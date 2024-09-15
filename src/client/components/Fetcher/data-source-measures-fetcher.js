/**
 * Created by heganjie on 16/10/6.
 */

import React from 'react'
import PropTypes from 'prop-types'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, recvJSON, noCache} from '../../common/fetch-utils'
import _ from 'lodash'
import {toQueryParams} from '../../../common/sugo-utils'
import {sagaSyncModel} from './saga-sync'
import FetchFinal from '../../common/fetch-final'


export default class DataSourceMeasuresFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    limit: PropTypes.number,
    dataSourceId: PropTypes.string.isRequired,
    doFetch: PropTypes.bool,
    useOpenAPI: PropTypes.bool,
    exportNameDict: PropTypes.bool,
    disabledCache: PropTypes.bool
  }

  static defaultProps = {
    doFetch: true
  }

  state = {
    searching: '',
    metricNameDict: null
  }

  updateNameFilter = _.debounce(val => {
    if (val !== this.state.searching) {
      this.setState({searching: val})
    }
  }, 1300)

  onData = (data) => {
    let {onData, exportNameDict} = this.props
    if (onData) {
      onData(data)
    }
    if (exportNameDict) {
      this.setState({dimNameDict: _.keyBy(data, dbDim => dbDim.name)})
    }
  }

  render() {
    let {limit, dataSourceId, doFetch, useOpenAPI, exportNameDict, disabledCache} = this.props
    let {metricNameDict} = this.state

    let url
    if (limit || this.state.searching || useOpenAPI) {
      let query = {limit: limit || 999, name: this.state.searching || '', noauth: useOpenAPI ? 1 : ''}
      url = `/app/measure/get/${dataSourceId}?${toQueryParams(query)}`
    } else {
      url = `/app/measure/get/${dataSourceId}`
    }
    return (
      <Fetch
        lazy={!doFetch}
        params={includeCookie}
        headers={disabledCache ? {...recvJSON.headers, ...noCache.headers} : recvJSON.headers}
        url={url}
        onData={this.onData}
      >
        {({isFetching, data: dataAndTotal, error}) => {
          let measures = dataAndTotal ? dataAndTotal.data : []
          return this.props.children({
            isFetching,
            data: measures,
            error,
            onSearch: this.updateNameFilter,
            metricNameDict: exportNameDict ? metricNameDict || _.keyBy(measures, 'name') : undefined
          })
        }}
      </Fetch>
    )
  }
}

export const withDbMetrics = (mapPropsToFetcherProps = _.constant({})) => Component => {
  return withDataSourceMeasures(Component, mapPropsToFetcherProps)
}

export const withDataSourceMeasures = (Component, mapPropsToFetcherProps) => props => {
  return (
    <DataSourceMeasuresFetcher
      {...mapPropsToFetcherProps(props)}
    >
      {({isFetching, data, metricNameDict}) => {
        return (
          <Component
            {...props}
            dataSourceMeasures={data || []}
            isFetchingDataSourceMeasures={isFetching}
            metricNameDict={metricNameDict}
          />
        )
      }}
    </DataSourceMeasuresFetcher>
  )
}

export const DBMETRICS_NS = 'dbMetrics'

export const dbMetricSagaModelGen = props => {
  const {
    dataSourceId, limit, searching, useOpenAPI, exportNameDict
  } = props
  const namespace = `${DBMETRICS_NS}_${dataSourceId}`
  const modelInst = sagaSyncModel(
    {
      namespace: namespace,
      modelName: 'dataSourceMeasures',
      reusable: true,
      getEffect: async () => {
        let query = {limit: limit || 999, name: searching || '', noauth: useOpenAPI ? 1 : ''}
        let url = `/app/measure/get/${dataSourceId}?${toQueryParams(query)}`
        
        let res = await FetchFinal.get(url)
        let metrics = _.get(res, 'data', [])
        if (exportNameDict) {
          window.store.dispatch({
            type: `${namespace}/updateState`,
            payload: prevState => ({...prevState, metricNameDict: _.keyBy(metrics, 'name')})
          })
        }
        return metrics
      }
    },
  )
  // default value
  modelInst.state.metricNameDict = {}
  return modelInst
}
