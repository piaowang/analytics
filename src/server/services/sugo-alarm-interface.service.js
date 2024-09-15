import { BaseService } from './base.service'

/**
 * 告警接口服务层-CRUD
 */
export default class SugoAlarmInterfacesService extends BaseService {
  constructor() {
    super('SugoAlarmInterfaces')
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new SugoAlarmInterfacesService()
    }
    return this._instance
  }
}
