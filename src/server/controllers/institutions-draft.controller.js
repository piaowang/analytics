import InstitutionsDraftService from '../services/institutions-draft.service'
import { Response } from '../utils/Response'
import InstitutionsRoleService from '../services/institutionsRole.service'
import db from '../models'
import { UserService } from '../services/user.service'
import _ from 'lodash'

export default class SugoInstitutionsDraftController {
  constructor() {
    this.modelsService = new InstitutionsDraftService()
  }

  async treeData(ctx) {
    // const attributes = ['serial_number', 'name', 'parent']
    const rows = await this.modelsService.treeData()
    const data = rows.map((row) => {
      return {
        id: row.id,
        name: row.name,
        serialNumber: row.serial_number,
        parent: row.parent || '',
        level: row.level,
        status: row.status,
        roleIds: row.SugoInstitutionsRoles
          ? _.map(row.SugoInstitutionsRoles, (Role) => _.get(Role, 'role_id'))
          : [],
        userIds: row.SugoUsers
          ? _.map(row.SugoUsers, (user) => _.get(user, 'username'))
          : [],
        updated_by: row.updated_by,
        updated_at: row.updated_at,
        description: row.description,
        checking: row.SugoDataCheckings[0],
        hasId: row.SugoInstitutions
      }
    })
    ctx.body = Response.ok({ data })
  }

  async findOne(ctx) {
    const { id } = ctx.q
    const where = { id }
    const row = await this.modelsService.findOne(where)

    let data = row.toJSON()
    data.institutions = await db.SugoInstitutions.findOne({
      where: { id: data.id },
      raw: true,
      attributes: [
        'serial_number',
        'name',
        'parent',
        'level',
        'status',
        'description',
        'updated_at',
        'updated_by'
      ]
    })
    let user = await UserService.getInstance().findOne({ id: data.updated_by })
    data = {
      ...data,
      updated_by: user.first_name
    }

    ctx.body = Response.ok({ data })
  }

  async create(ctx) {
    const { id: userId } = ctx.session.user
    const {
      serial_number,
      name,
      parent,
      level,
      status,
      roleIds = [],
      checkStatus
    } = ctx.q
    const data = {
      serial_number,
      name,
      parent,
      level,
      status,
      created_by: userId,
      updated_by: userId
    }
    const create_id = await this.modelsService.create(
      data,
      roleIds,
      checkStatus
    )
    ctx.body = Response.ok({ create_id })
  }

  async delete(ctx) {
    const { id } = ctx.q
    if (id) {
      const role = await InstitutionsRoleService.getInstance().findAll(
        { institutions_id: id },
        { raw: true }
      )
      if (role.length) {
        ctx.body = Response.fail('该机构下已有角色，请移出其角色再删除')
        return
      }
      const user = await UserService.getInstance().findAll(
        { institutions_id: id },
        { raw: true }
      )
      if (user.length) {
        ctx.body = Response.fail('该机构下已有用户，请移出其用户再删除')
        return
      }
    }
    const create_id = await this.modelsService.delete(id)
    ctx.body = Response.ok({ create_id })
  }

  async editor(ctx) {
    const { id: userId } = ctx.session.user
    const {
      id,
      serial_number,
      name,
      parent,
      level,
      status,
      roleIds = [],
      description,
      checkData = {}
    } = ctx.q
    if (id) {
      const data = {
        serial_number,
        name,
        parent,
        level,
        status,
        description,
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
      //     ctx.body = Response.fail(`废弃失败，请先解除角色关联`)
      //     return
      //   }
      //   const user = await UserService.getInstance().findAll({ institutions_id: id }, { raw: true })
      //   if (user.length) {
      //     ctx.body = Response.fail(`废弃失败，请先解除用户关联`)
      //     return
      //   }
      // }
      const create_id = await this.modelsService.update(
        data,
        id,
        roleIds,
        checkData
      )
      ctx.body = Response.ok({ create_id })
    }
  }

  async import(ctx) {
    const { id: userId } = ctx.session.user
    const { upload } = ctx.q
    // console.log('-------')
    // console.log(upload)

    const result = await this.modelsService.import(upload, userId)

    ctx.body = { ...result }
  }

  async updateCheck(ctx) {
    const data = ctx.q
    let { operationType, id, status } = data
    if (id && operationType === 3 && status === 0) {
      const role = await InstitutionsRoleService.getInstance().findAll(
        { institutions_id: id },
        { raw: true }
      )
      if (role.length) {
        ctx.body = Response.fail('该机构下已有角色，请移出其角色再删除')
        return
      }
      const user = await UserService.getInstance().findAll(
        { institutions_id: id },
        { raw: true }
      )
      if (user.length) {
        ctx.body = Response.fail('该机构下已有用户，请移出其用户再删除')
        return
      }
    }
    data.applyId = ctx.session.user.id
    const create_id = await this.modelsService.updateCheck(data)
    ctx.body = Response.ok({ create_id })
  }
}
