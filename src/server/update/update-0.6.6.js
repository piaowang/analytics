import { log } from '../utils/log'

export default async db => {

  //const  queryInterface = db.client.getQueryInterface()
  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    let all = await db.Route.findAll()
    all = all.map(r => r.get({ plain: true }))
    let tree = {}
    let toDel = []
    for (let r of all) {
      let {path, method, title, id, group} = r
      let key = path + '__' + method + '__' + title + group
      if (tree[key]) {
        toDel.push(id)
      } else {
        tree[key] = 1
      }
    }

    log(toDel.join(','), 'duplacated')

    await db.Route.destroy({
      where: {
        id: {
          $in: toDel
        }
      },
      ...transaction
    })

    await db.SugoRoleRoute.destroy({
      where: {
        route_id: {
          $in: toDel
        }
      },
      ...transaction
    })

    await db.Meta.create({
      name: 'update-log',
      value: '0.6.6'
    }, transaction)

    await db.Meta.update({
      value: '0.6.6'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.6.6 done')
}
