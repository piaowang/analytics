import Fetch from '../common/fetch-final'
import {remoteUrl} from '../constants/interface'
import {setLoading} from './common'
import _ from 'lodash'

const getTagGroups = (query = {}, doDispatch = true) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.get(remoteUrl.GET_TAGGROUP, query)
    setLoading(dispatch, false)
    if (res && doDispatch) {
      let action1 = {
        type: 'set_tagGroups',
        data: res.result
      }
      dispatch(action1)
    }
    return res
  }
}

const updateTagGroup = (id, update) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.put(remoteUrl.EDIT_TAGGROUP, {
      id, update
    })
    setLoading(dispatch, false)
    if(res) {
      let action = {
        type: 'update_tagGroups',
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

const addTagGroup = (inst) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.ADD_TAGGROUP, inst)
    setLoading(dispatch, false)
    if(res) {
      let action = {
        type: 'add_tagGroups',
        data: res.result
      }
      dispatch(action)
    }
    return res
  }
}

const delTagGroup = (id) => {
  return async (dispatch, getState) => {
    const {tagGroups} = getState().common
    let action = {
      type: 'del_tagGroups',
      data: {id}
    }
    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.DELETE_TAGGROUP, {
      ids: [id],
      titles: [id].map(id => _.get(_.find(tagGroups, {id}), 'title')),
      datasource_id: _.get(_.find(tagGroups, {id}), 'datasource_id')
    })
    setLoading(dispatch, false)
    if(res) dispatch(action)
    return res
  }
}

//actions maptoprops
export {
  getTagGroups,
  delTagGroup,
  addTagGroup,
  updateTagGroup
}
