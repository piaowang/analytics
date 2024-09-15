/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   09/12/2017
 * @description 错误码相关的几张表名删除southern标识、版本号升级到0.18.4
 */
import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'

export default async db => {
  const version = '0.18.4'
  const tableList = [
    { prevName: 'southern_interface_code', nextName: 'log_code_interface_code' },
    { prevName: 'southern_log_code', nextName: 'log_code_log_code' },
    { prevName: 'southern_module_code', nextName: 'log_code_module_code' },
    { prevName: 'southern_system_code', nextName: 'log_code_system_code' }
  ]

  await db.client.transaction(async t => {
    const transaction = { transaction: t }

    for (let table of tableList) {
      await db.client.query(`drop table if exists ${table.nextName}`, {
        type: db.client.QueryTypes.RAW,
        transaction: t
      })
      await db.client.query(`alter table if exists ${table.prevName} rename to ${table.nextName}`, {
        type: db.client.QueryTypes.RAW,
        transaction: t
      })
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
