import SugoLivescreenRoleService from '../services/sugo-livescreen-role.service'
import SugoExamineService from '../services/sugo-examine.service'
import SugoLiveScreenService from '../services/sugo-livescreen.service'
import RoleService from '../services/role.service'
import { UserService } from '../services/user.service'
import { Response } from '../utils/Response'
import { generate } from 'shortid'
import _ from 'lodash'
import db from '../models'
import { EXAMINE_TYPE, EXAMINE_STATUS, AUTHORIZATION_PERMISSIONS_TYPE } from '../../common/constants'

export default class LifeCycleController {

  constructor() {
    this.livescreenRoleSer = SugoLivescreenRoleService.getInstance()
    this.examineSer = SugoExamineService.getInstance()
    this.userSer = UserService.getInstance()
  }

  async getRoleList(ctx) {
    const { user } = ctx.session
    // 获取已经审核通过的大屏 
    let examineLivescreens = await this.examineSer.getExamineListByModelType(EXAMINE_TYPE.liveScreen, EXAMINE_STATUS.pass, user.id)
    let roles = await RoleService.findAll({}, { raw: true })
    roles = _.keyBy(roles, p => p.id)
    // 获取大屏信息
    let livescreens = await SugoLiveScreenService.findAll({
      id: { $in: examineLivescreens.map(p => p.model_id)}, is_template: false 
    }, { raw: true })
    // 获取授权信息
    let livescreenRoles = await this.livescreenRoleSer.findAll({
      livescreen_id: { $in: examineLivescreens.map(p => p.model_id) }
    }, { raw: true, order: [['updated_at', 'DESC']] })
    livescreenRoles = _.groupBy(livescreenRoles, p => p.livescreen_id)

    // 我可以授权的
    const authorize = livescreens.map(p => {
      const items = _.get(livescreenRoles, p.id, []).filter(p => p.status === 1)
      if (!items.length) {
        return {
          livescreen_id: p.id,
          livescreen_name: p.title,
          status: -1,
          roles: []
        }
      }
      return {
        livescreen_id: p.id,
        livescreen_name: p.title,
        status: 1,
        roles: items.map(r => ({ type: r.type, ..._.pick(_.get(roles, r.role_id, {}), ['id', 'name']) })),
        type: _.uniq(items.map(p => p.type))
      }
    })

    // 获取授权给我
    const myRoles = user.SugoRoles.map(p => p.id)
    let livescreenRoleMap = await this.livescreenRoleSer.findAll({ role_id: { $in: myRoles } }, { raw: true , order: [['updated_at', 'DESC']] })
    if (_.isEmpty(livescreenRoleMap)) {
      return ctx.body = Response.ok({ empowerMe: [], authorize })
    }
    let userMap = await this.userSer.findAll({}, { raw: true })
    userMap = _.keyBy(userMap, p => p.id)
    livescreens = await SugoLiveScreenService.findAll({ id: { $in: livescreenRoleMap.map(p => p.livescreen_id) }, created_by: { $ne: user.id } }, { raw: true })
    livescreenRoleMap = _.groupBy(livescreenRoleMap, p => p.livescreen_id)
    livescreenRoleMap = _.mapValues(livescreenRoleMap, v =>  _.first(_.sortBy(v,['created_by'], ['desc'])))
    const empowerMe = livescreens.map(p => {
      const updated_by = _.get(livescreenRoleMap, [p.id, 'updated_by'])
      return {
        livescreen_id: p.id,
        livescreen_name: p.title,
        status: _.get(livescreenRoleMap, [p.id, 'status']),
        type: _.get(livescreenRoleMap, [p.id, 'type']),
        updated_by,
        updated_by_name: _.get(userMap, [updated_by, 'first_name']),
        created_at: _.get(livescreenRoleMap, [p.id, 'updated_at'])
      }
    })
    ctx.body = Response.ok({ empowerMe, authorize })
    return
  }

  async saveAuthorize(ctx) {
    const { writeRoles, readRoles, livescreenId } = ctx.q
    const { user } = ctx.session
    const company_id = user.company_id
    const sugoLivescreenRoleService = SugoLivescreenRoleService.getInstance()
    const roles = await sugoLivescreenRoleService.findAll({ livescreen_id: livescreenId, created_by: user.id }, { raw: true })
    const roleIds = roles.map(p => p.role_id)
    //获取需要插入的权限
    const addWrite = _.difference(writeRoles, roleIds).map(p => ({
      id: generate(),
      role_id: p,
      livescreen_id: livescreenId,
      status: 1,
      type: AUTHORIZATION_PERMISSIONS_TYPE.write,
      company_id,
      created_by: user.id,
      updated_by: user.id
    }))
    const addRead = _.difference(readRoles, roleIds).map(p => ({
      id: generate(),
      role_id: p,
      livescreen_id: livescreenId,
      status: 1,
      type: AUTHORIZATION_PERMISSIONS_TYPE.read,
      company_id,
      created_by: user.id,
      updated_by: user.id
    }))
    const del = _.difference(roleIds, [...writeRoles, ...readRoles])
    await db.client.transaction(async t => {
      await sugoLivescreenRoleService.__bulkCreate(addWrite, t)
      await sugoLivescreenRoleService.__bulkCreate(addRead, t)
      await sugoLivescreenRoleService.remove({ livescreen_id: livescreenId, created_by: user.id, role_id: { $in: del } }, { transaction: t })
      await sugoLivescreenRoleService.update({ type: AUTHORIZATION_PERMISSIONS_TYPE.write, status: 1 }, { livescreen_id: livescreenId, created_by: user.id, role_id: { $in: writeRoles } }, { transaction: t })
      await sugoLivescreenRoleService.update({ type: AUTHORIZATION_PERMISSIONS_TYPE.read, status: 1 }, { livescreen_id: livescreenId, created_by: user.id, role_id: { $in: readRoles } }, { transaction: t })
    })
    return ctx.body = Response.ok()
  }

  async cancelAauthorize(ctx) {
    const { livescreenId } = ctx.q
    const { user } = ctx.session
    await this.livescreenRoleSer.update({ status: 0, updated_by: user.id }, { livescreen_id: livescreenId })
    ctx.body = Response.ok('取消成功')
    return
  }
}
