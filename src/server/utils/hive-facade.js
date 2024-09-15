import {guessDruidStrTypeByDbDataType} from '../../common/offline-calc-model-helper'
import conf from '../config'
import {getAllHiveTablesByDatabase, getAllTableFieldsByTable} from '../controllers/hive.controller'

const { hive } = conf

export async function rawShowTables(args) {
  let {hostAndPort, database, schema, user, password} = args
  if (hostAndPort) {
    throw new Error('暂不支持此 hive 服务器')
  }
  if (!hive.metastoreHost) {
    throw new Error('未配置 hive metastoreHost')
  }
  // 使用配置里的 hive 地址
  return await getAllHiveTablesByDatabase(database)
}

export async function rawDescTable(args) {
  let {tableName, hostAndPort, database, schema, user, password} = args
  if (!hive.metastoreHost) {
    throw new Error('未配置 hive metastoreHost')
  }
  let rawFieldInfos = await getAllTableFieldsByTable(database, tableName)
  
  return rawFieldInfos.map(fi => ({
    Field: fi.name,
    Type: guessDruidStrTypeByDbDataType(fi.type),
    RawType: fi.type
  }))
}

