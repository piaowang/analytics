import ContactService from '../services/contact.service'
import SugoDepartmentsSrv from '../services/sugo-departments'
import {returnResult, returnError} from '../utils/helper'
import db from '../models'
import _ from 'lodash'

async function getPersons(ctx) {
  let {personId} = ctx.params
  let {user} = ctx.session
  let {company_id} = user
  let whereCond = ctx.q || {}
  if (personId) {
    let model = await ContactService.queryOne({...whereCond, id: personId, company_id})
    returnResult(ctx, model)
    return
  }

  let models = await ContactService.queryMany({...whereCond, company_id}, {order: [ ['updated_at', 'DESC'] ]})
  returnResult(ctx, models)
}

async function createPerson(ctx) {
  let {user} = ctx.session
  let {company_id, id: creator} = user
  let person = ctx.q

  person.created_by = creator
  person.company_id = company_id
  let res = await ContactService.create(person)
  returnResult(ctx, res)
}

async function updatePerson(ctx) {
  let {personId} = ctx.params
  let person = ctx.q
  let {user, id: updater} = ctx.session
  let {company_id} = user

  person.updated_by = updater
  let res = await ContactService.updateById(personId, company_id, person)
  returnResult(ctx, res)
}

async function deletePerson(ctx) {
  let {personId} = ctx.params
  let {user} = ctx.session
  let {company_id} = user

  let res = await ContactService.deleteById(personId, company_id)
  returnResult(ctx, res)
}

// 部门
const getDepartments = async ctx => {
  const { company_id } = ctx.session.user
  const { id } = ctx.params
  let { where: whereCond, ...rest } = ctx.q || {}

  let srv = SugoDepartmentsSrv.getInstance()
  let res
  if (id) {
    res = await srv.findOne({ ...whereCond, id, company_id })
  } else {
    res = await srv.findAll({ ...whereCond, company_id }, { order: [ ['updated_at', 'DESC'] ] })
  }

  returnResult(ctx, res)
}

const createDepartment = async ctx => {
  const { company_id, id: userId } = ctx.session.user
  let obj = ctx.q
  obj.company_id = company_id
  obj.created_by = userId
  let srv = SugoDepartmentsSrv.getInstance()
  let res = await srv.create(obj)
  returnResult(ctx, res)
}

const updateDepartment = async ctx => {
  const { company_id, id: userId } = ctx.session.user
  const { id } = ctx.params
  let obj = ctx.q
  obj.updated_by = userId
  let srv = SugoDepartmentsSrv.getInstance()
  const res = await srv.update(obj, { id, company_id })
  returnResult(ctx, res)
}

const deleteDepartment = async ctx => {
  const { company_id } = ctx.session.user
  const { id } = ctx.params
  // TODO 如果有用户属于这个部门，也不能删除
  // 如果有用到这个部门，则不能删除
  let relatedContacts = await db.SugoContacts.findAll({
    where: {
      department_id: id
    },
    raw: true
  })
  if (!_.isEmpty(relatedContacts)) {
    returnResult(
      ctx,
      `${_.size(relatedContacts)} 位联系人属于这个部门，不能删除。分别是：${relatedContacts.map(r => r.name).join('，')}`,
      0, 400
    )
    return
  }
  let srv = SugoDepartmentsSrv.getInstance()
  const res = await srv.remove({ id, company_id })
  returnResult(ctx, res)
}

export default {
  getPersons,
  createPerson,
  updatePerson,
  deletePerson,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
}
