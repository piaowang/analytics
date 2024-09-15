import { BaseService } from './base.service'
export default class SugoTaskCategoryService extends BaseService {

  static instance = null

  constructor() {
    super('SugoTaskCategory')
  }

  static getInstance() {
    if (SugoTaskCategoryService.instance === null) {
      SugoTaskCategoryService.instance = new SugoTaskCategoryService()
    }
    return SugoTaskCategoryService.instance
  }

}
