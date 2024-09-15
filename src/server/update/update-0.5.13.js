import { log } from '../utils/log'

export default async db => {

  await db.Route.destroy({
    where: {
      path: '/reset-password'
    }
  })

  await db.Meta.create({
    name: 'update-log',
    value: '0.5.13'
  })

  await db.Meta.update({
    value: '0.5.13'
  }, {
    where: {
      name: 'version'
    }
  })

  log('update 0.5.13 done')
}
