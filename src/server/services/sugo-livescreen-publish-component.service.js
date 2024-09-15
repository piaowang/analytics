import {BaseService} from './base.service'

export default class SugoLivescreenPublishComponentService extends BaseService {

  static instance = null

  constructor() {
    super('SugoLivescreenPublishComponent')
  }

  static getInstance() {
    if (SugoLivescreenPublishComponentService.instance === null) {
      SugoLivescreenPublishComponentService.instance = new SugoLivescreenPublishComponentService()
    }
    return SugoLivescreenPublishComponentService.instance
  }
}
