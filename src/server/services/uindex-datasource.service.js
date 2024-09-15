import FetchKit from '../utils/fetch-kit'
import CONFIG from '../config'
import TagHqlService from './sugo-tag-hql.service'
import TagHqlImportService from './sugo-tag-hql-import-file.service'
import _ from 'lodash'
import { TAG_DEFAULT_DIMENSIONS } from '../../common/sdk-access-dimensions'
import {getDefaultHiveDb} from '../controllers/hive.controller'

const { hmaster, taskSpec = {}, hproxy } = CONFIG.uindex || {}
const hproxyFirstUrl = hproxy?.split(',')?.[0]

export default class UindexDatasourceService {

  static getInstance() {
    if (!this._instance) {
      this._instance = new UindexDatasourceService()
    }
    return this._instance
  }

  /**
   * @description 获取hmaster-leader-host
   * @returns
   * @memberOf UindexDatasourceService
   */
  async getLeaderHost() {
    return await FetchKit.get(`${hmaster}/druid/hmaster/v1/leader`, null, {
      timeout: 15000,
      handleResponse: res => {
        let host = hmaster  //如果leader未返回host用原配置文件的host
        try {
          host = res.text()
        } catch (e) {
          console.log(`请求${hmaster}/druid/hmaster/v1/leader错误`)
        }
        return host
      }
    })
  }

  /**
   * @description 是否已创建uindex数据源表
   * @param {any} datasourceName
   * @returns
   * @memberOf UindexDatasourceService
   */
  async existsTable(datasourceName) {
    const leaderHost =  await this.getLeaderHost()
    const url = `http://${leaderHost}/druid/hmaster/v1/datasources`
    // 先获取所有已创建uindex-table列表，判断是否已创建
    const datasources = await FetchKit.get(url)
      .catch(e => {
        console.log(e.stack)
        return []
      })
    return _.includes(datasources, datasourceName)
  }
  
  /**
   * @description 标签项目初始化时：创建uindex表和创建hive关联表
   * @param {any} datasourceName
   * @param {string} [dimension='distinct_id']
   * @param {Array<Object>} [dimensions=[]]
   * @memberOf UindexDatasourceService
   */
  async createUindexTableAndHiveTable(datasourceName, dimensionName, dimensions = [], userDemandPartitions = null, needUindexSpec = false) {
    // https://github.com/Datafruit/public-docs/blob/master/uindex/datasource-manage.md
    let { partitions = 2, partitionNum = -1, columnDelimiter = '\u0001', dimension = 'distinct_id' } = taskSpec
    if (dimensionName) {
      dimension = dimensionName
    }
    if (!dimensions.length) { // 默认主键维度
      dimensions = [{
        type: 'string',
        name: dimension,
        hasMultipleValues: false
      }]
    }
    
    if (TAG_DEFAULT_DIMENSIONS.length) {
      _.each(TAG_DEFAULT_DIMENSIONS, p => {
        dimensions.push({
          type: 'string',
          name: p[0],
          hasMultipleValues: false
        })
      })
    }
    // 1.创建uindex表
    const uindexSpec = {
      datasourceName,
      partitions: userDemandPartitions || partitions,
      shardSpec: {
        type: 'single',
        dimension,
        partitionNum
      },
      columnDelimiter,
      dimensions
    }
    // curl -X POST 'http://{hmaster_ip}:8086/druid/hmaster/v1/datasources' -H 'Content-Type:application/json' -d '
    const leaderHost =  await this.getLeaderHost()
    const url = `http://${leaderHost}/druid/hmaster/v1/datasources`
    // 先获取所有已创建uindex-table列表，判断是否已创建
    let createdUindex = false
    const hasCreatedTable = await this.existsTable(datasourceName)
    if (!hasCreatedTable) { // 未创建uindex表的时候
      console.log('create-uindex-table =>', JSON.stringify(uindexSpec, null, 2))
      const res = await FetchKit.post(url, uindexSpec)
      // { "msg": "create tag_test12 successfully" }
      // { "error": "DataSource[tag_test12] already exists" }
      if(res.error) {
        if (res.error.indexOf('already exists') > -1) { // ignore exists table
          createdUindex = true
        } else {
          throw new Error(res.error)
        }
      }
      createdUindex = true
    } else {
      createdUindex = true
    }
    if (!createdUindex) {
      return false
    }
    // 2. 创建hive关联表
    // TODO drop table ....
    const defaultHiveDbName = getDefaultHiveDb()
    const hiveDbNamePrefix = defaultHiveDbName === 'default' ? '' : `${defaultHiveDbName}.`
    const createTableHql = `CREATE EXTERNAL TABLE if not exists ${hiveDbNamePrefix}${datasourceName} (
        ${dimension} string
      )
      ROW FORMAT SERDE 'io.druid.hyper.hive.serde.DruidSerDe'
      STORED BY 'io.druid.hyper.hive.DruidStorageHandler'
      TBLPROPERTIES (
        "druid.datasource" = "${datasourceName}",
        "druid.hmaster.address.default" = "${leaderHost}"
      )
    `
    console.log('create hive table => ', createTableHql)
    const tagHqlService = TagHqlService.getInstance()
    await tagHqlService.runQueryWithoutQueryId({ sql: createTableHql })
      .catch(e => {
        throw new Error('create hive table error => ' + e.message)
      })
    if (needUindexSpec) return uindexSpec
    return true
  }

  async dataImport(datasourceName, data=[], fileInfo) {
    // https://github.com/Datafruit/public-docs/blob/master/uindex/ingestion.md
    // curl -X POST 'http://{hproxy_ip}:8088/druid/proxy/batchupdate/{datasourceName}' -H 'Content-Type:application/json' -d '{data}'
    const url = `${hproxyFirstUrl}/druid/proxy/batchupdate/${datasourceName}`
    /**
     *data: [{
        "values":{"app_id":"4", "event_id":"0004"},
        "appendFlags":{"event_id":false}
      }]
     */
    let allLength = data.length
    let res = {}
    let length = 0
    for (let _data=data.splice(0, 5000); _data.length>0; _data=data.splice(0, 5000)) {
      length += _data.length
      res = await FetchKit.post(url, _data)
      if (res.failed > 0) {
        break
      }
    }

    // const res = await FetchKit.post(url, data)
    if(res.failed > 0) {
      console.log('uindex data-import error =>', res)
      const error = new Error('uindex data-import error')
      error.payload = res
      throw error
    } else {
      const hasFile = await TagHqlImportService.getInstance().findById(fileInfo.id)
      if (!hasFile.result) {
        await TagHqlImportService.getInstance().create({ ...fileInfo, state: 1})
      }
    }
    return {...res, success: length, failed: allLength-length}
  }
  
  /**
   * @description 删除uindex 表，数据
   * @param {any} datasourceName
   * @returns
   * @memberOf UindexDatasourceService
   */
  async removeFore(datasourceName) {
    // curl -X DELETE http://{hmaster_ip}:8086/druid/hmaster/v1/datasources/force/{datasourceName}
    const leaderHost =  await this.getLeaderHost()
    const url = `http://${leaderHost}/druid/hmaster/v1/datasources/force/${datasourceName}`
    // res => delete {dataSourceName} successfully
    const res = await FetchKit.delete(url, null, {
      handleResponse: res => {
        return res.text()
      }
    })
    const dropTableHql = `DROP TABLE IF EXISTS ${datasourceName}`
    console.log('drop hive table => ', dropTableHql)
    const tagHqlService = TagHqlService.getInstance()
    await tagHqlService.runQueryWithoutQueryId({ sql: dropTableHql })
      .catch(e => {
        throw new Error('drop hive table error => ' + e.message)
      })
    // TODO 删除hive关联表
    return res.includes('successfully') > -1
  }
  
  /**
   * @description 获取spec里维度名字，segment里可能还没有数据的维度在这里也存在
   * @param {any} datasourceName
   * @returns
   * @memberOf UindexDatasourceService
   */
  async getSpecDimesnion(datasourceName) {
    // curl http://{hmaster_ip}:8086/druid/hmaster/v1/datasources/dimensions/{datasource_name}
    const leaderHost =  await this.getLeaderHost()
    const url = `http://${leaderHost}/druid/hmaster/v1/datasources/dimensions/${datasourceName}`
    const res = await FetchKit.get(url)
    return res
  }
  
  /**
   * @description 获取Uinde数据加载完成进度状态
   * @returns {Object} 数据源对应数据加载进度 100=已加载完成,0=未加载完成...
   * @memberOf UindexDatasourceService
   */
  async getUindexLoadStatus() {
    //curl http://{hmaster_ip}:8086/druid/hmaster/v1/loadstatus
    /**
     *
     * return
     * {
        "uindex_r1aJyE6dM_project_8al1TRqip": 100,
        "projects": 100,
        "user_tag": 100,
        "users_message": 100,
        ...
      }
     */
    const leaderHost =  await this.getLeaderHost()
    const url = `http://${leaderHost}/druid/hmaster/v1/loadstatus`
    return await FetchKit.get(url)
  }
  
}
