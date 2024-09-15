/**
 * 行为事件分析统计表格
 */
import { LoadingOutlined } from '@ant-design/icons';

import { Row, Col, Table, Tooltip } from 'antd';
import React, { Component } from 'react'
import _ from 'lodash'
import icUser from '../../images/ic_user.svg'
import * as d3 from 'd3'
import metricValueFormatterFactory from '../../common/metric-formatter-factory'
import {convertDateType, isRelative, convertOldDateType} from '../../../common/param-transform'
import HoverHelp, {HoverHelpWithBox} from '../Common/hover-help'
import {DruidDataFetcherOnlyRunInViewport} from '../Fetcher/druid-data-fetcher'
import TextFitter from '../Common/text-fitter'
import {getFilters} from './chart-panel'
import {EMPTY_VALUE_OR_NULL} from '../../../common/constants'

let durationCompleteFormatter = metricValueFormatterFactory('duration-complete')

function getTimeRange({dateType, dateRange}) {
  let relativeTime = isRelative(dateType) ? dateType : 'custom'
  // 暂不考虑 relativeTimeType
  return relativeTime === 'custom' ? dateRange : convertDateType(relativeTime, undefined, 'tool')
}

let percentFormatter = d3.format('.2%')

let loadingIndicator = (
  <LoadingOutlined />
)

class StatisticalPanel extends Component {
  state = {
    metricsGroupForNewOldUser: 0,
    metricsGroupForCtrlInfo: 0,
    ctrlSortDirect: 'desc'
  }

  componentWillReceiveProps (nextProps) {
    if (!_.isEqual(_.get(this.props.model, 'params.eventName'), _.get(nextProps, 'params.eventName'))) {
      this.setState({
        metricsGroupForNewOldUser: 0,
        metricsGroupForCtrlInfo: 0
      })
    }
  }

  renderNewOldUserFetcher(metricObjs) {
    const {model, isFetchingModels} = this.props
    const {metricsGroupForCtrlInfo} = this.state
    let timeFilter = _.get(model, 'params.timeFilter') || {}
    let {dateType} = timeFilter

    let [since, until] = getTimeRange(timeFilter)

    let sliceFilters = getFilters(model, metricsGroupForCtrlInfo !== 0)
    //fix: 这里对 lastOneYear 不做处理，因为在 convertDateType 里面已经对 lastOneYear做过处理了，这里再处理的话，会覆盖掉，然后导致数据错误
    if (isRelative(dateType) && _.isString(dateType) && dateType !== 'lastOneYear') {
      dateType = convertOldDateType(dateType)
    }

    // 新用户: since <= first_visit_time; 老用户： not 新用户
    // 按照用户设定的时间查询
    let commonFilters = [
      {
        col: '__time',
        op: 'in',
        eq: isRelative(dateType) ? dateType : [since, until]
      },
      ...sliceFilters
    ]
    let metricalField = _.get(model, 'params.metricalField') || 'distinct_id'
    let dsId = model && model.druid_datasource_id || ''
    return [
      <DruidDataFetcherOnlyRunInViewport
        key="allUserInfoFetcher"
        debounce={500}
        dataSourceId={dsId}
        doFetch={!!(!isFetchingModels && dsId)}
        filters={commonFilters}
        onFetchingStateChange={isFetching => {
          this.setState({ isFetchingAllUserInfo: isFetching })
        }}
        customMetrics={[
          {
            name: 'allUserCount',
            formula: `$main.countDistinct($${metricalField})`
          },
          ...metricObjs
        ]}
        onData={result => {
          this.setState({allUser: result && result[0] || {}})
        }}
      />,
      <DruidDataFetcherOnlyRunInViewport
        key="newUserInfoFetcher"
        dataSourceId={dsId}
        debounce={500}
        doFetch={!!(!isFetchingModels && dsId)}
        filters={[
          ...commonFilters,
          {
            col: 'first_visit_time',
            op: 'in',
            eq: [since, '3000']
          }
        ]}
        onFetchingStateChange={isFetching => {
          this.setState({ isFetchingNewUserInfo: isFetching })
        }}
        customMetrics={[
          {
            name: 'newUserCount',
            formula: `$main.countDistinct($${metricalField})`
          },
          ...metricObjs
        ]}
        onData={result => {
          this.setState({newUser: result && result[0] || {}})
        }}
      />,
      <DruidDataFetcherOnlyRunInViewport
        key="oldUserInfoFetcher"
        dataSourceId={dsId}
        debounce={500}
        doFetch={!!(!isFetchingModels && dsId)}
        filters={[
          ...commonFilters,
          {
            // 不是新用户，就是老用户
            op: 'not',
            eq: [
              {
                col: 'first_visit_time',
                op: 'in',
                eq: [since, '3000']
              }
            ]
          }
        ]}
        onFetchingStateChange={isFetching => {
          this.setState({ isFetchingOldUserInfo: isFetching })
        }}
        customMetrics={[
          {
            name: 'oldUserCount',
            formula: `$main.countDistinct($${metricalField})`
          },
          ...metricObjs
        ]}
        onData={result => {
          this.setState({oldUser: result && result[0] || {}})
        }}
      />
    ]
  }


  renderNewOldUserPanel(metricObjs) {
    let {model} = this.props
    let {allUser, newUser, oldUser, isFetchingAllUserInfo, isFetchingNewUserInfo, isFetchingOldUserInfo,
      metricsGroupForNewOldUser} = this.state
    let allUserCount = _.get(allUser, 'allUserCount') || 0
    let newUserCount = _.get(newUser, 'newUserCount') || 0
    let oldUserCount = _.get(oldUser, 'oldUserCount') || 0

    let newUserPercent = newUserCount / (newUserCount + oldUserCount)
    let oldUserPercent = oldUserCount / (newUserCount + oldUserCount)

    let eventType = _.get(model, 'params.eventName') || '点击'
    return (
      <div className="border corner mg3b relative">
        <div style={{width: '28%'}} className="bg-gray-blue itblock aligncenter borderr">
          <div className="height100 relative">
            <img src={icUser} alt="" className="center-of-relative"/>
          </div>

          <div className="height120 relative color-purple-blue">
            <div className="center-of-relative">
              <p className="font30 color-purple-blue elli">
                全部用户
              </p>
              <p className="font30">
                {isFetchingAllUserInfo ? loadingIndicator : null}
              </p>
            </div>
          </div>

          <div className="height120 relative color-purple-blue">
            <div className="center-of-relative color-purple-blue">
              <p className="font16">
                新用户
                <HoverHelp content="首次访问的用户" className="mg1l" />
              </p>
              <p className="font30">
                {isFetchingNewUserInfo
                  ? loadingIndicator
                  : (
                    <Tooltip overlay={`新用户数：${newUserCount}`}>
                      {percentFormatter(isFinite(newUserPercent) ? newUserPercent : 0)}
                    </Tooltip>
                  )}
              </p>
            </div>
          </div>

          <div className="height120 relative">
            <div className="center-of-relative color-999">
              <p className="font16">
                老用户
                <HoverHelp content="非首次访问的用户" className="mg1l" />
              </p>
              <p className="font30">
                {isFetchingOldUserInfo
                  ? loadingIndicator
                  : (
                    <Tooltip overlay={`老用户数：${oldUserCount}`}>
                      {percentFormatter(isFinite(oldUserPercent) ? oldUserPercent : 0)}
                    </Tooltip>
                  )}
              </p>
            </div>
          </div>
        </div>

        <div style={{width: 'calc(100% - 28%)'}} className="itblock">
          {metricObjs.map(mo => {
            let formatter = metricValueFormatterFactory(mo.pattern)
            let allUserMetricVal = _.get(allUser, mo.name, '--') || 0
            let newUserMetricVal = _.get(newUser, mo.name, '--') || 0
            let oldUserMetricVal = _.get(oldUser, mo.name, '--') || 0
            return (
              <div style={{width: `calc(100% / ${metricObjs.length})`}} className="itblock bg-white aligncenter" key={mo.name}>
                <div className="height100 line-height100 color-purple-blue font16">
                  <HoverHelp
                    addonBefore={`${mo.title || mo.name} `}
                    content={mo.description}
                  />
                </div>
                <div className="height120 bordert line-height120 font30">
                  <TextFitter
                    fontFamily="microsoft Yahei"
                    maxFontSize={30}
                    text={formatter(isFinite(allUserMetricVal) ? allUserMetricVal : 0)}
                    title={mo.pattern === 'duration' ? durationCompleteFormatter(allUserMetricVal) : undefined}
                  />
                </div>
                <div className="height120 bordert line-height120 font30">
                  <TextFitter
                    fontFamily="microsoft Yahei"
                    maxFontSize={30}
                    text={formatter(isFinite(newUserMetricVal) ? newUserMetricVal : 0)}
                    title={mo.pattern === 'duration' ? durationCompleteFormatter(newUserMetricVal) : undefined}
                  />
                </div>
                <div className="height120 bordert line-height120 font30 color-999">
                  <TextFitter
                    fontFamily="microsoft Yahei"
                    maxFontSize={30}
                    text={formatter(isFinite(oldUserMetricVal) ? oldUserMetricVal : 0)}
                    title={mo.pattern === 'duration' ? durationCompleteFormatter(oldUserMetricVal) : undefined}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/*eventType === '浏览' ? (
          <div
            className="absolute right0 top0 bg-purple-blue color-white pointer"
            style={{padding: '5px 32px', borderTopRightRadius: '3px'}}
            onClick={() => this.setState({metricsGroupForNewOldUser: metricsGroupForNewOldUser === 0 ? 1 : 0})}
          >
            {metricsGroupForNewOldUser === 0 ? '查看时长统计' : '查看数量统计'}
          </div>
        ) : null*/}
      </div>
    )
  }

  genTableColumns(metricObjs, groupCount) {
    const {model} = this.props
    let eventType = _.get(model, 'params.eventName') || '点击'
    let groupBy = eventType === '浏览' ? 'page_name' : 'event_name'
    let {ctrlSortDirect} = this.state
    return [
      {
        title: eventType === '浏览' ? '页面' : '控件',
        dataIndex: groupBy,
        key: groupBy,
        className: 'aligncenter-force font16',
        width: 100,
        render: val => val || <span className="color-999">{EMPTY_VALUE_OR_NULL}</span>
      },
      ...metricObjs.map(mo => ({
        title: (
          <HoverHelpWithBox
            content={mo.description}
            addonBefore={`${mo.title} `}
            wrapperProps={{className: 'elli'}}
          />
        ),
        dataIndex: mo.name,
        key: mo.name,
        className: 'aligncenter-force font16',
        width: 100,
        render: (val, record) => {
          let formatter = metricValueFormatterFactory(mo.pattern)
          let finalVal = formatter(isFinite(val) ? val : 0)
          return (
            <TextFitter
              fontFamily="microsoft Yahei"
              maxFontSize={16}
              text={finalVal}
              title={mo.pattern === 'duration' ? durationCompleteFormatter(val) : undefined}
            />
          )
        }
      })),
      {
        title: (
          <span
            className="font16 elli itblock"
          >
            排名
            <span
              className="pointer"
              onClick={() => this.setState({ctrlSortDirect: ctrlSortDirect === 'asc' ? 'desc' : 'asc'})}
            >{ctrlSortDirect === 'asc' ? '↓' : '↑'}</span>
          </span>
        ),
        dataIndex: 'index',
        key: 'index',
        className: 'aligncenter-force font16',
        width: 50,
        render: ctrlSortDirect === 'desc' ? v => v + 1 : v => groupCount - v
      }
    ]
  }

  renderCtrlInfoPanel(metricObjs) {
    const {model, isFetchingModels} = this.props
    let {metricsGroupForCtrlInfo, ctrlSortDirect} = this.state
    let timeFilter = _.get(model, 'params.timeFilter') || {}
    let {dateType, dateRange} = timeFilter

    let dsId = _.get(model, 'druid_datasource_id') || ''
    let sliceFilters = getFilters(model, metricsGroupForCtrlInfo !== 0)

    let eventType = _.get(model, 'params.eventName') || '点击'
    let groupBy = eventType === '浏览' ? 'page_name' : 'event_name'
    let finalFilters = [
      {
        col: '__time',
        op: 'in',
        eq: isRelative(dateType) ? dateType : dateRange
      },
      ...sliceFilters
    ]
    const panelHeight = 462
    return (
      <DruidDataFetcherOnlyRunInViewport
        key="allUserInfoFetcher"
        debounce={500}
        dimensions={[groupBy]}
        dimensionExtraSettingDict={{[groupBy]: {sortCol: metricObjs[0].name, sortDirect: ctrlSortDirect, limit: 10}}}
        dataSourceId={dsId}
        doFetch={!!(!isFetchingModels && dsId)}
        filters={finalFilters}
        customMetrics={[...metricObjs, {name: 'groupCount', formula: `$main.countDistinct($${groupBy})`}]}
      >
        {({isFetching, data, total})=>{
          return (
            <div
              className="border corner overhide relative"
              style={{height: panelHeight}}
            >
              <div className="mg2 borderl2 line-height30">
                <span className="mg2x iblock font16 bold">{eventType === '浏览' ? '页面' : '控件'}情况</span>
              </div>
              <Table
                rowKey={groupBy}
                className="bordert hide-pagination table-gray-blue-head"
                scroll={{x: '100%', y: panelHeight - (72 + 57)}}
                columns={this.genTableColumns(metricObjs, total.groupCount)}
                loading={isFetching}
                dataSource={(data || []).map((d, idx) => ({index: idx, ...d}))}
                pagination={{pageSize: 100}}
              />

              {/*eventType === '浏览' ? (
                <div
                  className="absolute right0 top0 bg-purple-blue color-white pointer"
                  style={{padding: '5px 32px', borderTopRightRadius: '3px'}}
                  onClick={() => this.setState({metricsGroupForCtrlInfo: metricsGroupForCtrlInfo === 0 ? 1 : 0})}
                >
                  {metricsGroupForCtrlInfo === 0 ? '查看时长统计' : '查看数量统计'}
                </div>
              ) : null*/}
            </div>
          )
        }}
      </DruidDataFetcherOnlyRunInViewport>
    )
  }

  render() {
    const {metricObjs} = this.props
    let {metricsGroupForNewOldUser, metricsGroupForCtrlInfo} = this.state

    let targetMetricObjsForNewOldUser = metricObjs.filter(mo => mo.group === metricsGroupForNewOldUser)
    let targetMetricObjsForCtrlPanel = metricObjs.filter(mo => mo.group === metricsGroupForCtrlInfo)
    return (
      <Row className="pd3y pd2x" gutter={20}>
        {this.renderNewOldUserFetcher(targetMetricObjsForNewOldUser)}
        <Col span={12}>
          {this.renderNewOldUserPanel(targetMetricObjsForNewOldUser)}
        </Col>
        <Col span={12}>
          {this.renderCtrlInfoPanel(targetMetricObjsForCtrlPanel)}
        </Col>
      </Row>
    )
  }
}

export default StatisticalPanel
