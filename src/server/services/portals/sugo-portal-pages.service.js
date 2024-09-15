import {BaseService} from '../base.service'

let _inst = null

export default class SugoPortalPagesService extends BaseService {
  constructor() {
    super('SugoPortalPages')
  }
  
  static getInstance() {
    if (!_inst) {
      _inst = new SugoPortalPagesService()
    }
    return _inst
  }
}
