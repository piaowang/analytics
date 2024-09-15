// run sql raw array
import { err, warn } from './log'
import _ from 'lodash'
import config from '../config'
import { quoteIdentifiers } from '../models'
import SMKit from 'common/jssm4'

export async function rawQueryWithTransaction (db, arr, transaction) {
  for (let sql of arr) {
    await db.client.query(sql, { type: db.client.QueryTypes.RAW, transaction })
  }
}

export async function rawQuery (db, arr) {
  for (let sql of arr) {
    try {
      await db.client.query(sql, { type: db.client.QueryTypes.RAW })
    } catch(e) {
      err(e.stack)
      err('run', sql, 'not ok')
    }
  }
}

export async function dropTables (db, tables, t) {
  let arr = tables.map(t => {
    return `DROP TABLE ${t};`
  })
  if (t) {
    return rawQueryWithTransaction(db, arr, t)
  }
  return rawQuery(db, arr)
}

export async function backupTables (db, tables) {
  let obj = {}
  let {client} = db
  for(let t of tables) {
    obj[t] = await client.query(
      `select * from ${client.queryInterface.QueryGenerator.quoteIdentifiers(t)}`,
      { type: client.QueryTypes.SELECT }
    )
  }
  return obj
}

export async function checkColumnExists(db, transaction, tableName, columnName, schemeName = 'public') {
  let sql = `
  SELECT EXISTS (SELECT 1
  FROM information_schema.columns
  WHERE table_schema= ${quoteIdentifiers(`${schemeName}`)} AND table_name=${quoteIdentifiers(`${tableName}`)} AND column_name=${quoteIdentifiers(`${columnName}`)});`

  let res = await db.client.query(sql, { type: db.client.QueryTypes.RAW, transaction })
  return res && res[0] && res[0][0].exists
}

/**
 * @description 检查字段名是否存在某个表model
 * @export
 * @param {any} db
 * @param {any} modelName 表对应的sequelize模型名称
 * @param {any} columnName 表字段名称
 * @returns
 */
export async function checkAttributeExists(db, transaction, tableName, columnName) {
  // desc table
  const res = await db.client.queryInterface.describeTable(tableName, transaction)
  return _.includes(_.keys(res), columnName)
}

/**
 * @description 给表增加列
 * @export
 * @param {any} db 
 * @param {any} transaction
 * @param {any} tableName 
 * @param {any} columnName
 * @param {any} columnTypeOption
 */
export async function addColumn(db, transaction, tableName, columnName, columnTypeOption) {
  const exists = await checkAttributeExists(db, transaction, tableName, columnName)
  if (!exists) {
    // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
    await db.client.queryInterface.addColumn(
      tableName,
      columnName,
      columnTypeOption,
      transaction
    )
  }
}

/**
 * @description 修改表的列
 * @export
 * @param {any} db 
 * @param {any} transaction
 * @param {any} tableName 
 * @param {any} columnName
 * @param {any} columnTypeOption
 */
export async function changeColumn(db, transaction, tableName, columnName, columnTypeOption) {
  const exists = await checkAttributeExists(db, transaction, tableName, columnName)
  if (exists) {
    // https://sequelize.org/master/class/lib/query-interface.js~QueryInterface.html
    await db.client.queryInterface.changeColumn(
      tableName,
      columnName,
      columnTypeOption,
      transaction
    )
  } else {
    await db.client.queryInterface.addColumn(
      tableName,
      columnName,
      columnTypeOption,
      transaction
    )
  }
}

/**
 * @description 批量添加表字段信息
 * @export
 * @param {any} db 
 * @param {any} transaction 
 * @param {any} [options=[{ table, column, type }]]
 */
export async function addColumns(db, transaction, options = []) {
  for (const option of options) {
    const { table, column, type } = option
    await addColumn(db, transaction, table, column, type)
  }
}

export function getSM4Result(inpVal) {
  const { site: { keyComp1: k1, kitPrefix: p1 } } = config
  let result = inpVal
  if (!_.isEmpty(result) && !_.isEmpty(k1) && !_.isEmpty(p1)) { // 数据库密码采用国密加密处理
    const params = k1 + p1
    const smKit = new SMKit(params)
    const getVal = (v) => smKit.decryptData_ECB(v)
    result = getVal(result)
  }
  return result
}
