import _ from 'lodash'
import {guessDruidStrTypeByDbDataType} from '../../common/offline-calc-model-helper'
import { checkExisted, checkDataType } from './seqelize-facade'
import moment from 'moment'

export async function rawShowTables(args) {
  let {hostAndPort, database, user, password, schema} = args
  schema = schema || user
  let tables = await rawSQLQueryForDb2Server('select * from syscat.tables where OWNER= ? and TABSCHEMA= ? and TYPE=\'T\'', [user.toUpperCase(), schema.toUpperCase()], hostAndPort, database, user, password)
  return _.map(tables, t => t.TABNAME)
}

export async function rawSQLQueryForDb2Server(sql, binds, hostAndPort, database, user, password) {
  const ibmdb = require('ibm_db')
  let [host, port] = hostAndPort.split(':')
  return new Promise((resolve, reject) => {
    ibmdb.open(`DATABASE=${database};HOSTNAME=${host};UID=${user};PWD=${password};PORT=${port};PROTOCOL=TCPIP`, function (err,conn) {
      if (err) return reject(err)
  
      console.log(`execute db2 sql: ${sql}`, ', binds: ', binds)
      conn.query(sql, binds, function (err, data) {
        if (err) {
          console.log(err)
          reject(null)
        }
        else resolve(data)
     
        conn.close(function () {
          console.log('db2 query done')
        })
      })
    })
  })
}


export async function rawDescTable(args) {
  let {tableName, hostAndPort, database, schema, user, password} = args
  let sql = 'select * from sysibm.syscolumns where tbname = ?'
  
  let fields = await rawSQLQueryForDb2Server(sql, [tableName], hostAndPort, database, user, password)
  return fields.map(f => {
    let {NAME, COLTYPE } = f
    return {
      Field: NAME,
      Type: guessDruidStrTypeByDbDataType(COLTYPE),
      RawType: COLTYPE
    }
  })
}

export async function createLink(hostAndPort, database, user, password) {
  let connection
  console.log(hostAndPort, database, user, password)
  try {
    const ibmdb = require('ibm_db')
    let [host, port] = hostAndPort.split(':')
    connection = await new Promise((resolve, reject) => {
      ibmdb.open(`DATABASE=${database};HOSTNAME=${host};UID=${user};PWD=${password};PORT=${port};PROTOCOL=TCPIP`, function (err,conn) {
        if (err) return reject(err)
        return resolve(conn)
        conn.query(sql, binds, function (err, data) {
          if (err) {
            console.log(err)
            reject(null)
          }
          else resolve(data)
      
          conn.close(function () {
            console.log('db2 query done')
          })
        })
      })
    })
    return connection
  } catch (err) {
    console.error(err)
  }
}

export async function createTable(handler, table_name, dimensionType) {

  let types = {
    'string': 'VARCHAR(32)',
    'byte': 'int', //todo
    'boolean': 'smallint',
    'short': 'smallint',
    'int': 'int',
    'long': 'bigint',
    'float': 'float',
    'double': 'double',
    'date': 'date',
    'datetime': 'timestamp'
  }


  let existed
  try {
    existed = await checkExisted(handler, 'db2', table_name)
  } catch (e) { await handler.close() }
  if (!_.isEmpty(existed)) return
  let dataTypes = '('
  Object.keys(dimensionType).map( i => {
    dataTypes += `${i} ${types[dimensionType[i]]} default null,`
  })

  dataTypes = dataTypes.substr(0, dataTypes.length - 1)
  dataTypes += ' )'

  let sql = `CREATE TABLE ${table_name.toUpperCase()} ${dataTypes}`
  let res = await handler.querySync(sql)
  // let res = await handler.query(sql, {}, {})
  console.log(`create table ${table_name} success===`)
  await handler.close()
}

export async function importValues(handler, table_name, dimensionType, dimensionValue) {
  let existed
  try {
    existed = await checkExisted(handler, 'db2', table_name)
  } catch (e) {}
  if (_.isEmpty(existed)) {
    throw Error('该数据源不存在该表')
  }
  let col = ''
  Object.keys(dimensionType).map( i => {
    checkDataType('db2', dimensionType, existed, i)
    col += ` "${i.toUpperCase()}",`
  })
  col = col.substr(0, col.length - 1)

  let replacements = []
  let sqlParts = ''
  dimensionValue.map( (i, idx) => {
    let parts = '('
    Object.keys(dimensionType).map( j => {
      parts += '?,'
      if (dimensionType[j] === 'date' || dimensionType[j] === 'datetime') return replacements.push(i[j] ? moment(i[j]).format('YYYY-MM-DD HH:mm:ss') : null)
      replacements.push(i[j] || null)
      
    })
    parts = parts.substr(0, parts.length - 1)
    parts += '),'
    sqlParts += parts
  })

  sqlParts = sqlParts.substr(0, sqlParts.length - 1)
  await handler.query(`INSERT INTO ${table_name} (${col}) VALUES ${sqlParts}`, replacements)
  handler.close()
}
