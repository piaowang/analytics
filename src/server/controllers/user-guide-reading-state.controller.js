import UserGuideReadingStateService from '../services/user-guide-reading-state.service'
import {returnResult} from '../utils/helper'

async function getStates(ctx) {
  let {stateId} = ctx.params
  let {user} = ctx.session
  let {company_id, id} = user

  if (stateId) {
    let model = await UserGuideReadingStateService.queryOne({id: stateId, user_id: id, company_id})
    returnResult(ctx, model)
    return
  }

  const models = await UserGuideReadingStateService.queryMany({company_id, user_id: id}, {
    order: [
      ['updated_at', 'DESC']
    ]
  })
  returnResult(ctx, models)
}

async function createState(ctx) {
  let {user} = ctx.session
  let {company_id, id} = user
  let newState = ctx.q

  if (!newState.user_id) {
    throw new Error('user_id 未填写')
  }

  newState.company_id = company_id
  newState.created_by = id
  let res = await UserGuideReadingStateService.create(newState)
  returnResult(ctx, res)
}

async function updateState(ctx) {
  let {stateId} = ctx.params
  let patchState = ctx.q
  let {user} = ctx.session
  let {company_id, id} = user

  patchState.updated_by = id
  let res = await UserGuideReadingStateService.updateById(stateId, company_id, patchState)
  returnResult(ctx, res)
}

async function deleteState(ctx) {
  let {stateId} = ctx.params
  let {user} = ctx.session
  let {company_id} = user

  let res = await UserGuideReadingStateService.deleteById(stateId, company_id)
  returnResult(ctx, res)
}

export default {
  getStates,
  createState,
  updateState,
  deleteState
}
