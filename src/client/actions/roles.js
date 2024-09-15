import Fetch from '../common/fetch-final'
import {remoteUrl} from '../constants/interface'
import _ from 'lodash'
import {setLoading} from './common'
import { getRes } from '../databus/datasource'

const getRoles = (query = {}, doDispatch = true,cb) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.get(remoteUrl.GET_ROLES, query)
    setLoading(dispatch, false)
    if (res && doDispatch) {
      let action1 = {
        type: 'set_roles',
        data: res.result
      }
      dispatch(action1)
    }
    _.isFunction(cb)&&cb()
    return res
  }
}

const getPermissions = (doDispatch = true) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.get(remoteUrl.GET_PERMISSIONS)
    setLoading(dispatch, false)
    if (res && doDispatch) {
      let action1 = {
        type: 'set_permissions',
        data: res.result
      }
      dispatch(action1)
    }
    return res
  }
}

const getResForAudit = () =>{
  return async dispatch =>{
    setLoading(dispatch, true)
    let res = await getRes()
    setLoading(dispatch, false)
    if(res){
      let action = {
        type:'set_resForAudit',
        data:res.result
      }
      dispatch(action)
    }
    return res
  }
}

const updateRole = (id, update, cb) => {
  return async (dispatch, getState) => {
    setLoading(dispatch, true)
    let roles = getState().common.roles
    let originRole = _.find(roles, {id})
    let res = await Fetch.post(remoteUrl.EDIT_ROLE, {
      id, update
    })
    setLoading(dispatch, false)
    if(res) {
      let action = {
        type: 'update_roles',
        data: {
          id,
          ...update,
          permissions: update.funcPermissions || originRole.permissions
        }
      }
      dispatch(action)
    }
    cb && cb(res)
    return res
  }

}

const addRole = (role) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.ADD_ROLE, {
      role
    })
    setLoading(dispatch, false)
    if(res) {
      let data = {
        ...role,
        ...res.result,
        permissions: role.funcPermissions
      }
      let action = {
        type: 'add_roles',
        data
      }
      dispatch(action)
    }
    return res
  }
}


const delRole = (record) => {
  return async dispatch => {
    let id = record.id
    let action = {
      type: 'del_roles',
      data: record
    }
    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.DELETE_ROLE, _.pick(record, ['id', 'name'])) // 带上 name 以便解释日志
    setLoading(dispatch, false)
    if(res) dispatch(action)
    return res
  }
}

//actions maptoprops
export {
  getRoles,
  delRole,
  addRole,
  updateRole,
  getPermissions,
  getResForAudit
}
