import { returnError, returnResult } from '../utils/helper'
import SugoLiveScreenPublishService from '../services/sugo-livescreen-publish.service'
import InstitutionsService from '../services/institutions.service'
import db from '../models'
import _ from 'lodash'

async function get(ctx) {
  const { user } = ctx.session
  const query = ctx.q
  // 获取大屏信息
  const institutionId = user.institutions_id
  const institutions = await InstitutionsService.getInstance().findAll()
  const curNode = _.find(institutions, item => item.id === institutionId) || {}
  function getSibling (id) {
    const siblingArr = _.filter(institutions, item => item.parent === id)
    if(siblingArr.length > 0) {
      return _.reduce(siblingArr, (acc, cur) => _.concat(acc, getSibling(cur.id)), [id])
    }
    return [id]
  }
  const ids = getSibling(curNode.parent || curNode.id).filter(v => v)
  const where = _.isEmpty(ids) ? undefined : {
    institutions_id: {
      $in: ids
    }
  }
  const users = await db.SugoUser.findAll(where).map(user => user.id)

  const result = await SugoLiveScreenPublishService.getInstance().findAll({
    ...(query.title ? { title: query.title } : {}),
    created_by: {
      $in: users
    }
  }, { 
    raw: true, order: [['updated_at', 'DESC']]  
  })
  returnResult(ctx, result)
}

async function deleteLiveScreen(ctx) {
  const { user } = ctx.session
  const { company_id } = user

  const { livescreenId } = ctx.params

  if (!livescreenId) {
    returnError(ctx, 'livecreenId is false')
    return
  }

  const res = await SugoLiveScreenPublishService.getInstance().deleteLiveScreen(company_id, livescreenId)
  returnResult(ctx, res)
}



export default { get, deleteLiveScreen }
