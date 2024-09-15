import {BaseService} from './base.service'

let _inst = null

export default class SugoDataDevVisualModelsService extends BaseService {
  constructor() {
    super('SugoDataDevVisualModels')
  }
  
  static getInstance() {
    if (!_inst) {
      _inst = new SugoDataDevVisualModelsService()
    }
    return _inst
  }
}
