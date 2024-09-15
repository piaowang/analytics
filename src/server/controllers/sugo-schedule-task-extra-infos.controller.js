import SugoScheduleTaskExtraInfosService from '../services/sugo-schedule-task-extra-infos.service'
import {returnResult} from '../utils/helper'
import _ from 'lodash'
import { convertContainsByDBType } from './convert-contains-where'

async function getScheduleTaskExtraInfos(ctx) {
  const { company_id } = ctx.session.user
  const { id } = ctx.params
  let { where: whereCond, ...rest } = ctx.q || {}
  const relatedTags = _.get(whereCond, 'related_tags.$contains', '')
  if (relatedTags) {
    whereCond = {
      ..._.omit(whereCond, 'related_tags'),
      $and: convertContainsByDBType('related_tags', relatedTags)
    }
  } 
  let srv = SugoScheduleTaskExtraInfosService.getInstance()
  let res = id
    ? await srv.findOne({...whereCond, id, company_id})
    : await srv.findAll({ ...whereCond, company_id }, {order: [
      ['updated_at', 'DESC']
    ]})

  returnResult(ctx, res)
}

async function createScheduleTaskExtraInfos(ctx) {
  const { company_id, id: userId } = ctx.session.user
  let obj = ctx.q
  obj.company_id = company_id
  obj.created_by = userId
  let srv = SugoScheduleTaskExtraInfosService.getInstance()
  let res = await srv.create(obj)
  returnResult(ctx, res)
}

async function updateScheduleTaskExtraInfos(ctx) {
  const { company_id, id: userId } = ctx.session.user
  const { id } = ctx.params
  let obj = ctx.q
  obj.updated_by = userId
  let srv = SugoScheduleTaskExtraInfosService.getInstance()
  const res = await srv.update(obj, { id, company_id })
  returnResult(ctx, res)
}

async function deleteScheduleTaskExtraInfos(ctx) {
  const { company_id } = ctx.session.user
  const { id } = ctx.params
  let { where: whereCond, ...rest } = ctx.q || {}
  let srv = SugoScheduleTaskExtraInfosService.getInstance()
  const res = await srv.remove(_.pickBy({ ...whereCond, id, company_id }, _.identity))
  returnResult(ctx, res)
}

export default {
  getScheduleTaskExtraInfos,
  createScheduleTaskExtraInfos,
  updateScheduleTaskExtraInfos,
  deleteScheduleTaskExtraInfos
}
