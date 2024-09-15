import {mapAwaitAll} from '../../../common/sugo-utils'
import {Op} from 'sequelize'
import db from '../../models'
import SugoPortalTagsService from '../../services/portals/sugo-portal-tags.service'
import SugoPortalAppsService from '../../services/portals/sugo-portal-apps.service'
import SugoPortalAppTagRelationsService from '../../services/portals/sugo-portal-app-tag-relations.service'
import SugoPortalTagAppOrdersService from '../../services/portals/sugo-portal-tag-app-orders.service'
import {Response} from '../../utils/Response'
import roleService from '../../services/role.service'
import _ from 'lodash'

export default class PortalAppsController {
  sugoPortalTagService = SugoPortalTagsService.getInstance()
  sugoPortalAppsService = SugoPortalAppsService.getInstance()
  sugoPortalAppTagRelationService = SugoPortalAppTagRelationsService.getInstance()
  sugoPortalTagAppOrderService = SugoPortalTagAppOrdersService.getInstance()
  
  async query(ctx) {
    const { name } = ctx.q
    
    const appId = ctx.params?.id
    
    let res
    let options = {
      order: [['created_at', 'DESC']]
    }
    if (appId) {
      options = {
        where: {
          id: appId
        }
      }
    }
    
    if (name) {
      options = {
        where: {
          [Op.or]: [
            {
              name: {
                [Op.like]: `%${name}%`
              }
            },
            {
              description: {
                [Op.like]: `%${name}%`
              }
            }
          ]
        }
      }
    }
    
    res = await this.sugoPortalAppsService.findAll({}, options)
    ctx.body = Response.ok(res)
  }
  
  async create(ctx) {
    const { checkedTag = [], ...data } = ctx.q
    const { id: userId, SugoRoles, type } = ctx.session.user

    const res = await db.client.transaction(async (transaction) => {
      let res = await this.sugoPortalAppsService.create({
        ...data,
        createdBy: userId
      }, { transaction })
      
      if (type !== 'built-in') {
        let appsPermissions = []
        await mapAwaitAll(SugoRoles.filter(i => i.type !== 'built-in'), async (role) => {
          let apps_id = await db.SugoRoleApp.findAll({
            where: {
              role_id: role.id
            },
            attributes: ['app_id'],
            raw: true,
            transaction
          })
          appsPermissions = appsPermissions.concat(apps_id)
          await roleService.appsAuth({
            apps_id: apps_id.map(i => i.app_id).concat(res.id),
            roleId: role.id,
            transaction
          })
        })
        ctx.session.user.appsPermissions = _.union(appsPermissions.map(i => i.app_id)).concat(res.id)
      }
      if (!_.isEmpty(checkedTag)) {
        await this.sugoPortalAppsService.addTag({
          app: res,
          tags: checkedTag,
          userId,
          transaction
        })
        return res
      }
      
      
      const existedWhere = {
        id: 'unTyped'
      }
      const existedUnTyped = await this.sugoPortalTagService.findOne(existedWhere, {
        transaction
      })
      if (!existedUnTyped) {
        const unTypedTagValues = {
          id: 'unTyped',
          name: '未分类',
          createdBy: userId
        }
        await this.sugoPortalTagService.create(unTypedTagValues,{ transaction })
      }
      
      const appTagRelationValues = {
        appId: res.id,
        tagId: 'unTyped',
        createdBy: userId
      }
      await this.sugoPortalAppTagRelationService.create(appTagRelationValues, { transaction })
      
      const appTagOrderWhere = {
        tagId: 'unTyped'
      }
      const existedOrder = await this.sugoPortalTagAppOrderService.findOne(appTagOrderWhere, {
        raw: true,
        transaction
      })
      
      if (!existedOrder) {
        const orderValues = {
          tagId: 'unTyped',
          appIdOrder: [res.id],
          createdBy: userId
        }
        await this.sugoPortalTagAppOrderService.create(orderValues, { transaction })
      } else {
        existedOrder.appIdOrder.unshift(res.id)
        const orderValues = {
          appIdOrder: existedOrder.appIdOrder,
          updatedBy: userId
        }
        await this.sugoPortalTagAppOrderService.update(orderValues,
          {tagId: 'unTyped'}, {transaction})
      }
      
      return res
    })
    
    ctx.body = Response.ok(res)
  }
  
  async update(ctx) {
    const res = await this.sugoPortalAppsService.update(
      ctx.q,
      { id: ctx.q.id }
    )
    ctx.body = Response.ok(res)
  }
  
  async destroy(ctx) {
    const appId = ctx.params.id
    const { id: userId } = ctx.session.user
    
    const res = await db.client.transaction(async (transaction) => {
      await db.SugoPortalAppTagRelations.destroy({
        where: {
          appId: appId
        },
        transaction
      })
      const res = await db.SugoPortalApps.destroy({
        where: {
          id: appId
        },
        transaction
      })
      
      const appTagRelationsWhere = {
        appId: appId
      }
      const realtions = await this.sugoPortalAppTagRelationService.findAll(appTagRelationsWhere, {
        raw: true,
        transaction
      })
      
      
      await mapAwaitAll(realtions, async (i) => {
        const orderWhere = {
          tagId: i.tagId
        }
        const order = await this.sugoPortalTagAppOrderService.findOne(orderWhere, {
          raw: true,
          transaction
        })
        
        const orderUpdateValue = {
          appIdOrder: order.appIdOrder.filter( (j) => j !== ctx.params.id),
          updatedBy: userId
        }
        
        await this.sugoPortalTagAppOrderService.update(orderUpdateValue, orderWhere,  {transaction})
      })

      return res
    })
    
    ctx.body = Response.ok(res)
  }
}
