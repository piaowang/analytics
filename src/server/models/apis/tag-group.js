import { getProjectsByDataSourceIds } from '../../services/sugo-project.service'
import _ from 'lodash'
import { getTagTypesByIds } from '../../services/sugo-tag-type-tree.service'
import { untypedItem } from '../../../common/constants'
import { getTagGroupsByIds } from '../../services/tag-group.service'

/**
 * 组合标签接口定义
 */
const ctrl = 'controllers/tag-group.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  class: '用户画像',
  group: '标签体系管理',
  menusCate: ['智能运营', '数据运营工具', '用户画像', '标签体系管理']
}

async function editTagDimLogExplain(log) {
  let { id, update } = log.body || {}
  let { title, type, status, description, params } = update || {}
  let { filters, relation } = params || {}

  let tagGroup = _.get(await getTagGroupsByIds([id]), [0]) || {}
  const projs = await getProjectsByDataSourceIds([tagGroup.datasource_id])
  let tagTypes = type && (await getTagTypesByIds([type]))

  const relationStr = relation === 'and' ? ' 并且 ' : ' 或者 '
  const filtersStr = (filters || []).map(flt => `${flt.dimension.title || flt.dimension.name} in ${flt.children.map(sf => sf.title).join(', ')}`)
  return [
    `${log.username} 为项目 ${_.get(projs, '[0].name', '未知')} 编辑了组合标签 ${title || tagGroup.title}`,
    '属性值为：',
    `标签分类： ${!type ? '（未修改）' : type !== 'not-typed' ? _.get(tagTypes, [0, 'name']) : untypedItem.title}`,
    `标签含义： ${_.isNil(description) ? '（未修改）' : description || '（空）'}`,
    `是否启用： ${_.isNil(status) ? '（未修改）' : status ? '是' : '否'}`,
    `标签组合： ${filters ? filtersStr.join(relationStr) : '（未修改）'}`
  ].join('\n')
}

async function createTagDimLogExplain(log) {
  let { title, type, status, description, datasource_id, params } = log.body || {}
  let { filters, relation } = params || {}

  const projs = await getProjectsByDataSourceIds([datasource_id])
  let tagTypes = type && (await getTagTypesByIds([type]))

  const relationStr = relation === 'and' ? ' 并且 ' : ' 或者 '
  const filtersStr = (filters || []).map(flt => `${flt.dimension.title || flt.dimension.name} in ${flt.children.map(sf => sf.title).join(', ')}`)
  return [
    `${log.username} 为项目 ${_.get(projs, '[0].name', '未知')} 创建了组合标签 ${title}`,
    '属性值为：',
    `标签分类： ${type ? _.get(tagTypes, [0, 'name']) : untypedItem.title}`,
    `标签含义： ${_.isNil(description) ? '（未修改）' : description || '（空）'}`,
    `是否启用： ${_.isNil(status) ? '（未修改）' : status ? '是' : '否'}`,
    `标签组合： ${filters ? filtersStr.join(relationStr) : '（未修改）'}`
  ].join('\n')
}

async function deleteTagDimLogExplain(log) {
  let { titles, datasource_id } = log.body || {}

  const projs = await getProjectsByDataSourceIds([datasource_id])

  return [`${log.username} 为项目 ${_.get(projs, '[0].name', '未知')} 删除了组合标签 ${(titles || []).join(', ')}`].join('\n')
}

const routes = [
  {
    path: '/get',
    title: '查看组合标签',
    method: 'get',
    func: 'get'
  },
  {
    path: '/update',
    title: '更新组合标签',
    method: 'put',
    func: 'update',
    requirePermission: true,
    logExplain: editTagDimLogExplain,
    logKeywordExtractor: 'body.update.title'
  },
  {
    path: '/delete',
    title: '删除组合标签',
    method: 'post',
    func: 'del',
    requirePermission: true,
    logExplain: deleteTagDimLogExplain,
    logKeywordExtractor: log => (_.get(log, 'body.titles') || []).join(', ')
  },
  {
    path: '/create',
    title: '新建组合标签',
    method: 'post',
    func: 'add',
    requirePermission: true,
    logExplain: createTagDimLogExplain,
    logKeywordExtractor: 'body.title'
  },
  {
    path: '/update-status',
    title: '更新组合标签启用停用状态',
    method: 'put',
    func: 'update',
    requirePermission: true,
    logExplain: editTagDimLogExplain,
    logKeywordExtractor: 'body.update.title'
  },
  {
    path: '/authorize/:id',
    title: '组合标签授权',
    method: 'put',
    func: 'update',
    requirePermission: true
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/tag-group'
}
