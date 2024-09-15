import { BaseService } from './base.service'

export default class SugoTaskPropsService extends BaseService {

  static instance = null

  constructor() {
    super('SugoTaskProps')
  }

  static getInstance() {
    if (SugoTaskPropsService.instance === null) {
      SugoTaskPropsService.instance = new SugoTaskPropsService()
    }
    return SugoTaskPropsService.instance
  }
}
