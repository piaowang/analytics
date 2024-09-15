import {OfflineCalcDataSourceDefaultSchema} from '../../common/constants'
import {guessDruidStrTypeByDbDataType} from '../../common/offline-calc-model-helper'
import { checkExisted, checkDataType } from './seqelize-facade'
import {mapAwaitAll} from '../../common/sugo-utils'
import _ from 'lodash'
// const childProcess = require('child_process');
// Using a fixed Oracle time zone helps avoid machine and deployment differences
process.env.ORA_SDTZ = 'UTC'

export async function rawShowTables(args) {
  const oracledb = require('oracledb')
  let {hostAndPort, database, schema, user, password} = args
  let tables = await rawSQLQueryForOracle('SELECT table_name FROM all_tables where owner = :owner',
    {owner: {val: _.toUpper(user) || OfflineCalcDataSourceDefaultSchema.Oracle, type: oracledb.STRING}},
    hostAndPort,
    database,
    user,
    password
  )
  return tables.map(colVals => colVals[0])
}

export async function rawDescTable(args) {
  const oracledb = require('oracledb')
  let {tableName, hostAndPort, database, schema, user, password} = args
  let oracleSql = `
    select column_name, data_type
    from ALL_TAB_COLUMNS
    where table_name = :tableName and owner = :owner
    order by column_id`
  let tables = await rawSQLQueryForOracle(oracleSql,
    {
      tableName: {val: tableName, type: oracledb.STRING},
      owner: {val: _.toUpper(user) || OfflineCalcDataSourceDefaultSchema.Oracle, type: oracledb.STRING}
    },
    hostAndPort,
    database,
    user,
    password
  )
  return (tables || []).map(colInfos => {
    let [colName, dataType] = colInfos
    return {
      Field: colName,
      Type: guessDruidStrTypeByDbDataType(dataType),
      RawType: dataType
    }
  })
}

export async function rawSQLQueryForOracle(sql, binds, hostAndPort, database, user, password) {
  const oracledb = require('oracledb')
  let connection
  
  try {
    connection = await oracledb.getConnection({
      user,
      password,
      connectString: `${hostAndPort}/${database}`
    })
    
    console.log(`execute oracle sql: ${sql}`, ', binds:', binds)
    let result = await connection.execute(
      sql,
      binds,
      {} //{ maxRows: 10 } //增删改记得这里需要autocommit: true
    )
    return result.rows
  } catch (err) {
    console.error(err)
  } finally {
    if (connection) {
      try {
        await connection.close()
      } catch (err) {
        console.error(err)
      }
    }
  }
}


export async function createLink(hostAndPort, database, user, password) {
  let connection
  console.log(hostAndPort, database, user, password)
  try {
    const oracledb = require('oracledb')
    connection = await oracledb.getConnection({
      user,
      password,
      connectString: `${hostAndPort}/${database}`
    })
    return connection
  } catch (err) {
    console.error(err)
  }
}

export async function createTable(handler, table_name, dimensionType) {

  let types = {
    'string': 'VARCHAR(32)',
    'byte': 'blob',
    'boolean': 'smallint',
    'short': 'smallint',
    'int': 'int',
    'long': 'long',
    'float': 'float',
    'double': 'double precision',
    'date': 'date',
    'datetime': 'timestamp'
  }

  let existed

  try {
    existed = await checkExisted(handler, 'Oracle', table_name)
  } catch (e) {}
  if (!_.isEmpty(existed)) return
  let dataTypes = '('
  Object.keys(dimensionType).map( i => {
    dataTypes += ` "${i}" ${types[dimensionType[i]]} default null,`
  })

  dataTypes = dataTypes.substr(0, dataTypes.length - 1)
  dataTypes += ' )'

  let sql = `CREATE TABLE ${table_name} ${dataTypes}`
  let res = await handler.execute(sql, {}, {})
  console.log(`create table ${table_name} success===`)
  await handler.close()
}

export async function importValues(handler, table_name, dimensionType, dimensionValue) {
  let existed
  try {
    existed = await checkExisted(handler, 'Oracle', table_name)
  } catch (e) {}
  if (_.isEmpty(existed)) {
    throw Error('该数据源不存在该表')
  }

  let col = ''
  Object.keys(dimensionType).map( i => {
    try {
      checkDataType('Oracle', dimensionType, existed, i)
    } catch(e) {
      handler.close()
      throw Error(e)
    }
    col += ` "${i}",`
  })
  col = col.substr(0, col.length - 1)

  await mapAwaitAll(dimensionValue, async (i,idx) => {
    let temp = {}
    let parts = '('
    Object.keys(dimensionType).map( j => {
      parts += `:${j}${idx},`
      temp[`${j}${idx}`] = i[j] || null
      if (dimensionType[j] === 'date' || dimensionType[j] === 'datetime') temp[`${j}${idx}`] = i[j] ? new Date(i[j]) : null
    })
    parts = parts.substr(0, parts.length - 1)
    parts += ')'
    let res = await handler.execute(`INSERT INTO ${table_name.toUpperCase()} (${col}) VALUES ${parts}`,
      temp, {autoCommit: true})
  })
  handler.close()
}
