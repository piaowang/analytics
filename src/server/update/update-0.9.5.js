import { log } from '../utils/log'
import {rawQueryWithTransaction} from '../utils/db-utils'

export default async db => {
  let sqlModOverview = `
    ALTER TABLE public.overview ADD gallery_id VARCHAR(32) NULL;
    ALTER TABLE public.overview
    ADD CONSTRAINT overview_sugo_gallery_id_fk
    FOREIGN KEY (gallery_id) REFERENCES sugo_gallery (id) ON DELETE CASCADE; `

  let sqlModSubscribe = `
    ALTER TABLE public.sugo_subscribe ADD gallery_id VARCHAR(32) NULL;
    ALTER TABLE public.sugo_subscribe
    ADD CONSTRAINT sugo_subscribe_sugo_gallery_id_fk
    FOREIGN KEY (gallery_id) REFERENCES sugo_gallery (id) ON DELETE CASCADE; `

  let arr = [ sqlModOverview, sqlModSubscribe ]

  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    await rawQueryWithTransaction(db, arr, t)

    await db.Meta.create({
      name: 'update-log',
      value: '0.9.5'
    }, transaction)

    await db.Meta.update({
      value: '0.9.5'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.9.5 done')
}
