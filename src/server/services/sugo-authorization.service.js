import {BaseService} from './base.service'
import _ from 'lodash'

export default class SugoAuthorizationService extends BaseService {

  static instance = null

  constructor() {
    super('SugoAuthorization')
  }

  static getInstance() {
    if (SugoAuthorizationService.instance === null) {
      SugoAuthorizationService.instance = new SugoAuthorizationService()
    }
    return SugoAuthorizationService.instance
  }
  
  /**
   * 获取传入类型和角色组信息查询操作权限
   * @param {*} modelType 模型类型
   * @param {*} roleIds 权限集合
   * @param {*} id 检测的id 或者集合 （可不传）
   */
  async getAuthorizationType(modelType, roleIds, id) {
    let where = { model_type: modelType, role_id: { $in: roleIds }, status: 1 }
    if (_.isString(id)) {
      where.model_id = id
    }
    if (_.isArray(id)) {
      where.model_id = {
        $in: id
      }
    }
    const res = await this.__model.findAll({ where, raw: true })
    return _.reduce(res, (r, v) => {
      if (_.get(r, v.model_id, 0) === 1) {
        return r
      }
      r[v.model_id] = v.type
      return r
    }, {})
  }
}
