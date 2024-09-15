import {BaseService} from './base.service'

let _inst = null

export default class SugoOfflineCalcTablesService extends BaseService {
  constructor() {
    super('SugoOfflineCalcTables')
  }
  
  static getInstance() {
    if (!_inst) {
      _inst = new SugoOfflineCalcTablesService()
    }
    return _inst
  }
}
