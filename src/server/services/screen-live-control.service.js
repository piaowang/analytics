import db from '../models'
import {notifyLiveScreenCtrlStateChange} from './sugo-livescreen-broadcast.service'

export default class ScreenLiveControlService {

  constructor() {
  }

  async update(id, data = {}) {
    let res = await db.SugoLiveScreenControl.update({ ...data }, {
      where: { id }
      // transaction
    })
    //TODO 按新的数据结构调整 通知大屏投影
    await notifyLiveScreenCtrlStateChange()

    return res
  }

  async create(data = {}) {
    let res = await db.SugoLiveScreenControl.create(data)
    //TODO 按新的数据结构调整 通知大屏投影
    await notifyLiveScreenCtrlStateChange()

    return res
  }

  async createLogger(logger, transaction = null) {
    await db.SugoLiveScreenControlLogger.create(logger, transaction ? {transaction} : undefined)
  }

  async getOneTheme(id) {
    return await db.SugoLiveScreenControlTheme.findOne({
      where: { id },
      raw: true
    })
  }
}
