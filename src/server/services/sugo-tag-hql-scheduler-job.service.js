import _ from 'lodash'
import { log, err } from '../utils/log'
import SugoTagHqlService from './sugo-tag-hql.service'

/**
 * 触发定时调度任务的执行内容处理服务层（执行任务声明文件）
 */
export default class TagHqlScheduleJobService {

  static getInstance() {
    if(!this._instance) {
      this._instance = new TagHqlScheduleJobService()
    }
    return this._instance
  }

  /**
   * 定时任务回调-执行检测功能
   */
  run = async (params) => {
    log('start running hql task ....')
    const id = _.get(params, 'data.id')
    const hql = _.get(params, 'data.hql')
    if (!params || !id) {
      err('running hql task error => no data.id')
      return
    }
    if (!hql) {
      throw new Error('execute hql task error => no hql')
    }
    log(params.data.title, 'runing hql task ....')
    // 更新最近调度时间
    await SugoTagHqlService.getInstance().update({recent_run_at: new Date()}, { id })
    const res = await SugoTagHqlService.getInstance().manualRun(params.data)
    log('run hql success')
  }
}
