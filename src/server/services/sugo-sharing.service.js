import {BaseService} from './base.service'

let _inst = null

export default class SugoSharingService extends BaseService {
  constructor() {
    super('SugoSharings')
  }
  
  static getInstance() {
    if (!_inst) {
      _inst = new SugoSharingService()
    }
    return _inst
  }
}
