import Sequelize from 'sequelize'
import _ from 'lodash'
import {OfflineCalcDataSourceDefaultSchema} from '../../common/constants'
import {guessDruidStrTypeByDbDataType, guessSimpleTypeByDbDataType} from '../../common/offline-calc-model-helper'

export async function rawShowTables(args) {
  let {hostAndPort, database, schema, user, password} = args
  let tables = await rawSQLQueryForSQLServer('SELECT * FROM INFORMATION_SCHEMA.TABLES where TABLE_SCHEMA = :schema',
    {schema: schema || OfflineCalcDataSourceDefaultSchema.SQLServer},
    hostAndPort,
    database,
    user,
    password
  )
  return _.map(tables, t => t.TABLE_NAME)
}

export async function rawDescTable(args) {
  let {tableName, hostAndPort, database, schema, user, password} = args
  let sql = `
    select *
    from information_schema.columns
    where table_name = :tableName and TABLE_SCHEMA = :schema
    order by ordinal_position`
  let fields = await rawSQLQueryForSQLServer(sql, {tableName, schema: schema || OfflineCalcDataSourceDefaultSchema.SQLServer}, hostAndPort, database, user, password)
  return fields.map(f => {
    let {COLUMN_NAME, DATA_TYPE} = f
    return {
      Field: COLUMN_NAME,
      Type: guessDruidStrTypeByDbDataType(DATA_TYPE),
      RawType: DATA_TYPE
    }
  })
}


export async function rawSQLQueryForSQLServer(sql, binds, hostAndPort, database, user, password) {
  let [host, port] = hostAndPort.split(':')
  let sequelize = new Sequelize(database, user, password, {
    host,
    port: (+port || 1433),
    dialect: 'mssql',
    logging: console.log,
    dialectOptions: {
      authentication: 'SQL Server Authentication'
    }
  })
  
  let res = await sequelize.query(sql, { replacements: binds, type: sequelize.QueryTypes.SELECT })
  return res
}
