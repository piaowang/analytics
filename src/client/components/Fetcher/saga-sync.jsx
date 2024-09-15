import _ from 'lodash'
import {mapAwaitAll} from '../../../common/sugo-utils'

export const sagaSyncModel = (opts) => {
  const {namespace, modelName, getEffect, postEffect, putEffect, deleteEffect, ...rest} = opts
  const capModelName = modelName.replace(/^./, str => str.toUpperCase())
  const isFetchingModel = `isFetching${capModelName}`
  const isSyncingModel = `isSyncing${capModelName}`
  return ({
    namespace,
    ...rest,
    state: {
      [isFetchingModel]: false,
      [isSyncingModel]: false,
      [modelName]: [],
      count:0,
      [`${modelName}Bak`]: null
    },
    reducers: {
      updateState(state, {payload: updater}) {
        return updater(state)
      }
    },
    sagas: {
      *fetch({ payload, callback }, effects) {
        yield effects.put({
          type: 'updateState',
          payload: prevState => ({ ...prevState, [isFetchingModel]: true })
        })
        let sharesWrapped = yield effects.call(getEffect, payload)
        yield effects.put({
          type: 'updateState',
          payload: prevState => ({
            ...prevState,
            [modelName]: sharesWrapped,
            [`${modelName}Bak`]: sharesWrapped,
            count: sharesWrapped.count ?? 0,
            [isFetchingModel]: false
          })
        })

        callback && callback(sharesWrapped)
      },
      *sync({payload: nextPendingData, callback, forceReload = false}, effects) {
        let {
          [`${modelName}Bak`]: originalData,
          [modelName]: pendingData,
          [isSyncingModel]: isSyncing
        } = yield effects.select(state => _.get(state, [namespace], []))
  
        if (!originalData) {
          // 未加载数据
          return
        }
        if (isSyncing) {
          // 已经正在同步
          return
        }
        pendingData = nextPendingData || pendingData
        
        yield effects.put({
          type: 'updateState',
          payload: prevState => ({ ...prevState, [isSyncingModel]: true, [modelName]: pendingData})
        })
  
        let fetchedDataDict = _.keyBy(originalData, d => d.id)
  
        let preCreateModels = pendingData.filter(d => !d.id || !(d.id in fetchedDataDict))
        let preUpdateModels = pendingData.filter(pd => pd.id && pd.id in fetchedDataDict && !_.isEqual(pd, fetchedDataDict[pd.id]))
        let preDeleteModels = _.differenceBy(originalData, pendingData, d => d.id)

        if (!postEffect) {
          throw new Error(`Not support create ${modelName}`)
        }
        if (!putEffect) {
          throw new Error(`Not support update ${modelName}`)
        }
        if (!deleteEffect) {
          throw new Error(`Not support delete ${modelName}`)
        }
        let resCreate = yield effects.call(mapAwaitAll, preCreateModels, postEffect)
        let resUpdate = yield effects.call(mapAwaitAll, preUpdateModels, putEffect)
        let resDelete = yield effects.call(mapAwaitAll, preDeleteModels, deleteEffect)
        
        // 如果没有修改成功，则不重新加载
        let resReload
        if (forceReload || !_.isEmpty(_.compact(resCreate)) || !_.isEmpty(_.compact(resUpdate)) || !_.isEmpty(_.compact(resDelete))) {
          resReload = yield effects.put.resolve({type: 'fetch'})
        }
        yield effects.put({
          type: 'updateState',
          payload: prevState => ({ ...prevState, [isSyncingModel]: false })
        })
  
        const res = {resCreate, resUpdate, resDelete, resReload}
        if (_.isFunction(callback)) {
          callback(res)
        }
        return res
      },
      // 一般用于强制加载列表中的单个项，因为列表可能惰性加载，没有加载 json 字段，这个方法用于加载 json 字段等信息
      // 需要 getEffect 支持传参，一般是传 id
      *reloadSingleItem({ payload }, effects) {
        yield effects.put({
          type: 'updateState',
          payload: prevState => ({ ...prevState, [isFetchingModel]: true })
        })
        let [reloaded] = yield effects.call(getEffect, payload)
        yield effects.put({
          type: 'updateState',
          payload: prevState => ({
            ...prevState,
            [modelName]: prevState[modelName].map(pd => pd.id === reloaded.id ? reloaded : pd),
            [`${modelName}Bak`]: prevState[`${modelName}Bak`].map(ot => ot.id === reloaded.id ? reloaded : ot),
            [isFetchingModel]: false
          })
        })
      }
    },
    subscriptions: {
      setup({dispatch, history}) {
        dispatch({ type: 'fetch' })
        return () => {
          // console.log(`saga sync model ${ns} uninstall!!`)
        }
      }
    }
  })
}
