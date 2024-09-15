import React from 'react'
import _ from 'lodash'
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Col, Input, message, Modal, Row, Select, Tooltip } from 'antd';
import DistinctCascadeFetcher from '../Fetcher/distinct-cascade-fetcher'
import Loading from '../../components/Common/loading'
import druidColumnTypeEnum, {
  DruidColumnTypeInverted,
  isNumberDimension,
  isTimeDimension
} from '../../../common/druid-column-type'
import {convertDateType} from 'common/param-transform'
import {immutateUpdate} from '../../../common/sugo-utils'
import DruidDataFetcher from '../Fetcher/druid-data-fetcher'
import {EMPTY_VALUE_OR_NULL} from '../../../common/constants'
import {isRelative} from '../../../common/param-transform'
import DateRangePicker from '../Common/time-picker'
import moment from 'moment'
import {ContextNameEnum, withContextConsumer} from '../../common/context-helper'

const {distinctDropDownFirstNLimit = 10} = window.sugo

@withContextConsumer(ContextNameEnum.ProjectInfo)
export default class FilterEditor extends React.Component {
  state = {
    pendingFilters: []
  }

  componentDidMount() {
    this.syncFilter()
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (!prevProps.isShowing && this.props.isShowing) {
      this.syncFilter(() => {
        let {allFilterable} = this.props
        if (!prevState.pendingFilters.length && allFilterable.length) {
          this.onAppendFilter(this.props)
        }
      })
    }
  }
  
  syncFilter(callback) {
    let {filters} = this.props
    this.setState({pendingFilters: filters || []}, callback)
  }

  onClose = () => {
    let {onFiltersChange, onClose} = this.props

    let {pendingFilters} = this.state

    if (_.some(pendingFilters, g => {
      if (g.type === 'number' && _.endsWith(g.op, 'in')) {
        let [from, to] = g.eq
        if (from && to && !(from <= to)) {
          return true
        }
      }
      return false
    })) {
      message.error('最小值不能大于最大值')
      return
    }

    onClose()
    onFiltersChange(pendingFilters.filter(f => _.isArray(f.eq) ? f.eq.length !== 0 : f.eq))
  }

  renderMultiRangesSelector(dbDim, currFilter, currFilterIndex) {
    let {dataSourceId, dimensionExtraSettingDict, filters, getPopupContainer} = this.props
    let {pendingFilters} = this.state

    let dimName = dbDim.name

    return (
      <DruidDataFetcher
        dbDimensions={[dbDim]}
        dataSourceId={dataSourceId}
        dimensions={[dbDim.name]}
        metrics={[]}
        customMetrics={[{name: 'count', formula: '$main.count()'}]}
        filters={filters.filter(flt => flt.col !== currFilter.col && flt.op !== currFilter.op)}
        dimensionExtraSettingDict={{
          [dimName]: {
            ...(dimensionExtraSettingDict[dimName]),
            sortCol: 'count',
            sortDirect: 'desc',
            limit: distinctDropDownFirstNLimit
          }
        }}
        groupByAlgorithm="topN"
      >
        {({isFetching, data, reloadDruidData})=>{
          let topN = (data || []).map(d => d[dimName] || EMPTY_VALUE_OR_NULL)

          return (
            <Loading
              isLoading={isFetching}
              indicatePosition="right"
            >
              <Select
                getPopupContainer={getPopupContainer}
                dropdownMatchSelectWidth={false}
                value={currFilter.eq.filter(_.identity)}
                mode="tags"
                searchPlaceholder="值"
                onChange={newVals => {
                  let nextFilters = immutateUpdate(pendingFilters, currFilterIndex, prevFilter => {
                    let nextEq = _.sortBy(newVals, v => v === EMPTY_VALUE_OR_NULL ? -1 : 1)
                    return {
                      ...prevFilter,
                      eq: nextEq,
                      containsNull: nextEq[0] === EMPTY_VALUE_OR_NULL
                    }
                  })
                  this.setState({
                    pendingFilters: nextFilters
                  })
                }}
                onSearch={val => {
                  reloadDruidData(bodyByProps => {
                    return immutateUpdate(bodyByProps, 'filters', filters => {
                      return [...filters, {col: dimName, op: 'startsWith', eq: [val]}]
                    })
                  })
                }}
                className="width-100"
                notFoundContent={isFetching ? '加载中' : '没有内容'}
              >
                {topN.map((val, i) => {
                  return (
                    <Select.Option
                      key={i}
                      value={val}
                    >{val}</Select.Option>
                  )
                })}
              </Select>
            </Loading>
          )
        }}
      </DruidDataFetcher>
    )
  }
  
  renderNumberRangePicker(filterGroup, groupIndex) {
    let {pendingFilters} = this.state
    let [from, to] = _.isArray(filterGroup.eq) && filterGroup.eq || []
    return (
      <Row>
        <Col span={11}>
          <Input
            value={from}
            type="number"
            placeholder="不限"
            onChange={ev => {
              let val = ev.target.value
              this.setState({
                pendingFilters: immutateUpdate(pendingFilters, [groupIndex], prev => {
                  return {
                    ...prev,
                    eq: [val ? val * 1 : null, to]
                  }
                })
              })
            }}
          />
        </Col>
        <Col span={2} className="aligncenter" style={{lineHeight: '25px'}}>至</Col>
        <Col span={11}>
          <Input
            value={to}
            type="number"
            placeholder="不限"
            onChange={ev => {
              let val = ev.target.value
              this.setState({
                pendingFilters: immutateUpdate(pendingFilters, [groupIndex], prev => {
                  return {
                    ...prev,
                    eq: [from, val ? val * 1 : null]
                  }
                })
              })
            }}
          />
        </Col>
      </Row>
    )
  }
  
  renderDistinctValuePicker(filterGroup, groupIndex) {
    let {allFilterable, relativeTime, since, until, dataSourceId} = this.props
    let {pendingFilters} = this.state
  
    let arr = relativeTime === 'custom'
      ? [since, until]
      : convertDateType(relativeTime)
    let finalSince = arr[0]
    let finalUntil = arr[1]
    let noContentHint = `${finalSince.slice(5, 10)} ~ ${finalUntil.slice(5, 10)} 查无数据`
    return (
      <DistinctCascadeFetcher
        since={finalSince}
        until={finalUntil}
        relativeTime={relativeTime}
        dataSourceId={dataSourceId}
        dbDim={_.find(allFilterable, dbD => dbD.name === filterGroup.col)}
        doFetch={false}
      >
        {({isFetching, data: distinctVals, onSearchAutoFetch, isWaitingForInput, fetch}) => {
          return (
            <Loading
              isLoading={isFetching}
              indicatePosition="right"
            >
              {/* 旧版本的 eq 是字符串，用半角逗号隔开 */}
              <Select
                onFocus={(() => fetch())}
                dropdownMatchSelectWidth={false}
                value={_.isString(filterGroup.eq) ? filterGroup.eq.split(/,/) : filterGroup.eq.filter(_.identity)}
                mode="tags"
                searchPlaceholder="值"
                onChange={newVals => {
                  let nextFilters = immutateUpdate(pendingFilters, groupIndex, prevFilter => {
                    return {
                      ...prevFilter,
                      eq: _.sortBy(newVals, v => v === EMPTY_VALUE_OR_NULL ? -1 : 1),
                      containsNull: _.includes(newVals, EMPTY_VALUE_OR_NULL)
                    }
                  })
                  this.setState({
                    pendingFilters: nextFilters
                  })
                }}
                onSearch={onSearchAutoFetch}
                className="width-100"
                notFoundContent={isFetching ? '加载中' : isWaitingForInput ? '等待输入' : noContentHint}
              >
                {(distinctVals || []).map((val, i) => {
                  return (
                    <Select.Option
                      key={i}
                      value={val || EMPTY_VALUE_OR_NULL}
                    >{val || EMPTY_VALUE_OR_NULL}</Select.Option>
                  )
                })}
              </Select>
            </Loading>
          );
        }}
      </DistinctCascadeFetcher>
    );
  }

  renderTimeRangePicker(flt, idx) {
    let {eq: fltEq = '-1 days', col} = flt
    let relativeTime = isRelative(fltEq) ? fltEq : 'custom'
    let [since, until] = relativeTime === 'custom' ? fltEq : convertDateType(relativeTime)
  
    return (
      <DateRangePicker
        className="itblock line-height18"
        alwaysShowRange
        hideCustomSelection
        style={{width: '100%'}}
        dateType={relativeTime}
        dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
        onChange={({ dateType: relativeTime, dateRange: [since, until] }) => {
          let newDateFlt = {
            col: col,
            op: 'in',
            eq: relativeTime === 'custom' ? [since, until] : relativeTime,
            dateStringComparingFormat: _.get(this.state.dateStringComparingFormatDict, col) || null
          }
          this.setState(prevState => {
            return {
              pendingFilters: immutateUpdate(prevState.pendingFilters, [idx], () => newDateFlt)
            }
          })
        }}
      />
    )
  }
  
  genValueDom(filterGroup, groupIndex) {
    let {allFilterable} = this.props

    let dbCol = _.find(allFilterable, dim => dim.name === filterGroup.col)
    if (!dbCol) {
      return null
    }

    if (_.endsWith(filterGroup.op, 'in-ranges') && (isNumberDimension(dbCol) || isTimeDimension(dbCol))) {
      return this.renderMultiRangesSelector(dbCol, filterGroup, groupIndex)
    }

    if (isNumberDimension(dbCol)) {
      return this.renderNumberRangePicker(filterGroup, groupIndex)
    }
    if (isTimeDimension(dbCol)) {
      return this.renderTimeRangePicker(filterGroup, groupIndex)
    }
    
    return this.renderDistinctValuePicker(filterGroup, groupIndex)
  }

  onAppendFilter = (props = this.props) => {
    let {allFilterable} = props
    let {pendingFilters} = this.state

    if (allFilterable.length === 0) {
      message.error('没有可筛选的维度，请先选择维度')
      return
    }
    let preAdd = allFilterable[0].name
    let dbDim = _.find(allFilterable, dim => dim.name === preAdd) || {name: preAdd, type: druidColumnTypeEnum.String}
    this.setState({
      pendingFilters: pendingFilters.concat([{
        col: preAdd,
        op: 'in',
        eq: isTimeDimension(dbDim) ? '-3 days' : [],
        type: DruidColumnTypeInverted[dbDim.type]
      }])
    })
  }

  render() {
    let {allFilterable, onClose, isShowing} = this.props

    let {pendingFilters} = this.state

    let filterableDict = allFilterable.filter(f => f.title).reduce((prev, curr) => {
      prev[curr.name] = curr.title
      return prev
    }, {})

    return (
      <Modal
        title="设置筛选器"
        visible={isShowing}
        onCancel={onClose}
        width={550}
        footer={
          <Button
            key="back"
            type="primary"
            size="large"
            onClick={this.onClose}
          >确认</Button>
        }
      >
        {
          pendingFilters.filter(p => p.op !== 'or' && p.eq.length).map((g, i) => {
            return (
              <div key={i} className="mg2b">
                <div className="iblock mg1r width100">
                  <Select
                    showSearch
                    optionFilterProp="children"
                    notFoundContent="没有内容"
                    dropdownMatchSelectWidth={false}
                    value={_.get(filterableDict, g.col, g.col)}
                    onChange={newVal => {
                      let dbDim = _.find(allFilterable, dim => dim.name === newVal)
                      this.setState({
                        pendingFilters: immutateUpdate(pendingFilters, [i], prev => {
                          return {
                            ...prev,
                            col: newVal,
                            eq: isTimeDimension(dbDim) ? '-3 days' : [],
                            type: DruidColumnTypeInverted[dbDim.type]
                          }
                        })
                      })
                    }}
                    className="width-100"
                  >
                    {
                      allFilterable.map(fa => {
                        return (
                          <Select.Option
                            key={fa.name}
                            value={fa.name}
                          >{fa.title || fa.name}</Select.Option>
                        )
                      }
                    )}
                  </Select>
                </div>
                <div className="iblock mg1r width80">
                  <Select
                    dropdownMatchSelectWidth={false}
                    value={_.startsWith(g.op, 'not ') ? 'exclude' : 'include'}
                    onChange={opType => {
                      let nextOp = opType === 'include' ? g.op.substr(4) : `not ${g.op}`
                      this.setState({
                        pendingFilters: pendingFilters.map((f, j) => i === j ? {...f, op: nextOp} : f)
                      })
                    }}
                    className="width-100"
                  >
                    <Select.Option value="include">包含</Select.Option>
                    <Select.Option value="exclude">不包含</Select.Option>
                  </Select>
                </div>

                <div className="iblock mg2r width260">
                  {this.genValueDom(g, i)}
                </div>

                <div className="iblock">
                  <Tooltip title="删除这个过滤条件">
                    <CloseOutlined
                      className="pointer"
                      onClick={() => {
                        this.setState({
                          pendingFilters: pendingFilters.filter((f, j) => i !== j)
                        })
                      }} />
                  </Tooltip>
                </div>
              </div>
            );
          })
        }
        <div>
          <Button
            icon={<PlusOutlined />}
            type="ghost"
            onClick={() => this.onAppendFilter()}
          >添加筛选</Button>
        </div>
      </Modal>
    );
  }
}

