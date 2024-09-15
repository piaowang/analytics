import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'
import _ from 'lodash'
import conf from '../config'

export default async db => {

  const version = '0.19.49'

  await db.client.transaction(async t => {

    const transaction = { transaction: t }

    //http://192.168.0.203/sugoio/sugo-analytics/wiki/sequelize%E5%8D%87%E7%BA%A7%E8%84%9A%E6%9C%AC-%E5%AF%B9%E6%95%B0%E6%8D%AE%E7%B1%BB%E5%9E%8B%E4%B8%BAenum%E7%9A%84%E5%AD%97%E6%AE%B5%2C%E8%B0%83%E6%95%B4%E6%9E%9A%E4%B8%BE%E9%A1%B9
    if (conf.db.dialect === 'mysql') {
      await db.client.queryInterface.changeColumn('sugo_track_event_screenshot', 'screenshot',{
        type: db.Sequelize.BLOB({ length: 'medium' }),
        allowNull: false
      }, transaction)
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
// alter table sugo_tags modify type enum('offline_calc_dimension', 'dimension', 'dimension_layer', 'offline_calc_index', 'measure', 'offline_calc_model', 'abc', 'user_group', 'sugo_data_apis', 'slices') not null;

