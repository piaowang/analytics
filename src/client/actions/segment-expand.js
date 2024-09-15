import Fetch2 from '../common/fetch-final'
import {remoteUrl} from '../constants/interface'
import _ from 'lodash'
import {setLoading} from './common'

const getSegmentExpand = (query) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch2.get(remoteUrl.GET_SEGMENTEXPAND, query)
    setLoading(dispatch, false)
    if (res) {
      let action = {
        type: 'set_segmentExpands',
        data: res.result
      }
      dispatch(action)
    }
    return res
  }
}

const delSegmentExpand = (record) => {

  return async dispatch => {

    let {id} = record
    setLoading(dispatch, true)
    let res = await Fetch2.post(remoteUrl.DELETE_SEGMENTEXPAND, {
      id
    })
    setLoading(dispatch, false)
    if (res) {
      let action = {
        type: 'del_segmentExpands',
        data: {id}
      }
      dispatch(action)
    }
    return res
  }

}

const updateSegmentExpand = (id, update) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch2.post(remoteUrl.EDIT_SEGMENTEXPAND, {
      id,
      update: update
    })
    setLoading(dispatch, false)

    if(res) {
      let action = {
        type: 'update_segmentExpands',
        data: _.assign({id}, update, {
          ...res.result
        })
      }
      dispatch(action)
    }
    return res
  }
}

const addSegmentExpand = (body) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch2.post(remoteUrl.ADD_SEGMENTEXPAND, body)
    setLoading(dispatch, false)
    if(res) {
      let action = {
        type: 'add_segmentExpands',
        data: res.result
      }
      dispatch(action)
    }
    return res
  }
}

const checkSegmentExpandStatus = (body) => {
  return async dispatch => {
    let res = await Fetch2.get(remoteUrl.STATUS_SEGMENTEXPAND, body)
    if(res) {
      let action = {
        type: 'update_segmentExpands',
        data: res.result
      }
      dispatch(action)
    }
    return res
  }
}

const getSegmentExpandIds = (body) => {
  return async dispatch => {
    let res = await Fetch2.get(remoteUrl.DOWNLOAD_SEGMENTEXPAND, body)
    if(res) {
      let action = {
        type: 'update_segmentExpands',
        data: res.result
      }
      dispatch(action)
    }
    return res
  }
}

const saveAsUsergroup = (body) => {
  return async () => {
    let res = await Fetch2.post(remoteUrl.SAVEAS_USERGROUP, body)
    return res
  }
}

//actions maptoprops
export {
  getSegmentExpand,
  delSegmentExpand,
  addSegmentExpand,
  checkSegmentExpandStatus,
  updateSegmentExpand,
  saveAsUsergroup,
  getSegmentExpandIds
}
