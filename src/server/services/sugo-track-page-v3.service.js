import { BaseService } from './base.service'

export default class SugoSDKPageInfoService extends BaseService {

  static instance = null

  constructor() {
    super('SugoSDKPageInfo')
  }

  static getInstance() {
    if (SugoSDKPageInfoService.instance === null) {
      SugoSDKPageInfoService.instance = new SugoSDKPageInfoService()
    }
    return SugoSDKPageInfoService.instance
  }
}
