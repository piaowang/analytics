import {sagaSyncModel} from '../../Fetcher/saga-sync'
import _ from 'lodash'
import Fetch from '../../../common/fetch-final'
import {OfflineCalcDataSourceTypeEnum} from '../../../../common/constants'
import {forAwaitAll} from '../../../../common/sugo-utils'
import {guessDruidStrTypeByDbDataType, guessSimpleTypeByDbDataType} from '../../../../common/offline-calc-model-helper'

export const hiveDataSourcesSagaModelGenerator = (ns) => props => {
  return sagaSyncModel(
    {
      namespace: ns,
      modelName: 'hiveDataSources', // 数据结构类似 offlineCalcDataSources
      getEffect: async () => {
        let res = await Fetch.get('/app/hive/databases')
        let hiveDatabases = _.get(res, 'result.databases', [])
        let fakeDs = hiveDatabases.map(hdbName => {
          return {
            id: `hive_${hdbName}`,
            name: hdbName,
            type: OfflineCalcDataSourceTypeEnum.Hive,
            connection_params: {
              database: hdbName
            },
            tags: [],
            params: {}
          }
        })
        return fakeDs
      }
    }
  )
}

export const hiveTablesSagaModelGenerator = (namespace) => props => {
  const dsTagDict = {
    // stg: '贴源层',
    edw: '主题层',
    ods: '明细层'
    // default: '贴源层',
    // oppo: '贴源层'
  }
  return sagaSyncModel(
    {
      namespace: namespace,
      modelName: 'hiveTables',
      getEffect: async idOverwrite => {
        let queryHiveDbsRes = await Fetch.get('/app/hive/databases')
        let hiveDatabases = _.get(queryHiveDbsRes, 'result.databases', [])
        if (idOverwrite) {
          let dbAndTable = idOverwrite.substr(5)
          let hdb = _.find(hiveDatabases, hdb0 => _.startsWith(dbAndTable, `${hdb0}_`))
          let tableName = dbAndTable.substr(hdb.length + 1)
          let queryHiveTableFieldsRes = await Fetch.get(`/app/hive/${hdb}/${tableName}/schema`)
          let rawFieldInfos = _.get(queryHiveTableFieldsRes, 'result.schema', [])
          return [{
            id: `hive_${hdb}_${tableName}`,
            data_source_id: `hive_${hdb}`,
            name: tableName,
            params: {
              hiveDbName: hdb,
              fieldInfos: rawFieldInfos.map(fi => ({field: fi.name, type: guessDruidStrTypeByDbDataType(fi.type)}))
            },
            tags: [dsTagDict[hdb] || '贴源层']
          }]
        }
        let tablesArr = await forAwaitAll(hiveDatabases, async hdbName => {
          let queryHiveTablesRes = await Fetch.get(`/app/hive/${hdbName}/tables`)
          let hiveTablesOfCurrDb = _.get(queryHiveTablesRes, 'result.tables', [])
          return hiveTablesOfCurrDb.map(hTableName => {
            return {
              id: `hive_${hdbName}_${hTableName}`,
              data_source_id: `hive_${hdbName}`,
              name: hTableName,
              params: {
                hiveDbName: hdbName
              },
              tags: [dsTagDict[hdbName] || '贴源层']
            }
          })
        })
        let fakeTables = _.flatMap(tablesArr, tables => tables)
        fakeTables.forEach(t => {
          let fieldInfos = _.get(t, 'params.fieldInfos')
          if (!_.isEmpty(fieldInfos) || !t.params) {
            return
          }
          Object.defineProperty(t.params, 'fieldInfos', {
            get: function () {
              t.params = {...t.params, fieldInfos}
              window.store.dispatch({
                type: `${namespace}/reloadSingleItem`,
                payload: t.id
              })
              return fieldInfos
            }
          })
        })
        return fakeTables
      }
    }
  )
}

