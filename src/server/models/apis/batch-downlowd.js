import { getProjectsByDataSourceIds } from '../../services/sugo-project.service'
import _ from 'lodash'
import { getDimensionsByNames } from '../../services/sugo-dimensions.service'
import { recurMapFilters } from '../../../common/druid-query-utils'
const ctrl = 'controllers/batch-download.controller'

const base = {
  requireLogin: true,
  requirePermission: true,
  lib: ctrl,
  class: '多维分析',
  group: '多维分析',
  menusCate: ['智能运营', '数据可视化', '多维分析']
}

const routes = [
  {
    path: '/batch',
    title: '批量下载',
    method: 'get',
    func: 'batchDownload',
    logExplain: downloadLogExplain,
    alwaysLogging: true
  },
  {
    path: '/batchtags',
    title: '批量下载用户标签数据',
    method: 'get',
    func: 'batchDownloadTags',
    class: '用户画像',
    group: '微观画像',
    menusCate: ['智能运营', '数据运营工具', '用户画像', '微观画像'],
    logExplain: downloadLogExplain,
    alwaysLogging: true
  }
]

async function downloadLogExplain(log) {
  const projs = await getProjectsByDataSourceIds([log.body.druid_datasource_id])
  let { filters, select } = log.body.params || {}
  let filterDims = recurMapFilters(filters, flt => flt.col)
  let dbDims = await getDimensionsByNames(log.body.druid_datasource_id, _.uniq([...select, ...filterDims]))
  let dimNameDict = _.keyBy(dbDims, 'name')
  return [
    `${log.username} 导出了项目 ${_.get(projs, '[0].name', '未知')} 数据`,
    '筛选条件是: ',
    _.isEmpty(filters)
      ? '(空)'
      : filters
          .map(flt => {
            return `${_.get(dimNameDict, [flt.col, 'title']) || flt.col} 包含 ${JSON.stringify(flt.pretty)}`
          })
          .join(', '),
    `导出字段： ${_.isEmpty(select) ? '(空)' : select.map(dimName => _.get(dimNameDict, [dimName, 'title']) || dimName)}`
  ].join('\n')
}

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/download'
}
