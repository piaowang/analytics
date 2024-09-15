import TempLookupsSrv from '../services/temp-lookups.service'
import {returnResult, returnError} from '../utils/helper'

/**
 * 预备删除的 lookups 控制层
 */
class TempLookupsController {

  constructor() {
    this._srv = new TempLookupsSrv()
  }

  query = async ctx => {
    const { company_id } = ctx.session.user
    const { id } = ctx.params
    let {where: whereCond, ...rest} = ctx.q || {}
    if (id) {
      let model = await this._srv.findOne({...whereCond, id, company_id}, rest)
      returnResult(ctx, model)
      return
    }
    const models = await this._srv.findAll({...whereCond, company_id}, rest)
    returnResult(ctx, models)
  }

  create = async ctx => {
    const { company_id, id: userId } = ctx.session.user
    let obj = ctx.q
    obj.company_id = company_id
    obj.created_by = userId
    let res = await this._srv.createAndLookup(obj)
    returnResult(ctx, res)
  }

  update = async ctx => {
    const { company_id, id: userId } = ctx.session.user
    const { id } = ctx.params
    let obj = ctx.q
    obj.updated_by = userId
    const res = await this._srv.update(obj, { id, company_id })
    returnResult(ctx, res)
  }

  remove = async ctx => {
    const { company_id } = ctx.session.user
    const {id} = ctx.params
    const res = await this._srv.remove({ id, company_id })
    returnResult(ctx, res)
  }
}

const inst = new TempLookupsController()

export default inst
