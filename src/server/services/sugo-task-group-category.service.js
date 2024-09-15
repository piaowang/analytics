import { BaseService } from './base.service'
export default class SugoTaskCategoryGroupService extends BaseService {

  static instance = null

  constructor() {
    super('SugoTaskGroupCategory')
  }

  static getInstance() {
    if (SugoTaskCategoryGroupService.instance === null) {
      SugoTaskCategoryGroupService.instance = new SugoTaskCategoryGroupService()
    }
    return SugoTaskCategoryGroupService.instance
  }

}
