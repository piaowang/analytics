import {BaseService} from './base.service'

export default class SugoLivescreenCategoryService extends BaseService {

  static instance = null

  constructor() {
    super('SugoLivescreenCategory')
  }

  static getInstance() {
    if (SugoLivescreenCategoryService.instance === null) {
      SugoLivescreenCategoryService.instance = new SugoLivescreenCategoryService()
    }
    return SugoLivescreenCategoryService.instance
  }
}
