import { BaseService } from './base.service'

export default class SugoDashboardCategoryMapService extends BaseService {
  constructor() {
    super('SugoDashboardCategoryMap')
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new SugoDashboardCategoryMapService()
    }
    return this._instance
  }
}
