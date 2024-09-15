import { log } from '../utils/log'

export default async db => {

  //'/app/user/get' -> common
  await db.Route.update({
    common: true
  }, {
    where: {
      path: '/app/role/get'
    }
  })

  await db.Meta.create({
    name: 'update-log',
    value: '0.5.14'
  })

  await db.Meta.update({
    value: '0.5.14'
  }, {
    where: {
      name: 'version'
    }
  })

  log('update 0.5.14 done')
}
