import {sagaSyncModel} from '../../Fetcher/saga-sync'
import * as marketBrainExecutionService from 'client/services/market-brain/executions'

export const claimCustomersSagaModelGenerator = (ns, type = 'list') => props => {
  if (props.reuseSagaModel) {
    return null
  }
  return sagaSyncModel(
    {
      namespace: ns,
      modelName: 'marketBrainH5ClaimCustomer',
      getEffect: async idOverwrite => {
        let res = await marketBrainExecutionService.getCustomerByExecutionId(_.get(props, 'params.id', ''))
        const { marketBrainMobileNeedDesensitize } = window.sugo
        if (!res.success) return [] 
        //需要脱敏 扩展包实现
        if (marketBrainMobileNeedDesensitize) {
          let result = await marketBrainExecutionService.fetchDesensitizeMobile(_.get(res, 'result', []))
          if (result.code === 'SUCCESS') res = result
        }
        return _.get(res, 'result', [])
      },
      postEffect: async (model) => {
        // return await Fetch.post('/app/offline-calc/data-sources', model)
      },
      putEffect: async model => {
      },
      deleteEffect: async model => {
        // return await Fetch.delete(`/app/offline-calc/data-sources/${model.id}`, undefined)
      }
    }
  )
}

export const taskExecSagaModelGenerator = (ns, type = 'list') => props => {
  if (props.reuseSagaModel) {
    return null
  }
  return sagaSyncModel(
    {
      namespace: ns,
      modelName: 'marketBrainH5TaskExec',
      getEffect: async idOverwrite => {
        let res = await marketBrainExecutionService.getDetailList(_.get(props, 'params.id', ''), _.get(window, 'sugo.jwtData.others.staff_id', window.sugo.user.id))
        const { marketBrainMobileNeedDesensitize } = window.sugo
        if (!res.success) return [] 
        //需要脱敏 扩展包实现
        if (marketBrainMobileNeedDesensitize) {
          let result = await marketBrainExecutionService.fetchDesensitizeMobile(_.get(res, 'result', []))
          if (result.code === 'SUCCESS') res = result
        }
        return _.get(res, 'result', [])
      },
      postEffect: async (model) => {
        // return await Fetch.post('/app/offline-calc/data-sources', model)
      },
      putEffect: async model => {
      },
      deleteEffect: async model => {
        // return await Fetch.delete(`/app/offline-calc/data-sources/${model.id}`, undefined)
      }
    }
  )
}
