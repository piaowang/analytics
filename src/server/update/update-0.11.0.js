import {log} from '../utils/log'
import {rawQueryWithTransaction} from '../utils/db-utils'

export default async db => {
  await db.client.transaction(async transaction => {

    let sqls = [
      'ALTER TABLE public.sugo_company ADD is_root boolean default false;',
      'ALTER TABLE public.sugo_company ADD deleted boolean default false;'
    ]

    await rawQueryWithTransaction(db, sqls, transaction)

    let root = await db.SugoCompany.findOne({
      where: {
        type: 'payed'
      },
      transaction
    })

    await db.SugoCompany.update({
      is_root: true,
      active: true
    }, {
      where: {
        id: root.id
      },
      transaction
    })

    await db.Meta.create({
      name: 'update-log',
      value: '0.11.0'
    }, {transaction})

    await db.Meta.update({
      value: '0.11.0'
    }, {
      where: { name: 'version' },
      transaction
    })
  })

  log('update 0.11.0 done')
}
