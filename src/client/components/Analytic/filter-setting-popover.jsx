import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import {Select, Button, Popover, InputNumber, Menu, Input, Checkbox, Slider, Tooltip, Radio, message} from 'antd'
import DruidDataFetcher from '../Fetcher/druid-data-fetcher'
import DistinctCascadeFetcher from '../Fetcher/distinct-cascade-fetcher'
import {isNumberDimension, isTimeDimension} from '../../../common/druid-column-type'
import Loading from '../../components/Common/loading'
import HighLightString from '../Common/highlight-string'
import setStatePromise from '../../common/set-state-promise'
import withAutoFocus from '../Common/auto-focus'
import Search from '../Common/search'
import {convertDateType, isRelative} from '../../../common/param-transform'
import FixWidthHelper from '../../components/Common/fix-width-helper'
import {granularityToFormat, dateFormatterGenerator} from '../../common/date-format-util'
import classNames from 'classnames'
import DruidColumnType from '../../../common/druid-column-type'
import {ContextNameEnum, withContextConsumer} from '../../common/context-helper'
import {EMPTY_VALUE_OR_NULL} from '../../../common/constants'

const {distinctDropDownFirstNLimit = 10} = window.sugo

const {Option} = Select
const InputWithAutoFocus = withAutoFocus(Search)

/**
 filter definition
 {
    col: '',
    op: 'in, not in, startsWith, endsWith, contains, equal',
    eq: [from to] / [case0, case1, case2, ...],
    type: 'number/string'
 }
 */

let ModeEnum = {
  Normal: 1,
  Advanced: 2
}

let NormalFilterOpEnum = ['in', 'not in', 'equal']
let AdvancedFilterOpEnum = ['equal', 'nullOrEmpty', 'startsWith', 'endsWith', 'contains', 'matchRegex']

export const FilterOpNameMap = {
  in: '包含',
  contains: '含有',
  startsWith: '开头是',
  endsWith: '结尾是',
  equal: '精确匹配',
  nullOrEmpty: '为空',
  matchRegex: '正则匹配',
  greaterThan: '大于',
  lessThan: '小于',
  greaterThanOrEqual: '大于等于',
  lessThanOrEqual: '小于等于'
}

const radioStyle = {
  display: 'block',
  height: '25px',
  lineHeight: '25px'
}

@setStatePromise
export default class FilterSettingPopover extends React.Component {
  static propTypes = {
    dataSourceId: PropTypes.string.isRequired,
    dbDimension: PropTypes.object.isRequired,
    topNFilters: PropTypes.array.isRequired,
    topNTimezone: PropTypes.string,
    children: PropTypes.object.isRequired,
    value: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    visible: PropTypes.bool,
    onVisibleChange: PropTypes.func,
    uiStrategy: PropTypes.oneOf(['lite', 'normal'])
  }

  static defaultProps = {
    onVisibleChange: _.identity
  }

  state = {
    searchingText: '',
    searchingTextDebounced: '',
    mode: ModeEnum.Normal,
    settings: { }
  }

  componentDidMount() {
    this.loadSettingsFromProps(this.props)
  }
  
  componentDidUpdate(prevProps, prevState) {
    let { value } = prevProps
  
    if (!_.isEqual(value, this.props.value)) {
      this.loadSettingsFromProps(this.props)
    }
  }
  
  onUpdateSearchingText = _.debounce(() => {
    if (this.state.searchingText !== this.state.searchingTextDebounced) {
      this.setState({ searchingTextDebounced: this.state.searchingText })
    }
  }, 1300)

  loadSettingsFromProps(props) {
    const { dbDimension, uiStrategy } = props
    let settings = {
      ...this.state.settings,
      ...props.value
    }
    const dimParamType = _.get(dbDimension, 'params.type')
    const isGroupOrBusinessDim = dimParamType === 'group' || dimParamType === 'business'
    let liteMode = uiStrategy === 'lite' && !isGroupOrBusinessDim
    if (liteMode && settings.op === 'in') {
      settings.op = 'equal'
    }
    return this.setStatePromise({
      settings: settings,
      mode: liteMode
        ? ModeEnum.Advanced
        : _.includes(NormalFilterOpEnum, settings.op) ? ModeEnum.Normal : ModeEnum.Advanced
    })
  }

  cleanSelections = () => {
    return this.setStatePromise({
      settings: {...this.state.settings, eq: [], containsNull: false}
    })
  }

  renderStringAdvancedFilterContent() {
    let {
      dataSourceId,
      topNFilters,
      dbDimension,
      uiStrategy,
      mainTimeDimName
    } = this.props
    let {
      settings: {
        op,
        eq
      }
    } = this.state

    let timeFlt = _.find(topNFilters, flt => flt.col === mainTimeDimName)
    let since, until
    let noContentHint = '查无数据'
    let relativeTime
    if (timeFlt) {
      relativeTime = isRelative(timeFlt.eq) ? timeFlt.eq : 'custom'
      let sinceUntil = relativeTime === 'custom' ? timeFlt.eq : convertDateType(relativeTime)
      since = sinceUntil[0]
      until = sinceUntil[1]
      noContentHint = `${since.slice(5, 10)} ~ ${until.slice(5, 10)} 查无数据`
    }

    return (
      <DistinctCascadeFetcher
        doFetch={false}
        since={since}
        until={until}
        relativeTime={relativeTime}
        dataSourceId={dataSourceId}
        dbDim={dbDimension}
      >
        {({isFetching, data, onSearchAutoFetch, isWaitingForInput, fetch}) => {
          let arr = isFetching ? ['载入中...'] : data
          let dropdownClassName = isFetching || isWaitingForInput ? 'is-fetching' : 'not-fetching'
          let isNegativeFilter = _.startsWith(op, 'not ')
          let finalOp = isNegativeFilter ? op.substr(4) : op
          return (
            <div className="pd1" style={{width: '215px'}}>
              <Input.Group compact>
                <Input
                  className="width60 ignore-mouse"
                  readOnly
                  value="匹配值"
                />
                {uiStrategy === 'normal' && false /* 考虑到性能，暂时禁用下拉框 */ ? (
                  <Select
                    style={{width: 'calc(100% - 60px)'}}
                    disabled={finalOp === 'nullOrEmpty'}
                    mode="combobox"
                    showArrow={false}
                    filterOption={false}
                    value={eq}
                    allowClear
                    showSearch
                    optionFilterProp="children"
                    dropdownMatchSelectWidth={false}
                    placeholder="填写或搜索"
                    notFoundContent={isFetching ? '加载中' : isWaitingForInput ? '等待输入' : noContentHint}
                    onSearch={'matchRegex' === finalOp ? undefined : onSearchAutoFetch}
                    onFocus={() => fetch()}
                    dropdownClassName={dropdownClassName}
                    onChange={v => {
                      this.setState({
                        settings: {...this.state.settings, eq: (_.isArray(v) ? v : [v]).filter(_.identity)}
                      })
                    }}
                    defaultActiveFirstOption={false}
                  >
                    {(arr || []).filter(_.identity).map(pl => (<Option key={pl} value={pl}>
                      <HighLightString
                        className="iblock elli"
                        text={pl}
                        highlight={_.isArray(eq) ? eq[0] : eq}
                      />
                    </Option>))}
                  </Select>
                ) : (
                  <Input
                    style={{width: 'calc(100% - 60px)'}}
                    value={_.isArray(eq) ? eq[0] : eq}
                    placeholder="未填写"
                    onChange={ev => {
                      let val = ev.target.value
                      this.setState({
                        settings: {...this.state.settings, eq: [val]}
                      })
                    }}
                  />
                )}
              </Input.Group>

              <Radio.Group
                className="pd1"
                buttonStyle="solid"
                onChange={ev => {
                  let val = ev.target.value
                  this.setState({
                    settings: {
                      ...this.state.settings,
                      op: isNegativeFilter ? `not ${val}` : val,
                      eq: val === 'nullOrEmpty' && _.isEqual([], _.compact(eq)) ? [EMPTY_VALUE_OR_NULL] : eq
                    }
                  })
                }}
                value={finalOp}
              >
                {AdvancedFilterOpEnum.map(k => {
                  return (
                    <Radio value={k} key={k} style={radioStyle}>{FilterOpNameMap[k]}</Radio>
                  )
                })}
              </Radio.Group>
              <Checkbox
                className="pd1"
                style={radioStyle}
                checked={isNegativeFilter}
                onChange={ev => {
                  let nextOp = ev.target.checked ? `not ${op}` : op.substr(4)
                  this.setState({
                    settings: {...this.state.settings, op: nextOp}
                  })
                }}
              >排除匹配项</Checkbox>
            </div>
          )
        }}
      </DistinctCascadeFetcher>
    )
  }

  renderStringNormalFilterContent(height = 252) {
    let {
      visible,
      dataSourceId,
      topNFilters,
      topNTimezone,
      dbDimension,
      value,
      dimExtraSetting,
      mainTimeDimName,
      customDimensions
    } = this.props
    let {
      settings: {
        op,
        eq
      },
      searchingText,
      searchingTextDebounced
    } = this.state

    eq = _.isArray(eq) ? eq : [eq].filter(_.identity)
    
    let eqSet = new Set(eq)

    let finalFilter
    if (searchingTextDebounced) {
      finalFilter = topNFilters.concat([{col: dbDimension.name, op: 'startsWith', eq: [searchingTextDebounced]}])
    } else {
      finalFilter = topNFilters
    }

    let groupValFormatter = this.getRangesFormatter()

    let singleSelect = op === 'equal'
    let Checker = singleSelect ? Radio : Checkbox
    return (
      <DruidDataFetcher
        dbDimensions={[dbDimension]}
        dataSourceId={dataSourceId}
        dimensions={[dbDimension.name]}
        customDimensions={customDimensions}
        metrics={[]}
        customMetrics={[{name: 'count', formula: '$main.count()'}]}
        filters={finalFilter}
        doFetch={visible}
        timezone={topNTimezone}
        dimensionExtraSettingDict={{
          [dbDimension.name]: {...dimExtraSetting, sortCol: 'count', sortDirect: 'desc', limit: distinctDropDownFirstNLimit }
        }}
        groupByAlgorithm="topN"
      >
        {({isFetching, data}) => {
          let topN = (data || []).map(d => d[dbDimension.name]).filter(_.identity)

          let savedEq = []
          if (_.endsWith(value.op, 'in') || _.endsWith(value.op, 'in-ranges')) {
            // 将已经选择了的项排到前面
            savedEq = value.containsNull ? _.drop(eq || [], 1) : (eq || [])
          }

          let savedEqSet = new Set(savedEq)
          topN = savedEq.concat(topN.filter(val => !savedEqSet.has(val)))

          // 默认第一项增加空值查询选项（fix #152)
          let showCleanSelectionBtn = !singleSelect && (eq || []).length && (eq || []).length
          let dbDimParamType = _.get(dbDimension, 'params.type')
          let dbDimGroupFor = _.get(dbDimension, 'params.dimension.name')
          return (
            <div className="filter-setting-popover itblock">
              <FixWidthHelper
                className="shadowb-eee"
                style={{padding: '5px'}}
                toFix="first"
                toFixWidth="80px"
              >
                <div>
                  <Select
                    dropdownMatchSelectWidth={false}
                    className="width-100"
                    value={op}
                    disabled={op === 'in-ranges'}
                    onChange={nextOp => {
                      this.setState({
                        settings: {
                          ...this.state.settings,
                          op: nextOp,
                          eq: _.includes(AdvancedFilterOpEnum, nextOp) ? _.take(eq.filter(v => v !== EMPTY_VALUE_OR_NULL), 1) : eq,
                          containsNull: _.includes(AdvancedFilterOpEnum, nextOp) ? false : this.state.settings.containsNull
                        }
                      })
                    }}
                  >
                    {[
                      op === 'in-ranges' ? <Option value="in-ranges" key="inRanges">包含</Option> : null,
                      <Option
                        key="equal"
                        value="equal"
                        disabled={dbDimParamType === 'group' && dbDimGroupFor === mainTimeDimName}
                      >精确匹配</Option>,
                      <Option value="in" key="in">包含</Option>,
                      <Option
                        key="notIn"
                        value="not in"
                        disabled={dbDimParamType === 'group' && dbDimGroupFor === mainTimeDimName}
                      >排除</Option>
                    ].filter(_.identity)}
                  </Select>
                </div>
                <div className="pd1l">
                  <InputWithAutoFocus
                    className="width-100"
                    placeholder="搜索更多..."
                    disabled={_.endsWith(op, 'in-ranges')}
                    value={searchingText}
                    onChange={ev => {
                      this.setState({searchingText: ev.target.value})
                      this.onUpdateSearchingText()
                    }}
                  />
                </div>
              </FixWidthHelper>
              {showCleanSelectionBtn ?
                (
                  <a
                    className="pointer"
                    onClick={this.cleanSelections}
                    className="itblock pd1 pd2l"
                  >清除选择的内容</a>
                ) : null}
              <Loading isLoading={isFetching} >
                {isFetching || topN.length
                  ? null
                  : (
                    <div className="aligncenter pd3t width-100" style={{position: 'absolute'}}>
                      {searchingText ? `没有以 ${_.truncate(searchingText, {length: 10})} 开头的数据` : '查无数据'}
                    </div>
                  )}
                <Menu
                  prefixCls="ant-select-dropdown-menu"
                  className="anlytic-filter-menu"
                  style={{overflow: 'auto', maxHeight: 'none', height: `calc(${height}px - 44px ${showCleanSelectionBtn ? '- 28px' : ''})`}}
                >
                  {/* 第一项添加系统选项 NULL空值 的选择*/}
                  {!(isFetching || topN.length) || topN.includes(EMPTY_VALUE_OR_NULL) || dbDimParamType === 'group' || singleSelect
                    ? null :
                    (
                      <Menu.Item key={'item-' + EMPTY_VALUE_OR_NULL}>
                        <Checkbox
                          checked={this.state.settings.containsNull}
                          onChange={ev => {
                            let newEq
                            if (ev.target.checked) {
                              newEq = [EMPTY_VALUE_OR_NULL].concat(eq)
                            } else {
                              newEq = _.drop(eq, 1)
                            }
                            let isChecked = ev.target.checked
                            this.setState({
                              settings: _.assign({}, this.state.settings, {eq: newEq, containsNull: isChecked})
                            })
                          }}
                        >
                          <Tooltip title={'为NULL的空值'} placement="topRight">
                            <span className="iblock elli tile-filter-item">{EMPTY_VALUE_OR_NULL}</span>
                          </Tooltip>
                        </Checkbox>
                      </Menu.Item>
                    )
                  }
                  {topN.map(val => {
                    return (
                      <Menu.Item key={'m-i-' + val}>
                        <Tooltip title={val} placement="topRight">
                          <Checker
                            className="width-100"
                            checked={eqSet.has(val)}
                            onClick={singleSelect ? () => {
                              if (!eqSet.has(val)) {
                                this.setState({
                                  settings: _.assign({}, this.state.settings, {eq: [val], containsNull: false})
                                })
                              }
                            } : undefined}
                            onChange={singleSelect ? undefined : ev => {
                              let newEq
                              if (ev.target.checked) {
                                newEq = eq.concat([val])
                              } else {
                                newEq = eq.filter(prev => prev !== val)
                              }
                              this.setState({
                                settings: _.assign({}, this.state.settings, {eq: newEq})
                              })
                            }}
                          >
                            <HighLightString
                              className="iblock elli tile-filter-item"
                              text={groupValFormatter ? groupValFormatter(val) : val}
                              highlight={searchingText}
                            />
                          </Checker>
                        </Tooltip>
                      </Menu.Item>
                    )
                  })}
                </Menu>
              </Loading>
            </div>
          )
        }}
      </DruidDataFetcher>
    )
  }

  getRangesFormatter() {
    let {dbDimension, value: {granularity}} = this.props

    return dbDimension && isTimeDimension(dbDimension)
      ? dateFormatterGenerator(granularityToFormat(granularity || 'P1D'))
      : null
  }

  renderNumberFilterContent() {
    let {
      visible,
      dataSourceId,
      topNFilters,
      topNTimezone,
      dbDimension,
      customDimensions
    } = this.props
    let { settings } = this.state
    let {op, eq, bounds = '[)'} = settings || {}

    const { params } = dbDimension
    let currDimName = dbDimension.name
    // 空值会当成 0，要先排除掉数值维度的空值，否次会查出 0~N 其实可能是 x~N
    let minFormula = `$main.min($\{${currDimName}\})`
    let maxFormula = `$main.max($\{${currDimName}\})`
    if (params.type === 'calc') {
      maxFormula = `$main.max(${params.formula})`
      minFormula = `$main.min(${params.formula})`
    }

    return (
      <DruidDataFetcher
        dbDimensions={[dbDimension]}
        dataSourceId={dataSourceId}
        customMetrics={[
          {name: 'upperLimit', formula: maxFormula},
          {name: 'lowerLimit', formula: minFormula}
        ]}
        customDimensions={customDimensions}
        filters={[...topNFilters, {col: currDimName, op: 'not nullOrEmpty', eq: [EMPTY_VALUE_OR_NULL]}]}
        doFetch={visible}
        timezone={topNTimezone}
        onData={data => {
          if (!data) {
            return
          }
          let {lowerLimit = null, upperLimit = null} = data[0] || {}
          if (lowerLimit === null && upperLimit === null || (!isFinite(lowerLimit) && !isFinite(upperLimit))) {
            if (!data[0]) {
              data[0] = {}
            }
            data[0].lowerLimit = - Math.pow(2, 31)
            data[0].upperLimit = Math.pow(2, 31)
            message.warning(`无法取得数值维度 ${dbDimension.title} 的范围，可能无法筛选出数据`, 5)
          } else {
            this.setState({
              settings: {...settings, eq: [
                _.isNumber(eq[0]) ? eq[0] : _.round(lowerLimit, 2),
                _.isNumber(eq[1]) ? eq[1] : _.round(upperLimit, 2)
              ]}
            })
          }
        }}
      >
        {({total: data}) => {
          let {lowerLimit, upperLimit} = data || {}
          lowerLimit = isFinite(lowerLimit) ? Math.floor(lowerLimit) : null
          upperLimit = isFinite(upperLimit) ? Math.ceil(upperLimit) : null

          let [min = null, max = null] = eq || []

          let displayRangePicker = op === 'in' || op === 'not in'
          let step = dbDimension && dbDimension.type === DruidColumnType.Float ? 0.01 : 1
          return (
            <div className="filter-number-popover">
              <div
                className={classNames('itblock', {width80: displayRangePicker, 'width-50': !displayRangePicker})}
                style={displayRangePicker ? undefined : {width: 'calc((100% - 28px) / 2)'}}
              >
                <div className="color-grey mg1b">类型</div>
                <Select
                  dropdownMatchSelectWidth={false}
                  className="width-100"
                  value={op}
                  onChange={val => {
                    if (_.endsWith(val, 'nullOrEmpty') && _.isEmpty(eq)) {
                      eq = [0]
                    }
                    this.setState({
                      settings: {
                        ...settings,
                        op: val,
                        eq: _.endsWith(op, 'in') ? eq : _.take(eq, 1)
                      }
                    })
                  }}
                >
                  <Option value="in">包含</Option>
                  <Option value="not in">排除</Option>
                  <Option value="equal">等于</Option>
                  <Option value="not equal">不等于</Option>
                  <Option value="nullOrEmpty">为空</Option>
                  <Option value="not nullOrEmpty">非空</Option>
                  <Option value="greaterThan">大于</Option>
                  <Option value="lessThan">小于</Option>
                  <Option value="greaterThanOrEqual">大于等于</Option>
                  <Option value="lessThanOrEqual">小于等于</Option>
                </Select>
              </div>

              <div
                className={classNames('itblock mg1l', {hide: displayRangePicker})}
                style={{width: 'calc((100% - 28px) / 2)'}}
              >
                <div className="color-grey mg1b">值</div>
                <InputNumber
                  disabled={_.endsWith(op, 'nullOrEmpty')}
                  className="width-100"
                  placeholder="不限"
                  value={min}
                  min={lowerLimit}
                  max={upperLimit}
                  step={step}
                  onChange={val => {
                    this.setState({
                      settings: {...settings, eq: [val === '' ? null : val]}
                    })
                  }}
                />
              </div>

              <div
                className={classNames('itblock mg1l', {hide: !displayRangePicker})}
                style={{width: 'calc((100% - 90px) / 2)'}}
              >
                <div className="color-grey mg1b">最小值</div>
                <InputNumber
                  className="width-100"
                  placeholder="不限"
                  value={min}
                  min={lowerLimit}
                  max={upperLimit}
                  step={step}
                  onChange={val => {
                    this.setState({
                      settings: {...settings, eq: [val === '' ? null : val, max]}
                    })
                  }}
                />
              </div>

              <div
                className={classNames('itblock mg1l', {hide: !displayRangePicker})}
                style={{width: 'calc((100% - 90px) / 2)'}}
              >
                <div className="color-grey mg1b">
                  最大值（
                  <span
                    className={classNames('pointer', {'color-main bold': bounds === '[)', 'color-gray': bounds !== '[)'})}
                    onClick={() => this.setState({settings: {...settings, bounds: '[)'}})}
                    title="最终筛选区间为“左闭右开”"
                  >开区间</span> / <span
                    className={classNames('pointer', {'color-main bold': bounds === '[]', 'color-gray': bounds !== '[]'})}
                    onClick={() => this.setState({settings: {...settings, bounds: '[]'}})}
                    title="最终筛选区间为“左闭右闭”"
                                >闭区间</span>
                  ）
                </div>
                <InputNumber
                  className="width-100"
                  placeholder="不限"
                  value={max}
                  min={lowerLimit}
                  max={upperLimit}
                  step={step}
                  onChange={val => {
                    this.setState({
                      settings: {...settings, eq: [min, val === '' ? null : val]}
                    })
                  }}
                />
              </div>

              <Slider
                className={classNames({hide: !displayRangePicker})}
                range
                min={lowerLimit}
                max={upperLimit}
                step={step}
                value={[
                  min === '-' || min === null || !isFinite(min) ? lowerLimit : min,
                  max === '-' || max === null || !isFinite(max) ? upperLimit : max
                ]}
                onChange={([from, to]) => {
                  this.setState({
                    settings: {...settings, eq: [
                      _.isNumber(lowerLimit) && from <= lowerLimit ? null : from,
                      _.isNumber(upperLimit) && upperLimit <= to ? null : to
                    ]}
                  })
                }}
              />
            </div>
          )
        }}
      </DruidDataFetcher>
    )
  }

  renderStringFilterContent() {
    let { mode, searchingText } = this.state
    const { dbDimension, uiStrategy, value: settings } = this.props
    const isGroupOrBusinessDim = dbDimension?.params?.type === 'group'
    if (uiStrategy === 'lite' && !isGroupOrBusinessDim) {
      return this.renderStringAdvancedFilterContent()
    }
    // 分组的只能有普通过滤
    if (isGroupOrBusinessDim) {
      mode = ModeEnum.Normal
    }
    return (
      <div>
        <Radio.Group
          // buttonStyle="solid"
          onChange={e => {
            let nextMode = e.target.value
            if (nextMode === ModeEnum.Normal) {
              let val = _.isArray(settings.eq) ? settings.eq[0] : settings.eq
              let canKeepOp = _.includes(NormalFilterOpEnum, settings.op)
              this.setState({
                mode: nextMode,
                settings: {
                  ...settings,
                  op: canKeepOp ? settings.op : 'equal',
                  eq: canKeepOp ? settings.eq : []
                },
                searchingText: val,
                searchingTextDebounced: val
              })
            } else {
              this.setState({
                mode: nextMode,
                settings: {
                  ...settings,
                  op: _.includes(AdvancedFilterOpEnum, settings.op) ? settings.op : 'equal',
                  eq: _.isEmpty(settings.eq) ? [searchingText] : _.take(settings.eq, 1)
                },
                searchingText: '',
                searchingTextDebounced: ''
              })
            }
          }}
          value={mode}
          className="block pd1"
        >
          <Radio.Button
            value={1}
            className="width-50 aligncenter"
          >普通</Radio.Button>
          <Radio.Button
            value={2}
            className="width-50 aligncenter"
            disabled={isGroupOrBusinessDim}
          >高级</Radio.Button>
        </Radio.Group>
        {mode === ModeEnum.Normal
          ? this.renderStringNormalFilterContent()
          : this.renderStringAdvancedFilterContent()}
      </div>
    )
  }

  renderInRangeFilterContent() {
    return (
      <div style={{height: 290}}>
        {this.renderStringNormalFilterContent(290)}
      </div>
    )
  }

  render() {
    let {
      visible,
      onVisibleChange,
      dbDimension,
      value: {op},
      onChange
    } = this.props
    
    let content = visible ? (
      <div>
        {_.endsWith(op, 'in-ranges')
          ? this.renderInRangeFilterContent()
          : isNumberDimension(dbDimension)
            ? this.renderNumberFilterContent()
            : this.renderStringFilterContent()}

        <div className="aligncenter pd2y">
          <Button
            type="ghost"
            className="mg3r"
            onClick={() => {
              onVisibleChange(false)
              this.loadSettingsFromProps(this.props).then(() => {
                onChange(_.clone(this.state.settings))
              })
            }}
          >取消</Button>
          <Button
            type="primary"
            onClick={() => {
              onVisibleChange(false)
              onChange(_.clone(this.state.settings))
            }}
          >确认</Button>
        </div>
      </div>
    ) : null
    return (
      <Popover
        overlayClassName="custom-filter-popover"
        placement="bottom"
        trigger="click"
        arrowPointAtCenter
        content={content}
        visible={visible}
        onVisibleChange={visible => {
          if (visible) {
            onVisibleChange(true)
          } else {
            // 点击下拉框不关闭 popover，点击外面才关闭
            if (document.activeElement.tagName === 'BODY') {
              onVisibleChange(false)
              this.loadSettingsFromProps(this.props).then(() => {
                onChange(_.clone(this.state.settings))
              })
            }
          }
        }}
        children={this.props.children}
      />
    )
  }
}

