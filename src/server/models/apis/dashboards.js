import _ from 'lodash'
import { getProjectsByDataSourceIds } from '../../services/sugo-project.service'
import { getSlicesByIds } from '../../services/slices.service'
import { getDashboardsByIds } from '../../services/dashboard.service'

const ctrl = 'controllers/dashboards.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  group: '数据看板',
  class: '图表',
  menusCate: ['智能运营', '数据可视化', '数据看板']
}

async function explainCreateDashboard(log) {
  const projs = await getProjectsByDataSourceIds([log.body.dashboard.datasource_id])
  let slices = await getSlicesByIds(log.body.dashboard.position_json.map(l => l.i))
  let sliceIdDict = _.keyBy(slices, 'id')
  return [
    `${log.username} 为项目 ${_.get(projs, '[0].name', '未知')} 创建了看板 ${log.body.dashboard.dashboard_title}`,
    '单图位置分别是：',
    ...log.body.dashboard.position_json.map(l => `${_.get(sliceIdDict[l.i], 'slice_name') || l.i} x: ${l.x} y: ${l.y} 长: ${l.w} 宽: ${l.h}`)
  ].join('\n')
}

async function explainUpdateDashboard(log) {
  let dashboard = _.get(await getDashboardsByIds([log.body.query.where.id]), [0])
  const projs = await getProjectsByDataSourceIds([dashboard.datasource_id])
  let slices = await getSlicesByIds(log.body.update.position_json.map(l => l.i))
  let sliceIdDict = _.keyBy(slices, 'id')
  return [
    `${log.username} 为项目 ${_.get(projs, '[0].name', '未知')} 修改了看板 ${dashboard.dashboard_title}`,
    '单图位置分别是：',
    ...log.body.update.position_json.map(l => `${_.get(sliceIdDict[l.i], 'slice_name') || l.i} x: ${l.x} y: ${l.y} 长: ${l.w} 宽: ${l.h}`)
  ].join('\n')
}

async function explainDeleteDashboard(log) {
  const projs = await getProjectsByDataSourceIds([log.body.query.where.datasource_id])
  return `${log.username} 为项目 ${_.get(projs, '[0].name', '未知')} 删除了看板 ${log.body.query.where.dashboard_title}`
}

const routes = [
  {
    path: '/get/:id',
    title: '查看看板详情',
    method: 'get',
    menusCate: ['智能运营', '数据可视化', '数据看板'],
    func: 'getOne'
  },
  {
    path: '/get',
    title: '查看看板列表',
    method: 'get',
    func: 'getAll'
  },
  {
    path: '/update',
    title: '更新看板',
    method: 'post',
    func: 'update',
    requirePermission: true,
    newRoleDefaultPermission: true,
    logExplain: explainUpdateDashboard,
    logKeywordExtractor: 'body.update.dashboard_title'
  },
  {
    path: '/delete',
    title: '删除看板',
    method: 'post',
    func: 'del',
    requirePermission: true,
    newRoleDefaultPermission: true,
    logExplain: explainDeleteDashboard,
    logKeywordExtractor: 'body.query.where.dashboard_title'
  },
  {
    path: '/create',
    title: '新建看板',
    method: 'post',
    func: 'add',
    requirePermission: true,
    newRoleDefaultPermission: true,
    logExplain: explainCreateDashboard,
    logKeywordExtractor: 'body.dashboard.dashboard_title'
  },
  {
    path: '/share',
    title: '分享看板',
    method: 'post',
    func: 'share',
    common: false,
    requirePermission: true,
    newRoleDefaultPermission: true
  },
  {
    path: '/getAllDashborads',
    title: '查看项目所有看板',
    method: 'get',
    func: 'getAllDashboards'
  },
  {
    path: '/save-copy-as',
    title: '看板另存为',
    method: 'post',
    func: 'saveCopyAs',
    requirePermission: true,
    newRoleDefaultPermission: true
  },
  // 导出excel 权限
  {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    requirePermission: true,
    method: 'put',
    path: '/export-excel',
    title: '导出excel',
    func: 'getAllDashboards'
  },
  // 订阅看板 权限
  {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    requirePermission: true,
    method: 'put',
    path: '/subscribe',
    title: '订阅看板',
    func: 'getAllDashboards'
  },
  // 全局筛选覆盖 权限
  {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    requirePermission: true,
    method: 'put',
    path: '/global-filter',
    title: '全局筛选覆盖',
    func: 'getAllDashboards'
  },
  // 二维码 权限
  {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    requirePermission: true,
    method: 'put',
    path: '/code',
    title: '二维码',
    func: 'getAllDashboards'
  },
  // 单图下载 权限
  {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    requirePermission: true,
    method: 'put',
    path: '/download',
    title: '单图下载',
    func: 'getAllDashboards'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/dashboards'
}
