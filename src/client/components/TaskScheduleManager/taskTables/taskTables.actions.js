import _ from 'lodash'
import Fetch from '../../../common/fetch-final'
import { Interface, taskType } from './setting'
import { toQueryParams } from '../../../../common/sugo-utils'
import { sendURLEncoded } from '../../../common/fetch-utils'
import { message } from 'antd'

const updateStatus = payload => {
  return {
    type: taskType.updateStatus,
    payload
  }
}
// 获取调度表
export const getSchduleTable = id => {
  return async dispatch => {
    dispatch(updateStatus(true))
    let resp = await Fetch.get(`${Interface.schedule}?refProjectId=${id}`)
    if(resp && resp.schedules ) {
      let arr = resp.schedules.map(item => {
        return {...item.schedule, refProjectId: item.refProjectId, showName: item.showName /*cronExpression: item.cronExpression*/}
      })
      dispatch({
        type: taskType.saveScheduleTables,
        payload: arr
      })
    }else{
      dispatch({
        type: taskType.saveScheduleTables,
        payload: []
      })
    }
    dispatch(updateStatus(false))
  }
}
// 取消调度任务
export const cancelSchduleProject = payload => {
  return async dispatch => {
    dispatch(updateStatus(true))
    let resp = await Fetch.post(Interface.schedule, null, {
      headers: sendURLEncoded.headers,
      body: toQueryParams({
        action: 'removeSched',
        scheduleId: payload
      })
    })
    if(resp.status === 'success') {
      message.success('取消调度成功!', 1)
    } else { 
      message.error('取消调度失败!', 1)
    }
    dispatch(updateStatus(false))
  }
}
// 转换arr
const translateArr = arr => {
  return arr.map((item) => {
    return {...item.first, actNum: item.second ? `${item.second.host}:${item.second.port}` : ''}
  })
}
// 查询正在执行的调度
export const getRunningFlows = param => {
  return async dispatch => {
    dispatch(updateStatus(true))
    let url = `${Interface.executor}?getRunningFlows&`,arr = []
    for(let x in param) {
      param[x] && arr.push(`${x}=${param[x]}`)
    }
    let resp = await Fetch.get(url+arr.join('&'))
    if(resp && resp.runningFlows) {
      let arr = translateArr(resp.runningFlows)
      dispatch({
        type: taskType.saveRunningFlows,
        payload: arr
      })
    } else {
      dispatch({
        type: taskType.saveRunningFlows,
        payload: []
      })
    }
    dispatch(updateStatus(false))
  }
} 
// 查询已经结束的调度
export const getRecentlyFinishedFlows = param => {
  return async dispatch => {
    dispatch(updateStatus(true))
    let resp = await Fetch.get(`${Interface.executor}?getRecentlyFinishedFlows&size=${param.size}&page=${param.page}&refProjectId=${param.id}`)
    if(resp) {
      dispatch({
        type: taskType.saveFinishedFlows,
        payload: resp
      })
    } else {
      dispatch({
        type: taskType.saveFinishedFlows,
        payload: {
          recentlyFinished:[],
          page:1,
          size:0
        }
      })
    }
    dispatch(updateStatus(false))
  }
}
// kill 正在执行的任务
export const cancelFlow = id => {
  return async (dispatch, getState) => {
    dispatch(updateStatus(true))
    let resp = await Fetch.get(`${Interface.executor}?ajax=cancelFlow&execid=${id}`)
    dispatch(updateStatus(false))
    if(resp.status === 'success') {
      message.success('任务已停止!')
      const data = getState()
      const { runningFlows } = _.cloneDeep(data.taskTables)
      _.remove(runningFlows, item => item.executionId === id) 
      dispatch({
        type: taskType.saveRunningFlows,
        payload: runningFlows
      })
      return 'success'
    } else {
      message.error('任务未能停止!')
      return 'fail'
    }
  }
}
// 获取调度历史
export const getHistoryFlows = param => {
  return async dispatch => {
    dispatch(updateStatus(true))
    let url = `${Interface.history}?page=1&size=10`, arr = []
    for(let x in param) {
      arr.push(`${x}=${param[x]}`)
      // param[x] && arr.push(`${x}=${param[x]}`)
    }
    url = `${Interface.history}?`+arr.join('&')
    let resp = await Fetch.get(url)

    if(resp) {
      let arr = resp.flowHistory.map(item => {
        if (item.second) {
          item.first.device = `${item.second.host}:${item.second.port}`
        }
        return {...item.first}
      })

      resp.flowHistory = arr

      dispatch({
        type: taskType.saveHistoryFlows,
        payload: resp
      })
    } else {
      dispatch({
        type: taskType.saveHistoryFlows,
        payload: {
          flowHistory: [],
          pageNum: 1,
          pageSize: 10,
          totalNum: 0
        }
      })
    }
    dispatch(updateStatus(false))
  }
}
// 重启任务
export const restartAnyFlows = id => {
  return async () => {
    let url = `${Interface.executor}?ajax=retryJob&execid=${id}`
    let resp = await Fetch.get(url)
    if(resp.status === 'restart success') {
      message.success(`任务重启成功, id编号为: ${resp.execid}`)
    }else {
      message.error('任务重启失败')
    }
  }
}

