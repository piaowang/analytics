import { BaseService } from './base.service'

export default class SugoPageCategoriesService extends BaseService {

  static instance = null

  constructor() {
    super('SDKPageCategories')
  }

  static getInstance() {
    if (SugoPageCategoriesService.instance === null) {
      SugoPageCategoriesService.instance = new SugoPageCategoriesService()
    }
    return SugoPageCategoriesService.instance
  }
}
