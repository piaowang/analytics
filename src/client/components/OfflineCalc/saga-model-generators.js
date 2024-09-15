import {sagaSyncModel} from '../Fetcher/saga-sync'
import {OfflineCalcVersionStatus} from '../../../common/constants'
import Fetch, {handleErr} from '../../common/fetch-final'
import _ from 'lodash'
import {tryJsonParse} from '../../../common/sugo-utils'
import {message} from 'antd'


export const dataSourceListSagaModelGenerator = (ns, type = 'list', extraQueryOpts = {}) => props => {
  if (props.reuseSagaModel) {
    return null
  }
  return sagaSyncModel(
    {
      namespace: ns,
      modelName: 'offlineCalcDataSources',
      getEffect: async idOverwrite => {
        let data = type === 'list' ? {} : { id: idOverwrite || _.get(props, 'params.id') }
        if (_.get(data, 'id') === 'new') {
          return []
        }
        let res = await Fetch.get('/app/offline-calc/data-sources', {...data, ...extraQueryOpts})
        return _.get(res, 'result', [])
      },
      postEffect: async (model) => {
        return await Fetch.post('/app/offline-calc/data-sources', model)
      },
      putEffect: async model => {
        return await Fetch.put(`/app/offline-calc/data-sources/${model.id}`, model)
      },
      deleteEffect: async model => {
        return await Fetch.delete(`/app/offline-calc/data-sources/${model.id}`, undefined)
      }
    }
  )
}

export const tableListSagaModelGenerator = (namespace, type = 'list', opts = {attributes: ['id', 'title', 'data_source_id', 'name', 'created_by']}) => props => {
  if (props.reuseSagaModel) {
    return null
  }
  return sagaSyncModel(
    {
      namespace: namespace,
      modelName: 'offlineCalcTables',
      getEffect: async idOverwrite => {
        const queryList = type === 'list' && !idOverwrite
        let data = queryList ? opts : {id: idOverwrite || _.get(props, 'params.id') || null}
        if (_.get(data, 'id') === 'new') {
          return []
        }
        let res = await Fetch.get('/app/offline-calc/tables', data)
        const resData = (_.get(res, 'result') || []).map(t => !t.data_source_id ? {...t, data_source_id: 'uploaded'} : t)
        if (queryList) {
          resData.forEach(t => {
            if (!t.params) {
              t.params = {}
            }
            let fieldInfos = _.get(t, 'params.fieldInfos')
            if (!_.isEmpty(fieldInfos)) {
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
        }
        return resData
      },
      postEffect: async (model) => {
        if (model.data_source_id === 'uploaded') {
          model = {...model, data_source_id: null}
        }
        return await Fetch.post('/app/offline-calc/tables', model)
      },
      putEffect: async model => {
        if (model.data_source_id === 'uploaded') {
          model = {...model, data_source_id: null}
        }
        return await Fetch.put(`/app/offline-calc/tables/${model.id}`, model)
      },
      deleteEffect: async model => {
        return await Fetch.delete(`/app/offline-calc/tables/${model.id}`)
      }
    }
  )
}

export const indicesSagaModelGenerator = (ns, type = 'list', extraQuery = {}) => props => {
  if (props.reuseSagaModel) {
    return null
  }
  return sagaSyncModel(
    {
      namespace: ns,
      modelName: 'offlineCalcIndices',
      getEffect: async idOverwrite => {
        let data = type === 'list' ? {} : {id: idOverwrite || props.params.id}
        if (_.get(data, 'id') === 'new') {
          return []
        }
        let res = await Fetch.get('/app/offline-calc/indices', {...data, ...extraQuery})
        return _.get(res, 'result', [])
      },
      postEffect: async (model) => {
        return await Fetch.post('/app/offline-calc/indices', model, {
          handleErr: async res => {
            let text = _.isFunction(res.text)
              ? await res.text()
              : _.isObject(res) ? JSON.stringify(res) : res
  
            const ret = tryJsonParse(text)
            text = ret.error || ret.message || text
            // 重复键违反唯一约束"sugo_offline_calc_indices_pkey"
            if (_.includes(text, '重复键违反唯一约束')) {
              message.warn('此指标编号已存在，请尝试另一编号')
              return
            }
            await handleErr(res)
          }
        })
      },
      putEffect: async model => {
        return await Fetch.put(`/app/offline-calc/indices/${model.id}`, model)
      },
      deleteEffect: async model => {
        return await Fetch.delete(`/app/offline-calc/indices/${model.id}`)
      }
    }
  )
}

export const modelsSagaModelGenerator = (ns, type = 'list', attributes) => props => {
  if (props.reuseSagaModel) {
    return null
  }
  return sagaSyncModel(
    {
      namespace: ns,
      modelName: 'offlineCalcModels',
      getEffect: async idOverwrite => {
        let data = type === 'list' ? {} : {id: idOverwrite || props.params.id}
        if (_.get(data, 'id') === 'new') {
          return []
        }
        data.attributes = attributes
        let isViewVersion = _.get(props.location, 'query.targetType') === 'viewVersion'
        if (isViewVersion) data.isViewVersion = isViewVersion
        let res = await Fetch.get('/app/offline-calc/models', data)
        return _.get(res, 'result', [])
      },
      postEffect: async (model) => {
        return await Fetch.post('/app/offline-calc/models', model)
      },
      putEffect: async model => {
        return await Fetch.put(`/app/offline-calc/models/${model.id}`, model)
      },
      deleteEffect: async model => {
        return await Fetch.delete(`/app/offline-calc/models/${model.id}`)
      }
    }
  )
}

export const runningHistoriesSagaModelGenerator = (ns) => props => {
  if (props.reuseSagaModel) {
    return null
  }
  return sagaSyncModel(
    {
      namespace: ns,
      modelName: 'offlineCalcRunningHistories',
      getEffect: async (payload) => {
        const {model_id} = payload || {}
        if (!model_id) {
          return []
        }
        let res = await Fetch.get(`/app/offline-calc/running-histories?model_id=${model_id}`)
        return _.get(res, 'result', [])
      },
      postEffect: async (model) => {
        return await Fetch.post('/app/offline-calc/running-histories', model)
      },
      putEffect: async model => {
        return await Fetch.put(`/app/offline-calc/running-histories/${model.id}`, model)
      },
      deleteEffect: async model => {
        return await Fetch.delete(`/app/offline-calc/running-histories/${model.id}`)
      }
    }
  )
}


export const reviewManagerSagaModelGenerator = namespace => props => {
  if (props.reuseSagaModel) {
    return null
  }
  return sagaSyncModel(
    {
      namespace: namespace,
      modelName: 'offlineCalcReviewManager',
      getEffect: async (payload = { page: 1, pageSize: 10, status: OfflineCalcVersionStatus.watingForReview }) => {
        let res = await Fetch.get('/app/offline-calc/review-manager', payload)
        return _.get(res, 'result')
      },
      postEffect: async (model) => {
        return await Fetch.post('/app/offline-calc/version-histories', model)
      }
      // putEffect: async model => {
      //   return await Fetch.put(`/app/offline-calc/version-histories/${model.id}`, model)
      // },
      // deleteEffect: async model => {
      //   return await Fetch.delete(`/app/offline-calc/version-histories/${model.id}`)
      // }
    }
  )
}

export const tagSagaModelGenerator = (namespace, tagTypeOverwrite) => props => {
  if (props.reuseSagaModel) {
    return null
  }
  let tagType = tagTypeOverwrite || props.tagType
  let convertKeyDict = {
    parent_id: 'parentId',
    project_id: 'projectId',
    created_at: 'createdAt'
  }
  return sagaSyncModel(
    {
      namespace: `${namespace}_${tagType}`,
      modelName: 'tags',
      getEffect: async () => {
        let res = await Fetch.get('/app/tag/get/all', {type: tagType})
        return _.get(res, 'data', [])
      },
      postEffect: async (model) => {
        let modelForAPI = _.mapKeys(model, (v, k) => convertKeyDict[k] || k)
        return await Fetch.post('/app/tag/create/all', modelForAPI)
      },
      putEffect: async model => {
        let modelForAPI = _.mapKeys(model, (v, k) => convertKeyDict[k] || k)
        return await Fetch.post(`/app/tag/update/${model.id}`, modelForAPI)
      },
      deleteEffect: async model => {
        return await Fetch.post(`/app/tag/delete/${model.id}`)
      }
    }
  )
}


export const reviewerSagaModelGenerator = (namespace) => props => {
  if (props.reuseSagaModel) {
    return null
  }
  return sagaSyncModel(
    {
      namespace: namespace,
      modelName: 'offlineCalcSetReviewer',
      getEffect: async () => {
        let res = await Fetch.get('/app/offline-calc/reviewer', { })
        return _.get(res, 'result', [])
      },
      postEffect: async (model) => {
        return await Fetch.post('/app/offline-calc/reviewer', model)
      },
      putEffect: async model => {
        return await Fetch.put(`/app/offline-calc/reviewer/${model.id}`, model)
      },
      deleteEffect: async model => {
      }
    }
  )
}

export const globalConfigSagaModelGenerator = (namespace, key) => props => {
  if (props.reuseSagaModel) {
    return null
  }
  return sagaSyncModel(
    {
      namespace: namespace,
      modelName: 'globalConfigs',
      getEffect: async () => {
        let res = await Fetch.get('/app/global-config', key ? {key} : undefined)
        return _.get(res, 'result', [])
      },
      postEffect: async (model) => {
        return await Fetch.post('/app/global-config', model)
      },
      putEffect: async model => {
        return await Fetch.put(`/app/global-config/${model.id}`, model)
      },
      deleteEffect: async model => {
        return await Fetch.post(`/app/global-config/${model.id}`)
      }
    }
  )
}

export const releaseSagaModelGenerator = () => props => {
  return require('./store/release-version').default
}

