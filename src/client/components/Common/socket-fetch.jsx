/**
 * Created by wuzhuoheng on 17/5/18.
 * 参考了 ./fetch.jsx
 * 提供给DruidDataFetcher使用,实现后台自动刷新druid推送到前端
 */

import { Component } from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import shortid from 'shortid'
import {isEqualWithFunc} from '../../../common/sugo-utils'
import getSocket from '../../common/websocket'
import setStatePromise from '../../common/set-state-promise'

let socket = null

async function waitSocket(callback, serviceName) {
  if(!socket) {
    socket = await getSocket()
    socket.register(serviceName)
  }
  callback ? callback(socket) : null
}

// waitSocket()

@setStatePromise
export default class SocketFetch extends Component {
  static propTypes = {
    method: PropTypes.oneOf(['get', 'post', 'put', 'delete']),
    url: PropTypes.string.isRequired,
    params: PropTypes.object,
    headers: PropTypes.object,
    body: PropTypes.object,
    lazy: PropTypes.bool,
    onData: PropTypes.func,
    onError: PropTypes.func,
    onFetchingStateChange: PropTypes.func,
    onFetcherUnmount: PropTypes.func,
    children: PropTypes.func.isRequired,
    debounce: PropTypes.number,
    cleanDataWhenFetching: PropTypes.bool,
    serviceName: PropTypes.string,
    socketCacheParams: PropTypes.object,
  }

  static defaultProps = {
    method: 'get',
    onFetchingStateChange: _.noop,
    cleanDataWhenFetching: false,
    serviceName: 'trafficAnalytics',
    socketCacheParams: {}
  }

  state = {
    isFetching: false,
    response: null,
    data: null,
    error: null
  }

  componentDidMount() {
    let {debounce, serviceName} = this.props
    if (0 < debounce) {
      this._fetch = this.fetch
      this.fetch = _.debounce(this._fetch, debounce)
    }
    waitSocket(socket => {
      if (socket) {
        socket.on(serviceName, 'query', this.onData)
      }
    }, serviceName)
    if (!this.props.lazy) {
      this.fetch()
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.debounce !== nextProps.debounce) {
      if (0 < nextProps.debounce) {
        if (!this._fetch) {
          this._fetch = this.fetch
        }
        this.fetch = _.debounce(this._fetch, nextProps.debounce)
      } else {
        if (this._fetch) {
          this.fetch = this._fetch
          this._fetch = null
        }
      }
    }

    if (!nextProps.lazy && !isEqualWithFunc(this.props, nextProps)) {
      this.fetch(nextProps.body, nextProps.params)
    }
  }

  componentWillUnmount() {
    let {onFetcherUnmount, serviceName} = this.props
    if (socket) {
      socket.off(serviceName, 'query', this.onData)
      socket.sendTo(serviceName, 'unmount', this.key)
    }
    if (onFetcherUnmount) {
      onFetcherUnmount()
    }
    this.willUnmount = true
  }

  fetchCount = 0
  key = shortid()

  async parseResponse(response) {
    if (response.status === 504) {
      return '网络连接超时，重试或者检查网络连接！'
    }
    let contentType = response.headers.get('content-type') || ''
    let isJsonResult = contentType.toLowerCase().indexOf('application/json') !== -1

    return isJsonResult ? await response.json() : await response.text()
  }

  onError = fetchId => {
    return async response => {
      if (this.willUnmount) {
        return
      }
      this.props.onFetchingStateChange(false)
      let res = await this.parseResponse(response)
      await this.setState2(fetchId, {
        isFetching: false,
        error: res
      })
      this.props.onError(this.state.error)
    }
  }

  afterUpdateState = async (fetchId, body) => {
    //为了兼容流量分析那边的旧结构 此处必须判断 后端检测是否传了过去 ，没传过去就用旧结构
    if (this.props.socketCacheParams) body.intervalTime = _.get(this.props.socketCacheParams, 'intervalTime')
    waitSocket(socket => {
      if (socket) {
        socket.sendTo(this.props.serviceName, 'query', {
          [this.key]: body
        })
      }
    }, this.props.serviceName)
  }

  onData = async res => {
    const {key, tag, result: data} = res
    if((key === this.key || tag === this.tag) && data){
      this.tag = tag //更新tag
      let {onData} = this.props
      const fetchId = this.fetchCount
      this.props.onFetchingStateChange(false)
      await this.setState2(fetchId, {
        isFetching: false,
        data,
        error: null
      })
      if (fetchId === this.fetchCount && onData) {
        onData(data)
      }
    }
  }

  setState2 = (fetchId, newState) => {
    if (fetchId === this.fetchCount) {
      return this.setStatePromise(newState)
    }
  }

  fetch = async (body = this.props.body, params = this.props.params) => {
    // 只取最后一次 fetch 的结果
    this.fetchCount += 1
    const fetchId = this.fetchCount

    return await this.afterUpdateState(fetchId, body, params)
  }

  render() {
    return this.props.children({
      ...this.state
    })
  }
}
