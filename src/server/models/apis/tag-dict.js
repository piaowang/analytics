import _ from 'lodash'
import { getProjectsByDataSourceIds } from '../../services/sugo-project.service'
import { getTagTypesByIds } from '../../services/sugo-tag-type-tree.service'
import { getRolesByIds } from '../../services/role.service'
import { DruidColumnTypeInverted } from '../../../common/druid-column-type'
import { untypedItem } from '../../../common/constants'

/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2018/03/07
 * @description tag-dict
 */

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/tag-dict.controller',
  class: '用户画像',
  group: '标签体系管理',
  menusCate: ['智能运营', '数据运营工具', '用户画像', '标签体系管理']
}

async function createTagDimLogExplain(log) {
  let dsId = _.last(log.path.split('/'))
  let { name, title, type, datasource_type, tag_type_id, tag_extra, params, tag_value, tag_desc, role_ids } = log.body || {}
  let { chartType } = params || {}
  let { is_Desensitiz, is_base_prop, is_base_tag, data_from, cleaning_rule, life_cycle } = tag_extra || {}
  const projs = await getProjectsByDataSourceIds([dsId])
  let tagTypes = await getTagTypesByIds([tag_type_id])
  let roles = await getRolesByIds(role_ids)
  let roldIdDict = _.keyBy(roles, 'id')
  return [
    `${log.username} 为项目 ${_.get(projs, '[0].name', '未知')} 创建了标签 ${name}${(title && `（${title}）`) || ''}`,
    '属性值为：',
    `标签类型： ${DruidColumnTypeInverted[type]}`,
    `标签分类： ${tag_type_id && tag_type_id !== untypedItem.id ? _.get(tagTypes, [0, 'name']) : untypedItem.title}`,
    `基础标签： ${+is_base_tag ? '是' : '否'}`,
    `是否脱敏： ${+is_Desensitiz ? '是' : '否'}`,
    '是否启用： 是',
    `用户基础属性： ${+is_base_prop ? '是' : '否'}`,
    `子标签定义： ${tag_value ? tag_value.replace(/\r?\n/g, '; ') : '（无变更）'}`,
    `定义口径： ${tag_desc ? tag_desc.replace(/\r?\n/g, '; ') : '（无内容）'}`,
    `数据来源： ${data_from || '（无内容）'}`,
    `清洗规则： ${cleaning_rule || '（无内容）'}`,
    `生命周期： ${_.isEmpty(life_cycle) ? '长期有效' : `时间段内：${life_cycle + ''}`}`,
    `展示图表类型： ${chartType === 'pie' ? '饼图' : '柱状图'}`,
    `授权访问： ${(role_ids || []).map(rId => _.get(roldIdDict[rId], 'name'))}`
  ].join('\n')
}

async function editTagDimLogExplain(log) {
  let { name, title, type, datasource_type, datasourceId, tag_type_id, tag_extra, params, tag_value, tag_desc, role_ids } = log.body || {}
  let { chartType, isUsingTag } = params || {}
  let { is_Desensitiz, is_base_prop, is_base_tag, data_from, cleaning_rule, life_cycle } = tag_extra || {}
  const projs = await getProjectsByDataSourceIds([datasourceId])
  let tagTypes = await getTagTypesByIds([tag_type_id])
  let roles = await getRolesByIds(role_ids)
  let roldIdDict = _.keyBy(roles, 'id')
  return [
    `${log.username} 为项目 ${_.get(projs, '[0].name', '未知')} 编辑了标签 ${name}${(title && `（${title}）`) || ''}`,
    '属性值为：',
    `标签类型： ${DruidColumnTypeInverted[type]}`,
    `标签分类： ${tag_type_id && tag_type_id !== untypedItem.id ? _.get(tagTypes, [0, 'name']) : untypedItem.title}`,
    `基础标签： ${+is_base_tag ? '是' : '否'}`,
    `是否脱敏： ${+is_Desensitiz ? '是' : '否'}`,
    `是否启用： ${isUsingTag === false ? '否' : '是'}`,
    `用户基础属性： ${+is_base_prop ? '是' : '否'}`,
    `子标签定义： ${tag_value ? tag_value.replace(/\r?\n/g, '; ') : '（无变更）'}`,
    `定义口径： ${tag_desc ? tag_desc.replace(/\r?\n/g, '; ') : '（无内容）'}`,
    `数据来源： ${data_from || '（无内容）'}`,
    `清洗规则： ${cleaning_rule || '（无内容）'}`,
    `生命周期： ${_.isEmpty(life_cycle) ? '长期有效' : `时间段内：${life_cycle + ''}`}`,
    `展示图表类型： ${chartType === 'pie' ? '饼图' : '柱状图'}`,
    `授权访问： ${_.uniq(role_ids || []).map(rId => _.get(roldIdDict[rId], 'name'))}`
  ].join('\n')
}

async function deleteTagDimLogExplain(log) {
  let { names, parentId } = log.body || {}
  const projs = await getProjectsByDataSourceIds([parentId])
  return `${log.username} 为项目 ${_.get(projs, '[0].name', '未知')} 删除了标签 ${names.join(', ')}`
}

const createOrUpdateLogKeywordExtractor = log => {
  let { name, title } = log.body
  return title || name
}

const deleteLogKeywordExtractor = log => {
  let { names, titles } = log.body
  return _.isEmpty(_.compact(titles)) ? (names || []).join(', ') : (titles || []).join(', ')
}

const routes = [
  {
    path: '/find-all-valid',
    title: '查找所有有效的标签记录',
    func: 'findAllValid',
    method: 'post'
  },
  {
    path: '/find-all-valid-by-name',
    title: '查询标签名所有有效记录',
    func: 'findAllValidByName',
    method: 'post'
  },
  {
    path: '/create/:id',
    title: '创建标签',
    method: 'post',
    func: 'addDimension',
    lib: 'controllers/sugo-dimensions.controller',
    requirePermission: true,
    logExplain: createTagDimLogExplain,
    logKeywordExtractor: createOrUpdateLogKeywordExtractor
  },
  {
    path: '/update/:id',
    title: '更新标签',
    method: 'put',
    func: 'editDimension',
    lib: 'controllers/sugo-dimensions.controller',
    requirePermission: true,
    logExplain: editTagDimLogExplain,
    logKeywordExtractor: createOrUpdateLogKeywordExtractor
  },
  {
    path: '/delete',
    title: '删除标签',
    method: 'post',
    func: 'deleteDimension',
    lib: 'controllers/sugo-dimensions.controller',
    requirePermission: true,
    logExplain: deleteTagDimLogExplain,
    logKeywordExtractor: deleteLogKeywordExtractor
  },
  {
    path: '/authorize/:id',
    title: '标签授权',
    method: 'put',
    func: 'editDimension',
    lib: 'controllers/sugo-dimensions.controller',
    requirePermission: true
  },
  {
    path: '/sync/:id',
    title: '同步标签',
    method: 'post',
    func: 'sync',
    lib: 'controllers/sugo-dimensions.controller',
    requirePermission: true
  },
  {
    path: '/get-tag-info',
    title: '获取uindex维度的标签信息',
    method: 'get',
    func: 'getDimensionTagInfo',
    lib: 'controllers/sugo-dimensions.controller',
    requirePermission: false
  },
  {
    path: '/use-tag/:id',
    title: '启用停用标签',
    method: 'put',
    func: 'editDimension',
    lib: 'controllers/sugo-dimensions.controller',
    newRoleDefaultPermission: true,
    requirePermission: true,
    logExplain: editTagDimLogExplain,
    logKeywordExtractor: createOrUpdateLogKeywordExtractor
  },
  {
    // 只是为了前端权限控制而创建的路由，并不会实际调用
    path: '/order-management',
    title: '标签排序与隐藏',
    method: 'post',
    func: 'getDimensions',
    lib: 'controllers/sugo-dimensions.controller',
    requirePermission: true
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/tag-dict'
}
