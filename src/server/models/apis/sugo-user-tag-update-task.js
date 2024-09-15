import { getProjectById } from '../../services/sugo-project.service'
import _ from 'lodash'
import { getDimensionsByNames } from '../../services/sugo-dimensions.service'
import tagTypeTreeServices from '../../services/sugo-tag-type-tree.service'
import segmentServices from '../../services/segment.service'
import tagUpdateTaskServices from '../../services/sugo-user-tag-update-task.service'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-user-tag-update-task.controller',
  class: '用户画像',
  group: '标签数据管理',
  menusCate: ['智能运营', '数据运营工具', '用户画像', '标签数据管理']
}

const routes = [
  {
    method: 'get',
    path: '/',
    title: '查询多个标签更新任务',
    func: 'query',
    // requirePermission: true
    authPermission: 'get:/console/tag-data-manage'
  },
  {
    method: 'post',
    path: '',
    title: '创建标签更新任务',
    func: 'create',
    requirePermission: true,
    logExplain: CreateTagTaskExplain,
    logKeywordExtractor: 'body.title'
  },
  {
    method: 'put',
    path: '/:id',
    title: '修改标签更新任务',
    func: 'update',
    requirePermission: true,
    logExplain: UpdateTagTaskExplain,
    logKeywordExtractor: 'body.title'
  },
  {
    method: 'delete',
    path: '/:id',
    title: '删除标签更新任务',
    func: 'remove',
    requirePermission: true,
    logExplain: deleteTagTaskExplain,
    logExtractor,
    logKeywordExtractor: 'body.title'
  },
  {
    method: 'post',
    path: '/:id/run',
    title: '执行标签更新任务',
    func: 'runTask',
    requirePermission: true
  }
]

function deleteTagTaskExplain(log) {
  return `${log.username} 为项目 ${_.get(log, 'body.project_name', '未知')} 删除了用户群定义标签 ${_.get(log, 'body.title', '未知')}`
}

async function CreateTagTaskExplain(log) {
  return await tagTaskExplain(log, true)
}

async function UpdateTagTaskExplain(log) {
  return await tagTaskExplain(log, false)
}

async function tagTaskExplain(log, isCreate) {
  const { params = {}, title, project_id } = log.body
  const { userGroupId, description, clearCurrentTagOldData, updateStrategy, cronInfo, userTagUpdates = [] } = params
  const { tagName, typeId, targetValue } = _.get(userTagUpdates, '0', [])
  const dimensions = [tagName]
  const projs = (await getProjectById(project_id)) || {}
  let dbDims = (await getDimensionsByNames(projs.datasource_id, dimensions)) || []
  const dbDim = _.get(dbDims, '0')
  let tagType = typeId === 'not-typed' ? { name: '未分类' } : (await tagTypeTreeServices.getInstance().findOne({ id: typeId })) || {}
  let segments = (await segmentServices.get({ where: { id: userGroupId } })) || []
  return [
    `${log.username} 为项目 ${_.get(projs, 'name', '未知')} ${isCreate ? '创建' : '修改'}了用户群定义标签 ${title}`,
    '属性值为：',
    `描述：${description}`,
    '用户群组：标签计算群',
    `用户群： ${_.get(segments, '0.title', '')}`,
    `标签类别： ${tagType.name}`,
    `标签： ${dbDim.title || dbDim.name}`,
    `标签值： ${targetValue}`,
    `清空标签旧数据： ${clearCurrentTagOldData ? '是' : '否'}`,
    `周期： ${updateStrategy === 'manual' ? '手动' : _.get(cronInfo, 'cronExpression', '')}`
  ].join('\n')
}

async function logExtractor(params, ctx) {
  let { path } = ctx
  const id = path.substr(path.lastIndexOf('/') + 1)
  const info = (await tagUpdateTaskServices.getInstance().findOne({ id })) || {}
  const projs = (await getProjectById(info.project_id)) || {}
  return { title: info.title, project_name: projs.name }
}

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/user-tag-update-tasks'
}
