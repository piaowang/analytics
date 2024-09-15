import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import FixWidthHelper from '../../components/Common/fix-width-helper'
import { SearchOutlined } from '@ant-design/icons';
import { Tooltip, Menu } from 'antd';
import DruidDataFetcher from '../Fetcher/druid-data-fetcher'
import DruidColumnType, {
  DruidColumnTypeInverted, isCharDimension, isNumberDimension,
  isTimeDimension
} from '../../../common/druid-column-type'
import Loading from '../../components/Common/loading'
import Search from '../Common/search'
import withAutoFocus from '../Common/auto-focus'
import HighLightString from '../Common/highlight-string'
import * as PubSub from 'pubsub-js'
import {immutateUpdate} from '../../../common/sugo-utils'
import {withDebouncedOnChange} from '../Common/with-debounce-on-change'
import {granularityToFormat, dateFormatterGenerator} from '../../common/date-format-util'
import classNames from 'classnames'
import SortButton from '../Common/sort-btn'
import echartsBaseOptions from '../../common/echart-base-options'
import {ContextNameEnum, withContextConsumer} from '../../common/context-helper'
import {EMPTY_VALUE_OR_NULL} from '../../../common/constants'
import {doQuerySliceData} from '../../common/slice-data-transform'

const {color: legendColors} = echartsBaseOptions

const InputWithDebouncedOnChange = withDebouncedOnChange(Search, ev => ev.target.value, 1300)

const InputWithAutoFocus = withAutoFocus(InputWithDebouncedOnChange)

const {
  analytics_manual_load_chart_data = false
} = window.sugo

function ColorCheckbox(props) {
  let {checked, onChange, children, activeColor, defaultColor = '#e1e1e1', ...rest} = props
  return (
    <FixWidthHelper
      toFix="first"
      toFixWidth="15px"
      {...rest}
      onClick={() => {
        onChange(!checked)
      }}
    >
      <div
        style={{
          backgroundColor: checked ? activeColor : defaultColor,
          borderRadius: '2px',
          height: '15px',
          marginTop: '2px'
        }}
      >{'\u00a0'}</div>
      <div className="mg1l">
        {children}
      </div>
    </FixWidthHelper>
  )
}

export default class LegendPanel extends React.Component {
  static propTypes = {
    dbDimensions: PropTypes.array.isRequired,
    comparingDimension: PropTypes.string.isRequired,
    dataSourceId: PropTypes.string.isRequired,
    filters: PropTypes.array,
    timezone: PropTypes.string,
    dimensionExtraSettingDict: PropTypes.object,
    updateHashState: PropTypes.func.isRequired
  }

  static defaultProps = {}

  state = {
    isSearching: false,
    searchingText: '',
    rowCountSortDirect: 'desc',
    colorDict: {}
  }

  componentDidMount() {
    PubSub.subscribe('analytic.onLegendColorUpdate', (msg, colorDict) => {
      this.setState({colorDict})
    })
  }

  componentDidUpdate(prevProps, prevState) {
    if (!_.isEqual(this.props.comparingDimension, prevProps.comparingDimension)) {
      this.setState({isSearching: false, searchingText: '', rowCountSortDirect: 'desc'})
    
      // 切换对比维度时 清除其他的 isLegendFilter
      this.props.updateHashState(prevState => {
        return immutateUpdate(prevState, 'filters', prevFilters => (prevFilters || []).filter(flt => !flt.isLegendFilter))
      }, true)
    }
  }
  
  componentWillUnmount() {
    // 组件卸载时 清除 filter 中的 isLegendFilter （通常是因为切换图表）
    let {updateHashState} = this.props
    updateHashState(prevState => {
      return immutateUpdate(prevState, 'filters', prevFilters => (prevFilters || []).filter(flt => !flt.isLegendFilter))
    }, true)

    PubSub.unsubscribe('analytic.onLegendColorUpdate')
  }

  setActiveLegend = (nextEq) => {
    let {
      dbDimensions, filters, updateHashState, comparingDimension, dimensionExtraSettingDict, mainTimeDimName
    } = this.props

    let dbDim = _.find(dbDimensions, dbDim => dbDim.name === comparingDimension)

    // 切换对比维度时 清除其他的 isLegendFilter
    let nextFilters = filters.filter(flt => flt.col !== comparingDimension || flt.op === 'lookupin')

    let druidColumnTypeInverted = DruidColumnTypeInverted[dbDim.type]

    let dbDimExtraSettings = _.get(dimensionExtraSettingDict, comparingDimension)
    if (comparingDimension !== mainTimeDimName && isCharDimension(dbDim)) {
      updateHashState({
        filters: nextFilters.concat([{
          col: comparingDimension,
          op: 'in',
          eq: nextEq,
          containsNull: nextEq[0] === EMPTY_VALUE_OR_NULL,
          type: druidColumnTypeInverted,
          isLegendFilter: true
        }])
      }, true)
    } else if (isNumberDimension(dbDim)) {
      let granularity = _.get(dbDimExtraSettings, 'granularity') || 10
      let splitType = _.get(dbDimExtraSettings, 'numberSplitType') || 'range'
      updateHashState({
        filters: nextFilters.concat([{
          col: comparingDimension,
          op: 'in-ranges',
          eq: nextEq,
          granularity: splitType === 'range' ? granularity : null,
          containsNull: nextEq[0] === EMPTY_VALUE_OR_NULL,
          type: druidColumnTypeInverted,
          isLegendFilter: true
        }])
      }, true)
    } else if (isTimeDimension(dbDim)) {
      let granularity = _.get(dbDimExtraSettings, 'granularity') || 'P1D'
      updateHashState({
        filters: nextFilters.concat([{
          col: comparingDimension,
          op: 'in-ranges',
          eq: nextEq,
          granularity,
          containsNull: nextEq[0] === EMPTY_VALUE_OR_NULL,
          type: druidColumnTypeInverted,
          isLegendFilter: true
        }])
      }, true)
    } else {
      throw new Error(`Can not identity this column's type: ${dbDim.title || dbDim.name}`)
    }
  }

  getCurrGroupFormatter() {
    let {dbDimensions, dimensionExtraSettingDict, comparingDimension} = this.props

    let dbDim = _.find(dbDimensions, dbDim => dbDim.name === comparingDimension)

    return isTimeDimension(dbDim)
      ? dateFormatterGenerator(granularityToFormat(_.get(dimensionExtraSettingDict, `${comparingDimension}.granularity`) || 'P1D'))
      : _.identity
  }

  notifySliceReload = () => PubSub.publish('analytic.auto-load')

  debounceNotifySliceReload = _.debounce(this.notifySliceReload, 1000)

  async checkHasOption(ops) {
    let { dataSourceId, filters, comparingDimension } = this.props
    let legendFilters = _.filter(filters, flt => flt.col !== comparingDimension)
    let res = await doQuerySliceData({
      druid_datasource_id: dataSourceId,
      params: {
        filters: [...legendFilters, {col: comparingDimension, op: 'in', eq: ops}],
        customMetrics: [
          {name: 'rowCount', formula: '$main.count()'}
        ]
      }
    })
    return 0 < _.get(res, [0, 'rowCount'], 0)
  }
  
  render() {
    let {
      dataSourceId, dbDimensions, filters, comparingDimension, dimensionExtraSettingDict, className, style,
      mainTimeDimName
    } = this.props
    let {rowCountSortDirect, isSearching, searchingText, colorDict} = this.state

    let dbDim = _.find(dbDimensions, dbDim => dbDim.name === comparingDimension)
    if (!dbDim) {
      return null
    }

    const isStringDim = comparingDimension !== mainTimeDimName && (dbDim.type === DruidColumnType.String || dbDim.type === DruidColumnType.StringArray)

    // legend 的选择不能影响 legend 的查询结果
    let legendFilters = _.filter(filters, flt => flt.col !== comparingDimension)
  
    let isSearchingLegend = isStringDim && isSearching && searchingText
    if (isSearchingLegend) {
      // 输入查询条件后
      legendFilters = legendFilters.concat([{
        col: comparingDimension,
        op: 'startsWith',
        eq: searchingText
      }])
    }

    // 如果已有时间或数值 in 类型等的过滤器，则清除
    let currLegendFlt = _.find(filters, flt => {
      if (isStringDim) {
        return flt.col === comparingDimension && flt.op !== 'lookupin'
      }
      return flt.col === comparingDimension && flt.op !== 'lookupin' && _.endsWith(flt.op, 'in-ranges')
    })
    let alreadyHasFilter = !!currLegendFlt

    let currEq = alreadyHasFilter ? currLegendFlt.eq : []

    let selectedSet = new Set(currEq)

    let groupValFormatter = this.getCurrGroupFormatter()

    let comparingDimSettings = _.get(dimensionExtraSettingDict, comparingDimension) || {}

    let isCharDim = isCharDimension(dbDim)
    return (
      <div
        style={style}
        className={className}
      >
        <div className="height-100 bg-white corner">
          <div
            style={{height: 43, padding: '0 10px', lineHeight: '38px', borderBottom: '1px solid #d2d8dc'}}
          >标注</div>

          <DruidDataFetcher
            dbDimensions={dbDimensions}
            dataSourceId={dataSourceId}
            customMetrics={[ {name: 'rowCount', formula: '$main.count()'} ]}
            onData={async data => {
              let resultSet = _.get(data, '0.resultSet', [])
              // 首次数据加载完成后选取前 5 个，非空
              // 不是根据名称搜索标注时，如果旧选项完全不存在于 resultSet，也需要重新选择
              let groupNames = isCharDim
                ? resultSet.map(d => d[comparingDimension] || EMPTY_VALUE_OR_NULL)
                : resultSet.map(d => d[comparingDimension])
              if (!_.isEmpty(resultSet) && !alreadyHasFilter
                  || !isSearchingLegend && !_.isEmpty(currEq) && !_.some(groupNames, v => selectedSet.has(v))
                    && !await this.checkHasOption(currEq)) {
                let nextEq = _.take(groupNames, 5).filter(v => v === 0 || v)
                this.setActiveLegend(_.orderBy(nextEq, val => val === EMPTY_VALUE_OR_NULL ? -1 : 1, 'asc'))
              }
            }}
            dimensionExtraSettingDict={{
              [comparingDimension]: {
                ...comparingDimSettings,
                sortCol: 'rowCount',
                sortDirect: 'desc',
                limit: 100
              }}}
            dimensions={[comparingDimension]}
            filters={legendFilters}
            groupByAlgorithm="groupBy"
            withGlobalMetrics={false}
          >
            {({isFetching, data}) => {
              if (!data) {
                data = []
              }
              // 除了搜索时，始终把当前选中的项排到前边
              if (!_.isEmpty(currEq) && !isSearchingLegend) {
                let selectedSet = new Set(currEq)
                data = [...currEq.map(v => ({[comparingDimension]: v})), ...data.filter(d => !selectedSet.has(d[comparingDimension]))]
              }

              // TODO 将已经选择了的项排到前面，没有查询出来但存在于 filter 的也要补上 ?
              /* let dict = _.keyBy(data, d => d[comparingDimension])
               data = (currLegendFlt.eq || []).map(v => ({[comparingDimension]: v, [panelSortCol]: dict[v][panelSortCol] || ''}))
               .concat(data.filter(d => !selectedSet.has(d[comparingDimension]))) */

              return (
                <Loading
                  style={{height: 'calc(100% - 43px)'}}
                  isLoading={isFetching}
                >
                  <FixWidthHelper
                    className={classNames({'shadowb-eee mg1b': !isSearching})}
                    toFix="last"
                    toFixWidth="40px"
                    style={{lineHeight: '30px', padding: '5px 10px'}}
                  >
                    <div>{dbDim.title || dbDim.name}</div>
                    <div className="alignright">
                      <SearchOutlined
                        className={classNames('grey-at-first pointer mg1r', {disabled: !isStringDim})}
                        onClick={isStringDim ? () => this.setState({isSearching: !isSearching}) : undefined} />

                      <SortButton
                        title={`切换到总记录数${rowCountSortDirect === 'asc' ? '降序' : '升序'}`}
                        type="icon"
                        value={rowCountSortDirect}
                        className="grey-at-first"
                        onChange={nextSortDirect => this.setState({rowCountSortDirect: nextSortDirect})}
                        placement="topRight"
                      />
                    </div>
                  </FixWidthHelper>
                  {!isSearching ? null :
                    <div className="mg1">
                      <InputWithAutoFocus
                        className="shadowb-eee"
                        placeholder="搜索"
                        value={searchingText}
                        onChange={val => {
                          this.setState({searchingText: val})
                        }}
                      />
                    </div>}
                  {isFetching || data.length
                    ? null
                    : (
                      <div className="relative overscroll-y" style={{height: 'calc(100% - 40px)'}}>
                        <div className="center-of-relative">
                          {searchingText ? `没有以 ${_.truncate(searchingText, {length: 10})} 开头的数据` : '查无数据'}
                        </div>
                      </div>
                    )}
                  <Menu
                    prefixCls="ant-select-dropdown-menu"
                    style={{
                      overflow: 'auto',
                      maxHeight: 'none',
                      height: `calc(100% - 45px ${isSearching ? '- 33px' : ''})`
                    }}
                  >
                    {data.filter(op => (comparingDimension in op)).map((op, i) => {
                      let groupName = isCharDim ? (op[comparingDimension] || EMPTY_VALUE_OR_NULL) : op[comparingDimension]
                      let formattedGroupName = groupName !== EMPTY_VALUE_OR_NULL ? groupValFormatter(groupName) : EMPTY_VALUE_OR_NULL
                      let activeColor = colorDict[op[comparingDimension]]
                      if (!activeColor) {
                        // 简单猜测一个颜色
                        activeColor = legendColors[i % legendColors.length]
                      }
                      return (
                        <Menu.Item key={groupName || i}>
                          <ColorCheckbox
                            checked={selectedSet.has(groupName)}
                            className="width-100"
                            activeColor={activeColor}
                            onChange={checked => {
                              let nextEq
                              if (checked) {
                                nextEq = groupName === EMPTY_VALUE_OR_NULL
                                  ? [groupName, ...currEq]
                                  : [...currEq, groupName]
                              } else {
                                nextEq = currEq.filter(val => val !== groupName)
                              }
                              this.setActiveLegend(nextEq)
                              if (analytics_manual_load_chart_data) {
                                this.debounceNotifySliceReload()
                              }
                            }}
                          >
                            <Tooltip title={formattedGroupName}>
                              <HighLightString
                                className="itblock elli"
                                text={formattedGroupName}
                                highlight={isSearching ? searchingText : null}
                              />
                            </Tooltip>
                          </ColorCheckbox>
                        </Menu.Item>
                      )
                    })}
                  </Menu>
                </Loading>
              );
            }}
          </DruidDataFetcher>
        </div>
      </div>
    );
  }
}
