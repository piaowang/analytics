import { BaseService } from './base.service'

export default class SugoClonePackageService extends BaseService {

  static instance = null

  constructor() {
    super('SugoClonePackage')
  }

  static getInstance() {
    if (SugoClonePackageService.instance === null) {
      SugoClonePackageService.instance = new SugoClonePackageService()
    }
    return SugoClonePackageService.instance
  }
}
