import { log } from '../utils/log'
import {rawQuery} from '../utils/db-utils'
import _ from 'lodash'
import {generate} from 'shortid'

export default async db => {
  
  let {client} = db

  let dss = await client.query(
    'select * from "dashboard_slices"',
    { type: client.QueryTypes.SELECT }
  )

  let ss = await client.query(
    'select * from "sugo_subscribe"',
    { type: client.QueryTypes.SELECT }
  )

  let ds = await client.query(
    'select * from "dashboards"',
    { type: client.QueryTypes.SELECT }
  )

  let users = await client.query(
    'select * from "sugo_user"',
    { type: client.QueryTypes.SELECT }
  )

  //db ALTER
  const alterSQLs = [
    'DROP TABLE dashboard_user;',
    'DROP TABLE sugo_subscribe;',
    'DROP TABLE dashboard_slices;',
    'DROP TABLE sugo_dashboard_user',
    'DROP TABLE dashboards;',

    //other userless tables

    'DROP TABLE ab_role;',
    'DROP TABLE ab_user;',
    'DROP TABLE ab_user_role;',
    'DROP TABLE ab_permission;',
    'DROP TABLE ab_permission_view;',
    'DROP TABLE ab_register_user;',
    'DROP TABLE ab_view_menu;',
    'DROP TABLE alembic_version;',
    'DROP TABLE birth_names;',
    'DROP TABLE clusters;',
    'DROP TABLE columns;',
    'DROP TABLE css_templates;',

    'DROP TABLE datasources;',
    'DROP TABLE dbs;',
    'DROP TABLE energy_usage;',
    'DROP TABLE favstar;',
    'DROP TABLE logs;',
    'DROP TABLE long_lat;',
    'DROP TABLE multiformat_time_series;',
    'DROP TABLE random_time_series;',
    'DROP TABLE slice_user;',
    'DROP TABLE sql_metrics;',
    'DROP TABLE metrics;',
    'DROP TABLE sugo_pivot_marks_copy',

    'DROP TABLE sugo_slice;',
    'DROP TABLE table_columns;',
    'DROP TABLE tables;',
    'DROP TABLE url;',
    'DROP TABLE user_freq;',
    'DROP TABLE subscribe;',
    'DROP TABLE sugo_model_settings',
    'DROP TABLE wb_health_population',

    'ALTER TABLE sugo_user ADD "email_validate" character varying(32)',
    'ALTER TABLE sugo_user ADD "company_id" character varying(32)'

  ]

  await rawQuery(db, alterSQLs)

  await client.sync()

  let admin = _.find(users, {
    username: 'admin'
  })

  debug('admin', JSON.stringify(admin))

  let aid = admin.id
  let comp = {
    id: generate(),
    name: 'test',
    description: 'test company',
    active: true,
    type: 'payed',
    email: 'test@sugo.io',
    cellphone: '',
    created_by: aid,
    updated_by: aid
  }

  let cid = comp.id

  await db.SugoCompany.create(comp)

  let dsTree = {}

  for (let d of ds) {
    let id = generate()
    dsTree['' + d.id] = id
    let obj = {
      id,
      dashboard_title: d.dashboard_title,
      position_json: d.position_json,
      description: d.description,
      created_by: aid,
      updated_by: aid,
      company_id: cid,
      created_at: new Date(d.created_on),
      updated_at: new Date(d.changed_on)
    }

    await db.Dashboards.create(obj)
  }

  debug(JSON.stringify(dsTree), 'dstree')

  for (let d of dss) {
    let id = generate()
    let obj = {
      id,
      dashboard_id: dsTree['' + d.dashboard_id],
      slice_id: d.slice_id
    }

    await db.DashboardSlices.create(obj)
  }

  for (let d of ss) {
    let id = generate()
    let obj = {
      id,
      dashboard_id: dsTree['' + d.dashboard_id] || undefined,
      slice_id: d.slice_id,
      user_id: aid,
      created_at: new Date(d.created_at),
      updated_at: new Date(d.updated_at)
    }

    await db.SugoSubscribe.create(obj)
  }

  for (let d of users) {
    let obj = {
      active: true,
      company_id: cid,
      email_validate: ''
    }
    await db.SugoUser.update(obj, {
      where: {
        id: d.id
      }
    })
  }

  await db.Meta.update({
    value: '0.5.6'
  }, {
    where: {
      name: 'version'
    }
  })

  log('update 0.5.6 done')
}
