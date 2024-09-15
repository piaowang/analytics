/**
 * Created by heganjie on 16/10/6.
 */

import React from 'react'
import PropTypes from 'prop-types'
import Fetch from '../Common/fetch.jsx'
import {includeCookie, noCache, recvJSON} from '../../common/fetch-utils'
import _ from 'lodash'
import {toQueryParams} from '../../../common/sugo-utils'
import DruidColumnType from '../../../common/druid-column-type'
import withPropsRemoteControl from '../Common/props-remote-control'
import {sagaSyncModel} from './saga-sync'
import FetchFinal from '../../common/fetch-final'

export const DBDIM_NS = 'dbDims'

export default class DataSourceDimensionsFetcher extends React.Component {
  static propTypes = {
    children: PropTypes.func,
    limit: PropTypes.number,
    dataSourceId: PropTypes.string.isRequired,
    doFetch: PropTypes.bool,
    stringDimensionOnly: PropTypes.bool,
    useOpenAPI: PropTypes.bool,
    useUserCustomOrder: PropTypes.bool,
    noSort: PropTypes.bool,
    onLoaded: PropTypes.func,
    resultFilter: PropTypes.func,
    exportNameDict: PropTypes.bool,
    disabledCache: PropTypes.bool,
    datasourceType: PropTypes.string // DimDatasourceType.tag | default
  }

  static defaultProps = {
    limit: 999,
    doFetch: true,
    stringDimensionOnly: false,
    children: _.constant(null)
  }

  state = {
    searching: ''
  }

  updateNameFilter = _.debounce(val => {
    if (val !== this.state.searching) {
      this.setState({searching: val})
    }
  }, 1300)

  adaptData = (dataAndTotal) => {
    let {stringDimensionOnly, resultFilter} = this.props
    let dims = dataAndTotal && dataAndTotal.data || []

    if (stringDimensionOnly) {
      dims = _.sortBy(dims.filter(c => Number(c.type) === DruidColumnType.String), d => d.title)
    }
    if (resultFilter) {
      dims = dims.filter(resultFilter)
    }
    return dims
  }

  onFetchingStateChange = isFetching => {
    if (isFetching) {
      let {exportNameDict} = this.props
      if (exportNameDict) {
        this.setState({dimNameDict: {}})
      }
    }
  }

  onData = raw => {
    let data = this.adaptData(raw)
    let {onLoaded, exportNameDict} = this.props
    if (onLoaded) {
      onLoaded(data)
    }
    if (exportNameDict) {
      this.setState({dimNameDict: _.keyBy(data, dbDim => dbDim.name)})
    }
  }

  render() {
    let {limit, dataSourceId, doFetch, useOpenAPI, useUserCustomOrder, noSort, exportNameDict,
      disabledCache, datasourceType} = this.props
    let {searching, dimNameDict} = this.state

    let url
    if (limit || searching || useOpenAPI || useUserCustomOrder || noSort || datasourceType) {
      let query = {
        limit: limit || 999,
        name: searching || '',
        noauth: useOpenAPI ? 1 : '',
        useUserCustomOrder: useUserCustomOrder ? 1 : '',
        noSort: noSort ? 1 : '',
        datasource_type: datasourceType || ''
      }
      url = `/app/dimension/get/${dataSourceId}?${toQueryParams(query)}`
    } else {
      url = `/app/dimension/get/${dataSourceId}`
    }
    return (
      <Fetch
        lazy={!doFetch}
        params={includeCookie}
        onData={this.onData}
        onFetchingStateChange={this.onFetchingStateChange}
        headers={disabledCache ? {...recvJSON.headers, ...noCache.headers} : recvJSON.headers}
        url={url}
      >
        {({isFetching, data: dataAndTotal, error, fetch}) => {
          let dataIncludeTimeDimension = this.adaptData(dataAndTotal)

          return this.props.children({
            isFetching,
            data: dataIncludeTimeDimension,
            error,
            onSearch: this.updateNameFilter,
            dimNameDict: exportNameDict
              ? (_.isEmpty(dimNameDict) ? _.keyBy(dataIncludeTimeDimension, 'name') : dimNameDict)
              : undefined,
            fetch
          })
        }}
      </Fetch>
    )
  }
}

let DimensionsFetcherWithRemoteControl = withPropsRemoteControl(DataSourceDimensionsFetcher)

export const withDbDims = (mapPropsToFetcherProps = _.constant({}), withRemoteControl = false) => Component => {
  return withDataSourceDimensions(Component, mapPropsToFetcherProps, withRemoteControl)
}

export const withDataSourceDimensions = (Component, mapPropsToFetcherProps, withRemoteControl = false) => props => {
  let DataSourceDimensionsFetcher0 = withRemoteControl ? DimensionsFetcherWithRemoteControl : DataSourceDimensionsFetcher
  const fetcherProps = mapPropsToFetcherProps(props)
  if (!fetcherProps.dataSourceId && props.dimNameDict) {
    return (
      <Component {...props} />
    )
  }
  return (
    <DataSourceDimensionsFetcher0 {...fetcherProps} >
      {({isFetching, data, remoteControl, dimNameDict, fetch}) => {
        return (
          <Component
            {...props}
            remoteControlForDimFetcher={remoteControl}
            dataSourceDimensions={data || []}
            isFetchingDataSourceDimensions={isFetching}
            dimNameDict={dimNameDict}
            reloadDataSourceDimensions={fetch}
          />
        )
      }}
    </DataSourceDimensionsFetcher0>
  )
}

export const dbDimSagaModelGen = props => {
  const {
    dataSourceId, limit, searching, useUserCustomOrder, noSort, datasourceType, useOpenAPI, stringDimensionOnly,
    resultFilter, exportNameDict
  } = props
  const namespace = `${DBDIM_NS}_${dataSourceId}`
  const modelInst = sagaSyncModel(
    {
      namespace: namespace,
      modelName: 'dataSourceDimensions',
      reusable: true,
      getEffect: async () => {
        let query = {
          limit: limit || 999,
          name: searching || '',
          noauth: useOpenAPI ? 1 : '',
          useUserCustomOrder: useUserCustomOrder ? 1 : '',
          noSort: noSort ? 1 : '',
          datasource_type: datasourceType || ''
        }
        let url = `/app/dimension/get/${props.dataSourceId}?${toQueryParams(query)}`
        let res = await FetchFinal.get(url)
        let dims = _.get(res, 'data', [])
        if (stringDimensionOnly) {
          dims = _.sortBy(dims.filter(c => Number(c.type) === DruidColumnType.String), d => d.title)
        }
        if (resultFilter) {
          dims = dims.filter(resultFilter)
        }
        if (exportNameDict) {
          window.store.dispatch({
            type: `${namespace}/updateState`,
            payload: prevState => ({...prevState, dimNameDict: _.keyBy(dims, 'name')})
          })
        }
        return dims
      }
    },
  )
  // default value
  modelInst.state.dimNameDict = {}
  return modelInst
}

