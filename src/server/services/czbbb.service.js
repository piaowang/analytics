
import { BaseService } from './base.service'
import RedisScheduleService from './redis-schedule.service'
import Fetch from '../utils/fetch-kit'
import conf from '../config'
import db from '../models'
import _ from 'lodash'
import { redisSet } from '../utils/redis'
import DruidQueryService from './druid-query.service'
import { convertContainsByDBType } from '../controllers/convert-contains-where'


export default class CzbbbService extends BaseService {
  constructor() {
    super('Czbbbs')
    this.redisSchedule = new RedisScheduleService({prefix: 'sugo:czbbb:scheduler'})
    this.prefix_key = 'czbbb'
  }

  getJobKey(suffix) {
    return `${this.prefix_key}:${suffix}`
  }

  async removeScheduleJob(id) {
    await this.redisSchedule.cancelJob(this.getJobKey(id))
  }

  async taskRunning() {
    function genQueryExpress({druid_datasource_id, ...rest}) {
      return {
        druid_datasource_id,
        'timezone': 'Asia/Shanghai',
        'granularity': 'P1D',
        'splitType': 'groupBy',
        'queryEngine': 'tindex',
        ...rest
      }
    }

    let store_ugnum = {}
  
    let allUg = await db.Segment.findAll({
      where: convertContainsByDBType('tags',['UimhvxFPc']),
      raw: true,
      attributes: ['id','title', 'params', 'compute_time', 'updated_at']
    })
    let allStoreId = await DruidQueryService.queryByExpression(genQueryExpress({
      'druid_datasource_id': '0JzuqWCBXFu',
      'dimensions': [
        's_car_store_id'
      ],
      'filters': [
        {
          'col': 's_car_store_id',
          'op': 'not in',
          'eq': [
            '空字符串 / NULL'
          ],
          'type': 'string',
          'containsNull': true
        }
      ],
      'dimensionExtraSettings': [
        {
          'limit': 999,
          'sortDirect': 'desc'
        }
      ]
    }))
    const storeIdSet = _.get(allStoreId, '[0].resultSet', [])
    storeIdSet.map( i => {
      if (!store_ugnum[i.s_car_store_id]) store_ugnum[i.s_car_store_id] = {}
    })
  
    for ( let i = 0; i < allUg.length; i ++) {
      let ug = allUg[i]
      ug.params = { total: 0}
      const { id } = ug
      let queryParams = {
        druid_datasource_id: '0JzuqWCBXFu',
        'dimensions': [
          's_car_store_id'
        ],
        'metrics': [
          'uindex_rkmGH92C4_project_Gj29BqJrd8_total'
        ],
        'filters': [
          {
            'col': 'distinct_id',
            'op': 'lookupin',
            // "eq": "1qva4lWpfh" //分群id
            eq: id
          },
          {
            'col': 's_member_telephone',
            'op': 'not in',
            'eq': [
              '空字符串 / NULL'
            ],
            'type': 'string',
            'containsNull': true
          }
        ],
        'dimensionExtraSettings': [
          {
            'limit': 999,
            'sortDirect': 'desc',
            'sortCol': 'uindex_rkmGH92C4_project_Gj29BqJrd8_total'
          }
        ]
      }
      let res = await DruidQueryService.queryByExpression(genQueryExpress(queryParams))
      const resultSet = _.get(res, '[0].resultSet', [])
  
      Object.keys(store_ugnum).map( j => {
        if (!store_ugnum[j][id]) store_ugnum[j][id] = _.cloneDeep(ug)
      })
      resultSet.map( j => {
        if (!j.s_car_store_id) return
        store_ugnum[j.s_car_store_id][id].params.total = j.uindex_rkmGH92C4_project_Gj29BqJrd8_total || 0
      })
    }
  
    await redisSet('store_ugnum',  store_ugnum)
  
  }

  

  async initCzbbbTasks() {
    const clusterId = process.env.NODE_APP_INSTANCE
    // 仅仅在第一个实例运行，这样就不会出现请求不匹配
    if (clusterId > 0) return
    // 清理历史缓存中的配置
    await this.redisSchedule.clearJobs() // 清除当前模块所有相关定时任务key
    await this.taskRunning()
    process.nextTick(async () => {

      const key = this.getJobKey('czbbb')
      const key1 = this.getJobKey('czbbb-1')
      await this.redisSchedule.cancelJob(key)
      await this.redisSchedule.cancelJob(key1)
      await this.redisSchedule.addJob(key, {
        // cron: `${s} ${m} ${H} ${D} ${M} *`,
        // cron: `0 0 7 * * *`,
        cron: '0 0 7 * * *',
        path: './czbbb.service',
        func: 'taskRunning',
        data: '',
        counter: 0
      })
      await this.redisSchedule.addJob(key1, {
        // cron: `${s} ${m} ${H} ${D} ${M} *`,
        // cron: `0 0 7 * * *`,
        cron: '0 0 10 * * *',
        path: './czbbb.service',
        func: 'taskRunning',
        data: '',
        counter: 0
      })
    })
  }

}
