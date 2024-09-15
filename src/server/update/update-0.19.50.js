import { log } from '../utils/log'
import _ from 'lodash'
import { addColumn, checkAttributeExists } from '../utils/db-utils'

export default async db => {
  const version = '0.19.52'

  await db.client.transaction(async t => {
    const transaction = { transaction: t }
    const has = await checkAttributeExists(db, transaction, 'sugo_tag_dictionary', 'tag_order')
    if (!has) {
      await addColumn(db, transaction, 'sugo_tag_dictionary', 'tag_order', {
        type: db.Sequelize.INTEGER,
        defaultValue: 0
      })
    }
    await db.Meta.create(
      {
        name: 'update-log',
        value: version
      },
      transaction
    )

    await db.Meta.update(
      {
        value: version
      },
      {
        where: { name: 'version' },
        ...transaction
      }
    )

    log(`update ${version} done`)
  })
}
// alter table sugo_tags modify type enum('offline_calc_dimension', 'dimension', 'dimension_layer', 'offline_calc_index', 'measure', 'offline_calc_model', 'abc', 'user_group', 'sugo_data_apis', 'slices') not null;
