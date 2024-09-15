import {BaseService} from '../base.service'

let _inst = null

export default class SugoPortalAppTagRelationsService extends BaseService {
  constructor() {
    super('SugoPortalAppTagRelations')
  }
  
  static getInstance() {
    if (!_inst) {
      _inst = new SugoPortalAppTagRelationsService()
    }
    return _inst
  }
  
  async existedRelate(appId, tagId) {
    let result = await this.findOne({
        appId,
        tagId
    })
    return !!result
  }
}
