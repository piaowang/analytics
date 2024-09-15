import { log } from '../utils/log'

export default async db => {

  //'/app/user/get' -> common
  // /console/datasource/upload /console/datasource/:datasourceId /app/datasource/create/upload
  await db.Route.destroy({
    where: {
      path: {
        $in: [
          '/console/datasource/upload',
          '/console/datasource/:datasourceId',
          '/app/datasource/create/upload'
        ]
      }
    }
  })

  await db.Meta.create({
    name: 'update-log',
    value: '0.6.0'
  })

  await db.Meta.update({
    value: '0.6.0'
  }, {
    where: {
      name: 'version'
    }
  })

  log('update 0.6.0 done')
}
