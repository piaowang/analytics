import BusinessDbServices from '../services/business-db-setting.service'
import _ from 'lodash'
import { Response } from '../utils/Response'
import db from '../models'
import customOrders from '../services/sugo-custom-orders.service'
import dimensionsServices from '../services/sugo-dimensions.service'

const controller = {
  async save(ctx) {
    let { businessdbsetting, isUindex } = ctx.q
    let { user } = ctx.session
    let { company_id } = user
    if (_.isEmpty(businessdbsetting)) return ctx.body = Response.fail('缺少参数')
    if (businessdbsetting.id) {
      businessdbsetting.updated_by = user.id
    } else {
      businessdbsetting.created_by = user.id
    }
    businessdbsetting.company_id = company_id
    if (businessdbsetting.id) {
      await db.client.transaction(async transaction => {
        let res = await BusinessDbServices.save(businessdbsetting, transaction)
        let jdbcErr = []
        if (res.success) {
          let opertionDeminsions = await db.SugoDimensions.findAll({
            where: {
              params: {
                table_id: businessdbsetting.id
              }
            }
          })
          for (var i = 0; i < opertionDeminsions.length; i++) {
            let p = opertionDeminsions[i]
            let params = { ...p.params, dimension: businessdbsetting.dimension }
            await db.SugoDimensions.update({ params },
              {
                where: {
                  id: businessdbsetting.id,
                  company_id
                }
              },
              transaction)
            let resJdbc = await dimensionsServices.updateDimensionLookUpJdbc(p.id, params, isUindex)
            if (!resJdbc.success) {
              jdbcErr.push(p.name)
            }
          }
          if (jdbcErr.length) {
            res.result.message = '修改成功, 同步维度失败,请到维度管理手动更新'
          }
        }
        ctx.body = res
        return
      })
    } else {
      let res = await BusinessDbServices.save(businessdbsetting)
      ctx.body = res
      return
    }
  },
  async delete(ctx) {
    let { id } = ctx.q
    let resCheck = await BusinessDbServices.check(id)
    if (resCheck.result) return ctx.body = Response.fail('维度表已使用，删除失败')
    let res = await BusinessDbServices.delete(id)
    ctx.body = res
  },
  async getList(ctx) {
    let { user } = ctx.session
    let { company_id } = user
    let res = await BusinessDbServices.getList(company_id)
    ctx.body = res
  },
  async testConnection(ctx) {
    let res = await BusinessDbServices.testConnection(ctx.q)
    ctx.body = res
  },
  async updateState(ctx) {
    let { id: userId, company_id } = ctx.session.user
    let { id, state, dataSourceId } = ctx.q
    let dataType = 'global'
    let opertionDeminsions = await db.SugoDimensions.findAll({
      where: {
        params: {
          table_id: id
        }
      }
    })
    opertionDeminsions = opertionDeminsions.map(p => p.name)
    if (opertionDeminsions.length) {
      let orders = await customOrders.getCustomOrder({ dataSourceId, userId, company_id, dataType })
      let dimensions = []
      if (orders) {
        dimensions = orders.dimensions_order
      } else {
        dimensions = await db.SugoDimensions.findAll({
          where: {
            company_id,
            parentId: dataSourceId
          }
        })
        dimensions = dimensions.map(p => p.name)
      }
      orders = state ? _.differenceBy(dimensions, opertionDeminsions.map(p => `hide:${p}`)).concat(opertionDeminsions)
        : opertionDeminsions.map(p => `hide:${p}`).concat(_.differenceBy(dimensions, opertionDeminsions))
      let res = await customOrders.updateCustomOrder({ dataSourceId, myCustomOrders: { dimensions_order: orders }, dataType, userId, company_id })
      if (!res.success) {
        ctx.body = Response.fail('更新状态失败')
        return
      }
    }
    let res = await BusinessDbServices.save({ state, id })
    ctx.body = res
  }
}

export default controller
