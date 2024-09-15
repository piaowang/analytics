import { BaseService } from './base.service'

export default class InstitutionsRoleService extends BaseService {
  constructor() {
    super('SugoInstitutionsRole')
  }
  static getInstance() {
    if (!this._instance) {
      this._instance = new InstitutionsRoleService()
    }
    return this._instance
  }
  //新增角色所属机构
  async updataFun(data,where,transaction){
    await this.__destroy(where,transaction)
    const res = await this.__bulkCreate(data,transaction)
    return res
  }
  //获取角色机构
  async getRoleInstitutions(where){
    return await this.findAll(where)
  }
}
