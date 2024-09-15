/*
 * @Author: xuxinjiang
 * @Date: 2020-06-19 16:12:41
 * @LastEditTime: 2020-07-01 15:52:19
 * @LastEditors: your name
 * @Description: In User Settings Edit
 * @FilePath: \sugo-analytics\src\server\controllers\manning.controller.js
 */

import config from '../config'
import db from '../models'
import FetchKit from '../utils/fetch-kit'
import ManningService from '../services/manning.service.js'
import { Response } from '../utils/Response'
import { toQueryParams } from '../../common/sugo-utils'

export default class ManningController {
  constructor() {
    this.ManningService = new ManningService()
  }
  async report(ctx) {
    const { user = false } = ctx.session
    if (!user) {
      ctx.session.redirect = '/mannings/report'
      return ctx.redirect('/')
    }
    //获取视图
    let reportList = []
    if (user.type === 'built-in') {
      reportList = await db.SugoManningReport.findAll({
        order: [['sortNumber']]
      })
    } else {
      const roleId = user.SugoRoles.map((v) => v.id)
      let roleList = await db.SugoRoleReport.findAll({
        where: {
          roleId: {
            $in: roleId
          }
        },
        raw: true
      })
      // 默认选中的报告
      const defaultReport = roleList.find((v)=>v.defaultReportId)
      roleList = roleList.reduce((data, v) => {
        return data.concat(v.reportId)
      }, [])
      let arr = new Set(roleList)
      arr = [...arr]
      reportList = await db.SugoManningReport.findAll({
        where: {
          id: {
            $in: arr
          }
        },
        raw:true,
        order: [['sortNumber']]
      })
      if(defaultReport){
        reportList = reportList.map((v)=>{
          if(v.id === defaultReport.defaultReportId){
            v.default = true
          }else{
            v.default = false
          }
          return v
        })
      }
    }

    ctx.local.reportList = reportList
    ctx.render('mannings', ctx.local)
  }
  async getMap(ctx) {
    const { TableauHost, TableauUsername } = config.manningConfig
    const id = ctx.query.id
    const res = await db.SugoManningReport.findByPk(id)
    if (!res) {
      ctx.body = '没有找到相应数据！'
    }
    const viewName = res.name
    //获取票卷
    const ticket = await FetchKit.post(`${TableauHost}/trusted`, null, {
      headers: {
        'Content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: toQueryParams({ username: TableauUsername })
    })
    return ctx.redirect(`${TableauHost}/trusted/${ticket}${viewName}`)
  }
  //获取角色拥有的视图
  async getRoleReport(ctx) {
    const id = ctx.q.id
    const res = await db.SugoRoleReport.findOne({
      where: {
        roleId: id
      }
    })
    if (res && res.reportId.length) {
      let list = await db.SugoManningReport.findAll({
        where: {
          id: {
            $in: res.reportId
          }
        },
        raw: true,
        order: [['sortNumber']]
      })
      if (res.defaultReportId) {
        list = list.map((v) => {
          if (v.id === res.defaultReportId) {
            v.default = true
          } else {
            v.default = false
          }
          return v
        })
      }

      ctx.body = Response.ok(list)
    } else {
      ctx.body = Response.fail('没有关联数据')
    }
  }
  async list(ctx) {
    let { pageSize = 30, page, search = '' } = ctx.q || {}
    let where = {}
    if (search !== '') {
      where = {
        name: {
          $like: `%${search}%`
        }
      }
    }
    let list = await this.ManningService.getData(where, pageSize || 30, page)
    ctx.body = Response.ok(list)
  }
  async add(ctx) {
    let data = ctx.q || {}
    let res = await this.ManningService.create(data)
    ctx.body = Response.ok(res)
  }
  async save(ctx) {
    let data = ctx.q
    let has = await this.ManningService.getDetail({
      title: data.title,
      id: { $ne: data.id }
    })
    if (has) {
      ctx.body = Response.fail('视图标题不能重复')
    } else {
      let res = await this.ManningService.save(data, { id: data.id })
      ctx.body = Response.ok(res)
    }
  }
  async del(ctx) {
    let id = ctx.q.id
    let res = await this.ManningService.del({ id })
    ctx.body = Response.ok(res)
  }
}
