import {BaseService} from './base.service'

let inst = null

export class SugoDataApiClientService extends BaseService {
  
  constructor () {
    super('SugoDataApiClients')
  }
  
  static getInstance () {
    if (inst === null) {
      inst = new SugoDataApiClientService()
    }
    return inst
  }
}
