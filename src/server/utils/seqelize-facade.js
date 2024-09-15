import Sequelize from 'sequelize'
import _ from 'lodash'

let types = {
  'db2': {
    'string': 'VARCHAR(32)',
    'byte': 'int', //TODO
    'boolean': 'smallint',
    'short': 'smallint',
    'int': 'int',
    'long': 'bigint',
    'float': 'float',
    'double': 'double',
    'date': 'date',
    'datetime': 'timestamp'
  },
  'Oracle': {
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
  },
  'mysql': {
    'string': 'VARCHAR(32)',
    'byte': 'BLOB',
    'boolean': 'TINYINT(1)',
    'short': 'SMALLINT(6)',
    'int': 'INT(32)',
    'long': 'BIGINT(20)',
    'float': 'FLOAT',
    'double': 'DOUBLE',
    'date': 'DATE',
    'datetime': 'DATETIME'
  },
  'mssql': {
    'string': 'VARCHAR(32)',
    'byte': 'smallint',
    'boolean': 'tinyint',
    'short': 'smallint',
    'int': 'integer',
    'long': 'bigint',
    'float': 'float',
    'double': 'float',
    'date': 'date',
    'datetime': 'datetime'
  },
  'postgres': {
    'string': 'VARCHAR(32)',
    'byte': 'bytea',
    'boolean': 'boolean',
    'short': 'smallint',
    'int': 'integer',
    'long': 'bigint',
    'float': 'double precision',
    'double': 'double precision',
    'date': 'date',
    'datetime': 'timestamp'
  }
}

export async function createSequelizeLink(hostAndPort, database, user, password, dialect) {

  let [host, port] = hostAndPort.split(':')
  let sequelize = new Sequelize(database, user, password, {
    host,
    port: (+port),
    dialect,
    logging: true
  })
  console.log(database, user, password, host, port, 'connect db===')
  return sequelize
}

export async function createTable(sequelize, table_name, dimensionType, dialect) {
  let existed
  try {
    existed = await checkExisted(sequelize, dialect, table_name)
  } catch (e) {}
  if (!_.isEmpty(existed)) return
  let dataTypes = '('
  Object.keys(dimensionType).map( i => {
    let dataName = `${i}`
    if (dialect === 'mssql') dataName = `[${i}]`
    if (dialect === 'mysql') dataName = `\`${i}\``
    dataTypes += ` ${dataName} ${types[dialect][dimensionType[i]]} null,`
  })

  dataTypes = dataTypes.substr(0, dataTypes.length - 1)
  dataTypes += ' )'

  let sql = `CREATE TABLE ${table_name} ${dataTypes};`
  await sequelize.query(sql)
  console.log(`create table ${table_name} success===`)
}

export async function importValues(sequelize, table_name, dimensionType, dimensionValue, dialect) {
  let existed
  try {
    existed = await checkExisted(sequelize, dialect, table_name)
  } catch (e) {
    console.log(e,'e===')
  }
  if (_.isEmpty(existed)) {
    throw Error('该数据源不存在该表')
  }

  let col = ''
  Object.keys(dimensionType).map( i => {
    checkDataType(dialect, dimensionType, existed, i)
    if (dialect === 'postgres') col += ` ${i},`
    if (dialect === 'mssql')  col += ` [${i}],`
    if (dialect === 'mysql') col += ` \`${i}\`,`
  })
  col = col.substr(0, col.length - 1)

  let replacements = {}
  let sqlParts = ''
  dimensionValue.map( (i, idx) => {
    let parts = '('
    Object.keys(dimensionType).map( j => {
      parts += `:${j}${idx},`
      replacements[`${j}${idx}`] = i[j] || null
    })
    parts = parts.substr(0, parts.length - 1)
    parts += '),'
    sqlParts += parts
  })

  sqlParts = sqlParts.substr(0, sqlParts.length - 1)

  await sequelize.query(`INSERT INTO ${table_name} (${col}) VALUES ${sqlParts};`,
    { type: sequelize.QueryTypes.INSERT, replacements })

}

export async function checkExisted(handler, dialect, table_name) {
  let existedSql = ''
  let options = {}
  switch (dialect) {
    case 'db2': 
      existedSql = 'select NAME, TYPENAME from sysibm.syscolumns where tbname = ?'
      let resdb = await handler.querySync(existedSql, [table_name.toUpperCase()])
      return resdb
    case 'Oracle':
      existedSql = 'select COLUMN_NAME, DATA_TYPE from user_tab_columns where table_name=:table_name'
      let res = await handler.execute(existedSql, { table_name: table_name.toUpperCase() })
      return _.get(res, 'rows', [])
    case 'mysql': 
      existedSql = `DESCRIBE ${table_name};`
      options = { type: handler.QueryTypes.DESCRIBE }
      break
    case 'mssql': 
      existedSql = 'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = :table_name;'
      options = { type: handler.QueryTypes.SELECT, replacements: { table_name } }
      break
    case 'postgres': 
      existedSql = 'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = :table_name;'
      options = { type: handler.QueryTypes.SELECT, replacements: { table_name } }
      break
  }
  return await handler.query(existedSql,
    options)
}

export function checkDataType(dialect, dimensionType, existed, i) {
  let dataTypeDict = {}
  let tableDataTypeDict = {}
  switch (dialect) {
    case 'db2': 
      dataTypeDict = {
        'VARCHAR': 'VARCHAR(32)',
        'SMALLINT': 'smallint',
        'BLOB': 'blob', //TODO
        'INTEGER': 'int',
        'DATE': 'date',
        'TIMESTAMP': 'timestamp',
        'DOUBLE': 'double, float',
        'BIGINT': 'bigint'
      }
      existed.map( j => {
        tableDataTypeDict[j.NAME.toLowerCase()] = j.TYPENAME
      })
      if (!dataTypeDict[tableDataTypeDict[i]].includes(types[dialect][dimensionType[i]])) {
        console.log(dataTypeDict[tableDataTypeDict[i]])
        console.log(types[dialect][dimensionType[i]])
        throw Error(`已存在表，非法数据类型${i}`)
      }
      break
    case 'Oracle': 
      dataTypeDict = {
        'VARCHAR2': 'VARCHAR(32)',
        'NUMBER': 'int,smallint',
        'FLOAT': 'float,double precision',
        'DATE': 'date',
        'TIMESTAMP(6)': 'timestamp',
        'BLOB': 'blob',
        'LONG': 'long'
      }
      existed.map( j => {
        tableDataTypeDict[j[0]] = j[1]
      })
      if (!dataTypeDict[tableDataTypeDict[i]].includes(types[dialect][dimensionType[i]])) {
        throw Error(`已存在表，非法数据类型${i}`)
      }
      break
    case 'mysql': 
      if (types[dialect][dimensionType[i]] !== _.get(existed[i], 'type')) {
        throw Error(`已存在表，非法数据类型${i}`)
      }
      break
    case 'mssql': 
      dataTypeDict = {
        'varchar': 'VARCHAR(32)',
        'int': 'integer',
        'float': 'float',
        'date': 'date',
        'datetime': 'datetime',
        'smallint': 'smallint',
        'tinyint': 'tinyint',
        'bigint': 'bigint'
      }
      existed.map( j => {
        tableDataTypeDict[j.column_name] = j.data_type
      })
      if (types[dialect][dimensionType[i]] !== dataTypeDict[tableDataTypeDict[i]])
        throw Error(`已存在表，非法数据类型${i}`)
      break
    case 'postgres': 
      dataTypeDict = {
        'character varying': 'VARCHAR(32)',
        'integer': 'integer',
        'double precision': 'double precision',
        'date': 'date',
        'timestamp without time zone': 'timestamp',
        'bytea': 'bytea',
        'boolean': 'boolean',
        'smallint': 'smallint',
        'bigint': 'bigint'
      }
      existed.map( j => {
        tableDataTypeDict[j.column_name] = j.data_type
      })
      if (types[dialect][dimensionType[i]] !== dataTypeDict[tableDataTypeDict[i]])
        throw Error(`已存在表，非法数据类型${i}`)
      break
  }
}
