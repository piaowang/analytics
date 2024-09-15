import React from 'react'
import { CloseCircleOutlined } from '@ant-design/icons';
import { Select, Tooltip, Popconfirm, InputNumber } from 'antd';
import DistinctCascadeFetcher from '../Fetcher/distinct-cascade-fetcher'
import DistinctSelect from './distinct-input'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import TimePicker from '../Common/time-picker'
import _ from 'lodash'
import moment from 'moment'
import {convertDateType} from '../../../common/param-transform'

const defaultQueryTime = () => convertDateType('-7 days')
const dateDimensionType = 4
const timeStampFormat = 'YYYY-MM-DD HH:mm:ss'
const Option = Select.Option
const valueTypeMap = {
  0: 'num',
  1: 'num',
  2: 'str',
  3: 'str',
  4: 'date',
  5: 'num'
}
const defaultDate = '-1 months'
const ToStampTime = str => {
  return moment(str).format(timeStampFormat)
}
const toMsTime = str => {
  return moment(str).valueOf()
}

export default class FilterItemMeasure extends React.Component {

  state = {
    defaultQueryTime: defaultQueryTime()
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.dataSourceId !== this.props.dataSourceId) {
      this.setState({
        defaultQueryTime: defaultQueryTime()
      })
    }
  }

  prefix = () => {
    let {index, parentIndex} = this.props
    return `params.simple.filters[${parentIndex}].filters[${index}]`
  }

  renderRelationTag = (relationTextMap, index, relation) => {
    return index
      ? <div className="relation-status">
        {relationTextMap[relation]}
      </div>
      : null
  }

  onChangeDimension = (value) => {
    let {dimensions, modifier} = this.props
    let dim = _.find(dimensions, {name: value}) || {}
    let prefix = this.prefix()
    let measure = _.cloneDeep(this.props.measure)
    _.set(measure, `${prefix}.dimensionName`, value)
    let dimType = dim.type
    let type = valueTypeMap[dimType]
    if (type === 'date') {
      _.set(
        measure,
        `${prefix}.type`,
        'between'
      )
      _.set(
        measure,
        `${prefix}.relativeTime`,
        defaultDate
      )
      _.set(
        measure,
        `${prefix}.value`,
        convertDateType(defaultDate)
      )
    } else if (type === 'num') {
      _.set(
        measure,
        `${prefix}.type`,
        'greaterThan'
      )
      _.set(
        measure,
        `${prefix}.relativeTime`,
        undefined
      )
      _.set(
        measure,
        `${prefix}.value`,
        0
      )
    } else {
      _.set(
        measure,
        `${prefix}.type`,
        'in'
      )
      _.set(
        measure,
        `${prefix}.relativeTime`,
        undefined
      )
      _.set(
        measure,
        `${prefix}.value`,
        []
      )
    }
    modifier({
      measure
    })
  }

  renderDimensionSelect = (filter, dimensions) => {
    return (
      <Select
        {...enableSelectSearch}
        dropdownMatchSelectWidth={false}
        className="itblock width140 mg1r"
        value={filter.dimensionName}
        onChange={this.onChangeDimension}
      >
        <Option key="all" value="all">全部维度</Option>
        {
          //每个维度集合都有时间维度，用户调整时间不在公式里控制，需要过滤
          dimensions.map((dimension, i) => {
            return (
              <Option key={i + ''} value={dimension.name + ''}>
                {dimension.title || dimension.name}
              </Option>
            )
          })
        }
      </Select>
    )
  }

  onDel = () => {
    const {
      index, updateMeasure, parentIndex
    } = this.props
    updateMeasure('delete_filter', {
      parentIndex,
      index
    })
  }

  renderDel = () => {
    return (
      <Popconfirm
        title={'确定删除指标条件么？'}
        placement="topLeft"
        onConfirm={this.onDel}
      >
        <Tooltip title="删除">
          <CloseCircleOutlined className="mg1l font16 color-grey pointer iblock" />
        </Tooltip>
      </Popconfirm>
    );
  }

  renderFilterType = () => {
    const { index, filter, filterTypeTextMap, strFilterTypeTextMap, updateMeasure,
      dimensionTree, parentIndex
    } = this.props
    //维度类型如果为数值，显示数字输入框，如果为字符类型，则显示选择框
    let dim = dimensionTree[filter.dimensionName]
    let dimType = dim.type
    if (dimType === dateDimensionType) return null
    let valueType = valueTypeMap[dimType]
    let typeTextMap = valueType === 'str'
      ? strFilterTypeTextMap
      : filterTypeTextMap

    return (
      <Select
        dropdownMatchSelectWidth={false}
        className="width100 mg1r itblock"
        onChange={(value) => {
          updateMeasure('update_filter_type', {
            index,
            parentIndex,
            value
          })
        }}
        showSearch
        value={filter.type}
      >
        {
          (Object.keys(typeTextMap)).map((filterType) => {
            return (
              <Option key={filterType} value={filterType}>
                {typeTextMap[filterType]}
              </Option>
            )
          })
        }
      </Select>
    )
  }

  renderDistinctValue = () => {
    const { index, filter, dimensions, onPickFilterProp, parentIndex } = this.props
    //将 since until 置空，使用默认时间查询
    let [since, until] = ['', '']
    let baseProps = {
      disabled: false,
      filter,
      index,
      onPickFilterProp
    }
    return (
      <DistinctCascadeFetcher
        since={since}
        until={until}
        dbDim={_.find(dimensions, dbDim => dbDim.name === filter.dimensionName)}
        dataSourceId={dimensions[0].parentId}
      >
        {({isFetching, data, onSearch, isWaitingForInput}) => {
          let notFoundContent = isFetching
            ? '加载中'
            : (filter.dimensionName
              ? (isWaitingForInput ? '等待输入' : '查无数据')
              : '未选择维度')
          return (
            <DistinctSelect
              {...baseProps}
              data={data}
              notFoundContent={notFoundContent}
              onSearch={onSearch}
              isFetching={isFetching}
              parentIndex={parentIndex}
            />
          )
        }}
      </DistinctCascadeFetcher>
    )
  }

  renderBetweenValue = () => {
    const { index, filter,
      onPickFilterProp, parentIndex
    } = this.props

    return (
      <div className="itblock mg2l">
        最小:
        <InputNumber
          value={filter.value[0]}
          disabled={false}
          className="iblock width80 mg1l"
          onChange={(v) => {
            onPickFilterProp(index, parentIndex, v, 0)
          }}
        />
        最大:
        <InputNumber
          value={filter.value[1]}
          disabled={false}
          className="iblock width80 mg1l"
          onChange={(v) => {
            onPickFilterProp(index, parentIndex, v, 1)
          }}
        />
      </div>
    )
  }

  renderNumValue = () => {
    const { index, filter,
      onPickFilterProp, parentIndex
    } = this.props
    return (
      <InputNumber
        value={filter.value}
        disabled={false}
        className="itblock width80"
        onChange={(v) => {
          onPickFilterProp(index, parentIndex, v)
        }}
      />
    )
  }

  onChangeDateValue = ({dateRange, dateType}) => {
    let {modifier} = this.props
    let measure = _.cloneDeep(this.props.measure)
    let prefix = this.prefix()
    _.set(
      measure,
      `${prefix}.value`,
      dateRange.map(toMsTime)
    )
    _.set(
      measure,
      `${prefix}.relativeTime`,
      dateType
    )
    modifier({
      measure
    })
  }

  resetDateValue = () => {
    setTimeout(() => {
      let value = convertDateType(defaultDate)
      let prefix = this.prefix()
      let {modifier} = this.props
      let measure = _.cloneDeep(this.props.measure)
      _.set(measure, `${prefix}.value`, value)
      _.set(measure, `${prefix}.relativeTime`, defaultDate)
      modifier({
        measure
      })
    }, 10)
  }

  renderDateValue = () => {
    const {
      filter: {
        value,
        relativeTime
      }
    } = this.props

    if (!relativeTime) {
      this.resetDateValue()
      return null
    }

    let props = {
      dateType: relativeTime,
      dateRange: value.map(ToStampTime),
      onChange: this.onChangeDateValue,
      className: 'itblock width260 mg1r',
      format: timeStampFormat
    }
    return (
      <TimePicker
        {...props}
      />
    )
  }

  renderValueInput = () => {
    const {filter, dimensionTree} = this.props
    //维度类型如果为数值，显示数字输入框，如果为字符类型，则显示选择框
    let dim = dimensionTree[filter.dimensionName]
    let {type} = dim
    let valueType = valueTypeMap[type]

    if (['isEmpty', 'notEmpty'].includes(filter.type)) {
      return null
    } else if (valueType === 'date') {
      return this.renderDateValue()
    } else if (valueType === 'str') {
      return this.renderDistinctValue()
    } else if (filter.type === 'between') {
      return this.renderBetweenValue()
    } else {
      return this.renderNumValue()
    }
  }

  renderFilters = () => {
    const {filter} = this.props
    if (filter.dimensionName === 'all') {
      return null
    }
    return (
      <div className="itblock">
        {this.renderFilterType()}
        {this.renderValueInput()}
      </div>
    )
  }

  render() {
    const {index, filter, dimensions, relationTextMap, relation} = this.props
    return (
      <div>
        <div className="filter-wrap" key={index}>
          {this.renderRelationTag(relationTextMap, index, relation)}
          <div className="filter">
            {this.renderDimensionSelect(filter, dimensions)}
            {this.renderFilters()}
            {this.renderDel()}
          </div>
        </div>
      </div>
    )
  }
}
