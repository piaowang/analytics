import InstitutionsService from '../services/institutions.service'
import { Response } from '../utils/Response'
import InstitutionsRoleService from '../services/institutionsRole.service'
import { UserService } from '../services/user.service'
import _ from 'lodash'

export default class SugoMarketingModelsController {

  constructor() {
    this.modelsService =  new InstitutionsService()
  }

  async treeData(ctx) {
    // const attributes = ['serial_number', 'name', 'parent']
    const rows = await this.modelsService.treeData()
    const data = rows.map(row => {
      return {
        id: row.id,
        name: row.name,
        serialNumber: row.serial_number,
        parent: row.parent || '',
        level: row.level,
        status: row.status,
        description: row.description,
        updated_at: row.updated_at,
        roleIds: row.SugoInstitutionsRoles ? _.map(row.SugoInstitutionsRoles, (Role)=>_.get(Role, 'role_id')) : [],
        userIds: row.SugoUsers ? _.map(row.SugoUsers, (user)=>_.get(user, 'username')) : []
      }
    })
    ctx.body = Response.ok({data})
  }

  async findOne (ctx) {
    const {id} = ctx.q
    const where = {id}
    const row = await this.modelsService.findOne(where)
    const data = {
      id: row.id,
      name: row.name,
      serialNumber: row.serial_number,
      parent: row.parent || '',
      level: row.level,
      status: row.status,
      check_status: row.check_status,
      description: row.description,
      roleIds: row.SugoInstitutionsRoles ? _.map(row.SugoInstitutionsRoles, (Role)=>_.get(Role, 'role_id')) : []
    }
    ctx.body = Response.ok({data})
  }

  async create (ctx) {
    const { id: userId } = ctx.session.user
    const {serial_number, name, parent, level, status, roleIds=[]} = ctx.q
    const data = {
      serial_number, name, parent, level, status,
      created_by: userId,
      updated_by: userId
    }
    const create_id = await this.modelsService.create(data, roleIds)
    ctx.body = Response.ok({create_id})
  }

  async delete (ctx) {
    const {id} = ctx.q
    if (id) {
      const role = await InstitutionsRoleService.getInstance().findAll( { institutions_id: id }, { raw: true })
      if (role.length) {
        ctx.body = Response.fail('该机构下已有角色，请移出其角色再删除')
        return
      }
      const user = await UserService.getInstance().findAll({ institutions_id: id }, { raw: true })
      if (user.length) {
        ctx.body = Response.fail('该机构下已有用户，请移出其用户再删除')
        return
      }
    }
    const create_id = await this.modelsService.delete(id)
    ctx.body = Response.ok({create_id})
  }
  
  async editor (ctx) {
    const { id: userId } = ctx.session.user
    const { id, serial_number, name, parent, level, status, roleIds = [], description, suggestion, check_status } = ctx.q
    if (id) {
      const data = {
        serial_number, name, parent, level, status, description, suggestion, check_status,
        updated_by: userId
      }
      // if (status === 2) {
      //   const child = await this.modelsService.findAll({ parent: id, status: 1 }, { raw: true })
      //   if (child.length) {
      //     ctx.body = Response.fail(`废弃失败，请先停用子机构[${child.map(p => p.name).join(',')}]`)
      //     return
      //   }
      //   const role = await InstitutionsRoleService.getInstance().findAll( { institutions_id: id }, { raw: true })
      //   if (role.length) {
      //     ctx.body = Response.fail('废弃失败，请先解除角色关联')
      //     return
      //   }
      //   const user = await UserService.getInstance().findAll({ institutions_id: id }, { raw: true })
      //   if (user.length) {
      //     ctx.body = Response.fail('废弃失败，请先解除用户关联')
      //     return
      //   }
      // }
      const create_id = await this.modelsService.update(data, id, roleIds)
      ctx.body = Response.ok({ create_id })
    }
  }

  async import (ctx) {
    const { id: userId } = ctx.session.user
    const { upload } = ctx.q


    const result = await this.modelsService.import(upload, userId)

    ctx.body = {...result}
  }
}
