import { Response } from '../utils/Response'
import BusinessDimensionService from '../services/business-dimension.service'
import _ from 'lodash'

export default class BusinessDimensionController {

  constructor() {
    this.modelsService =  new BusinessDimensionService()
  }

  async list(ctx) {
    const {pageSize= '10', current= '1', queryParams} = ctx.q
    const where = {}
    const other = {
      limit: parseInt(pageSize, 10),
      offset: (parseInt(current, 10) - 1) *  parseInt(pageSize, 10)
    }
    if (queryParams) {
      Object.keys(queryParams).map(key => {
        if (key === 'name') {
          where.name = {$like: `%${queryParams[key]}%`}
        } else if(key === 'create_mode' && parseInt(queryParams[key]) ) {
          where[key] = parseInt(queryParams[key])
        }
      })
    }
    const {rows} = await this.modelsService.findAndCountAll(where, other)
    const count = await this.modelsService.count(where)
    const list = rows.map(row => {
      return {
        id: row.id,
        name: row.name,
        alias: row.alias,
        create_mode: row.create_mode,
        type: row.type,
        status: row.status,
        level: row.level,
        roleIds: row.SugoBusinessDimensionRoles ? _.map(row.SugoBusinessDimensionRoles, (Role)=>_.get(Role, 'role_id')) : []
      }
    })
    const data = {
      list, 
      total: count,
      pageSize: parseInt(pageSize, 10),
      current: parseInt(current, 10)
    }
    ctx.body = Response.ok({data})
  }

  async create (ctx) {
    const { id: userId } = ctx.session.user
    const {name, alias, create_mode, type, status, roleIds=[]} = ctx.q
    const hasName = await this.modelsService.findOne({name}, {raw: true})
    if (hasName) {
      ctx.body = Response.error(ctx, '名称已经存在,不能创建相同名称的业务维度')
      return 
    }
    const data = {
      name, alias, create_mode, type, status,
      created_by: userId,
      updated_by: userId
    }
    const create_id = await this.modelsService.create(data, roleIds)
    ctx.body = Response.ok({create_id})
  }

  async update (ctx) {
    const { id: userId } = ctx.session.user
    const { id, name, alias, create_mode, type, status, roleIds=[] } = ctx.q
    if (id && name) {
      const hasData = await this.modelsService.findOne({name}, {raw: true})
      if (hasData && hasData.id !== id) {
        ctx.body = Response.error(ctx, '名称已经存在,不能存在相同名称的业务维度')
        return 
      }
      const data ={
        name, alias, create_mode, type, status,
        created_by: userId,
        updated_by: userId
      }
      const create_id = await this.modelsService.update(data, id, roleIds)
      ctx.body = Response.ok({ create_id })
      return
    }
    ctx.body = Response.error({})
  }

  async delete(ctx) {
    const { id } = ctx.q
    if (id) {
      const create_id = await this.modelsService.delete(id)
      ctx.body = Response.ok({ create_id })
      return
    }
    ctx.body = Response.error({})
  }
}
