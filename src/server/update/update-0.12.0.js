import {log} from '../utils/log'
import {rawQueryWithTransaction} from '../utils/db-utils'
import {permissions} from '../models/apis'
import _ from 'lodash'

export default async db => {

  await db.client.transaction(async t => {

    const transaction = {
      transaction: t
    }

    let saves = await await db.client.query(
      'select * from sugo_role_route',
      { type: db.client.QueryTypes.RAW, ...transaction }
    )
    //console.log(saves)
    //saves = saves.map(r => r.get({plain: true}))

    let sqls = [
      'alter table sugo_role_route drop column route_id',
      'alter table sugo_role_route add column route_id character varying(200);'
    ]

    await rawQueryWithTransaction(db, sqls, t)

    //重建route role 关联表
    await db.SugoRoleRoute.destroy({
      where: {},
      ...transaction
    })
    for(let item of saves[0]) {
      let route = await db.Route.findOne({
        where: {
          id: item.route_id
        },
        ...transaction
      })
      let perm = _.find(permissions, {
        method: route.method,
        path: route.path
      })
      if (perm) {
        await db.SugoRoleRoute.findOrCreate({
          where: {
            route_id: perm.id,
            role_id: item.role_id
          },
          defaults: {
            route_id: perm.id,
            role_id: item.role_id
          },
          ...transaction
        })
      } else {
        console.log(route.method, route.path, route.title, '不存在了')
      }
    }

    await db.Meta.create({
      name: 'update-log',
      value: '0.12.1'
    }, transaction)

    await db.Meta.update({
      value: '0.12.1'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.12.1 done')
}
