/**
 * 通讯录的 curd
 * */

import db from '../models'

async function queryOne(where) {
  return await db.SugoContacts.findOne({
    where
  })
}

async function queryMany(where, opt = {}) {
  return await db.SugoContacts.findAll({
    where,
    ...opt
  })
}

async function create(person) {
  let existed = await queryOne(person)
  if (existed) {
    throw new Error('你已经添加过这个联系人了')
  }
  return await db.SugoContacts.create(person)
}

async function updateById(personId, company_id, person) {
  return await db.SugoContacts.update(person, {
    where: {
      id: personId,
      company_id
    }
  })
}

async function deleteById(personId, company_id) {
  return await db.SugoContacts.destroy({
    where: {
      id: personId,
      company_id
    }
  })
}

export default {
  queryOne,
  queryMany,
  create,
  updateById,
  deleteById
}
