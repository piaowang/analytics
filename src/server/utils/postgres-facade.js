import Sequelize from 'sequelize'
import _ from 'lodash'
import {OfflineCalcDataSourceDefaultSchema} from '../../common/constants'
import {guessDruidStrTypeByDbDataType, guessSimpleTypeByDbDataType} from '../../common/offline-calc-model-helper'

export async function rawShowTables(args) {
  let {hostAndPort, database, schema, user, password} = args
  let tables = await rawSQLQueryForPG('SELECT * FROM pg_catalog.pg_tables where schemaname = :schema',
    {schema: schema || OfflineCalcDataSourceDefaultSchema.PostgreSQL},
    hostAndPort,
    database,
    user,
    password
  )
  return _.map(tables, t => t.tablename)
}

export async function rawDescTable(args) {
  let {tableName, hostAndPort, database, schema, user, password} = args
  let sql = `
  select * from INFORMATION_SCHEMA.COLUMNS
  where table_name = :tableName and table_schema = :schema
  order by ordinal_position`
  let fields = await rawSQLQueryForPG(sql, {tableName, schema: schema || OfflineCalcDataSourceDefaultSchema.PostgreSQL}, hostAndPort, database, user, password)
  return fields.map(f => {
    let {column_name, data_type} = f
    return {
      Field: column_name,
      Type: guessDruidStrTypeByDbDataType(data_type),
      RawType: data_type
    }
  })
}


export async function rawSQLQueryForPG(sql, binds, hostAndPort, database, user, password) {
  let [host, port] = hostAndPort.split(':')
  let sequelize = new Sequelize(database, user, password, {
    host,
    port: (+port || 5432),
    dialect: 'postgres',
    logging: console.log
  })
  
  let res = await sequelize.query(sql, { replacements: binds, type: sequelize.QueryTypes.SELECT })
  return res
}
