import _ from 'lodash'
import conf from '../../config'
import { getProjectsByDataSourceIds } from '../../services/sugo-project.service'
import { getSlicesByIds } from '../../services/slices.service'

export const OverviewInDashboard = !_.some(conf.site.menus, mg => _.some(mg.children, subM => subM.path === '/console/overview'))

const ctrl = 'controllers/overview.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  class: '图表',
  menusCate: ['智能运营', '数据可视化', '数据看板'],
  ...(OverviewInDashboard
    ? {
        group: '数据看板'
      }
    : {
        group: '概览'
      })
}

async function explainOverviewLayoutChange(log) {
  let dsId = _.last(log.path.split('/'))
  const projs = await getProjectsByDataSourceIds([dsId])
  let layout = _.get(log, 'body.layout') || _.get(log, 'body.layouts')
  let slices = await getSlicesByIds(layout.map(l => l.i))
  let sliceIdDict = _.keyBy(slices, 'id')
  return [
    `${log.username} 为项目 ${_.get(projs, '[0].name', '未知')} 调整了概览布局`,
    '单图位置分别是：',
    ...layout.map(l => `${_.get(sliceIdDict[l.i], 'slice_name') || l.i} x: ${l.x} y: ${l.y} 长: ${l.w} 宽: ${l.h}`)
  ].join('\n')
}

const routes = [
  {
    path: '/get',
    title: '概览列表',
    method: 'get',
    func: 'getAll'
  },
  {
    path: '/delete',
    title: '删除概览',
    method: 'post',
    func: 'del',
    requirePermission: true
  },
  {
    path: '/create',
    title: '添加概览',
    method: 'post',
    func: 'add',
    requirePermission: true
  },
  {
    path: '/update-layout/:datasource_id',
    title: '修改概览布局',
    method: 'post',
    func: 'updateLayout',
    requirePermission: false,
    logExplain: explainOverviewLayoutChange
  },
  {
    path: '/get-layout/:datasource_id',
    title: '获取概览布局',
    method: 'get',
    func: 'getLayout',
    requirePermission: false
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/overview'
}
