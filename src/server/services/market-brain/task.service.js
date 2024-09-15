import { BaseService } from '../base.service'
import { MARKETING_EVENT_STATUS, MARKETING_TASK_TYPE, MARKETING_TASK_STATUS } from 'common/constants'


export default class MarketBrainTasksService extends BaseService {

  constructor() {
    super('MarketBrainTasks')
  }


  async syncTaskStatus({ data }) {
    const where = {
      module_id: data.id
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
