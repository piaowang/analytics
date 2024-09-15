import { log } from '../utils/log'

import {insertLivefeedTemplate, insertTemplatePicture} from '../models/init-customizable-livefeed'


export default async db => {

  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    await insertTemplatePicture(db, transaction)

    await insertLivefeedTemplate(db, transaction)

    await db.Meta.create({
      name: 'update-log',
      value: '0.7.4'
    }, transaction)

    await db.Meta.update({
      value: '0.7.4'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.7.4 done')
}

