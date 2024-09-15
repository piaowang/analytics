import db from '../models'
import {generate} from 'shortid'

export const findAllSlices = async (where, opts = {raw: true}) => {
  return await db.Slices.findAll({
    attributes: ['id', 'slice_name', 'updated_at', 'params', 'datasource_name', 'druid_datasource_id' ],
    order: [
      ['updated_at', 'DESC']
    ],
    where,
    ...opts
  })
}

const getSliceInfoById = async (id) => {
  return await db.Slices.findOne({
    attributes: ['id', 'slice_name', 'updated_at', 'params', 'datasource_name', 'druid_datasource_id'],
    order: [
      ['updated_at', 'DESC']
    ],
    where: {
      id
    }
  })
}

export async function getSlicesByIds(ids) {
  return await db.Slices.findAll({
    where: {
      id: {$in: ids}
    },
    raw: true
  })
}


function checkSliceParams(params, toDatasourceName) {
  const {filters=[], dimensions=[], metrics=[], dimensionExtraSettingDict={}} = params
  const measureMap = {}
  const dimensionSet = new Set()
  const newMetrics = metrics.map(name => {
    const newName = name.replace(/\w+_/, `${toDatasourceName}_`)
    measureMap[newName] = name
    return newName
  })

  filters.forEach (item => {
    dimensionSet.add(item.col)
  })

  dimensionSet.add(...dimensions)

  Object.keys(dimensionExtraSettingDict).forEach(key => {
    dimensionExtraSettingDict[key].sortCol = dimensionExtraSettingDict[key].sortCol ? dimensionExtraSettingDict[key].sortCol.replace(/\w+_/, `${toDatasourceName}_`) : dimensionExtraSettingDict[key].sortCol
  })

  const newParams = {
    ...params,
    metrics: newMetrics,
    dimensionExtraSettingDict
  }

  return [newParams, measureMap, dimensionSet]
}

async function checkMeasureAnddimension (measureMap, dimensionSet, oldDatasource, toDatasource, transaction) {
  let measureKeys = Object.keys(measureMap)
  const dimensionKey = [...new Set(dimensionSet)]

  const newMeasureDatas = []
  const newDimensionDatas = []

  const newMeasureNames = measureKeys.map(name => name)
  const oldMeasureNames = measureKeys.map(name => measureMap[name])

  const hasNewMeasures = await db.SugoMeasures.findAll({where: {name: {$in: newMeasureNames}},raw: true})
  const oldMeasures = await db.SugoMeasures.findAll({where: {name: {$in: oldMeasureNames}},raw: true})

  oldMeasures.forEach(measure => {
    const {name: measureName} = measure
    const has = hasNewMeasures.find(({name}) => measureMap[name] === measureName)
    if (!has) {
      newMeasureDatas.push({
        ...measure,
        id: generate(),
        parentId: toDatasource,
        name: measureKeys.find(newName => measureMap[newName] === measureName) 
      })
    }
  })
  // 插入不存在的指标
  await db.SugoMeasures.bulkCreate(newMeasureDatas, {transaction})

  const hasNewDimension = await db.SugoMeasures.findAll({where: {name: {$in: dimensionKey}, parentId: toDatasource},raw: true})
  const oldDimension = await db.SugoMeasures.findAll({where: {name: {$in: dimensionKey}, parentId: oldDatasource},raw: true})

  oldDimension.forEach(dimension => {
    const {name: dimensionName} = dimension
    const has = hasNewDimension.find(({name}) => name === dimensionName)
    if (!has) {
      newDimensionDatas.push({
        ...oldDimension,
        id: generate(),
        parentId: toDatasource
      })
    }
  })
  // 插入不存在的维度
  await db.SugoMeasures.bulkCreate(newDimensionDatas, {transaction})
}

async function copySlices (slicesList, oldDatasource,  toDatasource, userId, toDatasourceName, transaction) {
  const idMap = {}
  const datas = []
  let measureMap = {}
  let dimensionSet = []
  slicesList.forEach(({id, slice_name, child_project_id, datasource_name, params, description, company_id}) => {
    const newId = generate()
    idMap[id] = newId
    const [newParams, _measureMap, _dimensionSet] = checkSliceParams(params, toDatasourceName)
    measureMap = {
      ...measureMap,
      ..._measureMap
    }
    dimensionSet = [
      ...dimensionSet,
      ..._dimensionSet
    ]
    datas.push({
      id: newId,
      slice_name,
      druid_datasource_id: toDatasource,
      child_project_id,
      datasource_name,
      params: newParams,
      created_by: userId,
      updated_by: userId,
      description,
      company_id,
      copy_from_project_id: oldDatasource // 表示从哪里复制过来的
    })
  })

  await db.Slices.bulkCreate(datas, {transaction})

  // // 判断维度和指标是否存在
  await checkMeasureAnddimension(measureMap, dimensionSet, oldDatasource, toDatasource, transaction)
  return idMap
}

async function copyDashboards (dashboardsList, oldDatasource, toDatasource, sliceMap, userId, transaction) {
  const idMap = {}
  const datas = []
  dashboardsList.forEach(({id, dashboard_title,position_json, params, description, company_id}) => {
    const newId = generate()
    idMap[id] = newId
    const newPosition_json = position_json.map((item) => ({...item, i: sliceMap[item.i] }))
    datas.push({
      id: newId,
      dashboard_title,
      position_json: newPosition_json,
      params,
      datasource_id: toDatasource,
      description,
      created_by: userId,
      updated_by: userId,
      company_id,
      copy_from_project_id: oldDatasource // 表示从哪里复制过来的
    })
  })
  await db.Dashboards.bulkCreate(datas, {transaction})
  return idMap
}

async function copyDashboardSlices (dashboardSlicesList, oldDatasource, sliceMap, dashboardMap, transaction) {
  const datas = []
  dashboardSlicesList.forEach(item => {
    datas.push({
      dashboard_id: dashboardMap[item.dashboard_id],
      slice_id: sliceMap[item.slice_id],
      copy_from_project_id: oldDatasource // 表示从哪里复制过来的
    })
  })

  return await db.DashboardSlices.bulkCreate(datas, {transaction})
}

async function copydashboardCategory(dashboardCategoryList, oldDatasource, projectId, userId, transaction) {
  const idMap = {}
  const datas = []
  dashboardCategoryList.forEach(({id, title, order, company_id, type, parent_id}) => {
    const newId = generate()
    idMap[id] = newId
    datas.push({
      id: newId,
      created_by: userId,
      updated_by: userId,
      project_id: projectId,
      title,
      order,
      company_id,
      type,
      parent_id,
      copy_from_project_id: oldDatasource // 表示从哪里复制过来的
    })
  })
  // 因此存在parent_id，要对新数据的parent_id进行修正
  datas.forEach(item => {
    const {parent_id} = item
    if (parent_id) {
      item.parent_id = idMap[item.parent_id]
    }
  })

  await db.SugoDashboardCategory.bulkCreate(datas, {transaction})
  return idMap
}


async function copyDashboardCategoryMap (dashboardCategoryMapList, oldDatasource, dashboardMap, dashboardCategoryIdsMap, transaction) {
  const datas = []
  dashboardCategoryMapList.forEach(item => {
    datas.push({
      dashboard_id: dashboardMap[item.dashboard_id],
      category_id: dashboardCategoryIdsMap[item.category_id],
      copy_from_project_id: oldDatasource // 表示从哪里复制过来的
    })
  })

  return await db.SugoDashboardCategoryMap.bulkCreate(datas, {transaction})
}

export async function copy (oldDatasource, toDatasource, toProjectId, toDatasourceName, userId) {
  const dashboardsList = await db.Dashboards.findAll({where: {datasource_id: oldDatasource},raw: true})
  const dashboardsIds = dashboardsList.map(({id}) => id)

  // 找到看板和单图的对应关系表
  const dashboardSlicesList = await db.DashboardSlices.findAll({
    where: {dashboard_id: {$in: dashboardsIds}},
    raw: true})
  const slicesIds =  dashboardSlicesList.map(({slice_id}) => slice_id)
  //根据关系表找到所有看板下的所有单图
  const slicesList = await db.Slices.findAll({where: {id: {$in: slicesIds}},raw: true})

  // 找到看板的分类关系表的数据
  const dashboardCategoryMapList = await db.SugoDashboardCategoryMap.findAll({
    where: {dashboard_id: {$in: dashboardsIds}},
    raw: true})
  const dashboardCategoryIds = dashboardCategoryMapList.map(({category_id}) => category_id)
  // 根据对应关系找到要复制的看板分类数据
  const dashboardCategoryList = await db.SugoDashboardCategory.findAll({
    where: {id: {$in: dashboardCategoryIds}},
    raw: true})

  // 找出将于被插入的项目的目标看板，删除之前的复制关系时要用到
  const toDashboardsList = await db.Dashboards.findAll({where: {datasource_id: toDatasource},raw: true})
  const toDashboardsIds = toDashboardsList.map(({id}) => id)

  return db.client.transaction(async transaction => {
    //复制单图前先删除同源下的之前复制过来的单图
    await db.Slices.destroy({where: {copy_from_project_id: oldDatasource, druid_datasource_id: toDatasource}}, {transaction})
    //复制单图
    const sliceMap = await copySlices(slicesList, oldDatasource, toDatasource, userId, toDatasourceName, transaction)
    
    //复制看板前先删除同源下的之前复制过来的单图
    await db.Dashboards.destroy({where: {copy_from_project_id: oldDatasource, datasource_id: toDatasource}}, {transaction})
    // 复制看板需要新创建的单图id和旧单图id的对应关系
    const dashboardMap = await copyDashboards(dashboardsList, oldDatasource, toDatasource, sliceMap, userId, transaction)

    //复制看板和单图的对应关系前先删除同源下的之前复制过来的看板和单图的对应关系
    await db.DashboardSlices.destroy({where: {copy_from_project_id: oldDatasource, dashboard_id: {$in: toDashboardsIds}}}, {transaction})
    //复制看板和单图的对应关系
    await copyDashboardSlices(dashboardSlicesList, oldDatasource, sliceMap, dashboardMap, transaction)
    

    //复制看板分类表前先删除同源下的之前复制过来的分类表
    await db.SugoDashboardCategory.destroy({where: {copy_from_project_id: oldDatasource, project_id: toProjectId}}, {transaction})
    // 复制看板分类表
    const dashboardCategoryIdsMap =  await copydashboardCategory(dashboardCategoryList, oldDatasource, toProjectId, userId, transaction)
    //复制看板分类表前先删除同源下的之前复制过来的分类对应关系表
    await db.SugoDashboardCategoryMap.destroy({where: {copy_from_project_id: oldDatasource, dashboard_id: {$in: toDashboardsIds}}}, {transaction})
    //复制看板分类和看板的对应关系数据
    await copyDashboardCategoryMap(dashboardCategoryMapList, oldDatasource, dashboardMap, dashboardCategoryIdsMap, transaction)

  })
}
 
export default {
  findAllSlices,
  getSliceInfoById,
  copy
}
