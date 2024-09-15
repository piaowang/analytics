import { BaseService } from './base.service'
import RedisSchedule from './redis-schedule.service'
import db from '../models'
import { AccessDataOriginalType, AccessDataType, adnroidAlias, iosAlias} from '../../common/constants'
import DruidQueryService from './druid-query.service'
import config from '../config'
import moment from 'moment'
import _ from 'lodash'

const { preQueryLength } = config
let cutvReportInst = null
/**
 * 临时 lookup 服务层-CRUD
 */
export default class CutvReportService extends BaseService {
  constructor() {
    super('CutvReport')
  }

  static getInstance() {
    if (!cutvReportInst) {
      cutvReportInst = new CutvReportService()
    }
    return cutvReportInst
  }

  pollingDruid = async (params) => {
    const { data } = params
    console.log(new Date(),'定制报表定时任务启动=======')
    if (_.isEmpty(params) || data < 0 ) return
    console.log(new Date(), '定制报表定时任务执行===========')
    await this.preQuery(data)
  }

  queryDruid = async (params) => {
    const { druid_datasource_id, during, sugo_lib, app_version, event_name } = params
    let deviceRes, weekRes, monthRes
    let queryDeviceCountAndDistinct_count = {
      druid_datasource_id,
      'timezone': 'Asia/Shanghai',
      'dimensions': ['__time'],
      'granularity': 'P1D',
      'filters': [{
        'col': '__time',
        'op': 'in',
        'eq':during,
        'dateStringComparingFormat': null
      }, {
        'col': 'event_name',
        'op': 'in',
        'eq': [event_name],
        'type': 'string'
      }, {
        'col': 'sugo_lib',
        'op': 'in',
        'eq': [
          sugo_lib
        ],
        'type': 'string'
      },
      {
        'col': 'app_version',
        'op': 'in',
        'eq': [
          app_version
        ],
        'type': 'string'
      }],
      'dimensionExtraSettings': [{
        'sortCol': '__time',
        'sortDirect': 'asc',
        'limit': 10
      }
      ],
      'customMetrics': [{
        'name': 'device_count',
        'formula': '$main.filter($device_id.isnt("")).count()',
        'dimName': 'device_id',
        'dimParams': {}
      },
      {
        'name': 'device_countDistinct',
        'formula': '$main.filter($device_id.isnt("")).countDistinct($device_id)',
        'dimName': 'device_id',
        'dimParams': {}
      }
      ],
      'splitType': 'tree',
      'queryEngine': 'tindex'
    }
    let queryWeekActive = {
      druid_datasource_id,
      'timezone': 'Asia/Shanghai',
      'granularity': 'P1D',
      'filters': [{
        'col': '__time',
        'op': 'in',
        'eq': [moment(during[0]).add(-7, 'd').toISOString(), during[1]],
        'dateStringComparingFormat': null
      }, {
        'col': 'event_name',
        'op': 'in',
        'eq': [event_name],
        'type': 'string'
      }, {
        'col': 'sugo_lib',
        'op': 'in',
        'eq': [
          sugo_lib
        ],
        'type': 'string'
      },
      {
        'col': 'app_version',
        'op': 'in',
        'eq': [
          app_version
        ],
        'type': 'string'
      }
      ],
      'dimensionExtraSettings': [{
        'sortCol': '__time',
        'sortDirect': 'asc',
        'limit': 10
      }],
      'customMetrics': [{
        'name': 'device_countDistinct',
        'formula': '$main.filter($device_id.isnt("")).countDistinct($device_id)',
        'dimName': 'device_id',
        'dimParams': {}
      }],
      'splitType': 'tree',
      'queryEngine': 'tindex'
    }
    let queryMonthActive = {
      druid_datasource_id,
      'timezone': 'Asia/Shanghai',
      'granularity': 'P1D',
      'filters': [{
        'col': '__time',
        'op': 'in',
        'eq': [moment(during[0]).add(-30, 'd').toISOString(), during[1]],
        'dateStringComparingFormat': null
      }, {
        'col': 'event_name',
        'op': 'in',
        'eq': [event_name],
        'type': 'string'
      }, {
        'col': 'sugo_lib',
        'op': 'in',
        'eq': [
          sugo_lib
        ],
        'type': 'string'
      },
      {
        'col': 'app_version',
        'op': 'in',
        'eq': [
          app_version
        ],
        'type': 'string'
      }
      ],
      'dimensionExtraSettings': [{
        'sortCol': '__time',
        'sortDirect': 'asc',
        'limit': 10
      }],
      'customMetrics': [{
        'name': 'device_countDistinct',
        'formula': '$main.filter($device_id.isnt("")).countDistinct($device_id)',
        'dimName': 'device_id',
        'dimParams': {}
      }],
      'splitType': 'tree',
      'queryEngine': 'tindex'
    }
    try {
      deviceRes = await DruidQueryService.queryByExpression(queryDeviceCountAndDistinct_count, {nocache: true})
      if (event_name === '启动') {
        weekRes = await DruidQueryService.queryByExpression(queryWeekActive,{ nocache: true })
        monthRes = await DruidQueryService.queryByExpression(queryMonthActive,{ nocache: true })
      }
    } catch (e) {
      console.log(new Date(), '定制报表定时任务,数据爬取失败 =>',e)
    }
    //查当天的累计启动,注册用户数,去重和非去重的(非去重的给累计启动用)
    const resultSet = _.get(deviceRes,'[0].resultSet', [])
    if (_.isEmpty(resultSet)) {
      //创建零值 用于查询
      const q = {
        count_date: during[0],
        sdk_type: sugo_lib,
        app_version,
        event_name,
        datasource_id: druid_datasource_id
      }
      const existed = await db.CutvCustomReport.findOne({
        where: q
      })

      const { device_countDistinct: week_active = 0 } = _.get(weekRes,'[0]',{})
      const { device_countDistinct: month_active = 0 } = _.get(monthRes,'[0]',{})
      if (existed) {
        await db.CutvCustomReport.update({
          device_count: 0,
          device_count_distinct: 0,
          week_active,
          month_active
        },{ where: q })
      } else {
        await db.CutvCustomReport.create({
          ...q,
          device_count: 0,
          device_count_distinct: 0,
          week_active,
          month_active
        })
      }
      return
    }
    const { device_count, device_countDistinct } = resultSet[0]
    const { device_countDistinct: week_active = 0 } = _.get(weekRes,'[0]',{})
    const { device_countDistinct: month_active = 0 } = _.get(monthRes,'[0]',{})
    const q = {
      count_date: during[0], 
      sdk_type: sugo_lib,
      app_version,
      event_name, 
      datasource_id: druid_datasource_id
    }
    const existed = await db.CutvCustomReport.findOne({
      where: q
    })
    if (existed) {
      await db.CutvCustomReport.update({
        device_count: ~~device_count,
        device_count_distinct: ~~device_countDistinct,
        week_active,
        month_active
      },{ where: q })
    } else {
      await db.CutvCustomReport.create({
        ...q,
        device_count: ~~device_count,
        device_count_distinct: ~~device_countDistinct,
        week_active,
        month_active
      })
    }
  }

  preQuery = async (length) => {
    const projectList = await this.queryProjectList()
    if (_.isEmpty(projectList)) return
    for (let i = projectList.length - 1; i >= 0 ; i --) {
      const { id: project_id, datasource_id } = projectList[i]
      const appList = await this.queryAppList(project_id)
      if (_.isEmpty(appList)) continue
      for (let j = appList.length - 1; j >= 0; j --) {
        const { appId, app_access_type } = appList[j]
        let sugo_lib
        if (![0,1].includes(app_access_type)) continue
        if (app_access_type === 0) sugo_lib = 'android'
        if (app_access_type === 1) sugo_lib = 'Objective-C'
        const versionList = await this.queryVersionList(appId)
        for (let k = versionList.length - 1; k >=0; k --) {
          const { app_version } = versionList[k]
          if (!app_version) continue
          for (let l = length; l >= 0; l --) {
            const since = moment().add(l * -1,'d').startOf('d').toISOString()
            const until = moment().add(l * -1, 'd').endOf('d').toISOString()
            for (let n = 1; n >=0; n --) {
              let event_nameArr = ['启动', '首次安装']
              await this.queryDruid({druid_datasource_id: datasource_id, during: [since, until], sugo_lib,  app_version, event_name: event_nameArr[n]})
            }
          }
        }
      } 
    }
  }

  queryProjectList = async () => {
    const projects = await db.SugoProjects.findAll({
      where: {
        access_type: AccessDataType.SDK
      },raw: true
    })
    return projects.map(i => ({
      id: i.id,
      datasource_id: i.datasource_id
    }))
  }

  queryAppList = async (project_id) => {
    const appIds = await db.SugoDataAnalysis.findAll({
      where: {
        $or: [{
          project_id,
          access_type: AccessDataOriginalType.Android
        },{
          project_id,
          access_type:AccessDataOriginalType.Ios
        }]
      }, raw: true
    })
    if (_.isEmpty(appIds)) return []
    return appIds.filter(i => i.access_type === 0 || i.access_type === 1).map(i => ({
      app_access_type: i.access_type,
      appId: i.id
    }))
  }

  queryVersionList = async (appid) => {
    const versionList = await db.AppVersion.findAll({
      where: {
        appid
      }, raw: true
    })
    return versionList
  }
}


export async function initCutvCustomMadeReportTask() {
  const cutvReportInst = CutvReportService.getInstance()
  let redisSchedule =  RedisSchedule.getInstance()
  // PM2 cluster模式只启动一次定时任务
  const clusterId = process.env.NODE_APP_INSTANCE || 0
  if (Number(clusterId) === 0) {
    await redisSchedule.cancelJob('cutv-polling-druid')
    setTimeout(() => {
      redisSchedule.addJob('cutv-polling-druid', {
        // every: '1 hour',
        cron: '0 59 * * * *',
        path: './cutv-report.service',
        func: 'pollingDruid',
        data: 0,
        counter: 0
      }).then(() => {
        cutvReportInst.preQuery(preQueryLength)
      })
    }, 100)
  }
}
