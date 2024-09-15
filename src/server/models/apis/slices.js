import { getProjectsByDataSourceIds } from '../../services/sugo-project.service'
import _ from 'lodash'
import { getDimensionsByNames } from '../../services/sugo-dimensions.service'
import { getMeasuresByNames } from '../../services/sugo-meaures.service'
import { recurMapFilters } from '../../../common/druid-query-utils'

const ctrl = 'controllers/slices.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  class: '多维分析',
  group: '单图'
}

async function createOrModSliceLogExplain(log) {
  const projs = await getProjectsByDataSourceIds([log.body.druid_datasource_id])
  let { filters, metrics, dimensions } = log.body.params || {}
  let filterDims = recurMapFilters(filters, flt => flt.col)
  let dbDims = await getDimensionsByNames(log.body.druid_datasource_id, _.uniq([...dimensions, ...filterDims]))
  let dbMeasures = await getMeasuresByNames(log.body.druid_datasource_id, metrics)
  let dimNameDict = _.keyBy(dbDims, 'name'),
    measureNameDict = _.keyBy(dbMeasures, 'name')
  return [
    `${log.username} 为项目 ${_.get(projs, '[0].name', '未知')} ${_.includes(log.path, 'update') ? '更改' : '创建'}了的单图 ${log.body.slice_name}，`,
    '单图筛选条件是: ',
    _.isEmpty(filters)
      ? '(空)'
      : filters
          .map(flt => {
            return `${_.get(dimNameDict, [flt.col, 'title']) || flt.col} ${flt.op} ${JSON.stringify(flt.eq)}`
          })
          .join(', '),
    `单图分组是： ${_.isEmpty(dimensions) ? '(空)' : dimensions.map(dimName => _.get(dimNameDict, [dimName, 'title']) || dimName)}`,
    `单图的指标是： ${metrics.map(metricName => _.get(measureNameDict, [metricName, 'title']) || metricName)}`
  ].join('\n')
}

async function deleteSliceLogExplain(log) {
  const projs = await getProjectsByDataSourceIds([log.body.druid_datasource_id])
  return `${log.username} 为项目 ${_.get(projs, '[0].name', '未知')} 删除了的单图 ${log.body.sliceNames.join('，')}`
}

function deleteSliceLogKeywordExtractor(log) {
  return log.body.sliceNames.join('，')
}

const routes = [
  {
    path: '/get/slices',
    title: '获取单图列表',
    method: 'get',
    func: 'querySlices'
  },
  {
    path: '/get/slices/:id',
    title: '获取单图详情',
    method: 'get',
    func: 'querySliceConfig'
  },
  {
    path: '/create/slices',
    title: '创建单图',
    method: 'post',
    func: 'createSlice',
    requirePermission: true,
    newRoleDefaultPermission: true,
    logExplain: createOrModSliceLogExplain,
    logKeywordExtractor: 'body.slice_name',
    menusCate: ['智能运营', '数据可视化', '单图']
  },
  {
    path: '/update/slices-tag',
    title: '更新分组信息',
    method: 'post',
    func: 'updataSliceTag',
    requirePermission: true,
    newRoleDefaultPermission: true,
    menusCate: ['智能运营', '数据可视化', '单图']
  },
  {
    path: '/update/slices',
    title: '更新单图',
    method: 'post',
    func: 'createSlice',
    requirePermission: true,
    newRoleDefaultPermission: true,
    logExplain: createOrModSliceLogExplain,
    logKeywordExtractor: 'body.slice_name',
    menusCate: ['智能运营', '数据可视化', '单图']
  },
  {
    path: '/delete/slices',
    title: '删除单图',
    method: 'post',
    func: 'deleteSlices',
    requirePermission: true,
    newRoleDefaultPermission: true,
    logExplain: deleteSliceLogExplain,
    logKeywordExtractor: deleteSliceLogKeywordExtractor,
    menusCate: ['智能运营', '数据可视化', '单图']
  },
  {
    path: '/share',
    title: '分享单图',
    method: 'post',
    func: 'shareSlice',
    requirePermission: true,
    newRoleDefaultPermission: true,
    menusCate: ['智能运营', '数据可视化', '单图']
  },
  {
    path: '/get/druidDistinct/:dataSourceName/:columnName',
    title: '查询单图数据TOPN',
    method: 'get',
    func: 'queryDruidDistinct'
  },
  {
    path: '/query-druid',
    title: '查询单图数据',
    method: 'get',
    func: 'queryDruidData'
  },
  {
    path: '/query-druid',
    title: '查询单图数据',
    method: 'post',
    func: 'queryDruidData'
  },
  {
    path: '/query-external',
    title: '查询单图数据',
    method: 'get',
    func: 'queryExternalDataSource'
  },
  {
    path: '/query-external',
    title: '查询单图数据',
    method: 'post',
    func: 'queryExternalDataSource'
  },
  {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    path: '/userAction',
    title: '创建事件分析',
    method: 'post',
    func: 'createSlice',
    requirePermission: true,
    class: '用户运营',
    group: '事件分析',
    menusCate: ['智能运营', '数据运营工具', '行为分析', '事件分析']
  },
  {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    path: '/userAction/:id',
    title: '更新事件分析',
    method: 'put',
    func: 'createSlice',
    requirePermission: true,
    class: '用户运营',
    group: '事件分析',
    menusCate: ['智能运营', '数据运营工具', '行为分析', '事件分析']
  },
  {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    path: '/userAction/:id',
    title: '删除事件分析',
    method: 'delete',
    func: 'deleteSlices',
    requirePermission: true,
    class: '用户运营',
    group: '事件分析',
    menusCate: ['智能运营', '数据运营工具', '行为分析', '事件分析']
  },
  {
    path: '/copyDashboards',
    title: '复制看板到新项目',
    func: 'copyDashboards',
    method: 'post',
    requirePermission: false,
    menusCate: ['智能运营', '数据可视化', '单图']
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/slices'
}
