import customOrders from '../services/sugo-custom-orders.service'
import { returnResult, returnError } from '../utils/helper'

async function updateCustomOrder(ctx) {
  let { dataSourceId } = ctx.params
  let myCustomOrders = ctx.q
  let { dataType } = myCustomOrders
  let { id: userId, company_id } = ctx.session.user
  let res = await customOrders.updateCustomOrder({ dataSourceId, myCustomOrders, dataType, userId, company_id })
  if (res.success) {
    returnResult(ctx, 'ok')
  } else {
    returnError(ctx, res.message)
  }
}

async function getCustomOrder(ctx) {
  let { dataSourceId } = ctx.params
  let { id: userId, company_id } = ctx.session.user
  let { dataType } = ctx.query
  let res = await customOrders.getCustomOrder({ dataSourceId, userId, company_id, dataType })
  returnResult(ctx, res)
}

export default { getCustomOrder, updateCustomOrder }
