import { log } from '../utils/log'
import {rawQueryWithTransaction} from '../utils/db-utils'

export default async db => {

  let arr = [
    'DROP TYPE IF EXISTS "public"."enum_sugo_datasources_access_type"; ',
    'CREATE TYPE "public"."enum_sugo_datasources_access_type" AS ENUM(\'single\', \'mysql\', \'android\', \'csv\', \'json\');',
    'ALTER TABLE "public"."sugo_datasources" ADD COLUMN "access_type" "public"."enum_sugo_datasources_access_type" DEFAULT \'single\''
  ]

  //const  queryInterface = db.client.getQueryInterface()
  await db.client.transaction(async t  => {
    const transaction = { transaction: t }

    await rawQueryWithTransaction(db, arr, t)
    //改成queryInterface方式
    // await queryInterface.QueryGenerator.pgEnumDrop('sugo_datasources', 'enum_sugo_datasources_access_type')
    // await queryInterface.addColumn(
    //   'sugo_datasources',
    //   'access_type',
    //   {
    //     type: db.Sequelize.ENUM,
    //     values: ['single', 'mysql', 'android', 'csv', 'json'],
    //     comment: '数据源接入类型',
    //     defaultValue: 'single'
    //   }, 
    //   transaction
    // )

    await db.Meta.create({
      name: 'update-log',
      value: '0.6.3'
    }, transaction)

    await db.Meta.update({
      value: '0.6.3'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })

  log('update 0.6.3 done')
}
