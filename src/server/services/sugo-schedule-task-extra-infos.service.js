import {BaseService} from './base.service'

export default class SugoScheduleTaskExtraInfosService extends BaseService {

  static instance = null

  constructor() {
    super('SugoScheduleTaskExtraInfo')
  }

  static getInstance() {
    if (SugoScheduleTaskExtraInfosService.instance === null) {
      SugoScheduleTaskExtraInfosService.instance = new SugoScheduleTaskExtraInfosService()
    }
    return SugoScheduleTaskExtraInfosService.instance
  }
}

