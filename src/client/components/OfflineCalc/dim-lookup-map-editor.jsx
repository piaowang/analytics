import React from 'react'
import { CloseCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Col, Input, Row, Select, Tooltip, message } from 'antd';
import _ from 'lodash'
import moment from 'moment'
import {immutateUpdate} from '../../../common/sugo-utils'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import {isNumberDimension, isTimeDimension} from '../../../common/druid-column-type'
import {convertDateType, isRelative} from '../../../common/param-transform'
import DateRangePicker from '../Common/time-picker'
import LazyInput from '../Common/lazy-input'
import {EMPTY_VALUE_OR_NULL} from '../../../common/constants'

const {Option} = Select

export const TextDimFilterOpNameMap = {
  in: '包含',
  contains: '含有'
}

export const TimeDimFilterOpNameMap = {
  in: '包含'
}

export const NumberDimFilterOpNameMap = {
  in: '包含'
}

// TODO 区间重叠检测
export default class OfflineCalcDimLookupMapEditor extends React.Component {
  state = {
    visiblePopoverKey: ''
  }
  
  addLookup = () => {
    let {value, onChange, mockDim} = this.props
    let {othersGroupName, ...rest} = value || {}
    let maxSort = _.max(_.keys(rest).map(k => rest[k].sort || 0))
    let nextName, idx = _.size(rest) + 1
    do {
      nextName = `分组${idx++}`
    } while (rest[nextName])
    onChange(immutateUpdate(value, nextName, () => ({
      op: 'in',
      eq: isTimeDimension(mockDim) ? '-1 days' : [],
      sort: maxSort
    })))
  }
  
  removeLookUp = (groupName) => {
    let {value, onChange} = this.props
    onChange(_.omit(value, groupName))
  }
  
  renderFilterEqSetter(filter, groupName) {
    let { value, onChange, mockDim } = this.props
    let {visiblePopoverKey} = this.state
    let {op, eq} = filter

    if (!mockDim) {
      return <div className="itblock width200 color-999 aligncenter">请选择维度</div>
    }
    let dimName = mockDim.name
    
    if (isTimeDimension(mockDim)) {
      let relativeTime = isRelative(filter.eq) ? filter.eq : 'custom'
      let [since, until] = relativeTime === 'custom' ? filter.eq : convertDateType(relativeTime)
      const selfVisiblePopoverKey = `lookupMapEditorDateRangePicker-${groupName}`
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
              eq: relativeTime === 'custom' ? [since, until] : relativeTime
            }
            onChange(immutateUpdate(value, groupName, prevFilter => {
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
              this.setState({
                visiblePopoverKey: visible ? selfVisiblePopoverKey : ''
              })
            }
          }}
        />
      )
    } else if (isNumberDimension(mockDim)) {
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
                const nextFlts = immutateUpdate(value, groupName, prevFilter => {
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
                const flts = immutateUpdate(value, groupName, prevFilter => {
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
          className="itblock width200"
          value={val}
          onChange={ev => {
            let nextVal = ev.target.value
            onChange(immutateUpdate(value, groupName, prevFilter => {
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
        value={_.isString(filter.eq) ? filter.eq.split(/,/) : filter.eq.filter(_.identity)}
        onChange={newVals => {
          onChange(immutateUpdate(value, groupName, prevFilter => {
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
  
  render() {
    // {'Group1': {op: 'in', eq: [], sort: 0}, othersGroupName: 'others'}
    let {value, onChange, mockDim} = this.props
    let {othersGroupName, ...rest} = value || {}
    let sortedGroupNames = _(rest).keys().orderBy(k => rest[k].sort || 0).value()
  
    let filterOpNameMap = isNumberDimension(mockDim)
      ? NumberDimFilterOpNameMap
      : isTimeDimension(mockDim)
        ? TimeDimFilterOpNameMap
        : TextDimFilterOpNameMap
  
    return (
      <div className="border pd1">
        {sortedGroupNames.map((groupName, i, arr) => {
          let {op, eq} = rest[groupName]
          return (
            <div key={i} className="mg1b">
              <Input
                placeholder="组名"
                value={groupName}
                className="iblock width80 mg1r"
                onChange={ev => {
                  let {value: nextGroupName} = ev.target
                  if (nextGroupName in value) {
                    message.warn(`已存在相同名称的组名: ${nextGroupName}`)
                    return
                  }
                  const nextVal = _.mapKeys(value, (v, k) => k === groupName ? nextGroupName : k)
                  onChange(nextVal)
                }}
              />
              
              <Select
                size="large"
                className="mg1r iblock"
                style={{width: '70px'}}
                {...enableSelectSearch}
                value={op}
                onChange={nextOp => {
                  onChange(immutateUpdate(value, groupName, prevFilter => {
                    // 如果是时间列的话，切换 op 时需要保持值
                    return {
                      ...prevFilter,
                      op: nextOp,
                      eq: isTimeDimension(mockDim) ? prevFilter.eq : []
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
  
              {this.renderFilterEqSetter(rest[groupName], groupName)}
              
              <Tooltip title="删除">
                <CloseCircleOutlined
                  className="mg1l font16 color-grey pointer iblock"
                  style={{ visibility: arr.length === 1 ? 'hidden' : 'visible' }}
                  onClick={() => this.removeLookUp(sortedGroupNames[i])} />
              </Tooltip>
            </div>
          );
        })}
        <div className="add-button-wrap pd1y">
          <a
            className="pointer"
            title="增加一个条件"
            onClick={this.addLookup}
          >
            <PlusCircleOutlined className="mg1r" />
            增加一个条件
          </a>
        </div>
        <div className="mg1b">
          <Input
            defaultValue="未分组"
            className="width-20"
            value={othersGroupName}
            onChange={(e) => {
              let {value: nextOthersGroupName} = e.target
              onChange(immutateUpdate(value, 'othersGroupName', () => nextOthersGroupName))
            }}
          /> (未覆盖的范围)
        </div>
      </div>
    );
  }
}
