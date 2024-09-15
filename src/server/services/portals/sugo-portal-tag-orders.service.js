import {BaseService} from '../base.service'

let _inst = null

export default class SugoPortalTagOrdersService extends BaseService {
  constructor() {
    super('SugoPortalTagOrders')
  }
  
  static getInstance() {
    if (!_inst) {
      _inst = new SugoPortalTagOrdersService()
    }
    return _inst
  }
}
