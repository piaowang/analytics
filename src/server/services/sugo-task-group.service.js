import { BaseService } from './base.service'

export default class SugoTaskGroupService extends BaseService {

  static instance = null

  constructor() {
    super('SugoTaskGroup')
  }

  static getInstance() {
    if (SugoTaskGroupService.instance === null) {
      SugoTaskGroupService.instance = new SugoTaskGroupService()
    }
    return SugoTaskGroupService.instance
  }
}
