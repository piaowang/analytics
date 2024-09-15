import {BaseService} from './base.service'
import { OfflineCalcTargetType, OfflineCalcVersionStatus } from '../../common/constants'
import { mapAwaitAll } from '../../common/sugo-utils'
import SugoOfflineCalcDataSourcesService from './sugo-offline-calc-data-sources.service'
import SugoOfflineCalcIndicesService from './sugo-offline-calc-indices.service'
import SugoOfflineCalcModelsService from './sugo-offline-calc-models.service'
import SugoOfflineCalcTablesService from './sugo-offline-calc-tables.service.js'
import _ from 'lodash'

let _inst = null

export default class SugoOfflineCalcVersionHistoriesService extends BaseService {
  constructor() {
    super('SugoVersionHistories')
    this.servList = {
      // [OfflineCalcTargetType.Dimension]: this.sugoOfflineCalcDimensionsService = SugoOfflineCalcDimensionsService.getInstance(),
      [OfflineCalcTargetType.Indices]: this.sugoOfflineCalcIndicesService = SugoOfflineCalcIndicesService.getInstance(),
      [OfflineCalcTargetType.IndicesModel]: this.sugoOfflineCalcModelsService =  SugoOfflineCalcModelsService.getInstance(),
      [OfflineCalcTargetType.Table]: this.sugoOfflineCalcTablesService =  SugoOfflineCalcTablesService.getInstance(),
      [OfflineCalcTargetType.Datasource]: this.sugoOfflineCalcDataSourcesService = SugoOfflineCalcDataSourcesService.getInstance()
    }
  }

  static getInstance() {
    if (!_inst) {
      _inst = new SugoOfflineCalcVersionHistoriesService()
    }
    return _inst
  }

  async getInfluence(id, targetType) {
    if (targetType === OfflineCalcTargetType.IndicesModel) return []

    //现在所有东西都只会影响到指标
    let keys = [
      // OfflineCalcTargetType.Dimension,
      OfflineCalcTargetType.Indices
      // OfflineCalcTargetType.Table,
      // OfflineCalcTargetType.IndicesModel
    ]

    let name = ''
    if (targetType === OfflineCalcTargetType.Table) {
      const res = await this.sugoOfflineCalcTablesService.findByPk(id)
      name = res.name
    }

    let where = {
      // [OfflineCalcTargetType.Dimension]: {
      //   formula_info: {
      //     dimDeps: {
      //       $like: `%${id}%`
      //     }
      //   }
      // },
      [OfflineCalcTargetType.Indices]: {
        formula_info: {
          idxDeps: {
            $like: `%${id}%`
          }
        }
      },
      [OfflineCalcTargetType.Table]: {
        formula_info: {
          $or: {
            idxDeps: {
              $like: `%${name}%`
            },
            dimDeps: {
              $like: `%${name}%`
            }
          }
        }
      }
    }

    let res = []
    if (targetType !== OfflineCalcTargetType.Datasource) {
      res = await this.sugoOfflineCalcIndicesService.findAll(where[targetType], { raw: true })
      res = res.map( i => {
        i.targetType = OfflineCalcTargetType.Indices
        return i
      })
    } else {
      //数据源的影响
      let temp1 = await this.sugoOfflineCalcTablesService.findAll({
        data_source_id: id
      },{ raw: true})
      temp1 = temp1.map( i => {
        i.targetType = OfflineCalcTargetType.Table
        return i
      })
      let temp2 = await this.sugoOfflineCalcIndicesService.findAll({
        formula_info: {
          $or: {
            idxDeps: {
              $like: `%${id}%`
            },
            dimDeps: {
              $like: `%${id}%`
            }
          }
        }
      },{ raw: true })
      temp2 = temp2.map( i => {
        i.targetType = OfflineCalcTargetType.Indices
        return i
      })
      res = [...temp1, ...temp2]
    }


    return res
  }
}
