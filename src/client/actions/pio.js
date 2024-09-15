/*
 * @Author: xuxinjiang
 * @Date: 2020-04-24 19:47:17
 * @LastEditors: your name
 * @LastEditTime: 2020-07-06 19:03:28
 * @Description: file content
 */ 
import fetch from '../common/fetch-final'
import _ from 'lodash'

const getOperators = (query, callback) => {

  return async dispatch => {
    //setLoading(dispatch, true)
    let res = await fetch.get('/app/pio/get-operators', query)
    //setLoading(dispatch, false)
    if (!res) return
    let action = {
      type: 'set_operators',
      data: res.result
    }
    dispatch(action)
    if (callback) callback(res)

  }

}

const getOperatorInfo = (query) => {
  return async dispatch => {
    let res = await fetch.get('/app/pio/get-operators-info', query)
    return res
  }

}


export {
  getOperators,
  getOperatorInfo
}
