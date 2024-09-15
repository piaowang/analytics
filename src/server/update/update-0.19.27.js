import { log } from '../utils/log'
import { checkAttributeExists } from '../utils/db-utils'

export default async db => {

  const version = '0.19.27'
  await db.client.transaction(async t => {

    const transaction = { transaction: t }
    const flag = await checkAttributeExists(db, transaction, 'sugo_user', 'institutions_id')
    if (!flag) {
      // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
      await db.client.queryInterface.addColumn(
        'sugo_user',
        'institutions_id',
        {
          type: db.Sequelize.STRING(32)
        },
        transaction
      )
    }

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
