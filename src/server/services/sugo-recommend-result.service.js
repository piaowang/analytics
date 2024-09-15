import {BaseService} from './base.service'

let inst = null
/**
 * @description
 * 推荐结果表（for 经传集团）
 * @export
 * @class SugoRecommendResultService
 * @extends {BaseService}
 */
export class SugoRecommendResultService extends BaseService {

  constructor () {
    super('SugoRecommendResult')
  }

  static getInstance () {
    if (inst === null) {
      inst = new SugoRecommendResultService()
    }
    return inst
  }
}
