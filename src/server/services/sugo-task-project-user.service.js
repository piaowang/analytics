import { BaseService } from './base.service'

export default class SugoTaskProjectUserService extends BaseService {

  static instance = null

  constructor() {
    super('SugoTaskProjectUser')
  }

  static getInstance() {
    if (SugoTaskProjectUserService.instance === null) {
      SugoTaskProjectUserService.instance = new SugoTaskProjectUserService()
    }
    return SugoTaskProjectUserService.instance
  }
}
