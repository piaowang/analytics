import db from '../models'
import _ from 'lodash'
import {mapAwaitAll} from '../../common/sugo-utils'

export async function getRoles(where) {
  return await db.SugoRole.findAll({
    where,
    raw: true
  })
}

export async function getRolesByIds(ids) {
  return await db.SugoRole.findAll({
    where: {
      id: {$in: ids}
    },
    raw: true
  })
}

const addRole = async ({
  where,
  role,
  permissionList,
  dataPermissions,
  apps_id,
  company_id,
  transaction
}) => {
  //创建角色
  let [result, isCreate] = await db.SugoRole.findOrCreate({
    where,
    defaults: role,
    transaction
  })
  if (result && isCreate === false) {
    throw new Error('角色名称重复了，换一个吧')
  }

  let roleId = result.id

  //更新功能权限
  await funcAuth({
    roleId,
    transaction,
    permissionList
  })

  //更新数据权限
  await dataAuth({
    ...dataPermissions,
    company_id,
    roleId,
    transaction
  })

  await appsAuth({
    apps_id,
    roleId,
    transaction
  })

  return result
}

//更新数据权限
const dataAuth = async ({
  roleId,
  datasourceIds, // 有一部分可能是子项目 id
  measureIds, //指标id
  dimensionIds, //维度id
  tagGroupIds, //标签id
  transaction,
  company_id //企业id
}) => {
  //项目
  let allProjs = await db.SugoProjects.findAll({
    where: { company_id },
    raw: true
  })
  //获取数据id
  let dids = allProjs ? allProjs.map(p => p.datasource_id) : []

  let attr = {
    raw: true,
    attributes: ['id', 'role_ids']
  }
  //数据源
  let dss = await db.SugoDatasources.findAll({
    where: {
      id: { $in: dids }
    },
    ...attr
  })
  // 查子项目
  let cps = await db.SugoChildProjects.findAll({
    where: {
      project_id: { $in: allProjs.map(p => p.id) }
    },
    ...attr
  })
  //维度表
  let dims = await db.SugoDimensions.findAll({
    where: {
      parentId: { $in: dids }
    },
    ...attr
  })
  //指标
  let meas = await db.SugoMeasures.findAll({
    where: {
      parentId: { $in: dids }
    },
    ...attr
  })
  //标签
  let tagGroups = await db.TagGroup.findAll({
    where: {
      datasource_id: { $in: dids }
    },
    ...attr
  })

  let dsIdsSet = new Set(datasourceIds)
  
  const batchUpdateRole = async (idAndRoleIds, hasPermissionIdSet, dbModel) => await _(idAndRoleIds)
    .map(obj => {
      return {
        ...obj,
        targetRoleIds: hasPermissionIdSet.has(obj.id) ? _.uniq(obj.role_ids.concat(roleId)) : _.without(obj.role_ids, roleId)
      }
    })
    .filter(obj => !_.isEqual(obj.role_ids, obj.targetRoleIds))
    .groupBy(obj => _.orderBy(obj.targetRoleIds).join(''))
    .thru(async updateBatchDict => {
      return await mapAwaitAll(_.keys(updateBatchDict), async k => {
        let objs = updateBatchDict[k]
        return await dbModel.update({
          role_ids: objs[0].targetRoleIds
        }, {
          where: {
            id: objs.map(cp => cp.id)
          },
          transaction
        })
      })
    })
    .value()
  //更新数据源
  await batchUpdateRole(dss, dsIdsSet, db.SugoDatasources)
  //更新子项目
  await batchUpdateRole(cps, dsIdsSet, db.SugoChildProjects)
  //更新维度
  await batchUpdateRole(dims, new Set(dimensionIds), db.SugoDimensions)
  //更新指标
  await batchUpdateRole(meas, new Set(measureIds), db.SugoMeasures)
  //更新标签
  await batchUpdateRole(tagGroups, new Set(tagGroupIds), db.TagGroup)
}

const funcAuth = async ({
  roleId,
  permissionList,
  transaction
}) => {
  await db.SugoRoleRoute.destroy({
    where: {
      role_id: roleId
    },
    transaction
  })
  
  const funcPerms = permissionList.map(routeId => ({
    role_id: roleId,
    route_id: routeId
  }))
  await db.SugoRoleRoute.bulkCreate(funcPerms, {transaction})
}

const findAll = async (where, option) => {
  return await db.SugoRole.findAll({ where, ...option })
}

const appsAuth = async ({
  apps_id,
  roleId,
  transaction
}) => {
  await db.SugoRoleApp.destroy({
    where: {
      role_id: roleId
    },
    transaction
  })

  const data = (apps_id || []).map(id => ({
    role_id: roleId,
    app_id: id
  }))

  await db.SugoRoleApp.bulkCreate(data, {transaction})
}

export default {
  addRole,
  dataAuth,
  funcAuth,
  appsAuth,
  findAll
}
