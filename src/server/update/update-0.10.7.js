import { log } from '../utils/log'
import {rawQueryWithTransaction} from '../utils/db-utils'
import DataSourceSrv from '../services/sugo-datasource.service'
import {initDruid} from '../utils/druid-middleware'

export default async db => {

  let sqls = [
    'ALTER TABLE public.sugo_dimensions ADD is_druid_dimension BOOLEAN DEFAULT FALSE NULL;'
  ]

  await initDruid()

  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    await rawQueryWithTransaction(db, sqls, t)

    let dataSources = await db.SugoDatasources.findAll(transaction)

    for (let ds of dataSources) {
      log(`正在同步数据源 ${ds.title}（${ds.name}）的维度...`)
      await DataSourceSrv.syncDimension(ds.id, ds.company_id, undefined, t)
    }

    log(`同步维度成功，总共同步了 ${dataSources.length} 个数据源`)

    await db.Meta.create({
      name: 'update-log',
      value: '0.10.7'
    }, transaction)

    await db.Meta.update({
      value: '0.10.7'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.10.7 done')
}
