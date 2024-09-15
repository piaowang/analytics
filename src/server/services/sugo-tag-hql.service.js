
import { BaseService } from './base.service'
import { log, err } from '../utils/log'
import RedisSchedule from './redis-schedule.service'
import TagDictService from '../services/sugo-tag-dict.service'
import db from '../models'
import config from '../config'
import FetchKit from '../utils/fetch-kit'
import _ from 'lodash'

/**
 * 标签计算任务服务层-CRUD
 */
export default class SugoTagHqlService extends BaseService {
  constructor() {
    super('SugoTagHql')
    this.redisSchedule =  new RedisSchedule({prefix: 'sugo:tag-hql:scheduler'})
    this.prefix_key = 'tag-hql-task'
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new SugoTagHqlService()
    }
    return this._instance
  }

  /**
   * 创建标签计算任务定时任务，并启动任务
   * @param tagHQL 标签计算任务记录
   * @returns {Promise<void>}
   */
  addHqlTask = async (tagHQL) => {
    if (!tagHQL) return
    const {rules: { cronExpression }} = tagHQL
    if (!cronExpression) {
      throw new Error('tagHql has no cronExpression')
    }
    log('add tag-hql => ', tagHQL.title || tagHQL.id)
    // cron:
    // 0 */n * * * * // 每隔n分钟
    // 0 0 */ * * *  // 每隔n小时
    await this.redisSchedule.addJob(this.getJobKey(tagHQL.id), {
      // every: '20 seconds',
      cron: `${cronExpression}`,
      path: './schedule/tag-hql-job',
      func: 'run', // default run
      data: tagHQL,
      counter: tagHQL.check_counter || 0
    })
  }

  getJobKey(id) {
    return `${this.prefix_key}-${id}`
  }

  /**
   * 停止hql定时任务
   * @param tagHql tagHql记录id
   * @returns {Promise<void>}
   */
  cancelHqlTask = async (tagHqlId) => {
    if (!tagHqlId) return
    log('stop tag-hql => ', this.getJobKey(tagHqlId))
    await this.redisSchedule.cancelJob(this.getJobKey(tagHqlId))
  }

  manualRun = async (tagHQL) => {
    // 更新最近调度时间
    // const res = await this.hiveService.runQuery(tagHQL.hql, null, isQuery)
    const res = await this.runQuery({
      queryId: tagHQL.id,
      sql: tagHQL.hql
    })
    const {project_id, tags} = tagHQL
    if (_.isEmpty(tags)) {
      return res
    }
    const recent_updated_at = new Date()
    let names = await db.SugoDimensions.findAll({
      attributes: ['name'],
      where: {
        id: { $in: tags }
      }
    })
    // 更新标签最近更新时间
    const ret_update = await TagDictService.execSQL('UPDATE sugo_tag_dictionary SET recent_updated_at=:recent_updated_at WHERE project_id=:project_id AND name IN (:names)', {
      replacements: {
        recent_updated_at,
        project_id,
        names: names.map(r => r.name)
      },
      type: db.client.QueryTypes.UPDATE
    })
    if (!ret_update.success) {
      err('update sugo_tag_dictionary => recent_updated_at error =>', ret_update.message)
    }
    return res
  }

  /**
   * 程序启动时初始化所有状态为[启动中]的定时调度任务
   * @memberOf SugoMonitorAlarmsService
   */
  initTasks = async () => {
    const clusterId = process.env.NODE_APP_INSTANCE
    // 仅仅在第一个实例运行，这样就不会出现请求不匹配
    if (clusterId > 0) return
    // 清理历史缓存中的配置
    // await this.redisSchedule.clearJobs()
    log('初始化标签计算任务定时任务')
    const other = {
      order: [
        ['weight', 'DESC'], // 按权重优先添加定时任务
        ['updated_at', 'DESC']
      ]
    }
    const res = await this.findAll({}, other)
    process.nextTick( async () => {
      for (const obj of res) {
        const o = obj.get({ plain: true })
        if (o.status) {
          // 循环启动所有时，每个延迟一秒
          // setTimeout(() => {
          await this.addHqlTask(o)
          // }, 1000)
        }
      }
    })
  }

  /**
   * @description 调用java restful api 执行hql语句
   * @param {string} queryId sql执行ID（方便取消执行操作)
   * @param {string} sql 执行的hql语句
   * @param {Array} params 查询sql参数列表
   * @returns
   * @memberOf SugoTagHqlService
   */
  async runQuery({queryId = 'default-qid', sql, params = null}) {
    const { apiHost } = config.hive
    if (!apiHost) {
      throw new Error('请求错误，请先配置hive.apiHost参数')
    }
    // 获取执行中队列
    // http://<apiHost>/hive/client/task/queue
    // result => {"taskCount":0,"pendingQueue":[],"runningQueue":[]}
    const { runningQueue: runnings } = await FetchKit.get(`${apiHost}/hive/client/task/queue`)
    /**
     * {
     *    "taskCount": 1,
          "queryIdToSql": {
            "S1VzrCURG": "insert..."
            ...
          }
        }
     */
    const { queryIdToSql = {} } = runnings
    const runningIds = _.keys(queryIdToSql) || []
    if (_.includes(runningIds, queryId)) {
      throw new Error('此计算任务正在执行中，请耐心等待。')
    }
    const api = `${apiHost}/hive/client/execute`
    const res = await FetchKit.post(api, {
      queryId,
      sql,
      params
    }).catch(e => {
      if (e.message.indexOf('Query was cancelled')) {
        throw new Error('执行失败，此计算任务已取消执行。')
      }
      throw e
    })
    if (!res.success) {
      err('hive restful api error =>', api)
      throw new Error('执行标签计算任务错误 =>', api, res.message, sql)
    }
    return res
  }

  /**
   * @description 调用java restful api 执行hql语句(此方法会同步等待接口返回结果)
   * @param {any} sql
   * @param {any} [params=null] 
   * @returns
   * @memberOf SugoTagHqlService
   */
  async runQueryWithoutQueryId({ sql, params = null }) {
    const { apiHost } = config.hive
    if (!apiHost) {
      throw new Error('请求错误，请先配置hive.apiHost参数')
    }
    const api = `${apiHost}/hive/client/execute`
    const res = await FetchKit.post(api, {
      sql,
      params
    }).catch(e => {
      if (e.message.indexOf('Query was cancelled') > -1) {
        throw new Error('执行失败，此计算任务已取消执行。')
      }
      throw e
    })
    if (!res.success) {
      err('hive restful api error =>', api)
      throw new Error('执行标签计算任务错误 =>', api, res.message, sql)
    }
    return res
  }

  /**
   * @description 取消执行的计算任务
   * @param {any} queryIds
   * @memberOf SugoTagHqlService
   */
  async cancelRunQuery(queryIds) {
    // http://<apiHost>/hive/client/task/cancel
    // http://<apiHost>/hive/client/task/queue
    const { apiHost } = config.hive
    if (!apiHost) {
      throw new Error('请求错误，请先配置hive.apiHost参数')
    }
    const api = `${apiHost}/hive/client/task/cancel`
    const res = await FetchKit.post(api, queryIds).catch(e => {
      if (e.message.indexOf('Invalid OperationHandle')) {
        throw new Error('取消失败，此计算任务已手动执行完成。')
      }
    })
    return res && res.message === 'ok'
  }
}
