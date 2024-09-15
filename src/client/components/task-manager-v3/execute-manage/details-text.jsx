import React from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import Fetch from '../../../common/fetch-final'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import _ from 'lodash'
import { Tabs, message } from 'antd'

const Details = (props) => {
  const { data = '', showMore = true, yarnLogInfo, yarnLogPath = [] } = props
  const { location: { query } } = props
  if (query.type === 'yarn') {
    return (
      <Tabs defaultActiveKey={'tabs0'} onChange={v => props.dispatch({ type: 'logsDetails/queryYarnLogInfo', payload: { url: yarnLogPath[v.substr(4)] } })}>
        {
          yarnLogPath.map((p, i) => {
            return (<Tabs.TabPane key={`tabs${i}`} tab={`日志${i + 1}`} >
              <div
                dangerouslySetInnerHTML={{ __html: yarnLogInfo }}
                className="overscroll-y"
                style={{ height: 'calc(100vh - 58px)', marginLeft:'-130px' }}
                ref={(ele) => {
                  if (ele) {
                    ele.scrollTop = ele.scrollHeight
                  }
                }}
              />
            </Tabs.TabPane>)
          })
        }
      </Tabs>)
  }
  const isRunning = _.get(props, 'location.query.isRunning', '0') === '1'
  return (
    <div className="overscroll-y" style={{ height: '100vh' }} ref={(ele) => {
      if (ele) {
        ele.scrollTop = ele.scrollHeight
      }
    }}
    >
      {
        data.split('\n').map((info, i) => {
          return (
            <div key={i}>{info ? `${info}` : null}</div>
          )
        })

      }
      {
        showMore || isRunning
          ? (<div className="mg3t aligncenter">
            <a onClick={() => props.dispatch({ type: 'logsDetails/query', payload: {} })}>加载更多...</a>
          </div>)
          : null
      }
    </div >
  )
}

Details.propTypes = {
  data: PropTypes.string
}

const sagaModel = (props) => ({
  namespace: 'logsDetails',
  state: {
    historyList: [],
    showMore: true,
    offset: 0,
    limit: _.get(props, 'location.query.isRunning', '0') === '0' ? 5000000 : 50000,
    yarnLogPath: [],
    yarnLogInfo: ''
  },
  reducers: {
    changeState(state, action) {
      let nextState = {
        ...state,
        ...action.payload
      }
      return nextState
    }
  },
  sagas: {
    *queryYarnLogInfo({ payload }, { call, put }) {
      const { url } = payload
      if (!url) {
        message.error('日志路径错误')
        yield put({
          type: 'changeState',
          payload: { yarnLogInfo: '' }
        })
      }
      let res = yield call(Fetch.post, '/app/task-v3/get-yarn-log-info', { url })
      yield put({
        type: 'changeState',
        payload: { yarnLogInfo: res }
      })
    },
    *query({ payload }, { call, put, select }) {
      const { location: { query } } = props
      let { data, offset, limit } = yield select(state => state['logsDetails'])
      let url = ''
      if (query.type === 'yarn') {
        let res = yield call(Fetch.post, '/app/task-v3/get-yarn-log-path', {
          execId: query.execid,
          jobId: query.jobId,
          attempt: query.attempt
        })
        if (res.success) {
          yield put({
            type: 'changeState',
            payload: { yarnLogPath: res.result.filter(_.identity) }
          })
          yield put({
            type: 'queryYarnLogInfo',
            payload: { url: _.get(res, 'result.0') }
          })
        } else {
          message.error(res.message)
        }
        return
      }
      if (query.type === 'logs') {
        url = `/app/task-schedule-v3/executor?execid=${query.execid}&action=${query.action}&jobId=${query.jobId}&offset=${offset}&length=${limit}&attempt=${query.attempt}`
      } else if (query.type === 'task') {
        url = `/app/task-schedule-v3/executor?execid=${query.execid}&action=${query.action}&jobId=${query.jobId}&offset=${offset}&length=${limit}`
      }
      let response = yield call(Fetch.get, url, null)
      // const response = yield call(logsDetails, payload)
      const { data: res = 'nothing', length } = response
      yield put({
        type: 'changeState',
        payload: { data: data + res, offset: offset + length, showMore: length === limit }
      })
    }
  },
  subscriptions: {
    init({ dispatch }) {
      const { location: { query } } = props
      dispatch({ type: 'query', payload: {} })
    }
  }
})


const withForm = withRuntimeSagaModel(sagaModel)(Details)

let mapStateToProps = (props) => {
  return {
    ...props['logsDetails']
  }
}

export default connect(mapStateToProps)(withForm)
