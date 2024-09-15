import {BaseService} from './base.service'
import {OfflineCalcDataSourceTypeEnum} from '../../common/constants'
import { createSequelizeLink, createTable, importValues } from '../utils/seqelize-facade'
import xorUtils from '../../common/xor-utils'
import { createLink as createOracleLink, createTable as createOracleTable, importValues as importOracleValues } from '../utils/oracle-facade'
import { createLink as createDb2Link, createTable as createDb2Table, importValues as importDb2Values } from '../utils/db2-facade'
import moment from 'moment'

let _inst = null

export default class SugoOfflineCalcImportTablesService extends BaseService {
  constructor() {
    super('SugoOfflineCalcImportTables')
  }
  
  static getInstance() {
    if (!_inst) {
      _inst = new SugoOfflineCalcImportTablesService()
    }
    return _inst
  }

  async createTable({datasource, table_name, dimensionType}) {
    const { 
      type,
      connection_params
    } = datasource
    const { 
      user,
      schema,
      database,
      password: pwd,
      hostAndPort 
    } = connection_params

    const password = xorUtils.decrypt(pwd)
    let dataSourceTypeDict = {}
    Object.keys(OfflineCalcDataSourceTypeEnum).map( i => {
      dataSourceTypeDict[OfflineCalcDataSourceTypeEnum[i]] = i
    })

    let handler
    let t
    switch (dataSourceTypeDict[type]) {
      case 'Oracle':
        handler = await createOracleLink(hostAndPort, database, user, password)
        await createOracleTable(handler, table_name, dimensionType)
        break
      case 'Db2':
        handler = await createDb2Link(hostAndPort, database, user, password)
        await createDb2Table(handler, table_name, dimensionType)
        break
      case 'MySQL':
        handler = await createSequelizeLink(hostAndPort, database, user, password, 'mysql')
        await createTable(handler, table_name, dimensionType, 'mysql')
        break
      case 'SQLServer':
        handler = await createSequelizeLink(hostAndPort, database, user, password, 'mssql')
        await createTable(handler, table_name, dimensionType, 'mssql')
        break
      case 'PostgreSQL':
        handler = await createSequelizeLink(hostAndPort, database, user, password, 'postgres')
        await createTable(handler, table_name, dimensionType, 'postgres')
        break
    }

    return 
  }

  async importValues(datasource, table_name, dimensionType, dimensionValue, id, transaction) {
    //检查表是否存在
    //检测字段数据类型是否和申请的相同
    //若有多余字段或字段不同数据类型则报错

    const { 
      id: datasource_id,
      type,
      connection_params
    } = datasource
    const { 
      user,
      schema,
      database,
      password: pwd,
      hostAndPort 
    } = connection_params
    const password = xorUtils.decrypt(pwd)

    let dataSourceTypeDict = {}
    Object.keys(OfflineCalcDataSourceTypeEnum).map( i => {
      dataSourceTypeDict[OfflineCalcDataSourceTypeEnum[i]] = i
    })

    let handler
    let t
    switch (dataSourceTypeDict[type]) {
      case 'Oracle':
        handler = await createOracleLink(hostAndPort, database, user, password)
        await importOracleValues(handler, table_name, dimensionType, dimensionValue)
        break
      case 'Db2':
        handler = await createDb2Link(hostAndPort, database, user, password)
        await importDb2Values(handler, table_name, dimensionType, dimensionValue)
        break
      case 'MySQL':
        handler = await createSequelizeLink(hostAndPort, database, user, password, 'mysql')
        await importValues(handler, table_name, dimensionType, dimensionValue, 'mysql')
        break
      case 'SQLServer':
        handler = await createSequelizeLink(hostAndPort, database, user, password, 'mssql')
        await importValues(handler, table_name, dimensionType, dimensionValue, 'mssql')
        break
      case 'PostgreSQL':
        handler = await createSequelizeLink(hostAndPort, database, user, password, 'postgres')
        await importValues(handler, table_name, dimensionType, dimensionValue, 'postgres')
        break
    }

    let res = await this.update({
      updated_at: moment().format('YYYY-MM-DD HH:mm:ss'),
      updated_by: id
    }, {
      datasource_id,
      table_name
    }, {
      transaction
    })
  }
}
