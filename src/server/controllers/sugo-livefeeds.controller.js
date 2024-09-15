import db from '../models'
import { returnError, returnResult } from '../utils/helper'
import _ from 'lodash'


async function get(ctx) {
  let {user} = ctx.session
  let {company_id = null} = user || {}

  // query 可包含 id / is_template
  let query = ctx.q

  query = _.defaultsDeep({}, query, {
    where: {
      $or: [
        { company_id: company_id },
        { company_id: null }
      ]
    },
    attributes: ['id', 'title', 'description', 'updated_at', 'cover_image_id', 'company_id'],
    order: [ ['updated_at', 'desc'] ]
  })

  // 如果是对外访问则不限制 company_id
  if (!user) {
    delete query.where.$or
  }

  // 查询某个 id 时才返回完整的 params，平时只查询封面图片
  if (query.where.id || query.where.is_template) {
    query.attributes = query.attributes.concat('params')
  }

  let myCompanyLivefeeds = await db.SugoLivefeeds.findAll(query)
  returnResult(ctx, myCompanyLivefeeds)
}

async function create(ctx) {
  let {user} = ctx.session
  let {company_id, id: creator} = user

  let livefeedInst = ctx.q

  if (!livefeedInst || !livefeedInst.title || !livefeedInst.params) {
    returnError(ctx, 'invalid live feed content')
    return
  }

  let created = await db.SugoLivefeeds.create({
    ...livefeedInst,
    company_id,
    created_by: creator
  })

  returnResult(ctx, created)
}

async function update(ctx) {
  let {user} = ctx.session
  let {company_id, id: userId} = user

  let livefeedInst = ctx.q

  if (!livefeedInst || !livefeedInst.title || !livefeedInst.params) {
    returnError(ctx, 'invalid live feed content')
    return
  }

  livefeedInst.updated_by = userId

  let res = await db.SugoLivefeeds.update(livefeedInst, {
    where: {
      id: livefeedInst.id,
      company_id
    }
  })

  returnResult(ctx, res)
}

async function deleteLivefeed(ctx) {
  let {user} = ctx.session
  let {company_id, id: userId} = user

  let { livefeedId } = ctx.params

  if (!livefeedId) {
    returnError(ctx, 'livefeed id is false')
    return
  }

  let res = await db.SugoLivefeeds.destroy({
    where: {
      id: livefeedId,
      company_id
    }
  })

  returnResult(ctx, res)
}

export default { get, create, update, deleteLivefeed}
