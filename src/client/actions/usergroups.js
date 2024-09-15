import Fetch2 from '../common/fetch-final'
import {remoteUrl} from '../constants/interface'
import _ from 'lodash'
import * as ls from '../common/localstorage'
import {browserHistory} from 'react-router'
import {setLoading} from './common'

const getUsergroups = (query, doDispatch = true) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch2.get(remoteUrl.GET_USERGROUP, query)
    setLoading(dispatch, false)
    if (res && doDispatch) {
      let action1 = {
        type: 'set_usergroups',
        data: res.result
      }
      dispatch(action1)
    }
    return res
  }
}

const delUsergroup = (record, callback) => {

  return async dispatch => {

    let id = record.id
    let action = {
      type: 'del_usergroups',
      data: record
    }

    setLoading(dispatch, true)
    let res = await Fetch2.post(remoteUrl.DELETE_USERGROUP, {
      query: {
        where: {
          id
        }
      },
      del: {...record.params.dataConfig, groupId: 'usergroup_' + record.id}
    })
    setLoading(dispatch, false)

    if (res) {
      dispatch(action)
      browserHistory.push('/console/usergroup')
    }
    
    if (_.isFunction(callback)) callback(res)

  }

}

const updateUsergroup = (id, update, callback) => {

  return async dispatch => {

    let action = {
      type: 'update_usergroups',
      data: _.assign({
        id: id
      }, update)
    }

    setLoading(dispatch, true)
    let res = await Fetch2.post(remoteUrl.EDIT_USERGROUP, {
      query: {
        where: {
          id: id
        }
      },
      update: update
    })
    setLoading(dispatch, false)

    if(res) {
      if (action.data.params) {
        let count = _.get(
          res,
          'result.addToDruidResult[0].event.RowCount',
          action.data.params.total
        )
        action.data.params.total = count
        action.data.compute_time = new Date()
      }
      dispatch(action)
    }

    if (_.isFunction(callback)) callback(res)

  }

}

const addUsergroup = (usergroup, callback) => {

  return async dispatch => {

    setLoading(dispatch, true)
    let res = await Fetch2.post(remoteUrl.ADD_USERGROUP, {usergroup})
    setLoading(dispatch, false)

    if(res) {
      let ug = res.result
      let action = {
        type: 'add_usergroups',
        data: ug
      }
      dispatch(action)
    }

    if (_.isFunction(callback)) callback(res)

  }

}

//actions maptoprops
export {
  getUsergroups,
  delUsergroup,
  addUsergroup,
  updateUsergroup
}
