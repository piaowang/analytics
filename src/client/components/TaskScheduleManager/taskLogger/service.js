import fetch from '../../../common/fetch-final'
import { toQueryParams } from '../../../../common/sugo-utils'
import _ from 'lodash'
import moment from 'moment'

const getProjectLog = async param => {
  let resp = await fetch.get(`/app/task-schedule/executor?${toQueryParams({
    execid: param.code,
    ajax: 'fetchExecFlowLogs',
    offset: param.offset || 0,
    length: param.length || 50000
  })}`)
  if(resp.offset || resp.data || resp.length){
    return resp
  }
  return {
    offset: '',
    data: '',
    length: ''
  }
}

const getProjectDetail = async param => {
  let resp = await fetch.get(`/app/task-schedule/executor?${toQueryParams({
    execid: param.code,
    ajax: 'fetchexecflow'
  })}`)
  let tableArr = []
  let spendArr = []
  let totalend = resp.endTime > 0 ? resp.endTime : resp.updateTime
  
  if(resp.nodes){
    let totalSpend = totalend - resp.startTime
    const { nodes } = resp
    tableArr = _.sortBy(nodes, (o) => o.endTime )
    tableArr.map(item => {
      let end = item.endTime > 0 ? item.endTime : item.updateTime
      let spend = ((end - item.startTime)/totalSpend) * 100 
      let indent = ((item.startTime - resp.startTime)/totalSpend) * 100 
      // 计算出进度条的占比和缩进比
      spendArr.push({
        spend,
        indent
      })
      return item
    })
  }

  return {
    spendArr,
    tableArr,
    project: {
      execid: resp.execid || '',
      status: resp.status.toLocaleUpperCase() || '',
      submitUser: resp.submitUser || '',
      submitTime: resp.submitTime || '',
      endTime: resp.endTime || '',
      totalSpend: moment(totalend).diff(moment(resp.submitTime), 'seconds') || 0,
      showName: resp.showName
    }
  }
} 

const getNodeLog = async param => {
  let resp = await fetch.get(`/app/task-schedule/executor?${toQueryParams({
    execid: param.code,
    jobId: param.jobId,
    ajax: 'fetchExecJobLogs',
    offset: param.offset || 0,
    length: param.length || 50000,
    attempt: 0
  })}`)
  if(resp.data || resp.length || resp.offset){
    return resp
  }else{
    return {
      data: '',
      length: '',
      offset: ''
    }
  }
}

export {
  getProjectLog,
  getProjectDetail,
  getNodeLog
}
