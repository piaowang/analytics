import {BaseService} from './base.service'

export default class DbConnectService extends BaseService {

  static instance = null

  constructor() {
    super('TaskScheduleDbConnectSetting')
  }

  static getInstance() {
    if (DbConnectService.instance === null) {
      DbConnectService.instance = new DbConnectService()
    }
    return DbConnectService.instance
  }
}
