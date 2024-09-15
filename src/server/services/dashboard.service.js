import db from '../models'
import {generate} from 'shortid'

export async function getDashboards(where) {
  return await db.Dashboards.findAll({
    where,
    raw: true
  })
}

export async function getDashboardSliceMappingsByDashboardId(dashboardIds, sliceIds) {
  return await db.DashboardSlices.findAll({
    where: {
      dashboard_id: {$in: dashboardIds},
      ...(sliceIds ? {slice_id: {$in: sliceIds}} : {})
    },
    raw: true
  })
}

export async function getDashboardsByIds(ids) {
  return await db.Dashboards.findAll({
    where: {
      id: {$in: ids}
    },
    raw: true
  })
}

export async function dashboardSaveCopyAs(dashboard_id, type, userId) { // 单图另存为
  // 单条看板数据
  const dashboards = await db.Dashboards.findOne({where: {id: dashboard_id},raw: true})
  if (!dashboards) {
    return 
  } 
  // 看板和单图的对应关系数据
  const dashboardSlicesList = await db.DashboardSlices.findAll({
    where: {dashboard_id},
    raw: true})
  const slicesIds =  dashboardSlicesList.map(({slice_id}) => slice_id)
  //根据关系表找到所有看板下的所有单图
  const slicesList = await db.Slices.findAll({where: {id: {$in: slicesIds}},raw: true})
  // 看板分类关系表的数据
  const dashboardCategorymap = await db.SugoDashboardCategoryMap.findOne({
    where: {dashboard_id},
    raw: true})
  // 看板分类数据
  const dashboardCategory = dashboardCategorymap && await db.SugoDashboardCategory.findOne({
    where: {id: dashboardCategorymap.category_id},
    raw: true})

  const {dashboard_title, position_json, params, datasource_id, description, company_id} = dashboards ? dashboards : {}
  const newDashboardsId =  generate()
  const nesDashboardCategoryId =  generate()
  const newDashboards = {
    dashboard_title, position_json, params, datasource_id, description,company_id,
    id: newDashboardsId,
    created_by: userId,
    updated_by: userId
  }
  const newDashboardSlicesList = dashboardSlicesList.map(({slice_id}) => {
    return {
      id: generate(),
      dashboard_id: newDashboardsId,
      slice_id
    }
  })


  const {title, order, company_id: _company_id, type: _type, project_id, parent_id} = dashboardCategorymap ? dashboardCategorymap : {}
  const nesDashboardCategory = {
    id: nesDashboardCategoryId,
    created_by: userId,
    updated_by: userId,
    project_id,
    title,
    order,
    company_id: _company_id,
    type: _type,
    parent_id
  }

  const newDashboardCategorymap = {
    dashboard_id: newDashboardsId,
    category_id: nesDashboardCategoryId
  }

  let result = {}

  if (type === 'follow') { // 跟随模式，母看板中的单图修改，从她这复制出去的看板中的单图也会变化
    result = db.client.transaction(async transaction => {
      await db.Dashboards.create(newDashboards, {transaction})
      await db.DashboardSlices.bulkCreate(newDashboardSlicesList, {transaction})
      if (dashboardCategorymap && dashboardCategory) {
        await db.SugoDashboardCategory.create(nesDashboardCategory, {transaction})
        await db.SugoDashboardCategoryMap.create(newDashboardCategorymap, {transaction})
      }
    })
  } else if (type === 'independence') { // 独立模式，单图的数据直接写在看板中
    result = db.client.transaction(async transaction => {
      newDashboards.params = {
        istemplate: true,
        templateSlices: slicesList || []
      }
      await db.Dashboards.create(newDashboards, {transaction})
      if (dashboardCategorymap && dashboardCategory) {
        await db.SugoDashboardCategory.create(nesDashboardCategory, {transaction})
        await db.SugoDashboardCategoryMap.create(newDashboardCategorymap, {transaction})
      }
    })
  }

  return result

}

export default {
  getDashboardsByIds,
  dashboardSaveCopyAs
}
