import {BaseService} from './base.service'

export default class SugoAlarmNotifyTemplate extends BaseService {

  /** @type {SugoAlarmNotifyTemplate} */
  static instance = null

  constructor() {
    super('SugoAlarmNotifyTemplates')
  }

  /**
   * @return {SugoAlarmNotifyTemplate}
   */
  static getInstance() {
    if (SugoAlarmNotifyTemplate.instance === null) {
      SugoAlarmNotifyTemplate.instance = new SugoAlarmNotifyTemplate()
    }
    return SugoAlarmNotifyTemplate.instance
  }
}

