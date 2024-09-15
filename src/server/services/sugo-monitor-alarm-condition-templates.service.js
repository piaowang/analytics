import { BaseService } from './base.service'

/**
 * 告警条件模版服务层-CRUD
 * sugo-monitor-alarm-condition-templates
 */
export default class SugoMonitorAlarmConditionTemplatesService extends BaseService {
  constructor() {
    super('SugoMonitorAlarmConditionTemplates')
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new SugoMonitorAlarmConditionTemplatesService()
    }
    return this._instance
  }
}
