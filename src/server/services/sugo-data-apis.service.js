import {BaseService} from './base.service'

let inst = null

export class SugoDataApiService extends BaseService {
  
  constructor () {
    super('SugoDataApis')
  }
  
  static getInstance () {
    if (inst === null) {
      inst = new SugoDataApiService()
    }
    return inst
  }
}
