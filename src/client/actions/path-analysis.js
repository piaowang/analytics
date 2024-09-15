import Fetch from '../common/fetch-final'
import {remoteUrl} from '../constants/interface'
import {setLoading} from './common'
import {DefaultDruidQueryCacheOpts, withExtraQuery} from '../common/fetch-utils'

const getPathAnalysis = (query = {}, doDispatch = true) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.get(remoteUrl.GET_PATHANALYSIS, query)
    setLoading(dispatch, false)
    if (res && doDispatch) {
      let action1 = {
        type: 'set_pathAnalysis',
        data: res.result
      }
      dispatch(action1)
    }
    return res
  }
}

const updatePathAnalysis = (id, update) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.EDIT_PATHANALYSIS, {
      id, update
    })
    setLoading(dispatch, false)
    if(res) {
      let action = {
        type: 'update_pathAnalysis',
        data: {
          id,
          ...update
        }
      }
      dispatch(action)
    }
    return res
  }
}

const addPathAnalysis = (inst) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.ADD_PATHANALYSIS, inst)
    setLoading(dispatch, false)
    if(res) {
      let data = {
        ...inst,
        ...res.result
      }
      let action = {
        type: 'add_pathAnalysis',
        data
      }
      dispatch(action)
    }
    return res
  }
}

const delPathAnalysis = (record) => {
  return async dispatch => {
    let id = record.id
    let action = {
      type: 'del_pathAnalysis',
      data: record
    }
    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.DELETE_PATHANALYSIS, {
      id
    })
    setLoading(dispatch, false)
    if(res) dispatch(action)
    return res
  }
}

const queryPathAnalysis = (query, direction) => {
  return async () => {
    let res = await Fetch.post(withExtraQuery(remoteUrl.QUERY_PATHANALYSIS, DefaultDruidQueryCacheOpts), {
      query, direction
    })
    return res
  }
}

//actions maptoprops
export {
  getPathAnalysis,
  delPathAnalysis,
  addPathAnalysis,
  queryPathAnalysis,
  updatePathAnalysis
}
