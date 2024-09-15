import { log } from '../utils/log'
import { rawQueryWithTransaction, rawQuery } from '../utils/db-utils'

export default async db => {

  const version = '0.18.9'
  const arr = [
    'ALTER TABLE sugo_dimensions ADD COLUMN tag_extra JSONB default \'{}\';',
    'ALTER TABLE tag_type ADD COLUMN tag_tree_id varchar(32);'
  ]

  await db.client.transaction(async t => {

    const transaction = { transaction: t }
    // 1. 更新表结构
    await rawQuery(db, arr)

    /*************************************历史数据处理start********************************* */
    // 2. 迁移历史tag_type数据到sugo_tag_type_tree表
    let types = await db.client.query(
      'SELECT DISTINCT ON (datasource_id, type) id, type, datasource_id, company_id, created_by, updated_by, created_at, updated_at FROM tag_type',
      { type: db.client.QueryTypes.SELECT, ...transaction }
    )
    const typeTrees = types.map(t => {
      return {
        parent_id: '-1',
        name: t.type,
        ...t
      }
    })
    await db.SugoTagTypeTree.bulkCreate(typeTrees, { ...transaction })

    // 更新tag_type表的tag_tree_id
    for(let t of typeTrees) {
      await db.TagType.update({tag_tree_id: t.id}, {
        where: {
          type: t.type
        },
        ...transaction
      })
    }
    /*************************************历史数据处理end********************************* */

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
