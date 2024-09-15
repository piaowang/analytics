import {Response} from '../../utils/Response'
import _ from 'lodash'
import {col, fn, Op} from 'sequelize'
import {dictBy} from '../../../common/sugo-utils'
import db from '../../models'
import SugoPortalAppsService from '../../services/portals/sugo-portal-apps.service'
import SugoPortalAppTagRelationsService from '../../services/portals/sugo-portal-app-tag-relations.service'
import SugoPortalTagsService from '../../services/portals/sugo-portal-tags.service'
import SugoPortalTagOrdersService from '../../services/portals/sugo-portal-tag-orders.service'
import SugoPortalTagAppOrdersService from '../../services/portals/sugo-portal-tag-app-orders.service'

export default class PortalTagsController {
  sugoPortalTagService = SugoPortalTagsService.getInstance()
  sugoPortalAppsService = SugoPortalAppsService.getInstance()
  sugoPortalAppTagRelationService = SugoPortalAppTagRelationsService.getInstance()
  sugoPortalTagOrderService = SugoPortalTagOrdersService.getInstance()
  sugoPortalTagAppOrderService = SugoPortalTagAppOrdersService.getInstance()
  
  async getTagAsMenu(ctx) {
    // TODO check logic
    const { appsPermissions } = ctx.session.user
    if (!appsPermissions[0]) { return ctx.body = Response.fail({}) }
  
    const queryAppWhere = {}
    if (appsPermissions[0] !== 'all') {
      queryAppWhere.id = {
        [Op.in]: appsPermissions
      }
    }
  
    const auditApp = await this.sugoPortalAppsService.findAll(queryAppWhere, {
      attributes: ['id', 'name'],
      raw: true
    })
  
    const appIdSet = auditApp.map((i) => i.id)
  
    const queryAllRelatedTagWhere = {
      appId: {
        [Op.in]: appIdSet
      }
    }
  
    const queryAllRelatedTagOption = {
      where: queryAllRelatedTagWhere,
      attributes: [ [fn('DISTINCT', col('tag_id')) , 'tagId']],
      raw: true
    }
    const relatedTag = await this.sugoPortalAppTagRelationService.findAll({}, queryAllRelatedTagOption)
  
    const kidTagsId = relatedTag.map(i => i.tagId)
  
    const tree = await this.sugoPortalTagService.findAllKidsParents(kidTagsId)
  
    const tagOrders = await this.sugoPortalTagOrderService.findAll({}, {
      raw: true
    })
    const orderMap = dictBy(tagOrders, o => o.tagId, v => v.order)
  
    function recurSort(tree, parentId = '') {
      const orderDict = dictBy(orderMap[parentId] || [], _.identity, (tId, idx) => idx)
      const childSortedTree = _.map(tree, n => ({...n, children: recurSort(n.children, n.id)}))
      return _.orderBy(childSortedTree, tag => orderDict[tag.id] ?? 9999)
    }
  
    const sortedTree = recurSort(tree)
    return ctx.body = Response.ok(sortedTree)
  }
  
  async query(ctx) {
    const tagList = await this.sugoPortalTagService.findAll() // 标签集合
    const order = await this.sugoPortalTagOrderService.findAll() // 标签顺序集合
    const tagAppOrder = await this.sugoPortalTagAppOrderService.findAll() // 标签-应用-排序集合
  
    ctx.body = Response.ok({
      tagList,
      order,
      tagAppOrder
    })
  }
  
  async create(ctx) {
    const tag = ctx.q
    const { id: userId } = ctx.session.user
  
    const { newTag, orderMap } = tag
  
    await db.client.transaction(async (transaction) => {
      const newTagRes = await this.sugoPortalTagService.create({
        ...newTag,
        createdBy: userId
      }, {transaction})
    
      if (newTag.parentId) {
        if (orderMap[newTag.parentId]) {
          orderMap[newTag.parentId].push(newTagRes.id)
        } else {
          orderMap[newTag.parentId] = [newTagRes.id]
        }
      }
    
      const order = {
        tagId: newTag.parentId,
        order: orderMap[newTag.parentId] || [],
        createdBy: userId
      }
    
      const where = {
        tagId: newTag.parentId
      }
    
      if (order.tagId) {
        const existed = await this.sugoPortalTagOrderService.findOne(where, {
          transaction
        })
      
        const updates = {
          tagId: newTag.parentId,
          order: orderMap[newTag.parentId],
          updatedBy: userId
        }
      
        if (!existed) {
          await this.sugoPortalTagOrderService.create(order, {transaction})
        } else {
          await this.sugoPortalTagOrderService.update(updates, where,  { transaction})
        }
      }
    
    })
    ctx.body = Response.ok({})
  }
  
  async update(ctx) {
    const tagId = ctx.params.id
  
    const newValue = _.omit(ctx.q, 'id')
    const editRes = await this.sugoPortalTagService.update(newValue, {
      id: tagId
    })
  
    if (editRes[0] === 1) {
      return ctx.body = Response.ok({})
    }
    ctx.body = Response.fail({})
  }
  
  async destroy(ctx) {
    if (!ctx.params.id) { return ctx.body = Response.fail({}) }
  
    const delRes = await db.client.transaction(async (transaction) => {
      const where = {
        id: ctx.params.id
      }
      const waitForDel = await this.sugoPortalTagService.findOne(where, {
        raw: true,
        transaction
      })
    
      const parentId = waitForDel.parentId
    
      const tagOrderWhere = {
        tagId: parentId
      }
      const tagOrder = await this.sugoPortalTagOrderService.findOne(tagOrderWhere, {
        raw: true,
        transaction
      })
      if (tagOrder?.order) {
        const allChildWhere = {
          parentId: ctx.params.id
        }
        const allChild = await this.sugoPortalTagService.findAll(allChildWhere, {
          raw: true
        })
        const nextTagOrder = tagOrder.order.filter(i => i !== ctx.params.id)
        allChild.map(i => nextTagOrder.push(i.id))
        const updateOrderValue = { order: nextTagOrder }
        await this.sugoPortalTagOrderService.update(updateOrderValue, tagOrderWhere, {transaction})
      }
    
      const updateSonWhere = {
        parentId: ctx.params.id
      }
      const updateSonParentId = {
        parentId
      }
      await this.sugoPortalTagService.update(updateSonParentId, updateSonWhere, {transaction})
    
      await this.sugoPortalTagAppOrderService.remove({
        tagId: ctx.params.id
      }, {
        transaction
      })
    
      await this.sugoPortalAppTagRelationService.remove({
        tagId: ctx.params.id
      }, {
        transaction
      })
    
      await this.sugoPortalTagService.remove({
        id: ctx.params.id
      }, {
        transaction
      })
    
      return true
    })
  
    if (!delRes) { return ctx.body = Response.fail({}) }
  
    ctx.body = Response.ok({})
  }
}
