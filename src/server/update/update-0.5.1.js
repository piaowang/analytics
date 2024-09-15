import { log } from '../utils/log'

export default async db => {

  let q = {
    where: {
      path: {
        $in: [
          '/app/insight/get/getUserGroups',
          '/app/insight/get/getUserGroups',
          '/app/role/get/getUserPermission'
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

  //delete dashboard_user table
  await db.DashboardUser.destroy({
    where: {}
  })
  await db.Meta.update({
    value: '0.5.1'
  }, {
    where: {
      name: 'version'
    }
  })
  log('update 0.5.1 done')
}
