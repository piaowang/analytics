import { log } from '../utils/log'
import {rawQueryWithTransaction} from '../utils/db-utils'

export default async db => {

  let arr = [
    'ALTER TABLE sugo_datasources ADD COLUMN role_ids JSONB DEFAULT \'[]\'::JSON',
    'ALTER TABLE sugo_dimensions ADD COLUMN role_ids JSONB DEFAULT \'[]\'::JSON',
    'ALTER TABLE sugo_measures ADD COLUMN role_ids JSONB DEFAULT \'[]\'::JSON',
    'ALTER TABLE sugo_datasources ADD COLUMN user_ids JSONB DEFAULT \'[]\'::JSON',
    'ALTER TABLE sugo_dimensions ADD COLUMN user_ids JSONB DEFAULT \'[]\'::JSON',
    'ALTER TABLE sugo_measures ADD COLUMN user_ids JSONB DEFAULT \'[]\'::JSON'
  ]

  //const  queryInterface = db.client.getQueryInterface()
  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    await rawQueryWithTransaction(db, arr, t)

    let roleTree = {}
    //设定默认数据源授权
    let ds = await db.SugoDatasources.findAll(transaction)
    ds = ds.map(d => d.get({ plain: true }))
    for (let datasource of ds) {
      let {company_id, id} = datasource
      let role
      if (roleTree[company_id]) {
        role = roleTree[company_id]
      } else {
        role = await db.SugoRole.findOne({
          where: {
            company_id,
            type: 'built-in'
          },
          ...transaction
        })
        role = role.get({ plain: true })
        roleTree[company_id] = role
      }

      await db.SugoDatasources.update({
        role_ids: [role.id]
      }, {
        where: {id},
        ...transaction
      })
    }

    let dims = await db.SugoDimensions.findAll(transaction)
    dims = dims.map(d => d.get({ plain: true }))
    for (let dim of dims) {
      let {company_id, id} = dim
      let role = roleTree[company_id]
      await db.SugoDimensions.update({
        role_ids: [role.id]
      }, {
        where: {id},
        ...transaction
      })
    }

    let mes = await db.SugoMeasures.findAll(transaction)
    mes = mes.map(d => d.get({ plain: true }))
    for (let me of mes) {
      let {company_id, id} = me
      let role = roleTree[company_id]
      await db.SugoMeasures.update({
        role_ids: [role.id]
      }, {
        where: {id},
        ...transaction
      })
    }

    await db.Meta.create({
      name: 'update-log',
      value: '0.6.4'
    }, transaction)

    await db.Meta.update({
      value: '0.6.4'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.6.4 done')
}
