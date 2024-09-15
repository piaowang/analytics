
import { BaseService } from './base.service'
import _ from 'lodash'
import {generate} from 'shortid'
import db from '../models'
import customOrderService from '../services/sugo-custom-orders.service'
import tagTypeService from '../services/tag-type.service'
import { KEY_NONE_TYPE } from '../../common/constants'

export async function getTagTypesByIds(ids) {
  return await db.SugoTagTypeTree.findAll({
    where: {
      id: {$in: ids}
    },
    raw: true
  })
}

/**
 * 标签类型分类树服务层-CRUD
 */
export default class SugoTagTypeTreeService extends BaseService {
  constructor() {
    super('SugoTagTypeTree')
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new SugoTagTypeTreeService()
    }
    return this._instance
  }

  async saveOrder (params) {
    const { userId, company_id, datasource_id, tagsOrder, tagTypes, tagTypeTrees } = params
    /**
     *{
        "tagsOrder": {
          "-1": [
            "BkvuQ67xQ",
            "rkdVh3Xe7",
            "not-typed"
          ],
          ...
        },
        "tagTypes": {
          "S1FToYybm": [{
              "dimension_id": "ByrqDaVlX",
              "type": "发行机构偏好-浏览"
            }
            ...
          ]
          ...
        },
        "tagTypeTrees": {
          "S1FToYybm": [
            "Skk40FJbQ"
          ]
          ...
        }
      }
     */
    return await this.client.transaction(async t => {
      const transaction = { transaction: t }
      // 1. 更新分类节点排序
      if (!_.isEmpty(tagsOrder)) {
        const orders = await customOrderService.getCustomOrder({
          dataSourceId: datasource_id,
          company_id,
          dataType: 'global'
        })
        let { tags_order = {}, id } = orders || {}
        if (!tags_order || _.isArray(tags_order)) { // 处理历史旧数据
          tags_order = {}
        }
        const newTagsOrder = _.keys(tagsOrder).reduce((prev, key) => {
          return {
            ...prev,
            [key]: tagsOrder[key]
          }
        }, tags_order)
        if (id) { // 如果存在则更新
          await db.SugoCustomOrders.update({
            tags_order: newTagsOrder
          }, {
            where: { id },
            ...transaction
          })
        } else { // 新增排序数据
          await db.SugoCustomOrders.create({
            id: generate(),
            druid_datasource_id: datasource_id,
            company_id,
            created_by: userId,
            tags_order: newTagsOrder
          }, transaction)
        }
      }

      // 2. 更新标签分类关系表
      if (!_.isEmpty(tagTypes)) {
        const keys = _.keys(tagTypes)
        const types = keys.reduce((prev, curr) => {
          return prev.concat(tagTypes[curr])
            .map(item =>{
              return {
                tag_tree_id: curr,
                ...item
              }
            })
        }, [])
        const delIds = types.map(o => o.dimension_id)
        // 删除所有分类关系，插入新的记录
        await tagTypeService.getInstance().remove({
          dimension_id: {
            $in: delIds
          },
          datasource_id
        }, transaction)
        // 如果未分类，则只做删除操作（说明将标签移动到了未分类节点)
        const newTagTypes = types.filter(o => o.tag_tree_id !== KEY_NONE_TYPE).map(item => {
          return {
            id: generate(),
            ...item,
            datasource_id,
            company_id,
            created_by: userId
          }
        })
        // 插入所有标签分类关系
        await tagTypeService.getInstance().getDBInstance().bulkCreate(newTagTypes, transaction)
      }

      // 3.更新标签分类层级处理
      if (!_.isEmpty(tagTypeTrees)) {
        const keys = _.keys(tagTypeTrees)
        for (let treeId of keys) {
          await this.update({ parent_id: treeId }, {
            id: {
              $in: tagTypeTrees[treeId]
            }
          }, transaction)
        }
      }
      return true
    })
  }
}
