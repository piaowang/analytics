import { log, err } from '../utils/log'
import {rawQuery, dropTables, backupTables} from '../utils/db-utils'
import _ from 'lodash'
import {generate} from 'shortid'

function editQueryParams(d, sugo_datasources_tree) {
  let keys = Object.keys(sugo_datasources_tree)
  let p = d.queryParams + ''
  for (let key of keys) {
    let str = `:${key},`
    let ig = p.indexOf(str)
    if (ig > -1) {
      p = p.replace(str, `:"${sugo_datasources_tree[key]}",`)
      break
    }
  }
  return p
}

function editPositionJson(d, slicesTree) {
  let keys = Object.keys(slicesTree)
  let p = d.position_json + ''
  for (let key of keys) {
    let str = `"i":"${key}"`
    let ig = p.indexOf(str)
    if (ig > -1) {
      p = p.replace(str, `"i":"${slicesTree[key]}"`)
    }
  }
  return p
}

export default async db => {
  
  let {client} = db

  let arr = [
    'sugo_usergroups',
    'dashboard_slices',
    'sugo_subscribe',
    'overview',
    'segment',
    'sugo_custom_orders',
    'sugo_dimensions',
    'sugo_funnels',
    'sugo_measures',
    'sugo_pivot_marks',
    'sugo_retentions',
    'slices',
    'sugo_datasources'
  ]

  let holder = await backupTables(db, arr)

  await dropTables(db, arr)

  let admin = await db.SugoUser.findOne({
    where: {
      username: 'admin'
    },
    attributes: ['id', 'username']
  })

  let uid = admin.id
  log('user id:', uid)

  let com = await db.SugoCompany.findOne({
    where: {
      name: 'test'
    }
  })

  let cid = com.id
  log('company id:', cid)

  //sync
  await client.sync()

  let sugo_datasources_tree = {}

  //sugo_datasources
  for (let d of holder.sugo_datasources) {

    let obj = {
      ...d,
      id: generate(),
      created_at: new Date(),
      updated_at: new Date(),
      created_by: uid,
      updated_by: uid,
      company_id: cid
    }

    sugo_datasources_tree[d.id] = obj.id

    await db.SugoDatasources.create(obj)
  }

  //segment
  let segmentTree = {}
  for (let d of holder.segment) {
    let obj = {
      ...d,
      id: generate(),
      druid_datasource_id: sugo_datasources_tree[d.druid_datasource_id],
      created_at: d.created_on,
      updated_at: d.changed_on,
      created_by: d.create_by,
      updated_by: d.updated_by || d.create_by,
      company_id: cid
    }
    segmentTree[d.id] = obj.id
    await db.Segment.create(obj)
  }

  //slices
  let slicesTree = {}
  for (let d of holder.slices) {
    let obj = {
      ...d,
      id: generate(),
      druid_datasource_id: sugo_datasources_tree[d.druid_datasource_id],
      created_at: d.created_on,
      updated_at: d.changed_on,
      created_by: uid,
      updated_by: uid,
      company_id: cid
    }
    slicesTree[d.id] = obj.id
    await db.Slices.create(obj)
  }

  //dashboard_slices
  for (let d of holder.dashboard_slices) {
    let obj = {
      ...d,
      slice_id: slicesTree[d.slice_id]
    }
    await db.DashboardSlices.create(obj)
  }

  //sugo_subscribe
  for (let d of holder.sugo_subscribe) {
    let obj = {
      ...d,
      slice_id: slicesTree[d.slice_id],
      user_id: uid
    }
    await db.SugoSubscribe.create(obj)
  }

  //sugo_custom_orders
  for (let d of holder.sugo_custom_orders) {
    let obj = {
      ...d,
      druid_datasource_id: sugo_datasources_tree[d.druid_datasource_id],
      user_id: uid
    }
    await db.SugoCustomOrders.create(obj)
  }

  //sugo_dimensions
  for (let d of holder.sugo_dimensions) {
    let obj = {
      ...d,
      id: generate(),
      parentId: sugo_datasources_tree[d.parentId],
      created_by: uid,
      updated_by: uid,
      company_id: cid
    }
    await db.SugoDimensions.create(obj)
  }

  //sugo_funnels
  for (let d of holder.sugo_funnels) {
    let obj = {
      ...d,
      id: generate(),
      druid_datasource_id: sugo_datasources_tree[d.druid_datasource_id],
      created_by: uid,
      updated_by: uid,
      company_id: cid,
      created_at: d.created_on,
      updated_at: d.changed_on
    }
    await db.SugoFunnels.create(obj)
  }

  //sugo_measures
  for (let d of holder.sugo_measures) {
    let obj = {
      ...d,
      id: generate(),
      parentId: sugo_datasources_tree[d.parentId],
      created_by: uid,
      updated_by: uid,
      company_id: cid
    }
    await db.SugoMeasures.create(obj)
  }

  //overview
  for (let d of holder.overview) {
    let obj = {
      ...d,
      id: generate(),
      slice_id: slicesTree[d.slice_id],
      company_id: cid,
      created_by: uid
    }
    await db.SugoOverview.create(obj)
  }

  //sugo_pivot_marks
  for (let d of holder.sugo_pivot_marks) {
    let obj = {
      ...d,
      id: generate(),
      queryParams: editQueryParams(d, sugo_datasources_tree),
      user_id: uid
    }

    await db.SugoPivotMarks.create(obj)
  }

  //sugo_retentions
  for (let d of holder.sugo_retentions) {
    let obj = {
      ...d,
      id: generate(),
      druid_datasource_id: sugo_datasources_tree[d.druid_datasource_id],
      created_by: uid,
      updated_by: uid,
      company_id: cid,
      created_at: d.created_on,
      updated_at: d.changed_on
    }
    await db.SugoRetentions.create(obj)
  }

  //sugo_role add company_id
  await rawQuery(db, [
    'ALTER TABLE sugo_role ADD "company_id" character varying(32)'
  ])

  await db.SugoRole.update({
    company_id: cid
  }, {
    where: {}
  })

  //dashboards
  let dss = await db.Dashboards.findAll()
  for (let d of dss) {
    let obj = {
      position_json: editPositionJson(d, slicesTree)
    }
    await db.Dashboards.update(obj, {
      where: {
        id: d.id
      }
    })
  }

  log('ok')

  await db.Meta.update({
    value: '0.5.7'
  }, {
    where: {
      name: 'version'
    }
  })

  log('update 0.5.7 done')
}
