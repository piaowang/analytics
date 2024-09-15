import {BaseService} from '../base.service'

let _inst = null

export default class SugoPortalTagAppOrdersService extends BaseService {
  constructor() {
    super('SugoPortalTagAppOrders')
  }
  
  static getInstance() {
    if (!_inst) {
      _inst = new SugoPortalTagAppOrdersService()
    }
    return _inst
  }
  
  async addOrder(appId, tagId, userId, transaction) {
    const where = {
      tagId: tagId
    }
  
    const existed = await this.findOne({
      ...where,
    }, {
      raw: true
    })
  
    let record = {
      tagId: tagId,
      appIdOrder: [appId],
      affectedUserId: userId,
      createdBy: userId
    }
  
    const options = {}
    if (transaction) options.transaction = transaction
  
    if (!existed) {
      await this.create(record, options)
    } else {
      let appIdOrder = existed.appIdOrder || []
      record = {
        appIdOrder: appIdOrder.concat(appId)
      }
      await this.update(record, where, options)
    }
  }
  
}
