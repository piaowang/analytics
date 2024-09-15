/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-23 15:22:27
 * @description 智能营销-任务表service
 */
import { BaseService } from '../base.service'
import { MARKETING_EVENT_STATUS, MARKETING_TASK_TYPE, MARKETING_TASK_STATUS } from 'common/constants'


export default class MarketingTasksService extends BaseService {

  constructor() {
    super('MarketingTasks')
  }

  /**
   * @description 开启或关闭营销事件/活动时同时更新任务状态信息
   * @param {Object} data
   * @param {MARKETING_TASK_TYPE} type
   */
  async syncTaskStatus({ data, type }) {
    const where = {
      module_id: data.id,
      type
    }
    const { name, created_by, updated_by, send_channel: send_type } = data

    const  [ model, flag ] = await this.findOrCreate(where, {
      name,
      send_type, // 发送渠道
      created_by,
      status:  MARKETING_TASK_STATUS.PREPARING,
      start_time: new Date(),
      ...where
    })
    if (data.status === MARKETING_EVENT_STATUS.OPEN) { // 如果事件/活动是开启状态
      if(!flag && model.status !== MARKETING_TASK_STATUS.PREPARING) { // 如果已存在任务记录且状态为已暂停状态需要更新为准备中
        await this.update({
          name, // 同步任务记录名称
          status: MARKETING_TASK_STATUS.PREPARING,
          updated_by
        }, where)
      }
    } else if(data.status === MARKETING_EVENT_STATUS.CLOSE) {
      await this.update({
        name, // 同步任务记录名称
        send_type, // 发送渠道
        updated_by,
        status: MARKETING_TASK_STATUS.PAUSED
      }, where)
    }
  }
}
