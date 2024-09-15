import moment from 'moment'
import db from '../models'
import conf from '../config'
import {generate} from 'shortid'
const {seedDatasourceName, seedCompany} = conf

export default function ({
  company_id,
  user_id,
  emailValidateId,
  role_id,
  target,
  email,
  cellphone,
  companyName,
  password
}) {

  return (async function () {

    let role_ids = [role_id]
    let user_ids = []
    let company = await db.SugoCompany.findOne({
      where: {
        name: seedCompany
      }
    })

    let datasource = await db.SugoDatasources.findOne({
      where: {
        name: seedDatasourceName,
        company_id: company.id
      }
    })

    datasource = datasource.get({ plain: true })
    let dims = await db.SugoDimensions.findAll({
      where: {
        parentId: datasource.id,
        company_id: datasource.company_id
      }
    })

    let meas = await db.SugoMeasures.findAll({
      where: {
        parentId: datasource.id,
        company_id: datasource.company_id
      }
    })
    dims = dims.map(dim => dim.get({ plain: true }))
    meas = meas.map(mea => mea.get({ plain: true }))

    //company
    await db.SugoCompany.create({
      id: company_id,
      name: companyName,
      active: true,
      email,
      cellphone,
      created_by: 'user register'
    }, target)

    await db.EmailValidate.create({
      id: emailValidateId,
      user_id,
      expire: moment().add(10, 'years')._d
    }, target)

    //role
    await db.SugoRole.create({
      id: role_id,
      name: 'admin',
      description: '超级管理员',
      type: 'built-in',
      company_id
    }, target)

    //user
    await db.SugoUser.create({
      id: user_id,
      username: email,
      first_name: companyName + '的超级管理员',
      type: 'built-in',
      email,
      password,
      email_validate: emailValidateId,
      company_id
    }, target)

    //user_role
    await db.SugoUserRole.create({
      user_id,
      role_id
    }, target)

    let ds = {
      ...datasource,
      id: generate(),
      created_by: user_id,
      updated_by: user_id,
      description: 'trial',
      taskId: '',
      company_id,
      user_ids,
      role_ids
    }

    //datasource
    await db.SugoDatasources.create(ds, target)

    //dimensions
    for (let dim of dims) {
      await db.SugoDimensions.create({
        ...dim,
        id: generate(),
        created_by: user_id,
        updated_by: user_id,
        company_id,
        user_ids,
        role_ids,
        parentId: ds.id
      }, target)
    }

    //measures
    for (let mea of meas) {
      await db.SugoMeasures.create({
        ...mea,
        id: generate(),
        created_by: user_id,
        updated_by: user_id,
        company_id,
        user_ids,
        role_ids,
        parentId: ds.id
      }, target)
    }

    let sliceBase = {
      druid_datasource_id: ds.id,
      datasource_name: ds.name,
      created_by: user_id,
      updated_by: user_id,
      company_id
    }

    let mea = meas[0]
    let dim = dims[0]

    let params = {
      relativeTime: '-3 days',
      since: moment().subtract(7, 'days').format('YYYY-MM-DD'),
      until: moment().format('YYYY-MM-DD'),
      metrics: [mea.name],
      dimensions: ['Province'],
      dimensionExtraSettings: [{
        limit: 10,
        sortDirect: 'desc',
        sortCol: mea.name
      }],
      filters: [],
      viz_type: 'table',
      timezone: 'Asia/Shanghai'
    }

    let slices = [
      {
        id: generate(),
        ...sliceBase,
        slice_name: `最近7天${dim.title || dim.name}${mea.title || mea.name}表格`,
        params 
      }, {
        id: generate(),
        ...sliceBase,
        slice_name: `最近7天${dim.title || dim.name}${mea.title || mea.name}柱图`,
        params: {
          ...params,
          viz_type: 'dist_bar'
        }
      }, {
        id: generate(),
        ...sliceBase,
        slice_name: `最近7天${dim.title || dim.name}${mea.title || mea.name}线图`,
        params: {
          relativeTime: '-7 days',
          since: moment().subtract(7, 'days').format('YYYY-MM-DD'),
          until: moment().format('YYYY-MM-DD'),
          'metrics': [mea.name],
          'dimensions': ['__time'],
          'viz_type': 'line'
        }
      }
    ]

    for(let slice of slices) {
      slice.params = JSON.stringify(slice.params)
      await db.Slices.create(slice, target)
    }

    let dashboard = {
      id: generate(),
      dashboard_title: '测试数据看板',
      position_json: slices.map((s, i) => {
        return {
          'w': 4,
          'h': 10,
          'x': i * 4,
          'y': 0,
          'i': s.id,
          'minW': 3,
          'minH': 3,
          'moved': false,
          'static': false
        }
      }),
      created_by: user_id,
      updated_by: user_id,
      company_id
    }
    dashboard.position_json = JSON.stringify(dashboard.position_json)

    //dashborad
    await db.Dashboards.create(dashboard, target)

    //subscribe
    await db.SugoSubscribe.create({
      user_id,
      dashboard_id: dashboard.id
    }, target)

    await db.SugoSubscribe.create({
      user_id,
      slice_id: slices[0].id
    }, target)

    //overview
    for(let slice of slices) {
      await db.DashboardSlices.create({
        slice_id: slice.id,
        dashboard_id: dashboard.id
      }, target)
      await db.SugoOverview.create({
        user_id,
        slice_id: slice.id,
        company_id
      }, target)
      await db.SugoSubscribe.create({
        user_id,
        slice_id: slice.id
      }, target)
    }

    //retension
    let ret = {
      name: '测试留存',
      druid_datasource_id: ds.id,
      datasource_name: ds.name,
      params: JSON.stringify({
        'startStep': [null, '后台', null],
        'endStep': [null, '启动', null],
        'retentionDimension': ['EventScreen', 'EventAction', 'EventLabel']
      }),
      company_id,
      created_by: user_id,
      updated_by: user_id
    }
    await db.SugoRetentions.create(ret, target)

    //funnel
    let funn = {
      funnel_name: '测试漏斗',
      druid_datasource_id: ds.id,
      datasource_name: ds.name,
      params: JSON.stringify({
        'relativeTime': '-7 days',
        'since': '2016-11-21',
        'until': '2016-11-28',
        'commonDimensions': [
          'EventScreen',
          'EventAction',
          'EventLabel'
        ],
        'funnelMetric': 'UserID',
        'funnelLayers2d': [
          [
            null,
            '点击'
          ],
          [
            null,
            '后台'
          ],
          [
            null,
            '对焦'
          ]
        ]
      }),
      company_id,
      created_by: user_id,
      updated_by: user_id
    }
    await db.SugoFunnels.create(funn, target)

  })()

}

