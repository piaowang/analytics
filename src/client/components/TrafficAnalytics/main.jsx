/**
 * 流量分析首页
 */

import React from 'react'
import Bread from '../Common/bread'
import { DeleteOutlined, DoubleRightOutlined, EditOutlined, LoadingOutlined, SaveOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Button, Row, Col, Card, Select, Popover, Tabs, Input, Popconfirm, Badge, message } from 'antd'
import moment from 'moment'
import _ from 'lodash'
import { Link, browserHistory } from 'react-router'
import EditBox from './edit-box'
import { immutateUpdate } from 'common/sugo-utils'
import { handlePreMetrics } from 'common/druid-query-utils'
import DataBox from './data-box'
import getMetrics from './metrics-definition'
import { DruidDataFetcherOnlyRunInViewport } from '../Fetcher/druid-data-fetcher'
import { enableSelectSearch } from '../../common/antd-freq-use-props'
import DataTable from './data-table'
import DataSourceDimensionsFetcher from '../Fetcher/data-source-dimensions-fetcher'
import metricValueFormatterFactory from '../../common/metric-formatter-factory'
import classNames from 'classnames'
import BoundaryTimeFetcher from '../Fetcher/boundary-time-fetcher'
import icGrowing from '../../images/ic_growing.svg'
import icDecreasing from '../../images/ic_decreasing.svg'
import { recvJSON, noCache, includeCookie } from '../../common/fetch-utils'
import TextFitter from '../Common/text-fitter'
import HoverHelp from '../Common/hover-help'
import getSocket from '../../common/websocket'
import deepCopy from 'common/deep-copy'
import TimeCard, { serviceName } from './time-card'
import * as ls from '../../common/localstorage'
import { withTrafficAnalyticsModelsDec } from '../Fetcher/traffic-analytic-models-fetcher'
import { checkPermission } from '../../common/permission-control'

const canCreate = checkPermission('post:/app/traffic-analytics/models')
const canEdit = checkPermission('put:/app/traffic-analytics/models/:modelId')
const canDelete = checkPermission('delete:/app/traffic-analytics/models/:modelId')

const TALSId = 'traffic_analyitics_change_project'
const rootPath = '/console/traffic-analytics'

let noCacheParams = _.defaultsDeep({}, recvJSON, noCache, includeCookie)

let durationCompleteFormatter = metricValueFormatterFactory('duration-complete')

let { Option } = Select
let { Item: FormItem } = Form

let loadingIndicator = <LoadingOutlined />

let RowObjs = [
  {
    name: '今天',
    dataKey: 'overviewToday',
    render: (val, formatter, metricObj, state) => {
      if (metricObj.pattern !== 'duration' && (metricObj.pattern || '').indexOf('%') === -1) {
        if (Number.isInteger(val)) {
          return <Badge count={val} style={{ background: 'transparent', border: 'none', zoom: 2 }} className='color-purple-blue' overflowCount={1e10} showZero />
        } else {
          // 小数
          return (
            <span className='font12 color-purple-blue' style={{ zoom: 2 }}>
              {formatter(val)}
            </span>
          )
        }
      } else {
        return <span className='color-purple-blue font20'>{formatter(val)}</span>
      }
    }
  },
  { name: '昨天', dataKey: 'overviewYesterday' },
  {
    name: '预测今日',
    dataKey: 'overviewPredictToday',
    render: (val, formatter, metricObj, state) => {
      let todayVal = _.get(state, `overviewToday.${metricObj.name}`) || 0
      // 预测今日不可能比今日的数据还要小
      val = Math.max(val, todayVal)

      let yesterdayVal = _.get(state, `overviewYesterday.${metricObj.name}`) || 0
      return (
        <span className='relative'>
          {formatter(val)}
          {yesterdayVal === val ? null : <img className='absolute vertical-center-of-relative mg1l' src={yesterdayVal < val ? icGrowing : icDecreasing} alt='' />}
        </span>
      )
    }
  },
  { name: '昨日此时', dataKey: 'overviewYesterdayThisMoment' },
  { name: '每日平均', dataKey: 'overviewDailyAverage' },
  { name: '历史峰值', dataKey: 'overviewPeak' }
]

const { TabPane } = Tabs

let getMetricsNameDictMemo = _.memoize(metricalField => _.keyBy(getMetrics(metricalField), 'name'))

const getPopupContainer = () => document.querySelector('.overscroll')

@withTrafficAnalyticsModelsDec(({ datasourceList }) => {
  return {
    doFetch: !!datasourceList.length
  }
})
export default class TrafficAnalytics extends React.Component {
  state = {
    model: this.createEmptyModel(),
    isFetchingDict: {},
    tempName: undefined,
    livePanelCollapsed: true,
    /**
     * 预测今日的计算
     * 判断项目的开始数据日期距离今日是否已经超过21天：
     * 若超过：则使用最近三周同一天的计算公式（一开始确定的公式）；
     * 若不达：则使用最近三天的同一时刻占全天百分比计算（开始的公式日期改成最近三天，其他不变）
     */
    thisProjectHasMoreThanThreeWeeksData: 'unknown',
    showSavingModel: false
  }

  async componentDidMount() {
    this.socket = await getSocket()
    await this.socket.register(serviceName)
    this.forceUpdate()
  }

  componentWillReceiveProps(nextProps) {
    let currModelId = _.get(this.props, 'params.modelId')
    let nextModelId = _.get(nextProps, 'params.modelId')
    let nextDsId = nextProps.datasourceCurrent.id
    let currDsId = this.props.datasourceCurrent.id

    //项目改变
    if (currDsId && nextDsId !== currDsId) {
      if (ls.get(TALSId)) {
        return ls.set(TALSId, '')
      }
      return this.changeDatasource(nextProps)
    }

    let { trafficAnalyticModels } = nextProps

    //如果url指定了id，并且跟顶部菜单不一致
    //主动切换顶部菜单
    this.adjustProject(nextProps, nextDsId)

    //无modelId
    if (!nextModelId) {
      return this.changeDatasource(nextProps)
    }

    //有modelId未初始化state.model
    if (nextModelId && trafficAnalyticModels.length && !this.state.model.id) {
      let nextModel = _.find(trafficAnalyticModels, { id: nextModelId })
      if (!nextModel) return browserHistory.replace(rootPath)
      return this.setNewModel(nextModel)
    }

    //切换modelId
    if (nextModelId && currModelId !== nextModelId && trafficAnalyticModels.length) {
      let nextModel = _.find(trafficAnalyticModels, { id: nextModelId })
      if (!nextModel) return browserHistory.replace(rootPath)
      this.setNewModel(nextModel)
    }
  }

  adjustProject(nextProps, nid) {
    let {
      trafficAnalyticModels,
      changeProject,
      projectList,
      params: { modelId }
    } = nextProps
    if (!modelId) return
    let nDatasourceId = _.get(
      _.find(trafficAnalyticModels, p => {
        return p.id === modelId
      }),
      'druid_datasource_id'
    )
    if (nid !== nDatasourceId) {
      let proj = _.find(projectList, {
        datasource_id: nDatasourceId
      })
      if (proj) {
        changeProject(proj.id)
        ls.set(TALSId, true)
      }
    }
  }

  setNewModel = nextModel => {
    let model = deepCopy(this.state.model)
    Object.assign(model, nextModel)
    Object.assign(model.params, nextModel.params)
    this.setState({
      model,
      tempName: undefined
    })
  }

  changeDatasource = nextProps => {
    let {
      trafficAnalyticModels,
      datasourceCurrent: { id }
    } = nextProps
    let nextModelId = _.get(nextProps, 'params.modelId')
    let nextModel = _.find(trafficAnalyticModels, {
      druid_datasource_id: id
    })
    if (nextModel) {
      browserHistory.replace(`${rootPath}/${nextModel.id}`)
    } else {
      if (nextModelId) browserHistory.replace(rootPath)
      let model = this.createEmptyModel(id)
      this.setState({
        model,
        tempName: undefined
      })
    }
  }

  createEmptyModel(dsId = this.props.datasourceCurrent.id) {
    return {
      id: '',
      name: undefined,
      druid_datasource_id: dsId,
      params: {
        metrics: ['uv', 'ip', 'pv'],
        filterCols: [],
        metricalField: '',
        filters: {},
        timeFilter: {
          dateType: '-1 day',
          dateRange: []
        },
        chartBoxState: {
          timeFilter: {
            dateType: ['-1 days startOf day', 'startOf day -1 ms'],
            dateRange: []
          },
          granularity: 'PT1H',
          selectMetric: ''
        }
      }
    }
  }

  isEditing(props = this.props) {
    let pathName = _.get(props, 'router.location.pathname') || window.location.pathname
    return _.endsWith(pathName, '/new') || _.endsWith(pathName, '/editing')
  }

  onDeleteModel = async () => {
    let { id: modelId } = this.state.model || {}
    let { deleteTrafficAnalyticsModel, reloadTrafficAnalyticModels, datasourceCurrent } = this.props
    let res = await deleteTrafficAnalyticsModel(modelId)
    if (!res || res.error) {
      message.error('删除失败，请重试')
      return
    }
    message.success('删除成功')
    let modelsAndCode = await reloadTrafficAnalyticModels()
    let firstModel = (_.get(modelsAndCode, 'result') || []).filter(m => m.druid_datasource_id === datasourceCurrent.id)
    if (firstModel) {
      browserHistory.replace(`${rootPath}/${firstModel.id}`)
    } else {
      browserHistory.replace(rootPath)
    }
  }

  getCommonMetricFromCurrDataSource() {
    return _.get(this.props.datasourceCurrent, 'params.commonMetric') || []
  }

  renderModelManager = dbDims => {
    let { loadingProject, trafficAnalyticModels, datasourceCurrent } = this.props

    let commonMetrics = this.getCommonMetricFromCurrDataSource()

    const { tempName, model, showSavingModel } = this.state

    let { id: modelId, name: currModelName } = model || {}

    let modelIdInUrl = _.get(this.props, 'params.modelId')
    let canSaveOnly = !modelIdInUrl

    let dbDimNameDict = _.keyBy(dbDims || [], 'name')

    let savePop = (
      <Tabs defaultActiveKey={canSaveOnly || !canEdit ? 'saveAs' : 'update'} className='width300'>
        {canSaveOnly || !canEdit ? null : (
          <TabPane tab='更新当前报告' key='update'>
            <Row>
              <Col className='pd1' span={24}>
                报告名称
              </Col>
              <Col className='pd1' span={24}>
                <Input
                  value={tempName === undefined ? currModelName : tempName}
                  className='width-100'
                  onChange={ev => this.setState({ tempName: ev.target.value })}
                  placeholder='未输入名称'
                />
              </Col>
              <Col className='pd1 alignright' span={24}>
                <Button
                  icon={<SaveOutlined />}
                  type='primary'
                  className='width-100'
                  onClick={async () => {
                    await this.onSaveModel('update')
                    this.setState({ showSavingModel: false })
                  }}
                >
                  更新
                </Button>
              </Col>
            </Row>
          </TabPane>
        )}

        {!canCreate ? null : (
          <TabPane tab='另存为新报告' key='saveAs'>
            <Row>
              <Col className='pd1' span={24}>
                报告名称
              </Col>
              <Col className='pd1' span={24}>
                <Input
                  value={tempName === undefined ? currModelName : tempName}
                  className='width-100'
                  onChange={ev => this.setState({ tempName: ev.target.value })}
                  placeholder='未输入名称'
                />
              </Col>
              <Col className='pd1 alignright' span={24}>
                <Button
                  icon={<SaveOutlined />}
                  type='primary'
                  className='width-100'
                  onClick={async () => {
                    await this.onSaveModel('saveAs')
                    this.setState({ showSavingModel: false })
                  }}
                >
                  保存
                </Button>
              </Col>
            </Row>
          </TabPane>
        )}
      </Tabs>
    )

    let models = trafficAnalyticModels.filter(m => m.druid_datasource_id === datasourceCurrent.id)
    models = models.length
      ? models
      : [
          {
            id: '',
            name: '默认报告'
          }
        ]
    return (
      <div>
        <Form layout='inline' className='pd3x' style={{ padding: '10px 32px' }}>
          <FormItem label='常用报告'>
            <Select
              getPopupContainer={getPopupContainer}
              {...enableSelectSearch}
              dropdownMatchSelectWidth={false}
              disabled={loadingProject}
              className='width220'
              placeholder='未选择报告'
              value={modelId || ''}
              onChange={modelId => {
                browserHistory.push(`${rootPath}/${modelId}`)
              }}
            >
              {models.map(model => {
                return (
                  <Option key={model.id} value={model.id}>
                    {model.name}
                  </Option>
                )
              })}
            </Select>
          </FormItem>

          <div className='fright' style={{ marginRight: '0px' }}>
            {canCreate || (!canSaveOnly && canEdit) ? (
              <Popover
                getPopupContainer={getPopupContainer}
                trigger='click'
                content={savePop}
                visible={showSavingModel}
                onVisibleChange={visible => this.setState({ showSavingModel: visible })}
              >
                <Button type='success' icon={<SaveOutlined />}>
                  保存
                </Button>
              </Popover>
            ) : null}

            {!canDelete ? null : (
              <Popconfirm title='确定删除当前报告？' onConfirm={this.onDeleteModel}>
                <Button
                  type='danger'
                  icon={<DeleteOutlined />}
                  className='mg1r mg3l'
                  disabled={!modelIdInUrl || (trafficAnalyticModels && trafficAnalyticModels.filter(m => m.druid_datasource_id === datasourceCurrent.id).length < 2)}
                >
                  删除
                </Button>
              </Popconfirm>
            )}
          </div>
        </Form>

        <Form layout='inline' className='pd3x bordert dashed' style={{ padding: '10px 32px' }}>
          <Link to={modelIdInUrl ? `${rootPath}/${modelId}/editing` : '/console/traffic-analytics/new'}>
            <Button className='mg1r color-purple border-purple noradius' icon={<EditOutlined />}>
              自定义指标
            </Button>
          </Link>

          <FormItem className='fright filter-id-item' style={{ marginRight: '0px' }} label={<span className='color-999999'>切换用户类型为：</span>} colon={false}>
            <Select
              getPopupContainer={getPopupContainer}
              {...enableSelectSearch}
              dropdownMatchSelectWidth={false}
              disabled={loadingProject}
              className='width180'
              placeholder='用户唯一ID'
              value={_.get(model, 'params.metricalField') || undefined}
              onChange={val => {
                this.setState({ model: immutateUpdate(model, 'params.metricalField', () => val) })
              }}
            >
              {commonMetrics.map(dimName => {
                let dbDim = dbDimNameDict[dimName]
                return (
                  <Option key={dimName} value={dimName}>
                    {(dbDim && dbDim.title) || dimName}
                  </Option>
                )
              })}
            </Select>
          </FormItem>
        </Form>

        {this.isEditing() ? this.renderEditingBox() : null}
      </div>
    )
  }

  onUpdateModel = (path, valOrUpdater) => {
    let { model } = this.state
    let newModel = immutateUpdate(model, path, _.isFunction(valOrUpdater) ? valOrUpdater : () => valOrUpdater)
    if (path === 'params.timeFilter') {
      newModel = immutateUpdate(newModel, 'params.chartBoxState.selectTime', () => false)
      newModel = immutateUpdate(newModel, 'params.chartBoxState.timeFilter', _.isFunction(valOrUpdater) ? valOrUpdater : () => valOrUpdater)
    }

    this.setState({
      model: newModel
    })
  }

  renderEditingBox() {
    let { datasourceCurrent, addTrafficAnalyticsModel, updateTrafficAnalyticsModel, reloadTrafficAnalyticModels } = this.props
    let { model } = this.state
    let props = {
      model,
      addTrafficAnalyticsModel,
      updateTrafficAnalyticsModel,
      reloadTrafficAnalyticModels,
      datasourceCurrent
    }
    return <EditBox {...props} onChange={this.onUpdateModel} />
  }

  renderSubLivePanel(metricObjs, rowObjs, displayHeader = true, displayRowName = true) {
    let { isFetchingDict } = this.state
    /**
     * metricObjs: [{name, title, formula, group}],
     * rowObjs: [{name, dataKey, render}]
     */
    let headerStyle = { lineHeight: '48px' }
    let headerClass = 'bold font14 elli'
    let filterNameCellClass = 'line-height36 pd2l relative'
    let cellClass = 'line-height36 height36 font16 color-999'

    let spanDict = { 4: 4, 5: 4, 1: 12 }
    const leftColSpan = displayRowName ? spanDict[metricObjs.length] || 6 : 0
    const rightColSpan = (24 - leftColSpan) / metricObjs.length
    return (
      <div className='bg-white corner aligncenter border mg2b blue-shadow'>
        {displayHeader ? (
          <Row className='bg-f9 cornert borderb'>
            {displayRowName ? (
              <Col span={leftColSpan} className={headerClass} style={headerStyle}>
                {/* 占位 */}
              </Col>
            ) : null}
            {metricObjs.map(mo => {
              return (
                <Col span={rightColSpan} className={headerClass} style={headerStyle} key={mo.name}>
                  <HoverHelp addonBefore={`${mo.title} `} content={mo.description} />
                </Col>
              )
            })}
          </Row>
        ) : null}

        <Row className='pd2y'>
          {displayRowName ? (
            <Col span={leftColSpan} className='itblock borderr alignleft'>
              {rowObjs.map(ro => {
                let { dataKey } = ro
                let isFetching = isFetchingDict[dataKey]
                return (
                  <div className={filterNameCellClass} key={ro.name}>
                    {ro.name}
                    <span className='absolute mg1l'>{isFetching ? loadingIndicator : null}</span>
                  </div>
                )
              })}
            </Col>
          ) : null}

          {metricObjs.map(mo => {
            let formatter = metricValueFormatterFactory(mo.pattern)
            return (
              <Col span={rightColSpan} key={mo.name}>
                {rowObjs.map(ro => {
                  let { dataKey, render } = ro
                  let val = _.get(this.state[dataKey], mo.name)
                  if (!isFinite(val)) {
                    val = 0
                  }
                  val = render ? render(val, formatter, mo, this.state) : formatter(val)
                  return (
                    <div className={cellClass} key={ro.name}>
                      {_.isObject(val) ? (
                        val
                      ) : (
                        <TextFitter
                          text={val}
                          maxFontSize={ro.name === '今天' ? 20 : 16}
                          fontFamily='microsoft Yahei'
                          title={mo.pattern === 'duration' ? durationCompleteFormatter(val) : undefined}
                        />
                      )}
                    </div>
                  )
                })}
              </Col>
            )
          })}
        </Row>
      </div>
    )
  }

  genPredictTodayFetcherProps(customMetrics = []) {
    let { thisProjectHasMoreThanThreeWeeksData } = this.state
    if (thisProjectHasMoreThanThreeWeeksData === 'unknown') {
      return {
        doFetch: false,
        children: _.constant(null)
      }
    }

    // 预测今日的部分计算逻辑

    let predictingHour = moment().startOf('hour')

    // 根据项目的数据量去预测今日
    let dayOffsets = thisProjectHasMoreThanThreeWeeksData ? [-7, -14, -21] : [-1, -2, -3]

    let prev3PartialDays = dayOffsets.map(offset => moment(predictingHour).add(offset, 'days'))
    let prev3PartialDaysFilterFormula = prev3PartialDays.map(m => `('${moment(m).startOf('day').toISOString()}' <= $__time and $__time < '${m.toISOString()}')`).join(' or ')

    let prev3EntireDays = dayOffsets.map(offset => moment().add(offset, 'days').startOf('day'))
    let prev3EntireDaysFilterFormula = prev3EntireDays.map(m => `('${m.toISOString()}' <= $__time and $__time < '${moment(m).add(1, 'day').toISOString()}')`).join(' or ')

    let todayPartialFilter = `'${moment().startOf('day').toISOString()}' <= $__time and $__time < '${predictingHour.toISOString()}'`
    return {
      customMetrics: _.flatMap(customMetrics, cm => {
        let applies = handlePreMetrics([{ ...cm, name: `${cm.name}_dailyVal` }])
          .map(mo => `.apply('${mo.name}', ${mo.formula})`)
          .join('')
        let preparingMetrics = [
          {
            name: `${cm.name}_partialSum`,
            formula: `$main.filter(${prev3PartialDaysFilterFormula}).split($__time.timeBucket('P1D'), 'days')${applies}.sum($${cm.name}_dailyVal)`
          },
          {
            name: `${cm.name}_entireSum`,
            formula: `$main.filter(${prev3EntireDaysFilterFormula}).split($__time.timeBucket('P1D'), 'days')${applies}.sum($${cm.name}_dailyVal)`
          },
          {
            name: `${cm.name}_partialToday`,
            formula: `$main.filter(${todayPartialFilter}).split($__time.timeBucket('P1D'), 'days')${applies}.sum($${cm.name}_dailyVal)`
          }
        ]
        return [
          ...preparingMetrics,
          {
            ..._.omit(cm, 'preMetrics'),
            formula: `$${cm.name}_partialToday/($${cm.name}_partialSum / $${cm.name}_entireSum)`
          }
        ]
      })
    }
  }

  genFetcherProps = (customMetrics = []) => {
    let { livePanelCollapsed } = this.state
    const queryKeys = ['overviewOnlineUserCount', 'overviewToday', 'overviewPredictToday', 'overviewYesterdayThisMoment']
    // const queryKeys = ['overviewOnlineUserCount']
    let propsDict = {
      // 估算最近 5 分钟的在线用户数
      overviewOnlineUserCount: {
        filters: [{ col: '__time', op: 'in', eq: '-5 minutes' }],
        customMetrics: [{ name: 'onlineUser', formula: '$main.countDistinct($session_id)' }],
        params: noCacheParams
      },
      overviewToday: {
        filters: [{ col: '__time', op: 'in', eq: ['startOf day', 'endOf day'] }],
        customMetrics,
        params: noCacheParams
      },
      overviewYesterday: {
        filters: [{ col: '__time', op: 'in', eq: ['-1 day startOf day', '-1 day endOf day'] }],
        customMetrics
      },
      overviewPredictToday: this.genPredictTodayFetcherProps(customMetrics),
      overviewYesterdayThisMoment: {
        filters: [{ col: '__time', op: 'in', eq: ['-1 day startOf day', '-1 day'] }],
        customMetrics,
        params: noCacheParams
      },
      overviewDailyAverage: {
        // 今天的数据不作计算
        filters: [{ col: '__time', op: 'lessThan', eq: [moment().startOf('day')] }],
        customMetrics: customMetrics.map(cm => {
          let applies = handlePreMetrics([{ ...cm, name: `${cm.name}_dailyVal` }])
            .map(mo => `.apply('${mo.name}', ${mo.formula})`)
            .join('')
          return {
            ..._.omit(cm, 'preMetrics'),
            formula: `$main.split($__time.timeBucket('P1D'), 'days')${applies}.average($${cm.name}_dailyVal)`
          }
        })
      },
      // 历史峰值
      overviewPeak: {
        filters: [{ col: '__time', op: 'lessThan', eq: [moment().startOf('day')] }],
        customMetrics: customMetrics.map(cm => {
          let applies = handlePreMetrics([{ ...cm, name: `${cm.name}_dailyVal` }])
            .map(mo => `.apply('${mo.name}', ${mo.formula})`)
            .join('')
          return {
            ..._.omit(cm, 'preMetrics'),
            formula: `$main.split($__time.timeBucket('P1D'), 'days')${applies}.max($${cm.name}_dailyVal)`
          }
        })
      }
    }

    queryKeys.forEach(key => (propsDict[key].mode = 'autoRefresh'))

    return livePanelCollapsed ? _.pick(propsDict, ['overviewOnlineUserCount', 'overviewToday', 'overviewYesterday', 'overviewPredictToday']) : propsDict
  }

  renderFetcherInst(customMetrics) {
    let { loadingProject, isFetchingTrafficAnalyticModels } = this.props
    let { model } = this.state
    let { druid_datasource_id } = model || {}
    let fetcherPropsDict = this.genFetcherProps(customMetrics)

    let doFetch = !!(!loadingProject && !isFetchingTrafficAnalyticModels && druid_datasource_id)
    return _.keys(fetcherPropsDict).map(dataKey => {
      let fetcherProps = fetcherPropsDict[dataKey]
      return (
        <DruidDataFetcherOnlyRunInViewport
          key={dataKey}
          debounce={500}
          dataSourceId={druid_datasource_id || ''}
          onFetchingStateChange={isFetching => {
            this.setState(prevState => {
              return {
                isFetchingDict: immutateUpdate(prevState.isFetchingDict, dataKey, () => isFetching)
              }
            })
          }}
          onData={result => {
            this.setState({ [dataKey]: (result && result[0]) || {} })
          }}
          children={() => {
            return null
          }}
          {...fetcherProps}
          doFetch={doFetch}
        />
      )
    })
  }

  renderLivePanel(metricObjs) {
    let { loadingProject, isFetchingTrafficAnalyticModels } = this.props
    let { livePanelCollapsed, model } = this.state
    let metricGroupDict = _.groupBy(metricObjs, 'group')

    // let groupCount = _.keys(metricGroupDict).length

    let currDsId = _.get(this.state, 'model.druid_datasource_id') || ''
    return (
      <div className='bg-gray-blue pd3x pd2y'>
        {this.renderFetcherInst(metricObjs)}

        <BoundaryTimeFetcher
          debounce={500}
          dataSourceId={currDsId}
          doQueryMaxTime={false}
          doFetch={!!(!loadingProject && !isFetchingTrafficAnalyticModels && _.get(model, 'druid_datasource_id'))}
          onFetchingStateChange={isFetching => {
            if (isFetching) {
              this.setState({ thisProjectHasMoreThanThreeWeeksData: 'unknown' })
            }
          }}
          onTimeLoaded={data => {
            let { minTime } = data || {}
            if (minTime) {
              let thisProjectHasMoreThanThreeWeeksData = moment(minTime).isBefore(moment().startOf('day').add(-21, 'day'))
              this.setState({ thisProjectHasMoreThanThreeWeeksData })
            }
          }}
        />

        <div>
          <div className='width250 mg2r itblock'>
            <TimeCard model={this.state.model} isEditing={this.isEditing()} socket={this.socket} />
            {this.renderOnlineUserCard()}
          </div>

          <Row gutter={20} className='itblock' style={{ width: `calc(100% - ${246}px)` }}>
            {_.keys(metricGroupDict).map((groupId, idx) => {
              let metricObjsSameGroup = metricGroupDict[groupId]
              let span = metricObjs.length === 5 ? 24 * (metricObjsSameGroup.length / 6) + (idx === 0 ? 4 : 0) : 24 * (metricObjsSameGroup.length / metricObjs.length)
              return (
                <Col span={span} key={groupId}>
                  {this.renderSubLivePanel(metricObjsSameGroup, _.take(RowObjs, 3), true, idx === 0)}
                  {livePanelCollapsed ? null : this.renderSubLivePanel(metricObjsSameGroup, _.takeRight(RowObjs, 3), false, idx === 0)}
                </Col>
              )
            })}

            <Col span={24} className='relative'>
              <div
                className='center-of-relative mg2t width100 height20 itblock color-white aligncenter collapse-toggle-btn pointer blue-shadow'
                onClick={() => this.setState({ livePanelCollapsed: !livePanelCollapsed })}
              >
                <DoubleRightOutlined
                  className={classNames({
                    'rotate-right-90': livePanelCollapsed,
                    'rotate-left-90': !livePanelCollapsed
                  })}
                />

                <span className='absolute elli mg2l color-999999' style={{ left: '100%' }}>
                  — {livePanelCollapsed ? '展开' : '收缩'}数据
                </span>
              </div>
            </Col>
          </Row>
        </div>
      </div>
    )
  }

  renderOnlineUserCard() {
    let { overviewOnlineUserCount, isFetchingDict, livePanelCollapsed } = this.state
    let val = _.get(overviewOnlineUserCount, 'onlineUser') || 0
    let isFetching = isFetchingDict.overviewOnlineUserCount
    if (livePanelCollapsed) {
      return (
        <Card className='mg2t blue-shadow'>
          <div className='color-999 aligncenter font16'>{moment().format('YYYY/MM/DD HH:mm')}</div>

          <div className='aligncenter mg2t'>
            <div className='iblock font16 color-999 mg1x relative'>
              在线用户数
              <span className='absolute mg1l'>{isFetching ? loadingIndicator : null}</span>
            </div>
            <div className='iblock alignright color-purple-blue' style={{ minWidth: '80px' }}>
              <Badge count={val} style={{ background: 'transparent', border: 'none', zoom: 9999 < val ? 1.5 : 2.5 }} overflowCount={1e10} showZero />
            </div>
          </div>
        </Card>
      )
    }
    let barStyle = { height: '3px', width: `calc((100% - ${isFetching ? 25 + 90 : 90}px) / 2)` }
    return (
      <Card className='mg2t blue-shadow'>
        <div className='color-999 aligncenter font16'>{moment().format('YYYY/MM/DD HH:mm')}</div>

        <div className='aligncenter mg2t'>
          <div className='iblock bg-ddd' style={barStyle} />
          <div className='iblock font16 color-999 mg1x'>
            在线用户数
            {isFetching ? <span className='mg1l'>{loadingIndicator}</span> : null}
          </div>
          <div className='iblock bg-ddd' style={barStyle} />
        </div>

        <div className='aligncenter overhide color-purple-blue'>
          <Badge count={val} style={{ background: 'transparent', border: 'none', zoom: Math.max(8.333 - (`${val}`.length - 1) * 0.9, 1) }} overflowCount={1e10} showZero />
        </div>

        <div className='aligncenter'>
          <div className='iblock bg-ddd aligncenter' style={{ height: '3px', width: '14px' }} />
        </div>
      </Card>
    )
  }

  onSaveModel = async type => {
    let { addTrafficAnalyticsModel, updateTrafficAnalyticsModel, reloadTrafficAnalyticModels } = this.props
    let { model, tempName } = this.state
    let { id: modelId, ...rest } = model || {}
    let nextName = tempName === undefined ? rest.name : (tempName || '').trim()
    if (!nextName) {
      message.error('请先填写名称')
      return
    }
    if (!model.druid_datasource_id) {
      message.error('请先选择所属项目')
      return
    }
    if (type === 'update') {
      let res = null
      if (!modelId) {
        res = await updateTrafficAnalyticsModel({ ...rest, name: nextName })
        modelId = res.result.id
      } else {
        res = await updateTrafficAnalyticsModel(modelId, { ...rest, name: nextName })
      }

      if (!res || res.error) {
        // message.error('更新失败，请重试')
        return
      }
      message.success('更新成功')
      let modelsAndCode = await reloadTrafficAnalyticModels()
      browserHistory.replace(`${rootPath}/${modelsAndCode.result[0].id}`)
    } else if (type === 'saveAs') {
      if (!modelId) {
        let newModel = this.createEmptyModel(rest.druid_datasource_id)
        delete newModel.id
        addTrafficAnalyticsModel(newModel)
      }
      let res = await addTrafficAnalyticsModel({ ...rest, name: nextName })
      if (!res || res.error) {
        // message.error('保存失败，请重试')
        return
      }
      message.success('保存成功')
      let modelsAndCode = await reloadTrafficAnalyticModels()
      browserHistory.replace(`${rootPath}/${modelsAndCode.result[0].id}`)
    } else {
      throw new Error(`Unknown type: ${type}`)
    }
  }

  getMetricalFieldFromDataSource() {
    let dimNames = _.get(this.props.datasourceCurrent, 'params.commonMetric') || []
    return dimNames[0]
  }

  render() {
    let { isFetchingTrafficAnalyticModels, datasourceCurrent, loadingProject } = this.props
    let { model } = this.state
    model = model || {}

    let metricsNames = _.get(model, 'params.metrics') || ['uv', 'ip', 'pv']
    let metricalField = _.get(model, 'params.metricalField') || this.getMetricalFieldFromDataSource()

    let SDKMetricsNameDict = getMetricsNameDictMemo(metricalField)
    let metricObjs = metricsNames.map(mName => SDKMetricsNameDict[mName]).filter(_.identity)
    const datasource = datasourceCurrent
    let dsId = datasourceCurrent.id || ''
    return (
      <div className='traffic-analytics-theme height-100 overscroll relative'>
        <Bread path={[{ name: '流量分析' }]} />

        <DataSourceDimensionsFetcher dataSourceId={dsId} doFetch={!!dsId}>
          {({ isFetching, data, remoteControl }) => {
            const props = {
              remoteControlForDimFetcher: remoteControl,
              dataSourceDimensions: data || [],
              isFetchingDataSourceDimensions: isFetching
            }
            return (
              <div>
                {this.renderModelManager(data)}
                {this.renderLivePanel(metricObjs)}
                <DataBox {...this.props} model={model} datasourceCurrent={datasourceCurrent} key='data-box' metricObjs={metricObjs} onChange={this.onUpdateModel} {...props} />
                <DataTable
                  key='data-table'
                  {...props}
                  dataSourceId={dsId}
                  dataSourceName={datasource.name}
                  metricalField={metricalField}
                  loadingProject={loadingProject}
                  isFetchingModels={isFetchingTrafficAnalyticModels}
                />
              </div>
            )
          }}
        </DataSourceDimensionsFetcher>
      </div>
    )
  }
}
