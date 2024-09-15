import db from '../models'
import _ from 'lodash'
import { returnError, returnResult } from '../utils/helper'
import {generate} from 'shortid'

const dimensionLayer = {
  /** 查询列表数据 */
  getDimensionLayer: async ctx => {
    let result = await db.SugoDimensionLayer.findAll()
    ctx.body = result
  },
  /** 保存 */
  addDimensionLayer: async ctx => {
    let {user} = ctx.session
    let {id} = user
    let { tags_name } = ctx.q
    let result = await db.SugoDimensionLayer.create({
      tags_name,
      created_by: id
    })
    ctx.body = result
  },

  /** 更新 */
  editDimensionLayer: async ctx => {
    let { dimension_id } = ctx.q
    let id = ctx.params.id
    if (!id) {
      throw new Error('别闹，id不能为空啊')
    }

    let result = await db.SugoDimensionLayer.update({
      dimension_id
    }, {
      where: {
        id
      }
    })
    ctx.body = result
  },
  /** 删除 */
  deleteDimensionLayer: async ctx => {
    let {id} = ctx.params
    if (!id) {
      throw new Error('别闹，id不能为空啊')
    }
    let result = await db.SugoDimensionLayer.destroy({
      where: {
        id
      }
    })
    ctx.body = result
  }
}

export default dimensionLayer
