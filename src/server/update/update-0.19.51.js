import { log } from '../utils/log'
import { addColumn, checkAttributeExists } from '../utils/db-utils'

export default async db => {
  const version = '0.19.51'

  await db.client.transaction(async t => {
    const transaction = { transaction: t }
    let has = await checkAttributeExists(db, transaction, 'sugo_track_event', 'sugo_autotrack_path')
    if (!has) {
      await addColumn(db, transaction, 'sugo_track_event', 'sugo_autotrack_path', {
        type: db.Sequelize.STRING(500)
      })
    }
    has = await checkAttributeExists(db, transaction, 'sugo_track_event', 'sugo_autotrack_position')
    if (!has) {
      await addColumn(db, transaction, 'sugo_track_event', 'sugo_autotrack_position', {
        type: db.Sequelize.STRING(50)
      })
    }
    has = await checkAttributeExists(db, transaction, 'sugo_track_event', 'sugo_autotrack_page_path')
    if (!has) {
      await addColumn(db, transaction, 'sugo_track_event', 'sugo_autotrack_page_path', {
        type: db.Sequelize.STRING(200)
      })
    }

    has = await checkAttributeExists(db, transaction, 'sugo_track_event_draft', 'sugo_autotrack_path')
    if (!has) {
      await addColumn(db, transaction, 'sugo_track_event_draft', 'sugo_autotrack_path', {
        type: db.Sequelize.STRING(500)
      })
    }
    has = await checkAttributeExists(db, transaction, 'sugo_track_event_draft', 'sugo_autotrack_position')
    if (!has) {
      await addColumn(db, transaction, 'sugo_track_event_draft', 'sugo_autotrack_position', {
        type: db.Sequelize.STRING(50)
      })
    }
    has = await checkAttributeExists(db, transaction, 'sugo_track_event_draft', 'sugo_autotrack_page_path')
    if (!has) {
      await addColumn(db, transaction, 'sugo_track_event_draft', 'sugo_autotrack_page_path', {
        type: db.Sequelize.STRING(200)
      })
    }
    // 检查列是否存在
    const has_buried_point_init = await checkAttributeExists(db, transaction, 'sugo_data_analysis', 'auto_track_init')
    if (!has_buried_point_init) {
      // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
      await addColumn(
        db,
        transaction,
        'sugo_data_analysis',
        'auto_track_init',
        {
          type: db.Sequelize.BOOLEAN,
          defaultValue: false
        },
        transaction
      )
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
