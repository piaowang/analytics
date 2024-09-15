import {BaseService} from '../base.service'

let _inst = null

export default class SugoPortalsService extends BaseService {
  constructor() {
    super('SugoPortals')
  }
  
  static getInstance() {
    if (!_inst) {
      _inst = new SugoPortalsService()
    }
    return _inst
  }
}
