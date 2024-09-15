import {BaseService} from './base.service'

let _inst = null

export default class SugoOfflineCalcDataSourcesService extends BaseService {
  constructor() {
    super('SugoOfflineCalcDataSources')
  }
  
  static getInstance() {
    if (!_inst) {
      _inst = new SugoOfflineCalcDataSourcesService()
    }
    return _inst
  }
}
