/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2020-02-08
 * @description 数据运营-策略分群模型service
 */

import { BaseService } from '../base.service'
import RedisScheduleService from '../redis-schedule.service'
import { pioUserGroupUrl } from '../../config'
import Fetch from '../../utils/fetch-kit'
import conf from '../../config'
import { generate } from 'shortid'
import { MARKETING_MODEL_TYPE, MARKETING_MODEL_TYPES } from 'common/constants'
import _ from 'lodash'
import { log, err } from '../../utils/log'

export default class SugoMarktingModelSettingsService extends BaseService {

  constructor() {
    super('SugoMarktingModelSettings')
    this.redisSchedule = new RedisScheduleService({prefix: 'sugo:marketing-model-settings:scheduler'})
    this.prefix_key = 'marketing-model-settings-task'
  }

  async findByProjectId(project_id, type) {
    return await this.findOne({
      project_id,
      type
    }, {
      raw: true
    })
  }

  /**
   * @description 调用模型计算接口
   * @param {object} { projectId, type, callbakHost }
   * @returns
   */
  async calcModel({ projectId, type, modelSettings, callbakHost }) {
    let settings = modelSettings // 定时任务触发时传入modelSettings参数并冗余传入projectId, type参数
    if (!settings) {
      // 查询当前模型最新配置参数
      settings = await this.findOne({
        project_id: projectId,
        type
      }, {
        raw: true
      })
    }
    const url = `${pioUserGroupUrl}/ant/model/${MARKETING_MODEL_TYPES[type]}`
    const requestId = `usergroup_${projectId}_${type}_${generate()}`
    // 接口参数请参考：http://192.168.0.212:3000/project/58/interface/api/

    const typeVal = _.get(MARKETING_MODEL_TYPES, settings.type, '')
    if (_.isEmpty(settings) || !typeVal) {
      throw new Error(`操作失败，【${projectId}, ${type}】没有此模型相关配置！`)
    }
    // 策略模型计算接口回调地址
    const callbackUrl = `http://${callbakHost}/api/v1/marketing-model-settings/callbak?id=${settings.id}`
    let data = {
      type: typeVal,
      ..._.pick(settings, ['dimensions', 'params']),
      'datasets': _.get(settings,'datasets.query'),
      redisConfig: { ...conf.dataConfig },
      requestId,
      callbackUrl
    }

    if(type === MARKETING_MODEL_TYPE.VALUE_SLICE) {
      data.params = _.get(settings,'params.tier', [])
    }
    // console.log(data, '======模型计算参数======')
    const res = await Fetch.post(url, data)
    return res
  }

  /**
   * @description 定时任务触发时，执行函数
   * @param {Definition} { cron, data }
   * @memberOf SugoMarktingModelSettingsService
   */
  async taskRunning({ data }) {
    log(`start running ${this.prefix_key}`, data.type)
    await this.calcModel({
      projectId: data.project_id,
      type: data.type,
      callbakHost: conf.site.websdk_app_host,
      modelSettings: data
    })
  }

  getJobKey(suffix) {
    return `${this.prefix_key}:${suffix}`
  }

  async addScheduleJob(data) {
    if (!data && !data.timer) return
    // TODO 确认模型设置参数的定时字段
    const cron = _.get(data, 'timers.cronExpression')
    if (!cron) {
      return
    }
    const key = this.getJobKey(`${data.id}:${data.type}`)
    log(`start marketing-model-settings [${MARKETING_MODEL_TYPES[data.type]} =>`, data.type, key)
    await this.redisSchedule.addJob(key, {
      // every: '20 seconds', // local test
      cron,
      path: './marketing/model-settings.service', // 定时任务触发函数在service
      func: 'taskRunning', // 定时任务触发时，所执行的函数
      data,
      counter: data.check_counter || 0
    })
  }

  async removeScheduleJob(data) {
    if (!data && !data.timer) return
    // TODO 确认模型设置参数的定时字段
    const { cron } = data.timer
    if (!cron) {
      return
    }
    const key = this.getJobKey(`${data.id}:${data.type}`)
    log(`stop marketing-model-settings [${MARKETING_MODEL_TYPES[data.type]} =>`, data.type, key)
    await this.redisSchedule.cancelJob(key)
  }

  /**
   * @description 初始化启动所有设置的定时任务
   * @memberOf SugoMarktingModelSettingsService
   */
  async initModelTasks() {
    const clusterId = process.env.NODE_APP_INSTANCE
    // 仅仅在第一个实例运行，这样就不会出现请求不匹配
    if (clusterId > 0) return
    const settings =  await this.findAll({}, { raw: true })
    if (_.isEmpty(settings)) {
      return
    }
    log('初始营销中台-策略分群模型定时任务: ', settings.length)
    // 清除当前模块所有相关定时任务key
    await this.redisSchedule.clearJobs()
    process.nextTick(async () => {
      await Promise.all(settings.map(data => this.addScheduleJob(data)))
    })
  }

}
