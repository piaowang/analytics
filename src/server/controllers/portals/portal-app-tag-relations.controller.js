import SugoPortalAppTagRelationsService from '../../services/portals/sugo-portal-app-tag-relations.service'
import SugoPortalTagAppOrdersService from '../../services/portals/sugo-portal-tag-app-orders.service'
import db from '../../models'
import {mapAwaitAll} from '../../../common/sugo-utils'
import {Response} from '../../utils/Response'


export default class PortalAppTagRelationsController {
  sugoPortalAppTagRelationService = SugoPortalAppTagRelationsService.getInstance()
  sugoPortalTagAppOrderService = SugoPortalTagAppOrdersService.getInstance()
  
  async query(ctx) {
    const res = await this.sugoPortalAppTagRelationService.findAll()
    ctx.body = Response.ok(res)
  }
  
  async create(ctx) {
    const { shouldAdd = [], shouldDel = [], shouldChange_tagAppOrderMap = {}, appId } = ctx.q
    const { id: userId } = ctx.session.user
    
    let res = await db.client.transaction(async (transaction) => {
      await mapAwaitAll(shouldAdd, async(item) => {
        const newItem = {
          appId: appId,
          tagId: item
        }
        await this.sugoPortalAppTagRelationService.findOrCreate(newItem, {
          ...newItem,
          createdBy: userId
        }, {transaction})
      })
      
      await mapAwaitAll(shouldDel, async(item) => {
        const delItem = {
          appId: appId,
          tagId: item
        }
        await this.sugoPortalAppTagRelationService.remove(delItem, {transaction})
      })
      
      for (let k in shouldChange_tagAppOrderMap) {
        const newOrder = {
          tagId: k
        }
        const existed = await this.sugoPortalTagAppOrderService.findOne(newOrder, {
          transaction
        })
        if (existed) {
          await this.sugoPortalTagAppOrderService.update({
            ...newOrder,
            appIdOrder: shouldChange_tagAppOrderMap[k],
            updatedBy: userId
          }, newOrder, {transaction})
        } else {
          await this.sugoPortalTagAppOrderService.create({
            ...newOrder,
            appIdOrder: shouldChange_tagAppOrderMap[k],
            createdBy: userId
          }, { transaction })
        }
        
      }
      
      const hasTagWhere = {
        appId: appId
      }
      const hasTag = await this.sugoPortalAppTagRelationService.findOne(hasTagWhere, {
        transaction,
        raw: true
      })
      
      if (hasTag) return true
      
      const unTypedTag = {
        appId: appId,
        tagId: 'unTyped'
      }
      await this.sugoPortalAppTagRelationService.create({
        ...unTypedTag,
        createdBy: userId
      },{ transaction })
      
      const unTypedTagAppOrderWhere = {
        tagId: 'unTyped'
      }
      const unTypedTagAppOrder = await this.sugoPortalTagAppOrderService.findOne(unTypedTagAppOrderWhere, {
        transaction,
        raw: true
      })
      
      const nextUnTypedTagAppOrder = {
        appIdOrder: [appId]
      }
      if (unTypedTagAppOrder) {
        unTypedTagAppOrder.appIdOrder.push(appId)
        nextUnTypedTagAppOrder.appIdOrder = unTypedTagAppOrder.appIdOrder
        await this.sugoPortalTagAppOrderService.update({
          ...nextUnTypedTagAppOrder,
          updateBy: userId
        }, { id: unTypedTagAppOrder.id }, { transaction })
      } else {
        await this.sugoPortalTagAppOrderService.create({
          ...nextUnTypedTagAppOrder,
          createdBy: userId
        })
      }
      
      return true
    })
    if (!res) return ctx.body = Response.fail({ msg: '标签设置失败' })
    ctx.body = Response.ok({ msg: 'success' })
  }
  
  async batchCreate(ctx) {
    const {data = [] } = ctx.q
    
    const { id: userId } = ctx.session.user
    
    const shouldRemoveUntypedArr = data.filter( (i) => i.tagId === 'unTyped')
    let res = await db.client.transaction(async (transaction) => {
      await mapAwaitAll(data, async(item) => {
        let where = {
          appId: item.appId,
          tagId: item.tagId
        }
        const existed = await this.sugoPortalAppTagRelationService.findOne(where, {
          transaction
        })
        if (existed) return
        await this.sugoPortalAppTagRelationService.create({
          ...item,
          createdBy: userId
        })
      })
      
      const appTagIdMap = {}
      data.map( (i) => {
        if (!appTagIdMap[i.tagId]) appTagIdMap[i.tagId] = []
        appTagIdMap[i.tagId].push(i.appId)
      })
      for (let k in appTagIdMap) {
        const newOrder = {
          tagId: k
        }
        const existed = await this.sugoPortalTagAppOrderService.findOne(newOrder, {
          transaction
        })
        if (existed) {
          await this.sugoPortalTagAppOrderService.update({
            ...newOrder,
            appIdOrder: appTagIdMap[k],
            updatedBy: userId
          }, newOrder, {transaction})
        } else {
          await this.sugoPortalTagAppOrderService.create({
            ...newOrder,
            appIdOrder: appTagIdMap[k],
            createdBy: userId
          }, { transaction })
        }
        
      }
  
  
      await mapAwaitAll(shouldRemoveUntypedArr, async (item) => {
        await this.sugoPortalAppTagRelationService.remove({
          appId: item.appId,
          tagId: 'unTyped'
        },
        {transaction})
      })
      
      const unTypedAppTagOrderWhere = {
        tagId: 'unTyped'
      }
      let unTYpedAppTagOrder = await this.sugoPortalTagAppOrderService.findOne(unTypedAppTagOrderWhere, {
        transaction,
        raw: true
      })
      
      const shouldRemoveUntypedAppIds = shouldRemoveUntypedArr.map( (i) => i.appId)
      if (!unTYpedAppTagOrder) return true
      let nextOrder = unTYpedAppTagOrder.appIdOrder.filter((i) => !shouldRemoveUntypedAppIds.includes(i))
      
      const updateUnTYpedAppTagOrder = {
        appIdOrder: nextOrder,
        updateBy: userId
      }
      await this.sugoPortalTagAppOrderService.update(updateUnTYpedAppTagOrder,
        unTypedAppTagOrderWhere, { transaction })
      
      return true
    })
    
    if (!res) return ctx.body = Response.fail({})
    return ctx.body = Response.ok({
      success: true
    })
  }
  
  async update(ctx) {
    const res = await this.sugoPortalAppTagRelationService.update(
      ctx.q,
      { id: ctx.q.id }
    )
    ctx.body = Response.ok(res)
  }
  
  async destroy(ctx) {
    const res = await this.sugoPortalAppTagRelationService.remove({
      id: ctx.params.id
    })
    ctx.body = Response.ok(res)
  }
  
  async changeOrder(ctx) {
    const { tagId, appIdOrder } = ctx.q
    const { id: userId } = ctx.session.user
    const updateWhere = {
      tagId: tagId
    }
    await this.sugoPortalTagAppOrderService.update({
      ...updateWhere,
      appIdOrder: appIdOrder,
      updatedBy: userId
    }, updateWhere)
    
    return ctx.body = Response.ok({})
  }
}
