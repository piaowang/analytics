import React from 'react'
import { MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Button, Col, Input, Row, Select } from 'antd';
import PickDimensionInFormulaEditorModal from './pick-dimension-in-formula-editor-modal'
import _ from 'lodash'
import {immutateUpdate} from '../../../common/sugo-utils'
import {connect} from 'react-redux'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import DruidColumnType, {isNumberDimension, isTimeDimension} from '../../../common/druid-column-type'
import {convertDateType, isRelative} from '../../../common/param-transform'
import DateRangePicker from '../Common/time-picker'
import moment from 'moment'
import LazyInput from '../Common/lazy-input'
import {EMPTY_VALUE_OR_NULL} from '../../../common/constants'

export const TextDimFilterOpNameMap = {
  in: '包含',
  'not in': '排除',
  contains: '含有',
  'not contains': '不含有'
}

export const TimeDimFilterOpNameMap = {
  in: '包含',
  'not in': '排除'
}

export const NumberDimFilterOpNameMap = {
  in: '包含',
  'not in': '排除'
  /*
    暂未支持：
    equal: '精确匹配',
    'not equal': '不等于',
    nullOrEmpty: '为空',
    'not nullOrEmpty': '非空',
    greaterThan: '大于',
    lessThan: '小于',
    greaterThanOrEqual: '大于等于',
    lessThanOrEqual: '小于等于'*/
}

let mapStateToProps = (state, ownProps) => {
  const tableSyncState = state['offline-calc-tables-for-dim-picker'] || {}
  const dsList = state['offline-calc-data-sources-for-dim-picker'] || {}
  return {
    offlineCalcTables: tableSyncState.offlineCalcTables,
    offlineCalcDataSources: dsList.offlineCalcDataSources
  }
}

const {Option} = Select

@connect(mapStateToProps)
export default class FiltersEditorForOfflineCalc extends React.Component {
  
  onAppendFilter = () => {
    let {value: filters, onChange} = this.props
    let nextFilters = [...(filters || []), {
      dim: null,
      op: 'in',
      eq: []
    }]
    onChange(nextFilters)
  }
  
  renderDimensionInFilterEditModal = () => {
    let {visiblePopoverKey, onVisiblePopoverKeyChange, value: filters, onChange, title} = this.props
    
    if (_.isNil(visiblePopoverKey)) {
      visiblePopoverKey = ''
    }
    let m = visiblePopoverKey.match(/filtersEditorAddDimensionToIndexFilter:(\d+)$/)
    let dim = m ? _.get(filters, [m[1], 'dim']) : null
    return (
      <PickDimensionInFormulaEditorModal
        reuseSagaModel
        title={title}
        value={dim}
        visible={_.includes(visiblePopoverKey, 'filtersEditorAddDimensionToIndexFilter')}
        onCancel={() => {
          onVisiblePopoverKeyChange(visiblePopoverKey.replace(/\|.+?$/, ''))
        }}
        onOk={nextVal => {
          if (m) {
            const nextFlts = immutateUpdate(filters, m[1], flt => {
              return {
                ...flt,
                dim: nextVal,
                eq: isTimeDimension(this.mockDim(_.get(nextVal, 'args[0]'))) ? '-1 days' : []
              }
            })
            onChange(nextFlts)
          }
          onVisiblePopoverKeyChange(visiblePopoverKey.replace(/\|.+?$/, ''))
        }}
      />
    );
  }
  
  mockDim = (dimArgs) => {
    let {fieldName, dataType} = dimArgs || {}
    return {name: fieldName, type: _.isNumber(dataType) ? dataType : DruidColumnType.String}
  }
  
  
  renderDimensionName = ({dsId, fieldName}) => {
    let {offlineCalcDataSources} = this.props
    let ds = _.find(offlineCalcDataSources, ds => ds.id === dsId)
    let dsName = ds ? `(${ds.name}) ` : ''
    return fieldName ? `${dsName}${fieldName}` : '(设置维度)'
  }
  
  renderFilterEqSetter(filter, idx) {
    let { value: filters, onChange, visiblePopoverKey, onVisiblePopoverKeyChange, disabled=false } = this.props
    if (_.isNil(visiblePopoverKey)) {
      visiblePopoverKey = ''
    }
    let {dim, op, eq} = filter
  
    let ocDim = this.mockDim(_.get(dim, 'args[0]'))
    if (!ocDim) {
      return <div className="itblock width200 color-999 aligncenter">请选择维度</div>
    }
    let dimName = ocDim.name
    
    if (isTimeDimension(ocDim)) {
      let relativeTime = isRelative(filter.eq) ? filter.eq : 'custom'
      let [since, until] = relativeTime === 'custom' ? filter.eq : convertDateType(relativeTime)
      const selfVisiblePopoverKey = `|filtersEditorDateRangePicker-${idx}`
      return (
        <DateRangePicker
          className="width200 height32 itblock line-height18"
          alwaysShowRange
          hideCustomSelection
          style={{width: '100%'}}
          dateType={relativeTime}
          dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
          onChange={({ dateType: relativeTime, dateRange: [since, until] }) => {
            let newDateFlt = {
              col: dimName,
              eq: relativeTime === 'custom' ? [since, until] : relativeTime,
              dateStringComparingFormat: _.get(this.state.dateStringComparingFormatDict, dimName) || null
            }
            onChange(immutateUpdate(filters, [idx], prevFilter => {
              return {...prevFilter, ...newDateFlt}
            }))
          }}
          popoverProps={{
            visible: _.endsWith(visiblePopoverKey, selfVisiblePopoverKey),
            onVisibleChange: (visible, by) => {
              console.log(`visible: ${visible} by clicking: `, by && by.target || by)
              // 关闭的话，只能点击确认或取消按钮才能关闭
              if (!visible && (by !== 'onOk' && by !== 'onCancel')) {
                return
              }
              const s = visiblePopoverKey.replace(/\|filtersEditor.+$/, '')
              onVisiblePopoverKeyChange(visible ? `${s}${selfVisiblePopoverKey}` : s)
            }
          }}
        />
      );
    } else if (isNumberDimension(ocDim)) {
      let [from, to] = _.isArray(filter.eq) && filter.eq || []
      return (
        <Row className="width200 itblock" style={{marginTop: '1px'}}>
          <Col span={11}>
            <LazyInput
              value={from}
              size="large"
              type="number"
              className="itblock"
              placeholder="不限"
              onChange={ev => {
                let val = ev.target.value
                const nextFlts = immutateUpdate(filters, [idx], prevFilter => {
                  return {...prevFilter, eq: [val ? val * 1 : null, to]}
                })
                onChange(nextFlts)
              }}
            />
          </Col>
          <Col span={2} className="aligncenter line-height32">至</Col>
          <Col span={11}>
            <LazyInput
              value={to}
              size="large"
              type="number"
              className="itblock"
              placeholder="不限"
              onChange={ev => {
                let val = ev.target.value
                const flts = immutateUpdate(filters, [idx], prevFilter => {
                  return {...prevFilter, eq: [from, val ? val * 1 : null]}
                })
                onChange(flts)
              }}
            />
          </Col>
        </Row>
      )
    }
    
    if (_.endsWith(filter.op, 'contains')) {
      let val = _.isArray(filter.eq) ? filter.eq[0] : filter.eq
      return (
        <Input
          placeholder="未输入关键字"
          disabled={disabled}
          className="itblock width200"
          value={val}
          onChange={ev => {
            let nextVal = ev.target.value
            onChange(immutateUpdate(filters, [idx], prevFilter => {
              let nextEq = [nextVal]
              return {
                ...prevFilter,
                eq: nextEq,
                containsNull: false
              }
            }))
          }}
        />
      )
    }
    
    return (
      <Select
        mode="tags"
        className="itblock width200 height32"
        placeholder="输入文本，回车分隔"
        disabled={disabled}
        value={_.isString(filter.eq) ? filter.eq.split(/,/) : filter.eq.filter(_.identity)}
        onChange={newVals => {
          onChange(immutateUpdate(filters, [idx], prevFilter => {
            let nextEq = _.sortBy(newVals, v => v === EMPTY_VALUE_OR_NULL ? -1 : 1)
            return {
              ...prevFilter,
              eq: nextEq,
              containsNull: nextEq[0] === EMPTY_VALUE_OR_NULL
            }
          }))
        }}
      />
    );
  }
  
  onRemoveFilterClick = ev => {
    let filterIdx = +ev.target.getAttribute('data-filter-idx')
    
    let {value: filters, onChange} = this.props
    onChange(filters.filter((f, i) => i !== filterIdx))
  }
  
  render() {
    let {value: filters, onChange, visiblePopoverKey, onVisiblePopoverKeyChange, disabled = false} = this.props
    if (_.isNil(visiblePopoverKey)) {
      visiblePopoverKey = ''
    }
    return (
      <React.Fragment>
        {(filters || []).map((flt, idx) => {
          // {func: 'useDim', args: [{dimId: 'xxx'}]} 创建指标
          let {dim, op, eq} = flt
          
          let ocDim = this.mockDim(_.get(dim, 'args[0]'))
          let filterOpNameMap = isNumberDimension(ocDim)
            ? NumberDimFilterOpNameMap
            : isTimeDimension(ocDim)
              ? TimeDimFilterOpNameMap
              : TextDimFilterOpNameMap
          return (
            <div key={idx} className="mg1b">
              <Button
                className="width120 itblock mg1r elli"
                disabled={disabled}
                onClick={() => {
                  const s = visiblePopoverKey.replace(/\|filtersEditor.+$/, '')
                  onVisiblePopoverKeyChange(`${s}|filtersEditorAddDimensionToIndexFilter:${idx}`)
                }}
              >{this.renderDimensionName(_.get(dim, 'args[0]', {}))}</Button>
  
              <Select
                size="large"
                disabled={disabled}
                className="width80 mg1r itblock"
                {...enableSelectSearch}
                value={op}
                onChange={nextOp => {
                  onChange(immutateUpdate(filters, [idx], prevFilter => {
                    // 如果是时间列的话，切换 op 时需要保持值
                    return {
                      ...prevFilter,
                      op: nextOp,
                      eq: isTimeDimension(ocDim) ? prevFilter.eq : []
                    }
                  }))
                }}
              >
                {_.keys(filterOpNameMap).map(op => {
                  return (
                    <Option value={op} key={op}>{filterOpNameMap[op]}</Option>
                  )
                })}
              </Select>
  
              {this.renderFilterEqSetter(flt, idx)}
  
              <div className="itblock width30 aligncenter">
                {
                  !disabled ?
                  <MinusCircleOutlined
                    title="移除这个过滤条件"
                    className="color-grey font16 pointer line-height32 hover-color-red"
                    data-filter-idx={idx}
                    onClick={this.onRemoveFilterClick} /> : null
                }
              </div>
            </div>
          );
        })}
        <div className="pd1t">
          {
            !disabled ?
            <span
              className="pointer color-black font12"
              onClick={this.onAppendFilter}
              title="增加一个过滤条件"
            >
              <PlusCircleOutlined className="mg1r color-green font14" />
              增加一个过滤条件
              </span> : null
          }
        </div>
        {this.renderDimensionInFilterEditModal()}
      </React.Fragment>
    );
  }
}
