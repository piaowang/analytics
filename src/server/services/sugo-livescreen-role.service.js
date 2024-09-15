import {BaseService} from './base.service'

export default class SugoLivescreenRoleService extends BaseService {

  static instance = null

  constructor() {
    super('SugoLivescreenRole')
  }

  static getInstance() {
    if (SugoLivescreenRoleService.instance === null) {
      SugoLivescreenRoleService.instance = new SugoLivescreenRoleService()
    }
    return SugoLivescreenRoleService.instance
  }
}
