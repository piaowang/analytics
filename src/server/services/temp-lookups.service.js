import { BaseService } from './base.service'
import {createOrUpdateLookup, removeLookup} from './segment.service'
import {p2q} from '../utils/param-transform'
import {requesterWithToArray, uindexRequesterWithToArray} from '../utils/druid-middleware'
import _ from 'lodash'
import sid from '../models/safe-id'
import {immutateUpdate, immutateUpdates} from '../../common/sugo-utils'
import RedisSchedule from './redis-schedule.service'
import moment from 'moment'
import {getDatasourcesById} from './sugo-datasource.service'
import conf from '../config'


let tempLookupSrvInst = null
/**
 * 临时 lookup 服务层-CRUD
 */
export default class TempLookupsService extends BaseService {
  constructor() {
    super('TempLookups')
  }

  static getInstance() {
    if (!tempLookupSrvInst) {
      tempLookupSrvInst = new TempLookupsService()
    }
    return tempLookupSrvInst
  }

  async createAndLookup(tempUg, other = {}) {
    // 创建 lookup
    let tempUg0 = {...tempUg, id: sid()}
    let query0 = {}
    let addToDruidResult = {}
    let isUindexUg = tempUg0.params.openWith === 'tag-dict' || tempUg0.params.openWith === 'tag-enhance'
    if (_.get(tempUg,'params.openWith') === 'tag-enhance') {
      let dbDs = await getDatasourcesById(tempUg0.druid_datasource_id)
      query0 = {
        intervals: '1000/3000',
        dataConfig: {
          ...conf.dataConfig,
          groupId: 'temp_usergroup_' + tempUg.params.md5
        },
        dataSource: dbDs.name,
        descending: false,
        granularity: 'all',
        queryType: 'user_group',
        dimension: tempUg0.params.groupby,
        aggregations: []
      }
      addToDruidResult = [{
        version: 'data_row',
        event: {
          RowCount: tempUg.params.topn
        }
      }]
    } else {
      query0 = await p2q(immutateUpdate(tempUg0, 'params', par => _.omit(par, 'md5')), isUindexUg)
      let func = isUindexUg ? uindexRequesterWithToArray : requesterWithToArray
      addToDruidResult = await func({
        query: query0
      })
    }

    await createOrUpdateLookup(query0, isUindexUg)

    tempUg0 = immutateUpdates(tempUg0,
      'params.total', () => addToDruidResult[0].event.RowCount,
      'params.dataConfig.groupId', () => query0.dataConfig.groupId
    )
    return await this.create(tempUg0, other)
  }

  cleanUp = async () => {
    // 清理创建时间大于 1 天前的临时 lookup
    let tempLookups = await this.findAll({
      created_at: {$lt: moment().add(-1, 'day').toDate()}
    })
    if (!_.isEmpty(tempLookups)) {
      debug('正在清除临时 lookups')
    }
    for (let tempLookup of tempLookups) {
      try {
        let dataConfig = _.get(tempLookup, 'params.dataConfig')
        let isUindex = tempLookup.params.openWith === 'tag-dict' || tempLookup.params.openWith === 'tag-enhance'
        await removeLookup(dataConfig, isUindex)
      } catch (e) {
        console.log(`删除临时分群报错：${e.message}`)
        console.error(e)
      }
      await this.remove({id: tempLookup.id})
      debug(`清除临时 lookups 成功: ${tempLookup.title}`)
    }
  }
}

export function initTempLookupCleanTask() {
  const tempLookupSrvInst = TempLookupsService.getInstance()
  let redisSchedule =  RedisSchedule.getInstance()
  // PM2 cluster模式只启动一次定时任务
  const clusterId = process.env.NODE_APP_INSTANCE || 0
  // clusterId is string
  if (Number(clusterId) === 0) {
    redisSchedule.addJob('clean-up-expired-temp-lookups', {
      // every: '20 seconds',
      every: '1 hour',
      path: './temp-lookups.service',
      func: 'cleanUp',
      data: null,
      counter: 0
    }).then(() => {
      debug('开始定期清除临时 lookups 任务')

      tempLookupSrvInst.cleanUp()
    })
  }
}
