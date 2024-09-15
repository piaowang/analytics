import _ from 'lodash'
import RoleDraftService from '../services/role-draft.service'
import DataCheckService from '../services/data-checking.service'
import { Response } from '../utils/Response'

export default class RoleDraftController {
  constructor() {
    this.RoleDraftService = new RoleDraftService()
    this.DataCheckService = new DataCheckService()
  }
  //获取角色草稿
  async getRoleDraft(ctx) {
    let { pageSize, page, search, status='' } = ctx.q || {}
    let where = {}
    if(search !==''){
      where = {
        name:{
          $like:`%${search}%`
        }  
      }
    }
    let list = await this.RoleDraftService.getRoleDraft(
      where,
      pageSize || 30,
      page || 0,
      status
    )
    let ids = []
    list.rows.forEach(val => {
      if (val.institutionsIds && val.institutionsIds.length) {
        ids = ids.concat(val.institutionsIds)
      }
    })
    ids = new Set(ids)
    const Institutions = await this.RoleDraftService.findInstitutions({
      id: [...ids]
    })
    if (Institutions) {
      list.rows = list.rows.map(item => {
        item = item.toJSON()
        item.ins_detail = Institutions.filter(val => {
          if (item.institutionsIds.indexOf(val.id.toString()) >= 0) {
            return true
          }
        })
        return item
      })
    }
    ctx.body = Response.ok(list)
  }
  //获取角色详情
  async getRoleDraftDetail(ctx) {
    let { id } = ctx.q || {}
    const res = await this.RoleDraftService.getDetail({
      id
    })
    ctx.body = Response.ok(res)
  }
  //新增角色
  async addRole(ctx) {
    let { role = {} } = ctx.q
    let { user } = ctx.session
    let { company_id, id } = user
    let { name } = role
    if (!name) {
      return (ctx.body = Response.fail('角色名称不能为空'))
    }
    //创建
    role.createdByFk = id
    role.changedByFk = id
    role.companyId = company_id
    role.type = 'user-created'
    let where = {
      companyId:company_id,
      name
    }
    const res = await this.RoleDraftService.addRoleCheck({
      where,
      role
    })
    ctx.body = Response.ok(res)
  }
  //更新角色
  async updataRole(ctx) {
    let { data } = ctx.q || {}
    data.changedByFk = ctx.session.user.id
    const res = await this.RoleDraftService.updateRole(data, { id: data.id })
    ctx.body = Response.ok(res)
  }

  //删除角色
  async deleteFun(ctx) {
    let { id } = ctx.q || {}
    const rs = await this.RoleDraftService.deleteRole(id)
    return ctx.body = Response.ok(rs)
  }
  //提交撤销审核
  async commitCheck(ctx) {
    let { id,type } = ctx.q || {}
    if (id) {
      const res = await this.DataCheckService.findCheckData(
        {
          checkId: id
        }
      )
      //撤销删除
      if(res.operationType === 3 && !type){
        res.status = 1
        res.operationType = 1
        const re =  await res.save()
        return ctx.body = Response.ok(re)
      }else{
        res.status = type ? 0 : -1
        type && (res.applyId = ctx.session.user.id)
        const re = res.save()
        return ctx.body = Response.ok(re)
      }
      
    }
    return (ctx.body = Response.fail('角色id不能为空'))
  }
  //复制角色
  async copyRole(ctx){
    //创建
    let { role } = ctx.q || {}
    let where = {
      companyId:role.companyId,
      name:role.name
    }
    delete role.id
    const res = await this.RoleDraftService.addRoleCheck({
      where,
      role
    })
    ctx.body = Response.ok(res)
  }
}
