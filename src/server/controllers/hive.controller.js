/**
 * Created by fengxj on 3/26/19.
 */
import {returnError, returnResult} from '../utils/helper'
import conf from '../config'
import {promiseWithTimeout} from '../../common/sugo-utils'
const {hive} = conf
const thrift = require('thrift')
const transport = thrift.TBufferedTransport
const ThriftHive = require('../utils/hive/lib/ThriftHiveMetastore')
const server = hive.metastoreHost
const port = hive.metastorePort
const options = {transport: transport, timeout: 10000}

export async function getAllHiveDatabase() {
  try {
    const connection = thrift.createConnection(server, port, options)
    const client = thrift.createClient(ThriftHive, connection)
    const res = await promiseWithTimeout(client.get_all_databases(), 5000, [])
    connection.end()
    return res
  } catch (e) {
    console.error(e)
    return []
  }
}

export async function getAllHiveTablesByDatabase(database) {
  try {
    const connection = thrift.createConnection(server, port, options)
    const client = thrift.createClient(ThriftHive, connection)
    const res = await promiseWithTimeout(client.get_all_tables(database), 5000, [])
    connection.end()
    return res
  } catch (e) {
    console.error(e)
    return []
  }
}

export async function getAllTableFieldsByTable(database, table) {
  try {
    
    const connection = thrift.createConnection(server, port, options)
    const client = thrift.createClient(ThriftHive, connection)
    const res = await promiseWithTimeout(client.get_schema(database, table), 5000, [])
    connection.end()
    return res
  } catch (e) {
    console.error(e)
    return []
  }
}

async function getDatabases(ctx) {
  const res = await getAllHiveDatabase()
  returnResult(ctx, {databases: res})
}

async function getTables(ctx) {
  const {database} = ctx.params
  const res = await getAllHiveTablesByDatabase(database)
  returnResult(ctx, {tables: res})
}

async function getSchema(ctx) {
  const {database, table} = ctx.params
  const res = await getAllTableFieldsByTable(database, table)
  returnResult(ctx, {schema: res})
}

async function getHost(ctx) {
  try {
    const hostInfo = getHostHandle()
    returnResult(ctx, hostInfo)
  } catch (e) {
    returnError(ctx, e.message)
  }
}

function getHostHandle() {
  let m = (hive.url || '').match(/:\/\/([\w.]+):(\d+)/)
  if (!m) {
    throw new Error('invalid hive url')
  }
  return {
    host: m[1],
    port: +m[2]
  }
}

export function getDefaultHiveDb() {
  let m = (hive.url || '').match(/:\/\/(?:[\w.]+):(?:\d+)\/?([^/\s]*)/)
  return m && m[1] || 'default'
}

export default {
  getDatabases,
  getTables,
  getSchema,
  getHost,
  getHostHandle
}
