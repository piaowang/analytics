import { log } from '../utils/log'
import {checkColumnExists, rawQueryWithTransaction} from '../utils/db-utils'

export default async db => {

  const version = '0.19.28'

  await db.client.transaction(async t => {
    const transaction = { transaction: t }
  
    // 这个列已存在表示数据表是先同步再进行数据库升级，无需重复插入
    let has_start_time = await checkColumnExists(db, t, 'sugo_offline_calc_indices', 'start_time')

    const arr = has_start_time ? [
      `ALTER TABLE "sugo_business_dimension_role" ADD FOREIGN KEY ("business_dimension_id") REFERENCES "sugo_business_dimension" ("id");
       ALTER TABLE "sugo_business_dimension_role" ADD FOREIGN KEY ("role_id") REFERENCES "sugo_role" ("id");`
    ] : [
      `ALTER TABLE "sugo_business_dimension_role" ADD FOREIGN KEY ("business_dimension_id") REFERENCES "sugo_business_dimension" ("id");
       ALTER TABLE "sugo_business_dimension_role" ADD FOREIGN KEY ("role_id") REFERENCES "sugo_role" ("id");`,
      'ALTER TABLE "sugo_offline_calc_indices" ADD COLUMN "start_time" TIMESTAMP;',
      'ALTER TABLE "sugo_offline_calc_indices" ADD COLUMN "end_time" TIMESTAMP;',
      'ALTER TABLE "sugo_offline_calc_indices" ADD COLUMN "statistical_type" INTEGER;',
      'ALTER TABLE "sugo_offline_calc_indices" ADD COLUMN "is_summary" INTEGER;',
      'ALTER TABLE "sugo_offline_calc_indices" ADD COLUMN "generation_cycle" INTEGER;',
      'ALTER TABLE "sugo_offline_calc_indices"  ADD COLUMN "data_format" INTEGER;',
      'ALTER TABLE "sugo_offline_calc_indices"  ADD COLUMN "is_landing" INTEGER;',
      'ALTER TABLE "sugo_offline_calc_indices"  ADD COLUMN "is_publish" INTEGER;',
      'ALTER TABLE "sugo_offline_calc_indices"  ADD COLUMN "business_line" VARCHAR(32);',
      'ALTER TABLE "sugo_offline_calc_indices"  ADD COLUMN "business_definition" VARCHAR(128);'
    ]
  
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
