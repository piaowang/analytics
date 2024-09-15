import db from '../models'
import _ from 'lodash'
import { returnError, returnResult } from '../utils/helper'
import {generate} from 'shortid'
import { convertContainsByDBType } from './convert-contains-where'

const tagTypeModelMap = {
  dimension: 'SugoDimensions',
  dimension_layer: 'SugoDimensions',
  measure: 'SugoMeasures',
  track_event_draft: 'TrackEventDraft',
  track_event: 'TrackEvent',
  user_group: 'Segment',
  offline_calc_dimension: 'SugoOfflineCalcDimensions',
  offline_calc_index: 'SugoOfflineCalcIndices',
  offline_calc_model: 'SugoOfflineCalcModels',
  sugo_data_apis: 'SugoDataApis',
  slices: 'Slices',
  publish: 'SugoSharings',
  portals: 'SugoPortals'
}

const tags = {
  /** 查询列表数据 */
  getTags: async ctx => {
    let id = ctx.params.id || ''
    let {offset = 0, limit = 9999, search = '', type} = ctx.q
    if (!id) {
      throw new Error('别闹，id不能为空啊')
    }
    
    let query = _.pickBy({
      ...(id === 'all' ? {} : {project_id: id}), // 实际上这个 id 对应的是 dataSourceId
      type
    }, _.identity)

    if (search) {
      query.name = search
    }

    let q = {
      where: query,
      offset: offset,
      limit: limit,
      order: [
        ['updated_at', 'DESC']
      ]
    }

    let result = await db.SugoTags.findAndCountAll(q)

    ctx.body = {
      total: result.count,
      data: result.rows
    }
  },

  /** 保存 */
  addTag: async ctx => {
    let body = ctx.q
    let {user} = ctx.session
    let {id} = user
    let {
      name,
      type,
      projectId,
      parentId
    } = body
    if (!name) {
      throw new Error('别闹，名字不能为空啊')
    }

    if (!/^[\u4e00-\u9fa5_a-zA-Z0-9]{1,32}$/.test(name)) {
      return returnError(ctx, '只能是数字、字母和中文组成，不能包含特殊符号和空格，不超过32个字符')
    }

    let uid = generate()
    let defs = {
      id: uid,
      type: type,
      name,
      project_id: projectId,
      parent_id: parentId,
      created_by: id
    }
    //Search for a specific element or create it if not available
    let result = await db.SugoTags.findOrCreate({
      where: {
        name,
        type,
        project_id: projectId
      },
      defaults: defs
    })

    let flag = result[1]
    if (!flag) {
      return returnError(ctx, '名字已经存在，换一个吧')
    }
    if ( type=== 'dimension_layer' ){
      await db.SugoDimensionLayer.create({
        id: uid,
        tags_name: name,
        created_by: id
      })
    }

    returnResult(ctx, defs)
  },

  /** 更新 */
  editTag: async ctx => {
    let body = ctx.q
    let id = ctx.params.id
    if (!id) {
      throw new Error('别闹，id不能为空啊')
    }
    let {
      name,
      type,
      projectId,
      parentId,
      createdAt
    } = body

    let obj = await db.SugoTags.findOne({
      where: {
        name,
        type,
        ...(projectId === 'all' ? {} : {project_id: projectId}) // 实际上这个 id 对应的是 dataSourceId
      }
    })
    if (obj && obj.id !== id) return returnError(ctx, '名字已经存在，换一个吧')

    //如果数据源名称存在 则可能是更新别名
    let result = await db.SugoTags.update({
      name,
      parent_id: parentId,
      created_at: createdAt
    }, {
      where: {
        id
      }
    })

    if ( type=== 'dimension_layer' ){
      await db.SugoDimensionLayer.update({
        tags_name: name,
        created_by: createdAt
      },{
        where: {
          id
        }
      })
    }

    returnResult(ctx, result)
  },
  /** 删除 */
  deleteTag: async ctx => {
    let tagId = ctx.params.id
    if (!tagId) {
      throw new Error('别闹，id不能为空啊')
    }

    //check slice
    let query = {
      where : convertContainsByDBType('tags', tagId)
    }

    let { type } = ctx.q
    if (type && type === 'dimension_layer') {
      query = {
        where : convertContainsByDBType('tags_layer', [tagId])
      }
    }

    let obj = await db.SugoTags.findOne({
      where: {
        id: tagId
      }
    })

    if (!obj) {
      return returnError(ctx, '没有这个标签', 404)
    }
    //删除tags
    let result = []
    await db.client.transaction(async t => {
      let target = {
        transaction: t
      }

      let modalName = tagTypeModelMap[obj.type]

      let data = await db[modalName].findAll({...query, ...target})

      await db.SugoTags.destroy({
        where: {
          id: tagId
        },
        ...target
      })
      if (type === 'dimension_layer'){
        await db.SugoDimensionLayer.destroy({
          where: {
            id: tagId
          }
        })
      }
      for(let i = 0;i < data.length;i ++) {
        let {tags, id} = data[i]
        let r = await db[modalName].update({
          tags: _.without(tags, tagId)
        }, {
          where: {
            id
          },
          ...target
        })
        result.push(r)
      }
    })

    returnResult(ctx, result)

  }
}

export default tags
