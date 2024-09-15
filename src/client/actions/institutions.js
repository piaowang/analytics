import Fetch from '../common/fetch-final'
import {remoteUrl} from '../constants/interface'
import { message } from 'antd'
import _ from 'lodash'
import {setLoading} from './common'

let enableDataChecking = _.get(window.sugo, 'enableDataChecking', false)

const initTreeData = (rows=[], key=null, nodedata=[]) => {
  const data = rows.filter(({parent}) => parent === key)
  const treeNodes = data.map(({ name, id, serialNumber, parent, roleIds }) => ({ value: id, title: name, name, id, key: id, serialNumber, parent, roleIds, children: [] }))
  nodedata.push(...treeNodes)
  if (nodedata.length) {
    for(let i=0; i<nodedata.length; i+=1) {
      const {key , children} = nodedata[i]
      initTreeData(rows, key, children)
    }
  }
}

const getInstitutions = (query = {}, cb, type) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let url = enableDataChecking && type === 'draft' 
      ? remoteUrl.GET_INSTITUTIONSDRAFT_LIST 
      : remoteUrl.GET_INSTITUTIONS_LIST
    let res = await Fetch.get(url, query)
    setLoading(dispatch, false)

    const tree = []
    initTreeData(_.get(res, 'result.data', []), '', tree)

    let action = {
      type: 'set_institutionsTree',
      data: tree
    }
    let action1 = {
      type: 'set_institutionsList',
      data: res.result.data
    }

    if(res.success) {
      dispatch(action)
      dispatch(action1)
    }

    _.isFunction(cb)&&cb()
  }
}

const getInstitutionsOne = (query, cb, type) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let url = enableDataChecking && type === 'draft' 
      ? remoteUrl.GET_INSTITUTIONSDRAFT_ONE 
      : remoteUrl.GET_INSTITUTIONS_ONE
    let res = await Fetch.get(url, query)
    setLoading(dispatch, false)
    let action1 = {
      type: 'set_institutions',
      data: res.result.data
    }

    if(res.success) {
      dispatch(action1)
    } 
    _.isFunction(cb)&&cb()
  }
}

const cteateInstitutions = (query, callback, type) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let url = enableDataChecking && type ==='draft' 
      ? remoteUrl.CREATE_INSTITUTIONSDRAFT
      : remoteUrl.CREATE_INSTITUTIONS
    let res = await Fetch.post(url, query)
    setLoading(dispatch, false)

    if(res.success) {
      message.success('创建成功')
      if (_.isFunction(callback)) callback('ok')
    } else {
      if (_.isFunction(callback)) callback('err')
      message.error(res.message)
    }
  }
}

const editorInstitutions = (query, callback, type) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let url = enableDataChecking && type ==='draft' 
      ? remoteUrl.EDITOR_INSTITUTIONSDRAFT
      : remoteUrl.EDITOR_INSTITUTIONS
    let res = await Fetch.post(url, query)
    setLoading(dispatch, false)

    if(res.success) {
      message.success('修改成功')
      if (_.isFunction(callback)) callback('ok')
    } else {
      if (_.isFunction(callback)) callback('err')
      message.error(res.message)
    }
  }
}

const deleteInstitutions = (query, callback, type) => {
  return async dispatch => {
    let url = enableDataChecking && type ==='draft' 
      ? remoteUrl.DELETE_INSTITUTIONSDRAFT
      : remoteUrl.DELETE_INSTITUTIONS
    let res = await Fetch.post(url, query)
    if(res.success) {
      message.success('删除成功')
      if (_.isFunction(callback)) callback('ok')
    } else {
      if (_.isFunction(callback)) callback('err')
      message.error(res.message)
    }
  }
}

const importInstitutions = (query, callback, type) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let url = enableDataChecking && type ==='draft' 
      ? remoteUrl.IMPORT_INSTITUTIONSDRAFT
      : remoteUrl.IMPORT_INSTITUTIONS
    let res = await Fetch.post(url, query)
    setLoading(dispatch, false)
    if(res.success) {
      message.success('导入成功')
      if (_.isFunction(callback)) callback('ok')
    } else {
      if (_.isFunction(callback)) callback('err')
      message.error(res.message)
    }
  }
}

//更新复核表，包括提交复核，撤销，修改，删除，审核通过，审核不通过
const updateCheck = (query, callback) => {
  return async dispatch => {
    if (!enableDataChecking) return  message.success('暂无该方法')

    let res = await Fetch.post(remoteUrl.UPDATEDRAFT_CHECK, query)
    if(res.success) {
      message.success('提交成功')
      if (_.isFunction(callback)) callback('ok')
    } else {
      if (_.isFunction(callback)) callback('err')
      message.error(res.message)
    }
  }
}

const refreshData = (data,callback)=>{
  return async dispatch => {
    const action = {
      type: 'set_institutionsList',
      data: data
    }
    dispatch(action)
    if (_.isFunction(callback)) callback()
  }
}

//actions maptoprops
export {
  getInstitutions,
  getInstitutionsOne,
  editorInstitutions,
  cteateInstitutions,
  importInstitutions,
  deleteInstitutions,
  updateCheck,
  refreshData
}
