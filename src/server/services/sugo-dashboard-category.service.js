import { BaseService } from './base.service'

export default class SugoDashboardCategoryService extends BaseService {
  constructor() {
    super('SugoDashboardCategory')
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new SugoDashboardCategoryService()
    }
    return this._instance
  }
}
