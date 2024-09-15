import SugoAuthorizationService from '../services/sugo-authorization.service'
import { UserService } from '../services/user.service'
import { Response } from '../utils/Response'
import { generate } from 'shortid'
import _ from 'lodash'
import db from '../models'
import { AUTHORIZATION_PERMISSIONS_TYPE } from '../../common/constants'

export default class AuthorizationController {

  constructor() {
    this.authorizationSer = SugoAuthorizationService.getInstance()
    this.userSer = UserService.getInstance()
  }
  
  async get(ctx) {
    const { modelId, modelType } = ctx.q
    const { user } = ctx.session
    const objs = await this.authorizationSer.findAll({ model_id: modelId, created_by: user.id, model_type: modelType }, { raw: true })
    return ctx.body = Response.ok(objs)
  }

  async save(ctx) {
    const { writeRoles, readRoles, modelType, modelId } = ctx.q
    const { user } = ctx.session
    const company_id = user.company_id
    const objs = await this.authorizationSer.findAll({ model_id: modelId, created_by: user.id, model_type: modelType }, { raw: true })
    const objIds = objs.map(p => p.role_id)
    //获取需要插入的权限
    const addWrite = _.difference(writeRoles, objIds).map(p => ({
      id: generate(),
      role_id: p,
      model_id: modelId,
      model_type: modelType,
      status: 1,
      type: AUTHORIZATION_PERMISSIONS_TYPE.write,
      company_id,
      created_by: user.id,
      updated_by: user.id
    }))
    const addRead = _.difference(readRoles, objIds).map(p => ({
      id: generate(),
      role_id: p,
      model_id: modelId,
      model_type: modelType,
      status: 1,
      type: AUTHORIZATION_PERMISSIONS_TYPE.read,
      company_id,
      created_by: user.id,
      updated_by: user.id
    }))
    const del = _.difference(objIds, [...writeRoles, ...readRoles])
    await db.client.transaction(async t => {
      await this.authorizationSer.__bulkCreate(addWrite, t)
      await this.authorizationSer.__bulkCreate(addRead, t)
      await this.authorizationSer.remove({ model_id: modelId, created_by: user.id, model_type: modelType,  role_id: { $in: del } }, { transaction: t })
      await this.authorizationSer.update({ type: AUTHORIZATION_PERMISSIONS_TYPE.write, status: 1 }, { model_id: modelId, created_by: user.id, model_type: modelType,  role_id: { $in: writeRoles } }, { transaction: t })
      await this.authorizationSer.update({ type: AUTHORIZATION_PERMISSIONS_TYPE.read, status: 1 }, { model_id: modelId, created_by: user.id, model_type: modelType,  role_id: { $in: readRoles } }, { transaction: t })
    })
    return ctx.body = Response.ok()
  }

}
