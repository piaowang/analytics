import React, { Component } from 'react'
import './css.styl'
import { Icon as LegacyIcon } from '@ant-design/compatible';
import { Row, Col, Select, Spin } from 'antd';
import TimePicker from '../Common/time-picker'
import { convertDateType, isRelative } from '../../../common/param-transform'
import LineChart from '../Charts/LineChart'
import { connect } from 'react-redux'
import _ from 'lodash'
import * as actions from '../../actions'
import { bindActionCreators } from 'redux'
import { AccessDataType, AccessDataOriginalType, ProjectStatus, ProjectState } from '../../../common/constants'
import { doQuerySliceData } from '../../common/slice-data-transform'
import moment from 'moment'
import Fetch from '../../common/fetch-final'
import * as d3 from 'd3'
import LinkNoJam from '../Common/link-nojam'
import { DefaultDruidQueryCacheOptsForDashboard } from '../../common/fetch-utils'
import {browserHistory} from 'react-router'

const Measure = [
  { key: 'new_user', title: '新用户数', formula: '' },
  { key: 'use_count', title: '启动用户数', formula: '' },
  { key: 'user_count', title: '启动次数', formula: '' },
  { key: 'measure_4', title: '累计启动用户', formula: '' }
]
const MeasureMap = {
  new_user: '新用户数',
  use_count: '启动用户数',
  user_count: '启动次数'
}
const commaFormatter = d3.format(',')
function numberFormat(val) {
  if (val === 0) return '--'
  if (!_.isNumber(val)) {
    return val
  }
  return Number.isInteger(val) ? commaFormatter(val) : val
}
const queryData = async function (appIdList, projectList, timeRange) {
  let dateFilter
  let metrics
  let dimensions = []
  let projects = projectList.filter(p => p.access_type === AccessDataType.SDK && _.some(appIdList, a => a.project_id === p.id))
  projects = projects.slice(0, sugo.sdkTrafficLimit)
  if (!projects.length) {
    return timeRange ? { chartData: [] } : { totalData: {}, listData: [] }
  }

  let deviceCount = []
  if (!timeRange) {
    let { result = [] } = await Fetch.get('/app/sdk-first-start-time/get-device-count', {
      dsNames: projects.map(p => p.datasource_name)
    })
    deviceCount = _.reduce(result, (r, v) => {
      const project = projectList.find(p => p.datasource_name === v.datasource_name) || {}
      const appInfo = appIdList.find(p => p.project_id === project.id && p.access_type === (v.app_type - 1))
      const appid = _.get(appInfo, 'id', '')
      const device = _.get(r, appid, {})
      r[appid] = { appid, ...device, ...v }
      return r
    }, {})
    const yesterBegin = moment().add(-1, 'd').startOf('d')
    const yesterEnd = moment().add(-1, 'd').endOf('d')
    const todayBegin = moment().startOf('d')
    const todayEnd = moment().endOf('d')
    dimensions.push('token')
    dateFilter = { col: '__time', op: 'in', eq: '-7 days' }
    metrics = [
      { name: 'today_new_user', formula: `$main.filter(${+todayBegin} <= $__time.cast('NUMBER') and $__time.cast('NUMBER') < ${+todayEnd} and $event_type == "首次访问").countDistinct($distinct_id, 'sketch')` },
      { name: 'today_use_count', formula: `$main.filter(${+todayBegin} <= $__time.cast('NUMBER') and $__time.cast('NUMBER') < ${+todayEnd} and $event_type == "启动").countDistinct($distinct_id, 'sketch')` },
      { name: 'today_user_count', formula: `$main.filter(${+todayBegin} <= $__time.cast('NUMBER') and $__time.cast('NUMBER') < ${+todayEnd} and $event_type == "启动").count()` },
      { name: 'yesterday_new_user', formula: `$main.filter(${+yesterBegin} <= $__time.cast('NUMBER') and $__time.cast('NUMBER') < ${+yesterEnd} and $event_type == "首次访问").countDistinct($distinct_id, 'sketch')` },
      { name: 'yesterday_use_count', formula: `$main.filter(${+yesterBegin} <= $__time.cast('NUMBER') and $__time.cast('NUMBER') < ${+yesterEnd} and $event_type == "启动").countDistinct($distinct_id, 'sketch')` },
      { name: 'yesterday_user_count', formula: `$main.filter(${+yesterBegin} <= $__time.cast('NUMBER') and $__time.cast('NUMBER') < ${+yesterEnd} and $event_type == "启动").count()` }
    ]
  } else {
    dateFilter = { col: '__time', op: 'in', eq: timeRange }
    dimensions.push('__time')
    metrics = [
      { name: 'new_user', formula: '$main.filter($event_type == "首次访问").countDistinct($distinct_id, \'sketch\')' },// ${+begin} <= $first_login_time.cast('NUMBER') and $first_login_time.cast('NUMBER') < ${+end}
      { name: 'use_count', formula: '$main.filter($event_type == "启动").countDistinct($distinct_id, \'sketch\')' },
      { name: 'user_count', formula: '$main.filter($event_type == "启动").count()' }
    ]
  }

  let result = []

  for (let i = 0; i < projects.length; i++) {
    const { datasource_id: druid_datasource_id, datasource_name } = projects[i]
    let data = await doQuerySliceData({
      druid_datasource_id,
      datasource_name,
      params: {
        dimensions,
        filters: [dateFilter],
        customMetrics: metrics,
        granularity: 'P1D'
      }
    }, DefaultDruidQueryCacheOptsForDashboard)
    result = result.concat(_.get(data, ['0', 'resultSet'], []))
  }

  if (timeRange) {
    let chartData = _.groupBy(result, p => moment(p.__time).format('YYYY-MM-DD')) || []
    chartData = _.keys(chartData).map(p => {
      const obj = chartData[p]
      if (obj.length === 1) {
        return obj[0]
      } else {
        return {
          use_count: _.sumBy(obj, o => o.user_count),
          user_count: _.sumBy(obj, o => o.user_count),
          new_user: _.sumBy(obj, o => o.new_user),
          __time: p
        }
      }
    })
    chartData = _.orderBy(chartData, ['__time'], ['asc'])
    return { chartData }
  }
  let totalData = {}
  let appData = []
  totalData = {
    yesterday: {
      new_user: _.sumBy(result, 'yesterday_new_user', '--'),
      use_count: _.sumBy(result, 'yesterday_use_count', '--'),
      user_count: _.sumBy(result, 'yesterday_user_count', '--')
    },
    today: {
      new_user: _.sumBy(result, 'today_new_user', '--'),
      use_count: _.sumBy(result, 'today_use_count', '--'),
      user_count: _.sumBy(result, 'today_user_count', '--')
    }
  }

  const resMap = _.keyBy(result, p => p.token)

  appData = appIdList.map(p => {
    return {
      type: p.access_type,
      project_id: p.project_id,
      ...resMap[p.id],
      ...deviceCount[p.id]
    }
  })
  appData = _.groupBy(appData, p => p.project_id)
  appData = projects.map(p => {
    return {
      name: p.name,
      data: appData[p.id]
    }
  })
  return { listData: appData, totalData }
}
const mapStateToProps = state => state.common
const mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)

@connect(mapStateToProps, mapDispatchToProps)
export default class SdkTraffic extends Component {
  state = {
    timeRange: '-7 day',
    chartData: [],
    listData: [],
    totalData: {},
    isLoadding: true,
    selectMeasure: 'new_user',
    appIdList: []
  }

  componentWillMount() {
    this.props.getProjects({
      where: {
        status: ProjectStatus.Show
      }
    }).then(res => {
      let projects = _.get(res, 'result.model') || []
      this.getAppIdList(projects)
    })
  }

  getAppIdList = async (projects) => {
    let { timeRange } = this.state
    let appIdList = await Fetch.get('/app/project/appid-list', {
      where: {
        status: ProjectState.Activate
      }
    })
    appIdList = appIdList.result.model
    const { listData, totalData } = await queryData(appIdList, projects)
    const { chartData } = await queryData(appIdList, projects, timeRange)
    this.setState({ appIdList, listData, chartData, totalData, isLoadding: false })
  }

  getData = async (timeRange) => {
    this.setState({ isLoadding: true })
    let { projects } = this.props
    let { appIdList } = this.state
    const { chartData } = await queryData(appIdList, projects, timeRange)
    this.setState({ chartData, timeRange, isLoadding: false })
  }

  render() {
    const { timeRange, isLoadding, chartData, selectMeasure, totalData, listData } = this.state
    let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
    let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(relativeTime)
    let minData = 0
    if (chartData.length) {
      minData = _.minBy(chartData, p => p.new_user).new_user - 100
      minData = minData < 0 ? 0 : minData
    }
    return (
      <div className="height-100 scroll-content relative always-display-scrollbar sdk-traffic">
        <Spin spinning={isLoadding}>
          <div className="total-panel">
            <div>汇总数据</div>
            <Row className="total-item alignright">
              <Col span={6} />
              {
                Measure.slice(0, 3).map((p, i) => <Col span={6} key={`title-${i}`} className="yesterday-color">{p.title}</Col>)
              }
            </Row>
            <Row className="total-item today-color font22">
              <Col span={6} className="font14">今日</Col>
              <Col span={6} className="alignright">{numberFormat(_.get(totalData, ['today', 'new_user'], '--'))}</Col>
              <Col span={6} className="alignright">{numberFormat(_.get(totalData, ['today', 'use_count'], '--'))}</Col>
              <Col span={6} className="alignright">{numberFormat(_.get(totalData, ['today', 'user_count'], '--'))}</Col>
            </Row>
            <Row className="total-item yesterday-color font16">
              <Col span={6} className="font14">昨日</Col>
              <Col span={6} className="alignright">{numberFormat(_.get(totalData, ['yesterday', 'new_user'], '--'))}</Col>
              <Col span={6} className="alignright">{numberFormat(_.get(totalData, ['yesterday', 'use_count'], '--'))}</Col>
              <Col span={6} className="alignright">{numberFormat(_.get(totalData, ['yesterday', 'user_count'], '--'))}</Col>
            </Row>
            <div className="iblock mg2b">
              <span className="iblock">指标:</span>
              <Select className="width150 mg2l iblock" defaultValue={selectMeasure} onChange={v => this.setState({ selectMeasure: v })}>
                {
                  Measure.map(p => <Select.Option value={p.key} key={p.key}>{p.title}</Select.Option>)
                }
              </Select>
              <TimePicker
                className="width280 mg2l iblock"
                dateType={relativeTime}
                dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
                onChange={({ dateType: relativeTime, dateRange: [since, until] }) => {
                  this.getData(relativeTime === 'custom' ? [since, until] : relativeTime)
                }}
              />
            </div>
            <div>
              <LineChart
                style={{ height: '200px' }}
                data={chartData}
                dimensions={['__time']}
                metrics={[selectMeasure]}
                translationDict={MeasureMap}
                optionsOverwriter={option => {
                  let newOption = _.cloneDeep(option)
                  _.set(newOption, 'yAxis.show', true)
                  _.set(newOption, 'grid.left', 70)
                  _.set(newOption, 'yAxis.splitLine.show', true)
                  _.set(newOption, 'yAxis.axisLabel.show', false)
                  _.set(newOption, 'yAxis.axisLine.lineStyle.color', '#eee')
                  _.set(newOption, 'yAxis.splitLine.lineStyle.color', '#eee')
                  _.set(newOption, 'xAxis.splitLine.show', false)
                  _.set(newOption, 'yAxis.min', minData)
                  _.set(newOption, 'series.0.itemStyle', { normal: { color: '#798acf' } })
                  _.set(newOption, 'series.0.smooth', false)
                  _.set(newOption, 'series.0.showAllSymbol', false)
                  _.set(newOption, 'series.0.showSymbol', false)
                  _.set(newOption, 'series.0.areaStyle', {
                    normal: {
                      color: 'rgba(220, 231, 255, 0.6)'
                    }
                  })
                  return newOption
                }}
              />
            </div>
          </div>
          <div className="app-panel">
            <div className="font20 mg2b">我的全部应用</div>
            <div>
              <Row className="app-title">
                <Col span={8} >应用名称</Col>
                <Col span={16}>
                  <Row>
                    <Col span={3} />
                    {
                      Measure.map((p, i) => <Col span={5} key={`app-title-${i}`} className="alignright pd2r">{p.title}</Col>)
                    }
                  </Row>
                </Col>
              </Row>
              {
                listData.map((p, j) => {
                  const children = _.orderBy(p.data, ['type'], ['asc']).map((d, i) => {
                    let icon = 'android'
                    let color = '#97C03D'//'#8AC1B6'
                    if (d.type === AccessDataOriginalType.Ios) {
                      icon = 'apple'
                      color = '#A7B2B8'//'#1167FD'
                    } else if (d.type === AccessDataOriginalType.Web) {
                      icon = 'ie'
                      color = '#1EBBEE'//'#1167FD'
                    } else if (d.type === AccessDataOriginalType.WxMini) {
                      icon = 'wechat'
                      color = '#00D105'
                    }
                    return (
                      <div className="app-item-data app-item-border-bottom font12" key={`div-${i}`}>
                        <Row className="today-color">
                          <Col span={1}><LegacyIcon type={icon} style={{ color: color }} className="app-item-icon font16" /></Col>
                          <Col span={2} className="pd2l">今天</Col>
                          <Col span={5} className="alignright pd2r">{numberFormat(_.get(d, 'today_new_user', '--'))}</Col>
                          <Col span={5} className="alignright pd2r">{numberFormat(_.get(d, 'today_use_count', '--'))}</Col>
                          <Col span={5} className="alignright pd2r">{numberFormat(_.get(d, 'today_user_count', '--'))}</Col>
                          <Col span={5} className="alignright pd2r">{numberFormat(_.get(d, 'today_device_count', '--'))}</Col>
                        </Row>
                        <Row className="mg1t yesterday-color">
                          <Col span={1}></Col>
                          <Col span={2} className="pd2l">昨天</Col>
                          <Col span={5} className="alignright pd2r">{numberFormat(_.get(d, 'yesterday_new_user', '--'))}</Col>
                          <Col span={5} className="alignright pd2r">{numberFormat(_.get(d, 'yesterday_use_count', '--'))}</Col>
                          <Col span={5} className="alignright pd2r">{numberFormat(_.get(d, 'yesterday_user_count', '--'))}</Col>
                          <Col span={5} className="alignright pd2r">{numberFormat(_.get(d, 'yesterday_device_count', '--'))}</Col>
                        </Row>
                      </div>
                    );
                  })
                  return (<Row className="app-item relative" key={`divl-${j}`}>
                    <Col span={8} className="vertical-center-of-relative app-item-title">
                      <a
                        className="pointer"
                        onClick={async () => {
                          let { projects, changeProject } = this.props
                          let proj = _.find(projects, { name: p.name })
                          if (!proj) {
                            return
                          }
                          await changeProject(proj.id, proj.datasource_id)
                          browserHistory.push('/console/dashboards/overview')
                        }}
                      >
                        {p.name}
                      </a>
                    </Col>
                    <Col span={16} offset={8} className="app-item-border-left">
                      {children}
                    </Col>
                  </Row>)
                })
              }
            </div>
          </div>
        </Spin>
      </div>
    );
  }
}
