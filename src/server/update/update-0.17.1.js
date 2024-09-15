/**
 * SDKPageInfoCategories 表增加 event_bindings_version 字段
 * @see {SDKPageCategoriesModel}
 */
import { log } from '../utils/log'

export default async db => {

  const version = '0.17.1'

  await db.client.transaction(async t => {

    const transaction = { transaction: t }
    try {
      await db.client.query('SELECT event_bindings_version FROM sugo_sdk_page_categories LIMIT 1')
    } catch (e) {
      log('update-0.17.1 -> %s', e.message)

      // 不存在时插入
      if (e.message.indexOf('event_bindings_version') !== -1) {
        await db.client.query(
          'ALTER TABLE sugo_sdk_page_categories ADD COLUMN event_bindings_version INTEGER',
          {
            type: db.client.QueryTypes.RAW,
            ...transaction
          }
        )
      } else {
        // 其他情况则表示出错
        throw e
      }
    }

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
