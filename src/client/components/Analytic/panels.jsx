import React from 'react'
import {withDataSourceMeasures} from '../Fetcher/data-source-measures-fetcher'
import DimensionPanel from './dimensions-panel'
import MetricsPanel from './metrics-panel'
import DataDisplayPanel from './data-display-panel'
import _ from 'lodash'
import setStatePromiseDec from '../../common/set-state-promise'
import DingPanel from './ding-panel'
import {withDataSourceCustomOrders} from '../Fetcher/data-source-custom-orders-fetcher'
import {withDataSourceTags} from '../Fetcher/data-source-tags-fetcher'
import * as PubSub from 'pubsub-js'
import ConditionPanel from './condition-panel'
import VerticalSplitHelper from '../Common/vertical-split-helper'
import LegendPanel from './legend-panel'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import ChartSwitcher, {BTN_HEIGHT, GUTTER} from './chart-switcher'
import {withSizeProvider} from '../Common/size-provider'
import {vizTypeIconMap} from '../../constants/viz-component-map'
import {ContextNameEnum, getContextByName} from '../../common/context-helper'
import {getDimensionLayer} from '../../databus/datasource.js'

const singleMetricChartSet = new Set(['pie', 'map', 'heat_map', 'balance_bar'])

const ChartsCount = _.keys(vizTypeIconMap).length

/* 10：10 为 外层 padding Y */
const ChartSwitchDefaultHeightInPx = (BTN_HEIGHT + GUTTER) * Math.ceil(ChartsCount / 3) + 10 + GUTTER
const ChartSwitch4RowDefaultHeightInPx = (BTN_HEIGHT + GUTTER) * 4 + 10 + GUTTER
const ChartSwitch3ColDefaultWidthInPx = (BTN_HEIGHT + GUTTER) * 3 + 10 + GUTTER + 2 /* 2px 为预留宽度 */

@setStatePromiseDec
class AnalyticPanels extends React.Component {
  static contextType = getContextByName(ContextNameEnum.ProjectInfo)

  state = {
    conditionPanelHeight: 120,
    dimensionLayer: [],
    drillDownData: []
  }

  componentWillMount() {
    this.getDimensionLayer()
  }

  componentDidMount() {
    let {innerRef, reloadCustomOrders} = this.props
    if (innerRef) {
      innerRef(this)
    }
    PubSub.subscribe('analytic.panels.customOrdersInvalid', () => reloadCustomOrders())
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    let prevArr = [prevProps.isFetchingDataSourceCustomOrders, prevProps.isFetchingDataSourceMeasures]
    let nextArr = [this.props.isFetchingDataSourceCustomOrders, this.props.isFetchingDataSourceMeasures]
  
    let {metrics, updateHashState} = prevProps
    // 指标和指标排序都已经加载完成，才能初始化指标
    // 没有设置指标时，也要初始化指标
    let {vizType} = this.props
    if (vizType !== 'table_flat' && _.isEmpty(metrics) && _.every(nextArr, b => !b)) {
      let firstMetric = this.getFirstMetric(this.props)
      if (firstMetric) {
        updateHashState({metrics: [firstMetric]}, true)
      }
    }
  }
  
  componentWillUnmount() {
    PubSub.unsubscribe('analytic.panels')
  }

  getDimensionLayer = async() => {
    let data = await getDimensionLayer()
    this.setState({dimensionLayer: data})
  }

  getFirstMetric(props) {
    let { dataSourceMeasures, dataSourceCustomOrders, dataSourceId } = props
    if (!_.some(dataSourceMeasures, m => m.parentId === dataSourceId)
      || dataSourceCustomOrders && dataSourceCustomOrders.druid_datasource_id !== dataSourceId) {
      return null
    }
    let metrics_order = _.get(dataSourceCustomOrders, 'metrics_order') || []
    let firstNotHiddenMetricInOrder = _.find(metrics_order, o => !_.startsWith(o, 'hide:'))

    if (firstNotHiddenMetricInOrder && _.some(dataSourceMeasures, dbM => dbM.name === firstNotHiddenMetricInOrder)) {
      return firstNotHiddenMetricInOrder
    } else {
      let mNames = _.take(dataSourceMeasures, 1).map(dbM => dbM.name)
      return mNames[0]
    }
  }

  renderLeftPanel = (props) => {
    let {
      dataSourceMeasures, dataSourceDimensions, metrics, updateHashState, isFetchingDataSourceMeasures,
      dataSourceCustomOrders, isFetchingDataSourceCustomOrders, dataSourceId, vizType, dataSourceTags,
      isFetchingDataSourceTags, visiblePopoverKey, isFetchingDataSourceDimensions
    } = this.props
    let {mainTimeDimName, projectCurrent} = this.context
    let {dimensionLayer} = this.state
    return (
      <VerticalSplitHelper {..._.pick(props, ['style', 'className'])}>
        <div
          className="panel dimension-panel"
          defaultWeight={65}
          collapseTitle="维度"
        >
          <DimensionPanel
            dimensionLayer={dimensionLayer}
            orders={dataSourceCustomOrders && dataSourceCustomOrders.dimensions_order}
            tags={dataSourceTags.filter(t => t.type === 'dimension')}
            tagsLayer={dataSourceTags.filter(t => t.type === 'dimension_layer')}
            className="width-100 height-100"
            {...{
              visiblePopoverKey, isFetchingDataSourceTags, isFetchingDataSourceCustomOrders, dataSourceDimensions,
              dataSourceId, isFetchingDataSourceDimensions, mainTimeDimName, projectCurrent
            }}
          />
        </div>
      
        <div
          className="panel metric-panel"
          defaultWeight={35}
          collapseTitle="指标"
        >
          <MetricsPanel
            selectedMetrics={metrics}
            orders={dataSourceCustomOrders && dataSourceCustomOrders.metrics_order}
            singleChoice={_.startsWith(vizType, 'multi_dim_') || singleMetricChartSet.has(vizType)}
            className="width-100 height-100"
            tags={dataSourceTags.filter(t => t.type === 'measure')}
            {...{
              isFetchingDataSourceMeasures, updateHashState, dataSourceMeasures, isFetchingDataSourceTags,
              visiblePopoverKey, dataSourceId
            }}
          />
        </div>
      </VerticalSplitHelper>
    )
  }
  
  render() {
    let {
      dataSourceId, dataSourceDimensions, dataSourceMeasures, visiblePopoverKey, vizType, spWidth, spHeight,
      updateHashState, metrics, dimensions, isFetchingDataSourceDimensions, isFetchingDataSourceMeasures,
      filters, dimensionExtraSettingDict, pinningDims, updateHashStateByPath, linkage
    } = this.props
    let {mainTimeDimName, projectCurrent} = this.context

    let {conditionPanelHeight, dimensionLayer, drillDownData} = this.state

    let leftPanelWidth = 200 + 10, rightPanelWidth = ChartSwitch3ColDefaultWidthInPx
    let displayLegendPanel = _.startsWith(vizType, 'multi_dim_') && dimensions.length === 2
    // 如果是 1920 的大屏幕，则完全显示图表区域，否则图表区域于钉板的面积比为 1:1
    let chartSwitcherHeight = ChartSwitchDefaultHeightInPx + 60 + 40 < spHeight /* 60 为钉板默认的 collapseHeigh，40 是预留高度 */
      ? ChartSwitchDefaultHeightInPx
      : Math.max(ChartSwitch4RowDefaultHeightInPx, spHeight / 2)
    
    let LeftPanel = this.renderLeftPanel
    return (
      <HorizontalSplitHelper
        className="panels"
        collapseWidth={125}
      >
        <LeftPanel
          className="itblock height-100"
          defaultWeight={leftPanelWidth}
          collapseTitle="展开左侧栏"
        />

        <div
          className="itblock height-100"
          defaultWeight={spWidth - leftPanelWidth - rightPanelWidth}
        >
          <ConditionPanel
            drillDownData={drillDownData}
            drillDownFn={(drillDownData)=>{this.setState({drillDownData})}}
            className="panel condition-panel"
            dimensionLayer={dimensionLayer}
            dataSourceDimensions={dataSourceDimensions}
            dataSourceMeasures={dataSourceMeasures}
            visiblePopoverKey={visiblePopoverKey}
            onHeightChange={nextHeight => this.setState({conditionPanelHeight: nextHeight})}
            projectCurrent={projectCurrent}
            mainTimeDimName={mainTimeDimName}
          />

          <DataDisplayPanel
            drillDownFn={(drillDownData)=>{this.setState({drillDownData})}}
            drillDownData={drillDownData}
            className="panel data-display-panel"
            dimensionLayer={dimensionLayer}
            style={{height: `calc(100% - ${conditionPanelHeight}px)`}}
            dataSourceDimensions={dataSourceDimensions}
            dataSourceMeasures={dataSourceMeasures}
            linkage={linkage}
            {...{isFetchingDataSourceDimensions, isFetchingDataSourceMeasures}}
          />

        </div>

        <VerticalSplitHelper
          className="itblock height-100"
          defaultWeight={rightPanelWidth}
          collapseTitle="展开右侧栏"
        >
          <ChartSwitcher
            className="panel"
            defaultWeight={chartSwitcherHeight}
            {...{vizType, updateHashState, metrics, dimensions}}
          />
          {displayLegendPanel
            ? (
              <LegendPanel
                mainTimeDimName={mainTimeDimName}
                dataSourceId={dataSourceId}
                filters={filters}
                dimensionExtraSettingDict={dimensionExtraSettingDict}
                updateHashState={updateHashState}
                defaultWeight={spHeight - chartSwitcherHeight}
                collapseTitle="标注"
                className="panel"
                comparingDimension={dimensions[0]}
                dbDimensions={dataSourceDimensions}
              />
            ) : null}
          <DingPanel
            dataSourceId={dataSourceId}
            defaultWeight={displayLegendPanel ? 0 : spHeight - chartSwitcherHeight}
            collapseTitle="钉板"
            className="panel ding-panel"
            dbDimensions={dataSourceDimensions}
            {...{filters, dimensionExtraSettingDict, updateHashState, updateHashStateByPath, mainTimeDimName}}
            dingingDbDimensionName={pinningDims && pinningDims[0]}
          />
        </VerticalSplitHelper>
      </HorizontalSplitHelper>
    )
  }
}

const Wrapped = (() => {
  let withMetrics = withDataSourceMeasures(AnalyticPanels, props => ({
    dataSourceId: props.dataSourceId,
    doFetch: !!props.dataSourceId,
    disabledCache: true
  }))
  let withTags = withDataSourceTags(withMetrics, props => ({
    dataSourceId: props.dataSourceId,
    doFetch: !!props.dataSourceId
  }))
  let withCustomOrders = withDataSourceCustomOrders(withTags, props => ({
    dataSourceId: props.dataSourceId,
    doFetch: !!props.dataSourceId
  }))
  return withSizeProvider(withCustomOrders)
})()

export default Wrapped
