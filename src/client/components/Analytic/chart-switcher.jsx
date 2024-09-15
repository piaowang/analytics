import React from 'react'
import {
  vizTypeNameMap,
  vizTypeIconMap,
  vizTypeHintMap,
  checkVizTypeEnable,
  analyticVizTypeChartComponentMap
} from '../../constants/viz-component-map'
import classNames from 'classnames'
import {Tooltip} from 'antd'
import _ from 'lodash'
import PubSub from 'pubsub-js'
import Icon from '../Common/sugo-icon'
import {withHashStateDec} from '../Common/hash-connector'

export const BTN_WIDTH = 66, BTN_HEIGHT = 66
export const GUTTER = 8

function VizTypeButton(props) {
  let {disabled, vizType, style, onClick, className, selected, ...rest} = props
  return (
    <Tooltip
      title={`${vizTypeNameMap[vizType]}：${vizTypeHintMap[vizType]}`}
      placement="left"
    >
      <div
        onClick={disabled ? _.noop : onClick}
        className={classNames('corner aligncenter pd1y', className, {
          'disabled color-b3 bg-fb': disabled,
          fpointer: !disabled,
          'color-white bg-purple': selected,
          'color-purple border': !selected
        })}
        style={{
          ...style,
          opacity: disabled ? .5 : 1,
          minWidth: '50px',
          marginBottom: `${GUTTER}px`,
          border: selected ? 'none' : undefined
        }}
        {...rest}
      >
        <Icon
          style={{fontSize: vizType === 'pie' || vizType === 'bubble' ? 29 : 36, lineHeight: '36px'}}
          type={vizTypeIconMap[vizType]}
        />
        <div
          className="aligncenter elli font12"
          // style={{color: disabled ? undefined : selected ? 'white' : '#737373'}}
        >{vizTypeNameMap[vizType]}</div>
      </div>
    </Tooltip>
  )
}

const hiddenVizTypeSet = new Set((window.sugo.hide_viz_types || '').split(','))

@withHashStateDec(state => {
  return {...state, dataSourceId: state.selectedDataSourceId}
})
export default class ChartSwitcher extends React.Component {

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (!_.isEqual(prevProps.dimensions, this.props.dimensions) || !_.isEqual(prevProps.metrics, this.props.metrics)) {
      // 条件不符时自动切换回表格
      if (!checkVizTypeEnable(this.props.vizType, {dimensions: this.props.dimensions, metrics: this.props.metrics})) {
        this.props.updateHashState({
          vizType: hiddenVizTypeSet.has('table') ? 'table_flat' : 'table'
        }, true)
      }
    }
  }
  
  onChangeVizTypeBtnClick = ev => {
    let vizType = ev.currentTarget.getAttribute('data-viz-type')
    let {updateHashState} = this.props

    updateHashState(prevState => {
      let {dimensions, metrics, dimensionExtraSettingDict} = prevState
      // "总计"不需要维度, "表格"不限维度, "柱状图"最多一个维度, "趋势图"需要一个数值维度
      let nextDimensions, nextMetrics, nextDimensionExtraSettingsDict

      if (prevState.vizType === 'table_flat' && vizType !== 'table_flat') {
        let dimNameSet = new Set(dimensions)
        dimensionExtraSettingDict = _.mapValues(dimensionExtraSettingDict, (val, key) => {
          let {sortCol, limit} = val
          let nextVal = val
          // table_flat 能按其他维度排序，其他图表类型不能，这里要自动调整 dimensionExtraSettingDict
          if (sortCol !== key && dimNameSet.has(sortCol)) {
            nextVal = { ...nextVal, sortCol: metrics[0] }
          }
          // 只有非数状表格的限制能大于 100 （通过配置）
          if (100 < limit) {
            nextVal = { ...nextVal, limit: 100 }
          }
          return nextVal
        })
        nextDimensionExtraSettingsDict = dimensionExtraSettingDict
      }

      switch (vizType) {
        case 'number':
          nextDimensions = []
          break
        case 'table':
          nextDimensions = dimensions
          break
        case 'map':
          nextDimensions = _.take(dimensions, 1)
          nextMetrics = _.take(metrics, 1)
          // 将维度限制设置为 50
          nextDimensionExtraSettingsDict = _.defaultsDeep({[dimensions[0]]: {limit: 50}}, dimensionExtraSettingDict)
          break
        case 'scatter_map':
        case 'migration_map':
          nextDimensions = _.take(dimensions, 2)
          nextMetrics = _.take(metrics, 1)
          // 将维度限制设置为 100
          nextDimensionExtraSettingsDict = _.defaultsDeep({[dimensions[0]]: {limit: 100}}, dimensionExtraSettingDict)
          break
        case 'pie':
        case 'wordCloud':
        case 'balance_bar':
          nextDimensions = _.take(dimensions, 1)
          nextMetrics = _.take(metrics, 1)
          break
        case 'bar_and_line':
          nextDimensions = _.take(dimensions, 1)
          if (metrics.length === 1) {
            // 如果只有一个指标时，自动添加环比指标
            PubSub.publish('analytic.appendCompareWithLastPeriodMetric', metrics[0])
          }
          break
        case 'dist_bar':
        case 'horizontal_bar':
        case 'line':
          nextDimensions = _.take(dimensions, 1)
          break
        case 'multi_dim_bar':
          nextMetrics = _.take(metrics, 1)
          break
        case 'multi_dim_line':
          nextMetrics = _.take(metrics, 1)
          break
        case 'heat_map':
        case 'multi_dim_stacked_bar':
          nextDimensions = _.take(dimensions, 2)
          nextMetrics = _.take(metrics, 1)
          break
        case 'chord':
          nextDimensions = _.take(dimensions, 2)
          break
        case 'multi_dim_stacked_line':
          nextDimensions = _.take(dimensions, 2)
          nextMetrics = _.take(metrics, 2)
          break
        case 'bubble':
          nextDimensions = _.take(dimensions, 2)
          nextMetrics = _.take(metrics, 3)
          break
        case 'liquidfill':
        case 'gauge':
          nextMetrics = _.take(metrics, 1)
          break
        case 'radar':
          nextDimensions = _.take(dimensions, 1)
          nextMetrics = _.take(metrics, 6)
          break
      }
      return _.pickBy({
        vizType: vizType,
        metrics: nextMetrics,
        dimensions: nextDimensions,
        dimensionExtraSettingDict: nextDimensionExtraSettingsDict,
        chartExtraSettings: {}
      }, _.identity)
    })

    PubSub.publish('analytic.onVisiblePopoverKeyChange', null)
  }

  render() {
    let {vizType, style, className, metrics, dimensions, customDimensions = []} = this.props

    const hasSubTag = customDimensions.filter(p => p.isSubTag).length

    let vizTypes = _.keys(analyticVizTypeChartComponentMap).filter(vizType => !hiddenVizTypeSet.has(vizType))

    return (
      <div
        style={style}
        className={className}
        ref={ref => this._rootDiv = ref}
      >
        <div
          className="overscroll-y hide-scrollbar-y height-100 bg-white corner"
          style={{padding: '8px 4px 0 4px'}}
        >
          {vizTypes.map(name => {
            let isDisabled = !checkVizTypeEnable(name, {metrics, dimensions})
            if(hasSubTag && name === 'table') {
              isDisabled = true
            }
            return (
              <VizTypeButton
                key={name}
                className="itblock viz-switch-btn"
                disabled={isDisabled}
                vizType={name}
                selected={vizType === name}
                style={{
                  marginLeft: `${GUTTER / 2}px`,
                  marginRight: `${GUTTER / 2}px`,
                  width: BTN_WIDTH,
                  height: BTN_HEIGHT
                  // border: vizType === name ? '1px solid #6969d7' : undefined
                }}
                onClick={this.onChangeVizTypeBtnClick}
                data-viz-type={name}
              />
            )
          })}
        </div>
      </div>
    )
  }
}

