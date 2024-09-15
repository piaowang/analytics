import { BaseService } from './base.service'

export default class SugoTaskProjectService extends BaseService {

  static instance = null

  constructor() {
    super('SugoTaskProject')
  }

  static getInstance() {
    if (SugoTaskProjectService.instance === null) {
      SugoTaskProjectService.instance = new SugoTaskProjectService()
    }
    return SugoTaskProjectService.instance
  }
}
