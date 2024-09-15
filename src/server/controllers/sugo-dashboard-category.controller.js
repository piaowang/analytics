import db from '../models'
import _ from 'lodash'
import { Response } from '../utils/Response'
import CategoryMapService from '../services/sugo-dashboard-category-map.service'
import CategoryService from '../services/sugo-dashboard-category.service'
import { generate } from 'shortid'

const controller = {
  async save(ctx) {
    let { id, dashboards = [], title, parent_id, type, project_id } = ctx.q
    let { user } = ctx.session
    let { company_id, id: userId } = user
    const transaction = await db.client.transaction({ autocommit: true })
    if (id) {
      await CategoryService.getInstance().update({ title: title, updated_by: userId, project_id, type }, { id: id }, { transaction })
      const oldObjs = await CategoryMapService.getInstance().findAll({ category_id: id }, { raw: true })
      if (oldObjs.length !== dashboards.length || _.difference(dashboards, oldObjs.map(p => p.dashboard_id)).length) {
        await CategoryMapService.getInstance().remove({ category_id: id }, { transaction })
        const addDashboards = dashboards.map((p, order) => ({ category_id: id, dashboard_id: p, company_id, order }))
        await CategoryMapService.getInstance().__bulkCreate(addDashboards, transaction)
      }
    } else {
      id = generate()
      await CategoryService.getInstance().create({ id, title, company_id, created_by: userId, parent_id, project_id, type }, { transaction })
      const addDashboards = dashboards.map((p, order) => ({ category_id: id, dashboard_id: p, company_id, order }))
      await CategoryMapService.getInstance().__bulkCreate(addDashboards, transaction)
    }
    transaction.commit()
    return ctx.body = Response.ok(id)
  },
  async delete(ctx) {
    const { id } = ctx.q
    await db.client.transaction(async transaction => {
      await CategoryService.getInstance().remove({ id }, { transaction })
      await CategoryMapService.getInstance().remove({ category_id: id }, { transaction })
    })
    return ctx.body = Response.ok('删除成功')
  },

  async getList(ctx) {
    let { user } = ctx.session
    let { company_id, id: userId } = user
    const category = await CategoryService.getInstance().findAll({ company_id }, { raw: true })
    let dashboards = await CategoryMapService.getInstance().findAll({ category_id: { $in: category.map(p => p.id) } }, { raw: true })
    dashboards = _.groupBy(dashboards, p => p.category_id)
    const res = category.map(p => {
      return {
        title: p.title,
        id: p.id,
        order: p.order,
        parent_id: p.parent_id,
        type: p.type,
        project_id: p.project_id,
        dashboards: _.orderBy(_.get(dashboards, p.id, []), ['order'], ['asc']).map(p => p.dashboard_id)
      }
    })
    return ctx.body = Response.ok(_.orderBy(res, ['order'], ['asc']))
  },
  async saveCustomOrder(ctx) {
    const { orders } = ctx.q
    for (let i = 0; i < orders.length; i++) {
      const { parent_id, order, id, type } = orders[i]
      await CategoryService.getInstance().update({ parent_id, order, type }, { id })
    }
    return ctx.body = Response.ok()
  }
}

export default controller 
