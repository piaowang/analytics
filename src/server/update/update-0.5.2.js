import { log } from '../utils/log'

export default async db => {

  let q = {
    where: {
      path: {
        $in: [
          '/app/datasource/get/getDatasourcesWithDimSize',
          '/app/datasource/get/getDatasourcesWithSetting'
        ]
      }
    }
  }
  let rs = db.Route.findAll(q)
  let ids = rs.map(r => r.id)
  await db.SugoRoleRoute.destroy({
    where: {
      route_id: {
        $in: ids
      }
    }
  })
  await db.Route.destroy(q)
  await db.Route.destroy({
    where: {
      path: {
        $in: [
          '/api/datacubes',
          '/api/datasource',
          '/api/datasource/getDatasourceSetting/:id'
        ]
      }
    }
  })
  await db.Meta.update({
    value: '0.5.2'
  }, {
    where: {
      name: 'version'
    }
  })
  log('update 0.5.2 done')
}
