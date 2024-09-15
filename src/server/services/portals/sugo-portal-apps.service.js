import {BaseService} from '../base.service'
import db from '../../models'
import {forAwaitAll} from '../../../common/sugo-utils'
import SugoPortalAppTagRelationsService from './sugo-portal-app-tag-relations.service'
import SugoPortalTagAppOrdersService from './sugo-portal-tag-app-orders.service'

let _inst = null

export default class SugoPortalAppsService extends BaseService {
  constructor() {
    super('SugoPortalApps')
    this.sugoProtalAppTagRelationService = new SugoPortalAppTagRelationsService()
    this.appOrdersService = new SugoPortalTagAppOrdersService()
  }
  
  static getInstance() {
    if (!_inst) {
      _inst = new SugoPortalAppsService()
    }
    return _inst
  }
  
  async addTag(params) {
    const { app = {}, tags = [], userId, transaction } = params
  
    await forAwaitAll(tags, async (item) => {
      let existedRelate = await this.sugoProtalAppTagRelationService.existedRelate(app.id, item)
      if (existedRelate) return
      
      const record = {
        appId: app.id,
        tagId: item,
        createdBy: userId
      }
      await this.sugoProtalAppTagRelationService.create(record, { transaction })
      // TODO 支持不写入顺序也能查询到前端？
      await this.appOrdersService.addOrder(app.id, item, userId, transaction)
    })
  }
  
}
