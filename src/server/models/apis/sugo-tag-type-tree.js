import { getProjectsByDataSourceIds } from '../../services/sugo-project.service'
import _ from 'lodash'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-tag-type-tree.controller',
  class: '用户画像',
  group: '标签体系管理',
  menusCate: ['智能运营', '数据运营工具', '用户画像', '标签体系管理']
}

async function explainCreateOrUpdateLog(log) {
  const projs = await getProjectsByDataSourceIds([log.body.datasource_id])
  return `${log.username} 为项目 ${_.get(projs, '[0].name', '未知')} ${_.includes(log.path, 'update') ? '修改' : '创建'}了的标签类型 ${log.body.name}，描述为 ${
    log.body.remark || '（空）'
  }`
}

async function explainDeleteLog(log) {
  const projs = await getProjectsByDataSourceIds([log.body.datasource_id])
  return `${log.username} 为项目 ${_.get(projs, '[0].name', '未知')} 删除的标签类型 ${log.body.name}`
}

const routes = [
  {
    method: 'get',
    path: '/list/:datasourceId',
    title: '取得标签分类名称列表',
    func: 'query'
  },
  {
    method: 'post',
    path: '/create',
    title: '创建标签分类',
    func: 'create',
    requirePermission: true,
    logExplain: explainCreateOrUpdateLog,
    logKeywordExtractor: 'body.name'
  },
  {
    method: 'put',
    path: '/update/:id',
    title: '更新标签分类',
    func: 'update',
    requirePermission: true,
    logExplain: explainCreateOrUpdateLog,
    logKeywordExtractor: 'body.name'
  },
  {
    method: 'delete',
    path: '/remove/:id',
    title: '删除标签分类',
    func: 'remove',
    requirePermission: true,
    logExplain: explainDeleteLog,
    logKeywordExtractor: 'body.name'
  },
  {
    method: 'post',
    path: '/save-order/:id',
    title: '标签分类顺序设置',
    func: 'saveOrder',
    requirePermission: true
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/tag-type-tree'
}
