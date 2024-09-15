import { log } from '../utils/log'
import { addColumn } from '../utils/db-utils'

export default async db => {

  const version = '0.19.44'

  await db.client.transaction(async t => {

    const transaction = { transaction: t }
    
    //分享日期
    await addColumn(db, transaction, 'sugo_sharings', 'deadline', {
      type: db.Sequelize.DATE
    })

    await db.Meta.create({
      name: 'update-log',
      value: version
    }, transaction)

    await db.Meta.update({
      value: version
    }, {
      where: { name: 'version' },
      ...transaction
    })
    
    log(`update ${version} done`)
  })
}
