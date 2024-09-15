import { log } from '../utils/log'

export default async db => {

  let slices = await db.Slices.findAll()
  slices = slices.map(s => s.get({ plain: true }))

  for (let slice of slices) {
    let user_id = slice.created_by
    let slice_id = slice.id
    let {company_id} = slice
    await db.SugoUserSlice.create({
      user_id,
      slice_id,
      company_id
    })
  }

  //'/app/user/get' -> common
  await db.Route.update({
    common: true
  }, {
    where: {
      path: '/app/user/get'
    }
  })

  await db.Meta.create({
    name: 'update-log',
    value: '0.5.12'
  })

  await db.Meta.update({
    value: '0.5.12'
  }, {
    where: {
      name: 'version'
    }
  })

  log('update 0.5.12 done')
}
