import { getProjectById } from '../../services/sugo-project.service'
import _ from 'lodash'
const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-tag-hql.controller',
  class: '用户画像',
  group: '标签数据管理',
  menusCate: ['智能运营', '数据运营工具', '用户画像', '标签数据管理']
}

const historyLib = 'controllers/sugo-tag-hql-import-file.controller'

const routes = [
  {
    method: 'get',
    path: '/list/:projectId',
    title: '取得标签计算任务列表',
    func: 'query',
    authPermission: 'get:/console/tag-data-manage'
  },
  {
    method: 'get',
    path: '/query/:id',
    title: '取得单个标签计算任务',
    func: 'query',
    authPermission: 'get:/console/tag-data-manage'
  },
  {
    method: 'post',
    path: '/create',
    title: '创建标签计算任务',
    func: 'create',
    requirePermission: true
  },
  {
    method: 'put',
    path: '/update/:id',
    title: '更新标签计算任务',
    func: 'update',
    requirePermission: true
  },
  {
    method: 'delete',
    path: '/remove/:id',
    title: '删除标签计算任务',
    func: 'remove',
    requirePermission: true
  },
  {
    method: 'get',
    path: '/run/:id',
    title: '启动/停止标签计算任务',
    func: 'run',
    requirePermission: true
  },
  {
    method: 'get',
    path: '/manual-run/:id',
    title: '手动执行标签计算任务',
    func: 'manualRun',
    requirePermission: true
  },
  {
    method: 'post',
    path: '/data-import/:id',
    title: '标签数据导入',
    func: 'dataImport',
    requirePermission: true,
    logExplain: importHistoryExplain,
    logExtractor,
    logKeywordExtractor: 'body.fileInfo.file_name'
  },
  {
    method: 'get',
    path: '/cancel-manual-run/:id',
    title: '取消手动执行标签计算任务',
    func: 'cancelManualRun',
    requirePermission: true
  },
  {
    method: 'get',
    path: '/import-history/:id',
    title: '获取数据导入历史',
    func: 'getList',
    lib: historyLib,
    requirePermission: true
  },
  {
    method: 'get',
    path: '/delete-history/:id',
    title: '删除导入的文件',
    func: 'del',
    lib: historyLib,
    requirePermission: true
  },
  {
    method: 'get',
    path: '/clear-config/get',
    title: '获取清理周期配置',
    func: 'getConfig',
    lib: historyLib,
    requirePermission: true
  },
  {
    method: 'post',
    path: '/clear-config/set',
    title: '设置清理周期配置',
    func: 'setConfig',
    lib: historyLib,
    requirePermission: true
  }
]

async function importHistoryExplain(log) {
  let { fileInfo } = log.body || {}
  const { file_name, file_path, file_memo, file_size, line_count, column_count, project_id } = fileInfo
  const projs = await getProjectById(project_id)
  return [
    `${log.username} 为项目 ${_.get(projs, 'name', '未知')} 导入了数据 ${file_name}`,
    '属性值为：',
    `文件路径：${file_path}`,
    `文件大小： ${file_size}`,
    `文件行数： ${line_count}`,
    `文件列数： ${column_count}`,
    `描述： ${file_memo}`
  ].join('\n')
}

function logExtractor(params) {
  return _.omit(params, 'data')
}

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/tag-hql'
}
