/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   09/12/2017
 * @description 设置系统码、产品线、接口方、错误码唯一性检测，版本号升级到0.18.6
 */
import { log } from '../utils/log'

export default async db => {

  const version = '0.18.6'
  const config = [
    {
      table: 'log_code_interface_code',
      unique_name: 'interface_code_unique',
      fields: ['code', 'system_id', 'module_id']
    },
    {
      table: 'log_code_log_code',
      unique_name: 'log_code_unique',
      fields: ['code', 'system_id', 'module_id', 'interface_id']
    },
    {
      table: 'log_code_module_code',
      unique_name: 'module_code_unique',
      fields: ['code', 'system_id']
    },
    {
      table: 'log_code_system_code',
      unique_name: 'system_code_unique',
      fields: ['code', 'project_id']
    }
  ]
  const SQLS = config.map(conf => {
    return `ALTER TABLE ${conf.table} ADD CONSTRAINT ${conf.unique_name} UNIQUE (${conf.fields.join(',')})`
  })

  await db.client.transaction(async t => {
    const transaction = { transaction: t }

    for (let sql of SQLS) {
      await db.client.query(sql, {
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
    },
    {
      where: { name: 'version' },
      ...transaction
    }
    )

    log(`update ${version} done`)
  })
}
