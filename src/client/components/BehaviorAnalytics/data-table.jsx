/**
 * 行为事件分析明细表格
 */
import { Component } from 'react'
import {Table, Tooltip} from 'antd'
import moment from 'moment'
import _ from 'lodash'
import {DruidDataFetcherOnlyRunInViewport} from '../Fetcher/druid-data-fetcher'
import IcGeren from '../TrafficAnalytics/icon/ic_geren'
import FilterCol from '../TrafficAnalytics/filter-col'
import {getTimeRange} from '../TrafficAnalytics/data-box'
import {insightUserById} from '../../common/usergroup-helper'
import {EMPTY_VALUE_OR_NULL} from '../../../common/constants'

const select = ['*']
const filterPath = 'params.filterDict._pageName' //控件或者是页面刷新范围

const getPopupContainer = () => document.querySelector('.overscroll-y')

export function getTypeFilter(model, countTime) {
  const eventType = _.get(model, 'params.eventName')
  return [
    {
      col: 'event_type',
      op: 'in',
      eq: getEventTypes(model, countTime)
    },
    eventType === '浏览' ? {col: 'page_name', op: 'not nullOrEmpty', eq: [EMPTY_VALUE_OR_NULL]} : null
  ].filter(_.identity)
}

export function getEventTypes(model, countTime) {
  const eventType = _.get(model, 'params.eventName')
  if (eventType === '浏览') {
    return countTime ? ['停留', '窗口停留'] : ['浏览']
  }
  if (eventType === '对焦') {
    return ['对焦']
  }
  else return [eventType]
}

class DataTable extends Component {

  state = {
    data: [],
    filters: [],
    isLoading: false
  }

  componentWillReceiveProps(nextProps) {
    const {model} = nextProps
    const {filters} = this.state
    let newFilters = []
    const _pageName = _.get(model, filterPath, [])
    if(_pageName.length) {
      if(!filters.length) {
        newFilters = _pageName.concat()
      } else {
        newFilters = filters.concat()
        let nameFilter = Object.assign({},  newFilters[0])
        let eqs = _.get(_pageName, '[0].eq', [])
        nameFilter.eq = nameFilter.eq.filter(v => eqs.includes(v))
        newFilters[0] = nameFilter
      }
    }
    
    this.setState({filters: newFilters})
  }

  getFilters() {
    const {model} = this.props
    const {filters} = this.state
    const {timeFilter} = model.params
    // const {dateRange} = timeFilter
    const filterDict = _.get(model, 'params.filterDict', {})

    let tempFilters = []
    Object.keys(filterDict).forEach(name => {
      tempFilters = tempFilters.concat(filterDict[name])
    })

    tempFilters = tempFilters.concat(filters)
    const dict = _.keyBy(tempFilters, 'col')
    let newFilters = []    
    for(let k in dict) {
      newFilters = newFilters.concat(dict[k])
    }
    newFilters.push({col: '__time', op: 'in', eq: getTimeRange(timeFilter)})
    return newFilters
  }

  insightUser = ev => {
    let {model} = this.props
    const dataSourceId = model.druid_datasource_id

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
    const {model} = this.props
    const tableColumns = [
      {
        title: <span className="pd1l">时间</span>,
        dataIndex: '__time',
        key: '__time',
        render: time => <span className="pd1l">{moment(time).format('YYYY-MM-DD HH:mm:ss')}</span>
      },
      {
        title: '用户ID',
        dataIndex: 'distinct_id',
        key: 'distinct_id',
        width: 280,
        render: (id, rec) => (<div>
          <Tooltip title={id}>
            <span className="iblock mw200 elli">{id}</span>
          </Tooltip>
          
          <span
            className="mg2l color-purple-blue fpointer"
            data-user-id={id}
            data-event-time={rec.__time}
            onClick={this.insightUser}
          >
            <IcGeren className="mg1r" style={{verticalAlign: 'sub'}}/>
          </span>
        </div>)
      },
      {
        title: '控件名称',
        dataIndex: 'event_name',
        key: 'event_name',
        width: 200
      },
      {
        title: '所在页面',
        dataIndex: 'page_name',
        key: 'page_name',
        width: 280
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

    if(_.get(model, 'params.eventName') === '浏览') {
      tableColumns[2] = {
        title: '页面名称',
        dataIndex: 'page_name',
        key: 'page_name'
      }
      tableColumns[3] = {
        title: '分辨率',
        dataIndex: 'screen_height',
        key: 'screen_height',
        render: (v, data) => data.screen_pixel || `${data.screen_height} * ${data.screen_width}`
      }
    }

    return tableColumns
  }

  renderTypeFilter() {
    const {model, dataSource, dataSourceDimensions} = this.props
    const {timeFilter} = model.params
    const {dateRange} = timeFilter
    const value = this.state.filters.concat()

    let con = _.get(model, 'params.eventName') === '浏览' ? {
      name: 'pageName',
      title: '页面名称',
      dimensions: ['page_name'],
      dimensionDes: ['参与分析的页面']
    } : {
      name: 'event_name',
      title: '控件名称',
      dimensions: ['event_name'],
      dimensionDes: ['参与分析的控件']
    }

    const optionDict = {
      [con.dimensions[0]]: _.get(model, `${filterPath}[0].eq`, [])
    }
    let topNFilters = [
      {col: '__time', op: 'in', eq: dateRange},
      ...getTypeFilter(model)
    ]
    return (
      <FilterCol
        getPopupContainer={getPopupContainer}
        condition={con} 
        value={value}
        dbDimensions={dataSourceDimensions}
        dataSource={dataSource}
        optionDict={optionDict}
        topNFilters={topNFilters}
        onChange={filters => {
          this.setState({filters})
        }}
        className="itblock mg2b bg-dark-white filter-col"
      />
    )
  }

  render() {
    const {dataSourceDimensions, model, isFetchingModels} = this.props
    const {data, isLoading} = this.state
    const dataSourceId = model.druid_datasource_id
    let noData = !data || !data.length
    let filteredData = noData ? [] : data
    let tableColumns = this.getTableColumns()
    const filters = this.getFilters()
    return (
      <section className="bg-f9 pd2">
        <div className="mg2y borderl2 line-height30">
          <span className="mg2x iblock color-purple-blue">行为事件分析明细</span>
        </div>
        {this.renderTypeFilter()}
        <DruidDataFetcherOnlyRunInViewport
          debounce={500}
          dbDimensions={dataSourceDimensions}
          dataSourceId={dataSourceId || ''}
          doFetch={dataSourceId && !isFetchingModels}
          filters={filters}
          select={select}
          selectLimit={500}
          selectOrderDirection={'desc'}
          cleanDataWhenFetching
          forceUpdate
          onData={data => this.setState({data})}
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
          pagination={{
            showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`,
            total: data.length,
            showSizeChanger: true,
            defaultPageSize: 10 
          }}
        />
      </section>
    )
  }
}

export default DataTable
