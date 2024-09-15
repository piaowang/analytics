import SugoTagTypeTreeService from '../services/sugo-tag-type-tree.service'
import {Response} from '../utils/Response'
import { untypedItem } from '../../common/constants'
import TagTypeService from '../services/tag-type.service'
import { AccessDataType } from '../../common/constants'
import projectServices from '../services/sugo-project.service'
import _ from 'lodash'

/**
 * @description 标签类型分类树controller
 * @class SugoTagTypeTreeController
 */
class SugoTagTypeTreeController {
  constructor () {
    this.tagTypeTreeService = new SugoTagTypeTreeService()
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new SugoTagTypeTreeController()
    }
    return this._instance
  }

  query = async ctx => {
    let { datasourceId } = ctx.params

    // 如果传入的是行为项目datasourceId 则根据行为项目的datasourceId 查询标签项目的标签设置
    let project = await projectServices.findByDataSourceId(datasourceId)
    if (project.success && _.get(project, 'result.accessType', '') !== AccessDataType.Tag) {
      const tagProject = await projectServices.findByTagName(_.get(project, 'result.tag_datasource_name', ''))
      if (project.success) {
        datasourceId = _.get(tagProject, 'result.datasource_id', '')
      }
    }

    const { search, id, parentId } = ctx.q
    
    let whereCond = { parent_id: parentId ? parentId : '-1' }
    if (id) {
      const model = await this.tagTypeTreeService.findOne({ id })
      return ctx.body = Response.ok(model)
    }
    if (parentId === 'all') { // 查询所有标签分类
      delete whereCond.parent_id
    }
    // 查询列表时必须带上此参数
    whereCond.datasource_id = datasourceId
    // if (search) {
    //   debug(search, 'tag-type-tree=====search')
    // }
    const models = await this.tagTypeTreeService.findAll({...whereCond}, {
      order: [['order', 'ASC']]
    })
    if (!parentId || parentId === 'all') { // 第一次加载的时候添加默认未分类
      models.push(untypedItem)
    } else {
      // 查询分类下关联的标签维度列表
      const tagTypes = await TagTypeService.getInstance().findAll({
        datasource_id: datasourceId,
        tag_tree_id: parentId
      })
      return ctx.body = Response.ok({trees: models, tagTypes })
    }
    return ctx.body = Response.ok({trees: models})
  }

  create = async ctx => {
    const {user: { id: userId, company_id }} = ctx.session
    let obj = ctx.q
    if (!obj.name) {
      return ctx.body = Response.error(ctx, '操作失败，缺少参数')
    }
    let existed = await this.tagTypeTreeService.findOne({ name: obj.name, datasource_id: obj.datasource_id })
    if (existed) {
      return ctx.body = Response.error(ctx, '你已经添加过同名记录了')
    }
    obj.company_id = company_id
    obj.created_by = userId
    obj.updated_by = userId
    const res = await this.tagTypeTreeService.create(obj)
    return ctx.body = Response.ok(res)
  }

  update = async ctx => {
    const { id } = ctx.params
    let obj = ctx.q
    obj.id = id
    let existed = await this.tagTypeTreeService.findOne({ name: obj.name, datasource_id: obj.datasource_id })
    if (existed && existed.id !== id) {
      return ctx.body = Response.error(ctx, '分类名称重复，请重新输入')
    }
    const res = await this.tagTypeTreeService.update(obj, { id })
    return ctx.body = Response.ok(res)
  }

  /**
   * @description 删除
   * @memberOf SugoTagTypeTreeController
   */
  remove = async ctx => {
    const { id } = ctx.params
    if (!id) {
      return ctx.body = Response.error(ctx, '操作失败，缺少参数')
    }
    const count = await this.tagTypeTreeService.count({
      parent_id: id
    })
    if (count > 0) {
      return ctx.body = Response.error(ctx, '操作失败，该分类下包含子节点。')
    }
    const res = await this.tagTypeTreeService.client.transaction(async transaction => {
      const t = { transaction }
      // 1. 删除tag-记录
      await this.tagTypeTreeService.remove({ id }, t)
      // 2. 删除tag_type已分配的分类记录
      await TagTypeService.getInstance().remove({ tag_tree_id: id }, t)
      return true
    })
    ctx.body = Response.ok(res)
  }

  /**
   * @description 保存标签树顺序及分类调整
   * @memberOf SugoTagTypeTreeController
   */
  saveOrder = async ctx => {
    const { id } = ctx.params
    if (!id) {
      return ctx.body = Response.error(ctx, '操作失败，缺少参数')
    }
    const { user: { id: userId, company_id } } = ctx.session
    const { tagsOrder, tagTypes, tagTypeTrees } = ctx.q
    const result = await this.tagTypeTreeService.saveOrder({
      userId,
      company_id,
      datasource_id: id,
      tagsOrder,
      tagTypes,
      tagTypeTrees
    })
    ctx.body = Response.ok(result)
  }
}

export default SugoTagTypeTreeController.getInstance()
