import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'

export default async db => {

  const version = '0.19.23'
  const arr = [
    'ALTER TABLE "sugo_dimensions" ALTER COLUMN "name" SET DATA TYPE VARCHAR (255);',
    'ALTER TABLE "sugo_dimensions" ALTER COLUMN "title" SET DATA TYPE VARCHAR (255);',
    'ALTER TABLE "sugo_tag_dictionary" ALTER COLUMN "title" SET DATA TYPE VARCHAR (255);',
    'ALTER TABLE "sugo_tag_dictionary" ALTER COLUMN "name" SET DATA TYPE VARCHAR (255);'
  ]

  await db.client.transaction(async t => {
    
    const transaction = { transaction: t }
    
    await rawQueryWithTransaction(db, arr, t)
    
    await db.Meta.create({
      name: 'update-log',
      value: version
    }, transaction)

    await db.Meta.update({
      value: version
    }, {
      where: { name: 'version' },
      ...transaction
    })
    
    log(`update ${version} done`)
  })
}
