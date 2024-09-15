import Fetch from '../common/fetch-final'
import {remoteUrl} from '../constants/interface'
import { message } from 'antd'
import _ from 'lodash'
import {setLoading} from './common'

const getBusinessDimension = (query, callback) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.get(remoteUrl.GET_BUSINESS_DIMENSION_LIST, query)
    setLoading(dispatch, false)

    let action1 = {
      type: 'set_businessDimension',
      data: res.result.data
    }

    if(res.success) {
      dispatch(action1)
      if (_.isFunction(callback)) callback('ok')
    } 
  }
}

const createBusinessDimension = (query, callback) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.CREATE_BUSINESS_DIMENSION_LIST, query)
    setLoading(dispatch, false)

    if(res && res.success) {
      message.success('创建成功')
      if (_.isFunction(callback)) callback('ok')
    } else {
      if (_.isFunction(callback)) callback('err')
      if(res && res.message) {
        message.error(res.message)
      }
      
    }
  }
}

const updateBusinessDimension = (query, callback) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.UPDATE_BUSINESS_DIMENSION_LIST, query)
    setLoading(dispatch, false)
    if(res && res.success) {
      message.success('修改成功')
      if (_.isFunction(callback)) callback('ok')
    } else {
      if (_.isFunction(callback)) callback('err')
      if(res && res.message) {
        message.error(res.message)
      }
    }
  }
}

const deleteBusinessDimension = (query, callback) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.DELETE_BUSINESS_DIMENSION_LIST, query)
    setLoading(dispatch, false)

    if(res.success) {
      message.success('删除成功')
      if (_.isFunction(callback)) callback('ok')
    } else {
      if (_.isFunction(callback)) callback('err')
      message.error(res.message)
    }
  }
}

//actions maptoprops
export {
  getBusinessDimension,
  updateBusinessDimension,
  createBusinessDimension,
  deleteBusinessDimension
}
