import {BaseService } from './base.service'

export default class SugoShareManagerService extends BaseService {
  constructor () {
    super('SugoShareManager')
  }

  static getInstance() {
    if(SugoShareManagerService.instance === null) {
      SugoShareManagerService.instance = new SugoShareManagerService()
    }
    return SugoShareManagerService.instance
  }
}

