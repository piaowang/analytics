import {BaseService } from './base.service'

export default class SugoExamineConfigService extends BaseService {
  
  static instance = null

  constructor () {
    super('SugoExamineConfig')
  }

  static getInstance() {
    if(SugoExamineConfigService.instance === null) {
      SugoExamineConfigService.instance = new SugoExamineConfigService()
    }
    return SugoExamineConfigService.instance
  }
}

