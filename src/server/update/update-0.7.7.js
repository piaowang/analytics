import { log } from '../utils/log'
import {doMigration} from '../../common/data-migration'

export default async db => {


  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    let slices = await db.Slices.findAll({
      where: {
        'params.relativeTime': {
          $ne: null
        }
      },
      ...transaction
    })

    debug(slices.length, 'slices to migrate')

    for(let slice of slices) {
      let params = doMigration(slice.params)
      await slice.update({
        params,
        updated_at: slice.updated_at
      }, {
        ...transaction,
        raw: true
      })
    }
    
    await db.Meta.create({
      name: 'update-log',
      value: '0.7.7'
    }, transaction)

    await db.Meta.update({
      value: '0.7.7'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.7.7 done')
}
