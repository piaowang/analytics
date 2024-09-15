/**
 * 去掉细查权限记录
 */
import { log } from '../utils/log'

export default async db => {

  const version = '0.17.0'

  await db.client.transaction(async t => {

    const transaction = { transaction: t }

    await db.SugoRoleRoute.destroy({
      where: {
        route_id: 'get#/console/insight'
      },
      ...transaction
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
