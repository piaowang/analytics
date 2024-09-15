import db, { quoteIdentifiers } from '../models'
import _ from 'lodash'
import conf from '../config'
import { permissions, commonPermissions } from '../models/apis'
import { returnError, returnResult } from '../utils/helper'
import roleService from '../services/role.service'
import { getDataSourcesByIds } from '../services/sugo-datasource.service'
import { getDimensionsByIds } from '../services/sugo-dimensions.service'
import { getMeasuresByIds } from '../services/sugo-meaures.service'
import InstitutionsRoleService from '../services/institutionsRole.service'
import { generate } from 'shortid'

//获取角色
const getRoles = async (ctx) => {
  let { user } = ctx.session
  let { company_id } = user
  let { query = {}, noRoute = false } = ctx.q || {}
  if (!query.order) query.order = [['updated_at', 'DESC']]

  if (!noRoute) {
    query.include = [
      {
        model: db.SugoRoleRoute
      }
      // {
      //   model: db.SugoRoleApp
      // }
    ]
    query.attributes = {
      include: [
        [
          db.client.literal(
            `(select count(*) from sugo_user_role where role_id=${quoteIdentifiers(
              'SugoRole.id'
            )})`
          ),
          'user_count'
        ]
      ]
    }
  }
  let insList = await db.SugoInstitutionsRole.findAll({ raw: true })
  insList = _.groupBy(insList, (p) => p.role_id)
  // 获取角色对应的app列表（改为
  let appList = await db.SugoRoleApp.findAll({ raw: true })
  appList = _.groupBy(appList, (p) => p.role_id)

  query.where = query.where || {}
  query.where.company_id = company_id
  let rows = await db.SugoRole.findAll(query)
  const result = rows.map((r) => {
    const role = r.get({ plain: true })
    const roleId = role.id
    const insRoles = _.get(insList, roleId, [])
    const appRoles = _.get(appList, roleId, [])
    return {
      ...role,
      institutions_id: insRoles.map((r) => r.institutions_id),
      permissions: r.SugoRoleRoutes.map((sr) => sr.route_id),
      appIds: appRoles.map((r) => r.app_id)
    }
  })
  returnResult(ctx, result)
}
//权限列表
const getPermissions = (ctx) => {
  ctx.body = {
    result: permissions,
    code: 0
  }
}

//新增角色
const addRole = async (ctx) => {
  let { role = {} } = ctx.q
  let { user } = ctx.session
  let { company_id, id } = user
  let { name, dataPermissions, funcPermissions, apps_id } = role
  if (!name) {
    return returnError(ctx, '角色名称不能为空')
  }
  //await checkLimit(ctx, 'role')

  let permissionList = funcPermissions.concat(
    commonPermissions.map((p) => p.id)
  )
  permissionList = _.uniq(permissionList)

  //创建
  role.created_by_fk = id
  role.changed_by_fk = id
  role.company_id = company_id
  role.id = generate()
  role.type = 'user-created'
  let where = {
    company_id,
    name
  }

  const institutions = role.institutions_id.map((p) => ({
    role_id: role.id,
    institutions_id: p
  }))

  let res = await db.client.transaction(async (transaction) => {
    //万宁角色视图权限
    if (conf.site?.enableReportView) {
      await db.SugoRoleReport.create(
        {
          roleId: role.id,
          reportId: role.reportList,
          defaultReportId: role.defaultReportId || ''
        },
        { transaction }
      )
    }
    const data = await roleService.addRole({
      where,
      role,
      permissionList,
      dataPermissions,
      company_id,
      apps_id,
      transaction
    })
    await InstitutionsRoleService.getInstance().__bulkCreate(
      institutions,
      transaction
    )
    return data
  })
  return returnResult(ctx, res)
}

//更新角色
const editRole = async (ctx) => {
  let { id, update } = ctx.q
  let { user } = ctx.session
  let { company_id, id: userId } = user
  if (!id) {
    return returnError(ctx, 'id不能为空')
  }

  let query1 = {
    where: {
      id,
      company_id
    }
  }

  const institutions = _.get(update, 'institutions_id', []).map((p) => ({
    role_id: id,
    institutions_id: p
  }))

  //创建
  let role = _.pick(update, ['name', 'description', 'status', 'suggestion'])
  role.changed_by_fk = userId
  let inDb = await db.SugoRole.findOne(query1)
  //判断是否重复
  if (!inDb) {
    return returnError(ctx, '找不到角色', 404)
  } else if (inDb.type === 'built-in') {
    return returnError(ctx, '不允许编辑这个角色', 404)
  }

  //检测名称重复
  let { name } = update
  if (name) {
    let dup = await db.SugoRole.findOne({
      where: {
        company_id,
        id: {
          $ne: id
        },
        name
      }
    })
    if (dup) {
      return returnError(ctx, '角色名称重复了，换一个吧')
    }
  }

  let res = await db.client.transaction(async (transaction) => {
    //万宁角色视图权限
    if (conf.site?.enableReportView) {
      await db.SugoRoleReport.update(
        {
          reportId: update.reportList,
          defaultReportId: update.defaultReportId
        },
        {
          where: {
            roleId: id
          },
          transaction
        }
      )
    }

    await InstitutionsRoleService.getInstance().remove(
      { role_id: id },
      { transaction }
    )
    await InstitutionsRoleService.getInstance().__bulkCreate(
      institutions,
      transaction
    )
    //更新角色
    await db.SugoRole.update(role, {
      where: {
        id,
        company_id
      },
      transaction
    })

    await roleService.appsAuth({
      apps_id: update.apps_id || [],
      roleId: id,
      transaction
    })

    //更新功能权限
    let { dataPermissions, funcPermissions } = update
    if (funcPermissions) {
      let permissionList = funcPermissions.concat(
        commonPermissions.map((p) => p.id)
      )
      permissionList = _.uniq(permissionList)
      await roleService.funcAuth({
        roleId: id,
        transaction,
        permissionList
      })
    }

    //更新数据权限
    if (dataPermissions) {
      await roleService.dataAuth({
        ...dataPermissions,
        company_id,
        roleId: id,
        transaction
      })
    }

    return 'ok'
  })

  returnResult(ctx, res)
}

//删除角色
const deleteRole = async (ctx) => {
  let { id } = ctx.q
  let { user } = ctx.session
  let { company_id } = user

  if (!id) {
    return returnError(ctx, 'id不能为空')
  }

  await roleService.appsAuth({
    apps_id: [],
    roleId: id
  })

  let query1 = {
    where: {
      id,
      company_id
    }
  }

  let inDb = await db.SugoRole.findOne(query1)

  //判断是否重复
  if (!inDb) {
    return returnError(ctx, '找不到角色', 404)
  } else if (inDb.type === 'built-in') {
    return returnError(ctx, '不允许删除这个角色')
  }

  //查找关联用户
  let count = await db.SugoUserRole.count({
    where: {
      role_id: id
    }
  })

  if (count) {
    return returnError(
      ctx,
      `不允许删除这个角色, 因为还有${count}个用户属于这个角色`
    )
  }

  let isShareDashBoard = await db.SugoRoleDashboard.findAll({
    where: {
      role_id: id
    },
    raw: true
  })
  if (!_.isEmpty(isShareDashBoard)) {
    await db.SugoRoleDashboard.destroy({
      where: {
        role_id: id
      }
    })
  }

  let query2 = {
    where: {
      role_id: id
    }
  }
  let res
  await db.client.transaction(async (t) => {
    //万宁角色视图权限
    if (conf.site?.enableReportView) {
      await db.SugoRoleReport.destroy({
        where: {
          roleId: id
        },
        transaction: t
      })
    }
    let target = {
      transaction: t
    }
    await db.SugoRoleSlice.destroy(query2, target)
    await db.SugoRoleRoute.destroy(query2, target)
    res = await db.SugoRole.destroy(query1, target)
  })

  returnResult(ctx, res)
}

export async function addRoleLogExplain(log, { apiIdDict }) {
  let { datasourceIds, dimensionIds, measureIds } =
    log.body.role.dataPermissions || {}
  let dataSources = _.isEmpty(datasourceIds)
    ? []
    : await getDataSourcesByIds(datasourceIds)
  let dbDims = _.isEmpty(dimensionIds)
    ? []
    : await getDimensionsByIds(dimensionIds)
  let dbMeasures = _.isEmpty(measureIds)
    ? []
    : await getMeasuresByIds(measureIds)
  let dimGroup = _.groupBy(dbDims, 'parentId')
  let measureGroup = _.groupBy(dbMeasures, 'parentId')
  return [
    `${log.username} 创建了角色 ${log.body.role.name}，其功能权限为：`,
    _(log.body.role.funcPermissions)
      .map((path) => apiIdDict[path])
      .groupBy((api) => (api ? api.class + '-' + api.group : 'missing'))
      .omitBy((v, k) => k === 'missing')
      .mapValues((apis) => apis.map((a) => a.title).join('，'))
      .thru((groupDict) =>
        _.keys(groupDict)
          .map((g) => g + '：' + groupDict[g])
          .join('\n')
      )
      .value(),
    `其数据权限为： ${_.isEmpty(dataSources) ? '（无权限）' : ''}`,
    ..._.flatMap(dataSources, (dbDs) => {
      let dbDims = dimGroup[dbDs.id],
        dbMeasures = measureGroup[dbDs.id]
      return [
        `授权访问数据源 ${dbDs.title || dbDs.name}，以及其维度 ${_.size(
          dbDims
        )} 个，指标 ${_.size(dbMeasures)} 个`,
        `维度分别是：${dbDims.map((d) => d.title || d.name).join('，')}`,
        `指标分别是：${dbMeasures.map((m) => m.title || m.name).join('，')}`
      ]
    })
  ].join('\n')
}

export async function editRoleLogExplain(log, { apiIdDict }) {
  let { datasourceIds, dimensionIds, measureIds } =
    log.body.update.dataPermissions || {}
  let dataSources = _.isEmpty(datasourceIds)
    ? []
    : await getDataSourcesByIds(datasourceIds)
  let dbDims = _.isEmpty(dimensionIds)
    ? []
    : await getDimensionsByIds(dimensionIds)
  let dbMeasures = _.isEmpty(measureIds)
    ? []
    : await getMeasuresByIds(measureIds)
  let dimGroup = _.groupBy(dbDims, 'parentId')
  let measureGroup = _.groupBy(dbMeasures, 'parentId')
  return [
    `${log.username} 将角色 ${log.body.update.name} 的功能权限修改为：`,
    !log.body.update.funcPermissions
      ? '（无变更）'
      : _(log.body.update.funcPermissions)
        .map((path) => apiIdDict[path])
        .groupBy((api) => (api ? api.class + '-' + api.group : 'missing'))
        .omitBy((v, k) => k === 'missing')
        .mapValues((apis) => apis.map((a) => _.get(a, 'title')).join('，'))
        .thru((groupDict) =>
          _.keys(groupDict)
            .map((g) => g + '：' + groupDict[g])
            .join('\n')
        )
        .value(),
    `数据权限修改为： ${_.isEmpty(dataSources) ? '（无变更）' : ''}`,
    ..._.flatMap(dataSources, (dbDs) => {
      let dbDims = dimGroup[dbDs.id],
        dbMeasures = measureGroup[dbDs.id]
      return [
        `授权访问数据源 ${dbDs.title || dbDs.name}，以及其维度 ${_.size(
          dbDims
        )} 个，指标 ${_.size(dbMeasures)} 个`,
        `维度分别是：${dbDims.map((d) => d.title || d.name).join('，')}`,
        `指标分别是：${dbMeasures.map((m) => m.title || m.name).join('，')}`
      ]
    })
  ].join('\n')
}

export default {
  getRoles,
  deleteRole,
  addRole,
  editRole,
  getPermissions
}
