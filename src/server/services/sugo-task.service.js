import { BaseService } from './base.service'

export default class SugoTaskService extends BaseService {

  static instance = null

  constructor() {
    super('SugoTask')
  }

  static getInstance() {
    if (SugoTaskService.instance === null) {
      SugoTaskService.instance = new SugoTaskService()
    }
    return SugoTaskService.instance
  }
}
