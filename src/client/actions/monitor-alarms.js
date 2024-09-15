import _ from 'lodash'
import Fetch from '../common/fetch-final'
import {remoteUrl} from '../constants/interface'
import {setLoading} from './common'

const getMonitorAlarms = (id, projectId) => {
  return async dispatch => {
    setLoading(dispatch, true)
    const url = `${remoteUrl.MONITOR_ALARMS}/query`
    let res = await Fetch.get(id ? `${url}/${id}` : `${url}-all/${projectId}`)
    setLoading(dispatch, false)
    if (res && !res.error && !id) {
      let action = {
        type: 'set_monitorAlarms',
        data: res.result
      }
      dispatch(action)
    }
    return res
  }
}

const delMonitorAlarms = id => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.delete(`${remoteUrl.MONITOR_ALARMS}/remove/${id}`)
    setLoading(dispatch, false)

    if(res && !res.error) {
      let action = {
        type: 'del_monitorAlarms',
        data: {id}
      }
      dispatch(action)
    }
  }
}

const updateMonitorAlarms = (id, update, active) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let url = `${remoteUrl.MONITOR_ALARMS}/update/${id}`
    if (active) {
      url = `${remoteUrl.MONITOR_ALARMS}/change/${id}`
    }
    let res = await Fetch.put(url , update)
    setLoading(dispatch, false)

    if(res && !res.error) {
      let action = {
        type: 'update_monitorAlarms',
        data: {id, ...update}
      }
      dispatch(action)
    }
    return res
  }
}

const addMonitorAlarms = (data) => {
  return async dispatch => {
    delete data.id
    setLoading(dispatch, true)
    let res = await Fetch.post(`${remoteUrl.MONITOR_ALARMS}/create`, data)
    setLoading(dispatch, false)

    if(res) {
      let action = {
        type: 'add_monitorAlarms',
        data: res.result
      }
      dispatch(action)
    }
    return res
  }
}

//actions maptoprops
export {
  getMonitorAlarms,
  delMonitorAlarms,
  addMonitorAlarms,
  updateMonitorAlarms
}
