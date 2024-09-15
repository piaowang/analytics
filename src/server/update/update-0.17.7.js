import { log } from '../utils/log'
import _ from 'lodash'

export async function modPermission(from, to, db, transaction) {
  if (!to) {
    return await db.SugoRoleRoute.destroy({
      where: {
        route_id: from
      },
      transaction
    })
  }
  return await db.SugoRoleRoute.update({
    route_id: to
  }, {
    where: {
      route_id: from
    },
    transaction
  })
}

/**
 * 为已有 from 权限的角色，创建多个新权限
 * @param from
 * @param tos
 * @param db
 * @param transaction
 * @returns {Promise.<*>}
 */
export async function createByPermission(from, tos, db, transaction) {
  let fromPermissions = await db.SugoRoleRoute.findAll({
    where: {
      route_id: from
    },
    transaction,
    raw: true
  })

  if (_.isString(tos)) {
    tos = _.compact([tos])
  }
  if (!_.isEmpty(fromPermissions) && !_.isEmpty(tos)) {
    let toCreate = _(fromPermissions).flatMap(listPerm => {
      let {role_id, sugo_role_id} = listPerm

      return tos.map(to => ({ role_id, sugo_role_id, route_id: to }))
    }).value()
    return await db.SugoRoleRoute.bulkCreate(toCreate, {transaction})
  }
}

/**
 * 为已有 from 权限的角色，创建多个新权限，之后 from 权限会被 tos[0] 覆盖
 * @param from
 * @param tos
 * @param db
 * @param transaction
 * @returns {Promise.<void>}
 */
export async function splitPermission(from, tos, db, transaction) {
  let fromPermissions = await db.SugoRoleRoute.findAll({
    where: {
      route_id: from
    },
    transaction,
    raw: true
  })

  if (_.isString(tos)) {
    tos = [tos]
  }
  let [head, ...rest] = _.compact(tos)
  if (!_.isEmpty(fromPermissions) && !_.isEmpty(rest)) {
    let toCreate = _(fromPermissions).flatMap(listPerm => {
      let {role_id, sugo_role_id} = listPerm

      return rest.map(to => ({ role_id, sugo_role_id, route_id: to }))
    }).value()
    await db.SugoRoleRoute.bulkCreate(toCreate, {transaction})
  }
  if (head) {
    await db.SugoRoleRoute.update({route_id: head}, {where: {route_id: from}, transaction})
  }
}

export default async db => {

  const version = '0.17.7'

  await db.client.transaction(async t => {

    const transaction = { transaction: t }

    // 看版的创建从 get#/console/dashboards/new 改为 post#/app/dashboards/create
    await modPermission('get#/console/dashboards/new', 'post#/app/dashboards/create', db, t)

    // 为有 get#/console/dashboards 权限的角色，加入看版的更新和删除权限
    await createByPermission('get#/console/dashboards', ['post#/app/dashboards/update', 'post#/app/dashboards/delete'], db, t)

    // get#/console/livescreen/:id -> xxx
    await splitPermission('get#/console/livescreen/:id', [
      'post#/app/livescreen/create',
      'post#/app/livescreen/update',
      'delete#/app/livescreen/delete/:livescreenId',
      'post#/app/livescreen/copy/:livescreenId'
    ], db, t)

    // 为有 /console/analytic 权限的角色，增加 查看源数据 和 操作单图 的权限
    await createByPermission('get#/console/analytic', [
      'get#/console/analytic/inspect-source-data',
      'post#/app/slices/create/slices',
      'post#/app/slices/update/slices',
      'post#/app/slices/delete/slices'
    ], db, t)

    // 为有 /console/source-data-analytic 权限的角色，增加 操作书签权限
    await createByPermission('get#/console/source-data-analytic', [
      'post#/app/source-data-analytic-marks/',
      'put#/app/source-data-analytic-marks/:id',
      'delete#/app/source-data-analytic-marks/:id'
    ], db, t)

    // 为有 put#/app/alarm/interfaces/:id 权限的角色，增加 管理通讯录权限
    await createByPermission('put#/app/alarm/interfaces/:id', [
      'put#/app/contact/persons/:personId'
    ], db, t)

    // 为有 get#/console/monitor-alarms 权限的角色，增加 查看告警异常记录，与告警的创建修改删除权限
    await createByPermission('get#/console/monitor-alarms', [
      'get#/console/monitor-alarms/exceptions/:id',
      'post#/app/monitor-alarms/create',
      'put#/app/monitor-alarms/update/:id',
      'delete#/app/monitor-alarms/remove/:id'
    ], db, t)

    // get#/console/usergroup/new -> 新增分群
    await modPermission('get#/console/usergroup/new', 'post#/app/usergroup/create', db, t)

    // 为有 get#/console/usergroup 权限的角色，增加 查看用户列表、重新计算分群、下载用户列表权限
    await createByPermission('get#/console/usergroup', [
      'get#/console/inspect-user/:id',
      'get#/app/usergroup/:id/users/download',
      'get#/app/usergroup/:id/recompute'
    ], db, t)

    // 为有 post#/app/funnel/update 权限的角色，增加 创建漏斗 权限
    await createByPermission('post#/app/funnel/update', [ 'post#/app/funnel/create' ], db, t)

    // 为有 get#/console/user-action-analytics 权限的角色，增加 事件分析 的 创建、修改、删除 权限
    await createByPermission('get#/console/user-action-analytics', [
      'post#/app/slices/userAction/',
      'put#/app/slices/userAction/:id',
      'delete#/app/slices/userAction/:id'
    ], db, t)

    // 为有 get#/console/traffic-analytics 权限的角色，增加 流量分析 的 创建、修改、删除 权限
    await createByPermission('get#/console/traffic-analytics', [
      'post#/app/traffic-analytics/models',
      'put#/app/traffic-analytics/models/:modelId',
      'delete#/app/traffic-analytics/models/:modelId'
    ], db, t)

    // 为有 get#/console/behavior-analytics 权限的角色，增加 行为事件分析 的 创建、修改、删除 权限
    await createByPermission('get#/console/behavior-analytics', [
      'post#/app/behavior-analytics/models',
      'put#/app/behavior-analytics/models/:modelId',
      'delete#/app/behavior-analytics/models/:modelId'
    ], db, t)

    // 去掉无用的权限
    await modPermission('get#/console/loss-predict/:id/model-result', null, db, t)

    // 为有 get#/console/loss-predict 权限的角色，增加 流失预测 的 开始训练、创建、修改、删除 权限
    await createByPermission('get#/console/loss-predict', [
      'get#/console/loss-predict/file-histories',
      'get#/console/loss-predict/:modelId/predictions',
      'get#/console/loss-predict/:modelId/begin-predict',
      'post#/app/loss-predict/models',
      'put#/app/loss-predict/models/:modelId',
      'delete#/app/loss-predict/models/:modelId'
    ], db, t)

    // tag-users 不再受权限控制
    await modPermission('get#/console/tag-users', null, db, t)

    // 为有 get#/console/tag-dict 权限的角色，增加 保存分群，新增、修改、删除 标签分类和组合标签 权限
    await createByPermission('get#/console/tag-dict', [
      'get#/console/tag-users/:id',
      'post#/app/usergroup/create-for-tag-dict',
      'post#/app/tag-group/create',
      'put#/app/tag-group/update',
      'post#/app/tag-group/delete',
      'post#/app/tag-type/create',
      'put#/app/tag-type/update',
      'delete#/app/tag-type/delete'
    ], db, t)

    // 智能分析编辑页权限 变为 新建、更新、从案例创建、新建案例、新建模版 权限
    await splitPermission('get#/console/pio-projects/new', [
      'post#/app/proj/add',
      'post#/app/proj/update',
      'delete#/app/proj/del/:id',
      'post#/app/proj/clone-case',
      'post#/app/proj/add-case',
      'post#/app/proj/add-template'
    ], db, t)

    // 去掉无用的权限
    await modPermission('get#/console/pio-projects/:projectId', null, db, t)

    // 为有 get#/console/project 权限的角色，增加 修改项目名称 权限
    await createByPermission('get#/console/project', [ 'post#/app/project/update-project-name' ], db, t)

    // 为有 get#/console/project/create 权限的角色，增加 创建子项目 权限
    await createByPermission('get#/console/project/create', [ 'post#/app/project/create-child' ], db, t)

    // 为有 get#/console/project/:id 权限的角色，增加 切换项目可见性、数据接入状态、权限授予 权限
    await createByPermission('get#/console/project/:id', [
      'post#/app/project/toggle-visibility/:project_id',
      'post#/app/project/toggle-data-input/:project_id',
      'post#/app/project/permission-grant'
    ], db, t)

    // 为有 get#/console/dimension 权限的角色，增加 同步维度、排序和隐藏、用户画像 权限
    await createByPermission('get#/console/dimension', [
      'post#/app/dimension/sync/:id',
      'post#/app/dimension/order-management',
      'post#/app/dimension/tags-management'
    ], db, t)

    // 为有 get#/console/measure 权限的角色，增加 排序和隐藏、用户画像 权限
    await createByPermission('get#/console/measure', [
      'post#/app/measure/order-management',
      'post#/app/measure/tags-management'
    ], db, t)

    // 为有 get#/console/project/datasource-settings 权限的角色，增加 设置用户类型数据、设置用户行为数据、设置RFM数据 权限
    await createByPermission('get#/console/project/datasource-settings', [
      // 'post#/app/datasource/config-user-type-dims',
      'post#/app/datasource/config-user-action-dims',
      'post#/app/datasource/config-rfm-dims'
    ], db, t)

    // 为有 get#/console/business-db-setting 权限的角色，增加 新增、修改、删除 业务表，已经切换 禁用/启用状态 权限
    await createByPermission('get#/console/business-db-setting', [
      'post#/app/businessdbsetting/create',
      'post#/app/businessdbsetting/update',
      'post#/app/businessdbsetting/delete',
      'post#/app/businessdbsetting/updatestate'
    ], db, t)

    // 编辑用户组详情 拆分为 功能权限和数据权限
    await splitPermission('get#/console/security/role/:roleId', [
      'post#/app/role/data-permission-management',
      'post#/app/role/function-permission-management'
    ], db, t)

    // 移除冗余的权限，仅保留最旧的一个
    let allPerms = await db.SugoRoleRoute.findAll({...transaction, raw: true})
    let predelPermId = _(allPerms)
      .groupBy(p => `${p.role_id}${p.sugo_role_id || ''}${p.route_id}`)
      .mapValues(arr => _.drop(arr, 1)).values().flatten().map(p => p.id).value()

    if (!_.isEmpty(predelPermId)) {
      await db.SugoRoleRoute.destroy({where: {id: {$in: predelPermId}}, ...transaction})
    }

    await db.Meta.create({
      name: 'update-log',
      value: version
    }, transaction)

    await db.Meta.update({
      value: version
    }, {
      where: { name: 'version' },
      ...transaction
    })

    log(`update ${version} done`)
  })
}
