import LitePopInput from '../Common/lite-pop-input'
import React from 'react'
import {
  compressUrlQuery,
  exportFile,
  groupBy,
  immutateUpdate,
  insert
} from '../../../common/sugo-utils'
import moment from 'moment'
import * as d3 from 'd3'
import DruidQueryResources from '../../models/druid-query/resource'
import _ from 'lodash'
import DruidDataFetcher from '../Fetcher/druid-data-fetcher'
import {ContextNameEnum, withContextConsumer} from '../../common/context-helper'
import {withUserGroupUsersDec} from '../Fetcher/usergroup-user-fetcher'
import {genTableMetrics} from './userlist'
import {withDbDims} from '../Fetcher/data-source-dimensions-fetcher'
import {message} from 'antd'
import {isUindexUg} from '../../common/usergroup-helper'
import {DimDatasourceType, QUERY_ENGINE} from '../../../common/constants'
import {genQueryBody} from '../../common/slice-data-transform'

@withContextConsumer(ContextNameEnum.ProjectInfo)
@withUserGroupUsersDec(props => {
  return ({
    userGroup: props.userGroup,
    doFetch: false,
    pageIndex: 0,
    pageSize: 100
  })
})
@withDbDims(props => {
  let dsId = _.get(props, 'datasourceCurrent.id') || ''
  return {
    dataSourceId: dsId,
    doFetch: false,
    exportNameDict: true,
    datasourceType: isUindexUg(props.userGroup) ? DimDatasourceType.tag : DimDatasourceType.default
  }
})
export default class UserGroupExporter extends React.Component {
  state = {
    loadingCsvData: false
  }

  genUserListFetchParams = (userList, tableMetrics) => {
    let {userGroup: ug, datasourceCurrent, dimNameDict} = this.props
    let userIdDimName = _.get(ug, 'params.groupby') || _.get(datasourceCurrent, 'params.commonMetric[0]')

    let dsId = datasourceCurrent && datasourceCurrent.id
    return {
      dataSourceId: dsId,
      doFetch: !!(dsId && userIdDimName && !_.isEmpty(userList)),
      filters: [
        !_.isEmpty(userList) && {col: userIdDimName, op: 'in', eq: userList}
      ].filter(_.identity),
      dimensions: [userIdDimName, 'sugo_nation', 'sugo_province', 'sugo_city'].filter(dimName => dimName in dimNameDict),
      splitType: 'groupBy',
      dimensionExtraSettingDict: {[userIdDimName]: {limit: 9999}},
      customMetrics: tableMetrics,
      withGlobalMetrics: false,
      metrics: []
    }
  }

  genTopNFetchParams = (ug) => {
    let {dimNameDict, datasourceCurrent} = this.props
    let userIdDimName = _.get(ug, 'params.groupby') || _.get(datasourceCurrent, 'params.commonMetric[0]')
    let dsId = datasourceCurrent && datasourceCurrent.id
    return {
      dataSourceId: dsId,
      queryEngine: isUindexUg(ug) ? QUERY_ENGINE.UINDEX : QUERY_ENGINE.TINDEX,
      doFetch: !!(dsId && userIdDimName && (userIdDimName in dimNameDict)),
      filters: [],
      dimensions: [userIdDimName],
      dimensionExtraSettingDict: {[userIdDimName]: {limit: 500}},
      groupByAlgorithm: 'topN',
      metrics: []
    }
  }

  downloadUserList = async (amount) => {
    let {userGroup: ug, datasourceCurrent, reloadUserGroupIds, reloadDataSourceDimensions} = this.props

    this.setState({loadingCsvData: true})

    let userIdDimName = _.get(ug, 'params.groupby') || _.get(datasourceCurrent, 'params.commonMetric[0]')

    await reloadDataSourceDimensions()

    let userIds = []
    if (ug.id === 'all') {
      // 全部用户，从 druid 读取
      let queryTopNParams = genQueryBody(this.genTopNFetchParams(ug))

      let topNRes = await DruidQueryResources.query(immutateUpdate(queryTopNParams, 'dimensionExtraSettings[0].limit', () => +amount))
      userIds = (_.get(topNRes, 'result[0].resultSet') || []).map(d => d[userIdDimName])
    } else {
      // 分群用户，从 redis 读取
      let queryRedisRes = await reloadUserGroupIds(prevBody => immutateUpdate(prevBody, 'query.groupReadConfig.pageSize', () => amount))
      let {count, ids, totalCount} = queryRedisRes || {}
      userIds = ids
    }

    if (_.isEmpty(userIds)) {
      message.warn('查询用户群失败')
      this.setState({loadingCsvData: false})
      return
    }

    if (isUindexUg(ug)) {
      let {dimNameDict} = this.props
      const queryParamsAllFields = {
        druid_datasource_id: datasourceCurrent && datasourceCurrent.id,
        queryEngine: QUERY_ENGINE.UINDEX,
        tag_datasource_name: datasourceCurrent && datasourceCurrent.name,
        params: {
          filters: [
            !_.isEmpty(userIds) && {col: userIdDimName, op: 'in', eq: userIds}
          ].filter(_.identity),
          select: _(dimNameDict).keys().filter(k => k !== '__time').orderBy(k => k === userIdDimName ? 0 : 1).value(),
          selectLimit: +amount,
          scanQuery: true // 批量下载采用scanQuery下载
        }
      }

      this.setState({loadingCsvData: false})

      const fileName = `分群 ${ug && ug.title || '全部访问用户'} 的用户列表_${moment().format('YYYY-MM-DD')}.csv`
      let downloadAllFieldsUrl = `/app/download/batchtags?q=${compressUrlQuery(queryParamsAllFields)}&filename=${encodeURI(fileName)}`
      window.location.href = downloadAllFieldsUrl
    } else {
      await this.exportBehaviorUserGroup(userIds)
    }
  }

  async exportBehaviorUserGroup(userIds) {
    let {userGroup: ug, datasourceCurrent, dimNameDict} = this.props
    let userIdDimName = _.get(ug, 'params.groupby') || _.get(datasourceCurrent, 'params.commonMetric[0]')

    let tableMetrics = genTableMetrics({
      durationDimName: 'duration' in dimNameDict ? 'duration' : null,
      eventNameDimName: 'event_name' in dimNameDict ? 'event_name' : null,
      eventTimeDimName: 'event_time' in dimNameDict ? 'event_time' : '__time'
    })

    let queryParams = genQueryBody(this.genUserListFetchParams(userIds, tableMetrics))
    let res = await DruidQueryResources.query(queryParams)

    this.setState({loadingCsvData: false})

    let nonDistinctUserList = _.get(res, 'result[0].resultSet')
    // 前端去重
    let arr = this.mergeMultiArea(nonDistinctUserList, userIdDimName)

    let columns = this.genColumns(ug, userIdDimName, tableMetrics)
    let sortedKeys = columns.map(tCol => tCol.title)
    let sortedRows = arr.map(d => columns.map(tCol => {
      let render = tCol.render
      let val = d[tCol.dataIndex]
      return render ? render(val, d) : val
    }))

    let content = d3.csvFormatRows([sortedKeys, ...sortedRows])

    exportFile(`分群 ${ug && ug.title || '全部访问用户'} 的用户列表_${moment().format('YYYY-MM-DD')}.csv`, content)
  }

  mergeMultiArea = (userList, userIdDimName) => {
    let dict = groupBy(userList, ev => ev[userIdDimName], evs => {
      // 合并 最近30天访问次数 vv，最近30天访问时长 durationSum 和 最近一次访问时间 maxTime
      if (evs.length === 1) {
        return evs[0]
      } else {
        let mostRecentlyEvent = _.maxBy(evs, ev => moment(ev.maxTime).valueOf())
        return {
          ...mostRecentlyEvent,
          vv: _.sumBy(evs, 'vv'),
          durationSum: _.sumBy(evs, 'durationSum')
        }
      }
    })
    return _.values(dict)
  }

  genColumns(ug, userDimName, tableMetrics) {
    let {dimNameDict} = this.props
    if (!dimNameDict[userDimName]) {
      return []
    }
    let cols = [dimNameDict[userDimName], ...tableMetrics].map(col => {
      let {title, name, formatter} = col
      return {
        title: title || name,
        dataIndex: name,
        render: name === userDimName ? _.identity : formatter
      }
    }).filter(_.identity)
    if (_.some(['sugo_nation', 'sugo_province', 'sugo_city'], dimName => dimName in dimNameDict)) {
      return insert(cols, 1, {
        title: '最近访问地区',
        dataIndex: 'sugo_nation',
        render: (val, record) => {
          return `${record.sugo_nation || ''}${record.sugo_province || ''}${record.sugo_city || ''}`
        }
      })
    }
    return cols
  }

  render() {
    let {children} = this.props
    let {loadingCsvData} = this.state
    if (!children) {
      return null
    }
    return (
      <LitePopInput
        title="请选择下载量"
        defaultValue={100}
        type="select"
        options={[{name: '100'}, {name: '500'}, {name: '1000'}]}
        onChange={this.downloadUserList}
        placement="bottomRight"
      >
        {children({loadingCsvData})}
      </LitePopInput>
    )
  }
}
