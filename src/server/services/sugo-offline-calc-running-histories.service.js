import {BaseService} from './base.service'

let _inst = null

export default class SugoOfflineCalcRunningHistoriesService extends BaseService {
  constructor() {
    super('SugoOfflineCalcRunningHistories')
  }
  
  static getInstance() {
    if (!_inst) {
      _inst = new SugoOfflineCalcRunningHistoriesService()
    }
    return _inst
  }
}
