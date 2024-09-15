/**
 * Created by heganjie on 16/10/6.
 */

import React from 'react'
import PropTypes from 'prop-types'
import Fetch from '../Common/fetch.jsx'
import SocketFetch from '../Common/socket-fetch'
import {DefaultDruidQueryCacheOpts, includeCookie, noCache, recvJSON, withExtraQuery} from '../../common/fetch-utils'
import _ from 'lodash'
import FetchFinal, {handleErr} from '../../common/fetch-final'
import {isEqualWithFunc} from '../../../common/sugo-utils'
import {inQueue, invalidById} from '../../../common/in-queue'
import {isInViewportDec} from '../Common/is-in-viewport'
import {AbortController} from '../../../common/abortcontroller'
import {QUERY_ENGINE} from '../../../common/constants'
import {doQueryDruidData, genQueryBody} from '../../common/slice-data-transform'
import {resolveLocalMetric} from "../../../common/druid-query-utils";


export default class DruidDataFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func,
    dataSourceId: PropTypes.string,
    childProjectId: PropTypes.string,
    dbDimensions: PropTypes.array, // 目前用于判断 groupBy 的维度是不是分组维度，之后会将维度的信息传给服务器端，减少数据库的查询
    filters: PropTypes.array,
    dimensions: PropTypes.array,
    metrics: PropTypes.array,
    customMetrics: PropTypes.array,
    customDimensions: PropTypes.array,
    select: PropTypes.array,
    selectOffset: PropTypes.number,
    selectLimit: PropTypes.number,
    selectOrderDirection: PropTypes.string,
    selectOrderBy: PropTypes.string,
    dimensionExtraSettingDict: PropTypes.object,
    tempMetricDict: PropTypes.object,
    localMetricDict: PropTypes.object,
    timezone: PropTypes.string,
    timeout: PropTypes.number,
    doFetch: PropTypes.bool,
    onFetchingStateChange: PropTypes.func,
    onData: PropTypes.func,
    onError: PropTypes.func,
    groupByAlgorithm: PropTypes.oneOf(['groupBy', 'topN']),
    splitType: PropTypes.oneOf(['groupBy', 'tree']),
    queryEngine: PropTypes.oneOf([QUERY_ENGINE.TINDEX, QUERY_ENGINE.UINDEX, QUERY_ENGINE.DRUID, QUERY_ENGINE.MYSQL]),

    alwaysUpdate: PropTypes.bool,
    forceUpdate: PropTypes.bool,
    cleanDataWhenFetching: PropTypes.bool,
    useOpenAPI: PropTypes.bool,
    debounce: PropTypes.number,
    params: PropTypes.object,
    mode: PropTypes.string,
    withGlobalMetrics: PropTypes.bool,
    sCache: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    cCache: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    queryInQueue: PropTypes.bool,
    socketCacheParams: PropTypes.object,
    serviceName: PropTypes.string
  }

  static defaultProps = {
    doFetch: true,
    alwaysUpdate: true,
    filters: [],
    select: [],
    dimensions: [],
    metrics: [],
    dimensionExtraSettingDict: {},
    useOpenAPI: false,
    tempMetricDict: {},
    localMetricDict: {},
    params: includeCookie,
    dbDimensions: [],
    children: _.constant(null),
    cleanDataWhenFetching: false,
    mode: 'fetch',
    serviceName: 'trafficAnalytics',
    queryEngine: QUERY_ENGINE.TINDEX,
    queryInQueue: true,
    ...DefaultDruidQueryCacheOpts
  }

  state = {
    
  }

  shouldComponentUpdate(nextProps) {
    if (this.props.alwaysUpdate) {
      return true
    }
    return !isEqualWithFunc(this.props, nextProps)
  }

  componentWillUnmount() {
    this.componentUnmounted = true
    this.cancelFetching()
  }

  id = _.uniqueId('druid-data-fetcher_')

  cancelFetching = () => {
    if (this._cancelFetching) {
      let func = this._cancelFetching
      this._cancelFetching = null
      func()
    }
    invalidById('druid-data-fetch-queue', this.id)
  }
  
  fetchDirect = async (url, data, opts) => {
    if (this.componentUnmounted) {
      // throw new Error('component already unmount')
      return
    }
    let abortCtrl = new AbortController()
  
    this._cancelFetching = () => abortCtrl.abort()
  
    try {
      let cacheParams = _.pickBy(this.props, (v, k) => (k === 'sCache' || k === 'cCache') && !_.isNil(v))
      let result = await FetchFinal.get(withExtraQuery(url, cacheParams), data, {
        ...opts,
        signal: abortCtrl.signal,
        _autoSwitchToPostWhenUrlTooLong: true
      })
      if (!_.isEmpty(this.props.localMetricDict)) {
        result = await resolveLocalMetric(result || [], doQueryDruidData, this.props)
      }
      return result
    } catch (e) {
      throw e
    } finally {
      this._cancelFetching = null
    }
  }
  
  fetchInQueue = inQueue('druid-data-fetch-queue', this.id, this.fetchDirect, this.cancelFetching)

  onError = (err, resp) => {
    let {onError} = this.props
    if (onError) {
      onError(err)
    }
    // 手动取消的话，提示会显示在图表窗口
    if (/aborted$/i.test(_.get(err, 'message'))) {
      return
    }
    handleErr(resp || err)
  }

  loadGroupDimValuesAsData = (dbGroupDim) => {
    let {filters, dimensions: [groupDimName]} = this.props
    let searchingFilter = _.find(filters, flt => flt.col === groupDimName)
    let {othersGroupName, groupFilters} = dbGroupDim.params || {}
    let originalDim = _.get(dbGroupDim, 'params.dimension.name')
    if (originalDim === '__time') {
      // __time 暂不支持查询 其他组
      othersGroupName = null
    }
    let nextData = [othersGroupName, ...groupFilters.map(gf => gf.groupName)].filter(_.identity)

    let filterPredicate = _.identity
    if (searchingFilter) {
      let {op, eq} = searchingFilter
      let isNegative = _.startsWith(op, 'not ')
      let opType = isNegative ? op.substr(4) : op

      let eqVal = _.isArray(eq) ? eq[0] : eq
      switch (opType) {
        case 'contains':
        default:
          filterPredicate = val => val.indexOf(eqVal) !== -1
          break
      }

      if (isNegative) {
        filterPredicate = _.negate(filterPredicate)
      }
    }

    return nextData.filter(filterPredicate)
  }


  onData = (...res) => {
    let {onData = _.noop} = this.props
    if (_.isFunction(onData)) {
      onData(...res)
    }
  }

  getGroupDim = (props = this.props) => {
    let {
      dimensions,
      groupByAlgorithm,
      dbDimensions
    } = props
    if (dimensions.length === 1 && groupByAlgorithm === 'topN' && 0 < dbDimensions.length) {
      let singleDim = dimensions[0]
      return _.find(dbDimensions, dbD => dbD.name === singleDim && dbD.params.type === 'group')
    }
    return null
  }

  render() {
    let {
      doFetch,
      select,
      onFetchingStateChange,
      useOpenAPI,
      params,
      timeout,
      forceUpdate,
      cleanDataWhenFetching,
      debounce,
      localMetricDict,
      accessDataType,
      mode,
      queryInQueue,
      serviceName,
      socketCacheParams
    } = this.props
    // 如果是只有 groupBy 一个维度，并且是分组维度，则直接从内存读出它的值
    let groupDim = this.getGroupDim()
    if (groupDim) {
      let groupDimVals = this.loadGroupDimValuesAsData(groupDim)
      return this.props.children({
        isFetching: false,
        data: groupDimVals.map(v => ({[groupDim.name]: v})),
        total: {},
        reload: _.noop,
        fetch: _.noop
      })
    }

    let leanBody = genQueryBody(this.props)

    let url = useOpenAPI
      ? '/api/query-druid'
      : '/app/slices/query-druid'
    if(accessDataType === 'external') {
      url = '/app/slices/query-external'
    }
    let headers = forceUpdate ? {...recvJSON.headers, ...noCache.headers} : recvJSON.headers
    let paramsFinal = timeout ? {...params, timeout} : params

    const props = {
      debounce: debounce,
      lazy: !doFetch,
      onFetchingStateChange: onFetchingStateChange,
      onData: this.onData,
      onError: this.onError,
      params: paramsFinal,
      headers: headers,
      url: url,
      fetchMethod: queryInQueue ? this.fetchInQueue : this.fetchDirect,
      cleanDataWhenFetching: cleanDataWhenFetching,
      body: leanBody,
      serviceName,
      socketCacheParams,
      children: select && select.length > 0
        ? (props) => this.props.children({...props, cancelFetching: this.cancelFetching})
        : ({data: result, fetch, ...rest}) => {
          let totalAndResultSet = result && result[0] || {}
          let data = totalAndResultSet && totalAndResultSet.resultSet

          return this.props.children({
            data: data,
            total: totalAndResultSet && _.omit(totalAndResultSet, 'resultSet'),
            cancelFetching: this.cancelFetching,
            ...rest,
            // 重写 fetch 使其 body 参数支持回调类型
            fetch: (body, params) => {
              if (_.isFunction(body)) {
                let bodyMapper = body
                let leanBody = genQueryBody(this.props)
                return fetch(bodyMapper(leanBody), params)
              }
              return fetch(body, params)
            }
          })
        }
    }

    return mode !== 'autoRefresh' ? <Fetch {...props} /> : <SocketFetch {...props} />
  }
}

@isInViewportDec
export class DruidDataFetcherOnlyRunInViewport extends React.Component {
  static propTypes = DruidDataFetcher.propTypes

  static defaultProps = {
    ...DruidDataFetcher.defaultProps,
    children: _.constant(<div />)
  }

  shouldComponentUpdate(nextProps) {
    return nextProps.isInViewport
  }

  render() {
    let {onceInViewport, ...rest} = this.props
    return (
      <DruidDataFetcher
        {...rest}
        doFetch={onceInViewport && rest.doFetch}
      />
    )
  }
}

export function withDruidData(WrappedComponent, mapPropsToFetcherProps) {
  function WithDruidData(props) {
    return (
      <DruidDataFetcher
        {...mapPropsToFetcherProps(props)}
      >
        {({isFetching, data, total, error, fetch, cancelFetching}) => {

          //解决fix-2395问题，因为plywood返回的是对象，一般应该直接获取数字
          for (let metricName in total) {
            if (typeof total[metricName] === 'object' && _.startsWith(metricName, '_tempMetric_')) {
              total[metricName] = 0
            }
          }

          return (
            <WrappedComponent
              {...props}
              druidData={props.druidData || data || []}
              total={props.total || total}
              isFetchingDruidData={isFetching}
              fetchingDruidDataError={error}
              reloadDruidData={fetch}
              cancelFetching={cancelFetching}
            />
          )
        }}
      </DruidDataFetcher>
    )
  }

  const wrappedComponentName = WrappedComponent.displayName || WrappedComponent.name || 'Component'

  WithDruidData.displayName = `withDruidData(${wrappedComponentName})`

  return WithDruidData
}

export function withDruidDataDec(mapPropsToFetcherProps) {
  return WrappedComponent => withDruidData(WrappedComponent, mapPropsToFetcherProps)
}
