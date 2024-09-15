/**
 * 实时流量监控
 */

import React, { Component } from 'react'
import {DruidDataFetcherOnlyRunInViewport} from '../Fetcher/druid-data-fetcher'
import {Table, Tooltip} from 'antd'
import moment from 'moment'
import IcGeren from './icon/ic_geren'
import {browserHistory} from 'react-router'
import {toQueryParams} from '../../../common/sugo-utils'
import {insightUserById} from '../../common/usergroup-helper'

const select = ['*']

class DataTable extends Component {

  state = {
    data: [],
    isLoading: false
  }

  componentWillReceiveProps(nextProps) {
    const {dataSourceId} = nextProps
    if(dataSourceId !== this.props.dataSourceId) this.setState({data: []})
  }

  componentWillUnmount() {
    clearInterval(this._timeId)
    clearTimeout(this._refreshId)
  }

  _limit = 10

  startInsert() {
    if(this._timeId) return
    this._timeId = setInterval(this.insert, 2000)
  }

  startRefresh() {
    clearTimeout(this._refreshId)
    this._refreshId = setTimeout(() => this.refresh(), 20000)
  }

  insert = () => {
    if(!this._data.length) {
      clearInterval(this._timeId)
      this._timeId = null
    }
    const item = this._data.pop()
    if(!item) return
    let data = this.state.data.concat()
    data.unshift(item)
    this.setState({data: data.slice(0, 10)})
  }

  onData = data => {
    if(this.state.data.length) {
      const first = this.state.data[0]
      const lastTime = moment(first['__time']).toDate()
      data = data.filter(d => moment(d['__time']).toDate() > lastTime)
      if(data.length) {
        this._data = this._data ? data.concat(this._data) : data
        this.startInsert()
      }
    } else {
      this.setState({data})
    }
    this.startRefresh()
  }

  insightUser = ev => {
    // let {dataSourceId} = this.props
    // let metricalField = 'distinct_id' // TODO 支持设备 ID ？
    let userId = ev.currentTarget.getAttribute('data-user-id')
    /*    let eventTime = ev.currentTarget.getAttribute('data-event-time')
    let query = {
      datasource: dataSourceId,
      groupby: metricalField,
      id: `__temp_${metricalField}_${userId}`,
      user: userId,
      datetype: encodeURI(JSON.stringify([moment(eventTime).add(-1, 'day').format(), moment().format()]))
    }
    browserHistory.push(`/console/insight?${toQueryParams(query)}`)*/
    insightUserById(userId)
  }

  getTableColumns() {
    const tableColumns = [
      {
        title: '时间',
        dataIndex: '__time',
        key: '__time',
        render: time => moment(time).format('YYYY-MM-DD HH:mm:ss')
      },
      {
        title: '用户ID',
        dataIndex: 'distinct_id',
        key: 'distinct_id',
        width: 280,
        render: (id, rec) => (<div className="">
          <Tooltip title={id}>
            <span className="iblock mw200 elli">{id}</span>
          </Tooltip>

          <span
            className="mg1l color-purple-blue fpointer"
            data-user-id={id}
            data-event-time={rec.__time}
            onClick={this.insightUser}
          >
            <IcGeren style={{verticalAlign: 'sub'}}/>
          </span>
        </div>)
      },
      {
        title: '正在访问的页面',
        dataIndex: 'page_name',
        key: 'page_name',
        width: 300
      },
      {
        title: '操作事件',
        dataIndex: 'event_type',
        key: 'event_type'
      },
      {
        title: '操作设备',
        dataIndex: 'device_brand',
        key: 'device_brand',
        render: (device_brand, item) => {
          let {device_model, browser, browser_version} = item
          let dev = ''
          if(device_brand) dev += device_brand
          if(device_model) dev += ' ' + device_model
          if(!dev) {
            if(browser) dev += browser
            if(browser_version) dev += ' ' + browser_version
          }
          return dev
        }
      }
    ]

    return tableColumns
  }

  render() {
    const {
      dataSourceDimensions,
      dataSourceId,
      isFetchingModels
    } = this.props
    const {data, isLoading} = this.state
    let noData = !data || !data.length
    let filteredData = noData ? [] : data
    let tableColumns = this.getTableColumns()
    return (
      <div className="bg-f5 pd3">
        <div className="mg2y borderl2 line-height30">
          <span className="mg2x iblock color-purple-blue">实时流量监控：</span>
        </div>
        <DruidDataFetcherOnlyRunInViewport
          debounce={500}
          dbDimensions={dataSourceDimensions}
          dataSourceId={dataSourceId || ''}
          doFetch={!!(dataSourceId && !isFetchingModels)}
          filters={[]}
          select={select}
          selectLimit={this._limit}
          selectOrderDirection={'desc'}
          cleanDataWhenFetching
          forceUpdate
          onData={this.onData}
          children={({fetch}) => {
            this.refresh = fetch
            return <div />
          }}
          onFetchingStateChange={isFetching => this.setState({isLoading: isFetching})}
        />
        <Table
          loading={isLoading}
          className="always-display-scrollbar-horizontal-all wider-bar radius shadow12 table-white-head"
          scroll={{x: '100%'}}
          dataSource={filteredData}
          size="small"
          rowKey={(a, i) => i}
          columns={tableColumns}
          pagination={false}
        />
      </div>
    )
  }
}

export default DataTable
