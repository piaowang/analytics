import Fetch2 from '../common/fetch-final'
import {remoteUrl} from '../constants/interface'
import _ from 'lodash'
import {setLoading} from './common'

const getCompany = (query) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch2.get(remoteUrl.GET_COMPANY, query)
    setLoading(dispatch, false)
    if (res) {
      let action = {
        type: 'set_companys',
        data: res.result
      }
      dispatch(action)
    }
    return res
  }
}

const delCompany = (record) => {

  return async dispatch => {

    let {id} = record
    setLoading(dispatch, true)
    let res = await Fetch2.post(remoteUrl.DELETE_COMPANY, {
      id
    })
    setLoading(dispatch, false)
    if (res) {
      let action = {
        type: 'del_companys',
        data: {id}
      }
      dispatch(action)
    }
    return res
  }

}

const updateCompany = (id, update) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch2.post(remoteUrl.EDIT_COMPANY, {
      id,
      update
    })
    setLoading(dispatch, false)

    if(res) {
      let action = {
        type: 'update_companys',
        data: _.assign({id}, update)
      }
      dispatch(action)
    }
    return res
  }
}

const addCompany = (body) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch2.post(remoteUrl.ADD_COMPANY, body)
    setLoading(dispatch, false)
    if(res) {
      let action = {
        type: 'add_companys',
        data: res.result
      }
      dispatch(action)
    }
    return res
  }
}


//actions maptoprops
export {
  getCompany,
  delCompany,
  addCompany,
  updateCompany
}
