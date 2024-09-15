import {BaseService} from './base.service'
import SugoOfflineCalcTablesService from '../services/sugo-offline-calc-tables.service'
import SugoOfflineCalcDataSourcesService from '../services/sugo-offline-calc-data-sources.service'
import SugoOfflineCalcIndicesService from '../services/sugo-offline-calc-indices.service'
import _ from 'lodash'
import offlineCalcModelToSql from '../../common/offline-calc-model-helper'
import db from '../models'

let _inst = null

export default class SugoOfflineCalcModelsService extends BaseService {
  constructor() {
    super('SugoOfflineCalcModels')
  }
  
  static getInstance() {
    if (!_inst) {
      _inst = new SugoOfflineCalcModelsService()
    }
    return _inst
  }

  async getAllTables(where = {} ) {
    let res = await SugoOfflineCalcTablesService.getInstance().findAll(where, { raw: true })
    return res
  }

  async getAllDs(where = {} ) {
    let res = await SugoOfflineCalcDataSourcesService.getInstance().findAll(where, { raw: true })
    return res
  }

  async getAllIndeices(where = {}) {
    let res = await SugoOfflineCalcIndicesService.getInstance().findAll(where, { raw: true })
    return res
  }

  async genOpenDataApiResult({ model, dsIdDict, tbIdDict }) {
    const {
      id,
      name, 
      title, 
      params: { 
        outputCols,
        scheduleCron
      } 
    } = model

    let allIndices = await this.getAllIndeices()
    const idxIdDict = _.keyBy(allIndices, ds => ds.id)
  
    let hiveSql
    try {
      hiveSql = await offlineCalcModelToSql(model, { tableIdDict: tbIdDict, idxIdDict})
    } catch (e) {
      hiveSql = `错误：${e.message}`
    }

    return {
      id,
      name, 
      title,
      scheduleCron: _.get(scheduleCron,'cronExpression', '0 * * * *'),
      tableDeps:  _.get(model.params, 'tableDeps', []).map( table => {
        const { data_source_id, name: tableName } = tbIdDict[table]
        let t_ds = dsIdDict[data_source_id]
        return { dsName: t_ds.name, connectParams: _.omit(t_ds.connection_params, 'password'), tableName }
      }),
      idxDeps: _.get(model,'params.idxDeps', []).map(index => {
        index = idxIdDict[index]
        const {id, formula_info: { uiText }} = index
        return {
          id,
          uiText
        }
      }),
      //该顺序关系可以通过sql反映出来
      // outputCols: outputCols.map( col => {
      //   const { dimId, idxId } = col
      //   if (dimId) {
      //     const [tbId, field] = dimId.split('/')
      //     const { data_source_id, name: tableName } = tbIdDict[tbId]
      //     const ds = dsIdDict[data_source_id]
      //     return {
      //       dsName: ds.name,
      //       connectParams: ds.connection_params,
      //       tableName,
      //       field
      //     }
      //   }
      //   if (idxId) {
      //     let index = idxIdDict[idxId]
      //     const { name, title, formula_info: { text } } = index
      //     if (text.includes('createIdx') || text.includes('useIdx') || !text.includes('importDim')) {
      //       return {
      //         name,
      //         title
      //       }
      //     }
      //     return {
      //       name,
      //       title,

      //     }
      //   }
      // }),
      hiveSql
    }
  }
  
  async checkDepsIsPublic(item, transaction) {
    let idxDeps = _.get(item, 'params.idxDeps', [])
    if (!_.isEmpty(idxDeps)) {
      return true
    }
    let idxServ = SugoOfflineCalcIndicesService.getInstance()
    let privateDepIdx = await idxServ.findOne(
      {
        id: {$in: idxDeps},
        belongs_id: {$ne: db.Sequelize.col('id')}
      },
      {raw: true, transaction})
    return !privateDepIdx
  }
  
}
