import React from 'react'
import { InputNumber, Select, Tooltip } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons'
const Option = Select.Option
import DistinctCascadeFetcher from '../Fetcher/distinct-cascade-fetcher'
import DistinctSelect from './distinct-input'
import TimePicker from '../Common/time-picker'
import Loading from '../Common/loading'
import _ from 'lodash'
import {update} from './common-functions'
import {convertDateType, isRelative} from 'common/param-transform'
import {
  relationTextMap, actionPool,
  valueActionPool, arrayActionPool, isNumberDim,
  isDateDim,
  onloadingValue,
  timeStampFormat,
  defaultDate
} from './constants'

const defaultValueGen = (actiontype) => {
  if (actiontype === 'str') return []
  else if (actiontype === 'num') return 0
  else return defaultDate
}

@update
export default class FilterSubItemDim extends React.Component {

  prefix = () => {
    let {index, i} = this.props
    return `params.dimension.filters[${index}].filters[${i}]`
  }

  removeFilter = () => {
    let {i, index} = this.props
    let path = `usergroup.params.dimension.filters[${index}].filters`
    let filters = _.get(this.props, path)
    if (filters.length === 1) {
      let levelOneFilters = _.get(this.props, 'usergroup.params.dimension.filters')
      levelOneFilters.splice(index, 1)
      this.update(levelOneFilters, 'params.dimension.filters')
    } else {
      filters.splice(i, 1)
      this.update(filters, path)
    }
  }

  renderRemoveFilter = () => {
    const {disabled} = this.props
    return disabled
      ? <p className="mg1t" />
      : <Tooltip className="iblock" title="移除这个筛选">
        <CloseCircleOutlined
          className="pointer iblock"
          onClick={this.removeFilter}
        />
      </Tooltip>
  }

  changeAction = value => {
    let {modifier} = this.props
    let usergroup = _.cloneDeep(this.props.usergroup)
    let prefix = this.prefix()
    let path = `${prefix}.action`
    let path1 = `${prefix}.value`
    let v = _.get(usergroup, path1)
    let oldValue = _.get(usergroup, path)
    let actionType = _.get(usergroup, `${prefix}.actionType`)
    _.set(usergroup, path, value)
    if (
      valueActionPool[actionType].includes(oldValue) &&
      arrayActionPool[actionType].includes(value)
    ) {
      _.set(
        usergroup,
        path1,
        actionType === 'str' ? [v] : [v || 0, (v || 0) + 1]
      )
    } else if (
      valueActionPool[actionType].includes(value) &&
      arrayActionPool[actionType].includes(oldValue)
    ) {
      _.set(usergroup, path1, v[0])
    }
    modifier({usergroup})
  }

  renderActionSelect = () => {
    const {
      disabled,
      subFilter: {action, actionType = 'str'},
      getPopupContainer
    } = this.props
    if (actionType === 'date' || action.includes('lookup')) {
      return null
    }
    return (
      <div className="inline">
        <Select
          dropdownMatchSelectWidth={false}
          className="iblock width80 mg1r"
          value={action}
          disabled={disabled}
          onChange={this.changeAction}
          getPopupContainer={getPopupContainer}
        >
          {
            actionPool[actionType].map(m => {
              return (<Option key={m + '@at'} value={m}>{m}</Option>)
            })
          }
        </Select>
      </div>
    )
  }

  onChangeFilterValue = _value => {
    let value = _value
    if (value === onloadingValue) return
    if (_.isArray(value) && value.includes(onloadingValue)) {
      value = _.without(value, onloadingValue)
    }
    this.update(value, `${this.prefix()}.value`)
  }

  onChangeFilterValue1 = value => {
    this.update(value, `${this.prefix()}.value[1]`)
  }

  onChangeFilterValue0 = value => {
    let prefix = this.prefix()
    let path1 = `${prefix}.value[1]`
    let {modifier} = this.props
    let usergroup = _.cloneDeep(this.props.usergroup)
    _.set(usergroup, `${prefix}.value[0]`, value)
    let v2 = _.get(usergroup, path1)
    if (value > v2) {
      _.set(usergroup, path1, value + 1)
    }
    modifier({usergroup})
  }

  onChangeInput = value => {
    this.update(value, `${this.prefix()}.value`)
  }

  renderBetweenDom = () => {
    let {subFilter: {value}, disabled} = this.props
    return (
      <div className="inline">
        <InputNumber
          value={value[0]}
          className="iblock width80 mg1t"
          disabled={disabled}
          onChange={this.onChangeFilterValue0}
        />
        <span className="mg1r">-</span>
        <InputNumber
          value={value[1]}
          disabled={disabled}
          className="iblock width80 mg1t"
          onChange={this.onChangeFilterValue1}
        />
      </div>
    )
  }

  renderInput = () => {
    let {subFilter: {value}, disabled} = this.props
    return (
      <div className="inline">
        <InputNumber
          className="iblock width80 mg1t"
          value={value}
          disabled={disabled}
          onChange={this.onChangeInput}
        />
      </div>
    )
  }

  renderLookupValue = () => {
    let {subFilter: {value}, usergroups} = this.props
    let ug = _.find(
      usergroups,
      {
        id: value
      }
    ) || {title: value}
    return (
      <div className="inline">
        <Tooltip
          title={`查询范围限定于分群 “${ug.title}”内`}
        >
          <span
            className="iblock width120 elli"
            title={ug.title}
          >分群:{ug.title}</span>
        </Tooltip>
      </div>
    )
  }

  onChangeDateValue = ({dateRange, dateType}) => {
    let {modifier} = this.props
    let usergroup = _.cloneDeep(this.props.usergroup)
    let prefix = this.prefix()
    _.set(
      usergroup,
      `${prefix}.value`,
      dateType === 'custom'
        ? dateRange
        : dateType
    )
    modifier({
      usergroup
    })
  }

  resetDateValue = () => {
    setTimeout(() => {
      let value = defaultDate
      let prefix = this.prefix()
      let {modifier} = this.props
      let usergroup = _.cloneDeep(this.props.usergroup)
      _.set(usergroup, `${prefix}.value`, value)
      _.set(usergroup, `${prefix}.relativeTime`, defaultDate)
      modifier({
        usergroup
      })
    }, 10)
  }

  renderDateSelect = () => {
    let {
      subFilter: {value}
    } = this.props
    if (!value) {
      this.resetDateValue()
      return null
    }

    let dateType = isRelative(value)
      ? value
      : 'custom'
    let dateRange = isRelative(value)
      ? convertDateType(dateType)
      : value
    let props = {
      dateType,
      dateRange,
      onChange: this.onChangeDateValue,
      className: 'inline width260 mg1r',
      style: {marginTop: -3},
      format: timeStampFormat
    }
    return (
      <TimePicker
        {...props}
      />
    )
  }

  renderValueSelect = () => {

    let {
      subFilter: {dimension, actionType, action},
      usergroup: {params},
      dimensions,
      datasourceCurrent: {
        id: druid_datasource_id
      }
    } = this.props
    let {subFilter} = this.props
    let useRelativeTime = params.relativeTime || 'custom'
    let arr = useRelativeTime === 'custom'
      ? [params.since, params.until]
      : convertDateType(useRelativeTime)
    let finalSince = arr[0]
    let finalUntil = arr[1]
    let noContentHint = `${finalSince} ~ ${finalUntil} 查无数据`

    if (actionType === 'date') {
      return this.renderDateSelect()
    }
    else if (action.includes('lookup')) {
      return this.renderLookupValue()
    }
    else if (actionType === 'str') {
      return (
        <DistinctCascadeFetcher
          since={finalSince}
          until={finalUntil}
          relativeTime={useRelativeTime}
          dbDim={_.find(dimensions, dbD => dbD.name === dimension)}
          dataSourceId={druid_datasource_id}
        >
          {({isFetching, data, onSearch, isWaitingForInput}) => {
            let notFoundContent = isFetching
              ? '加载中'
              : (dimension
                ? isWaitingForInput ? '等待输入' : noContentHint
                : '未选择维度')
            let props = {
              action,
              data,
              notFoundContent,
              onSearch,
              filter: subFilter,
              onChange: this.onChangeFilterValue,
              isFetching
            }
            return (
              <DistinctSelect
                {...props}
              />
            )
          }}
        </DistinctCascadeFetcher>
      )
    }

    return action === 'between'
      ? this.renderBetweenDom()
      : this.renderInput()
  }

  onChangeDimension = name => {
    let {dimensions, modifier} = this.props
    let usergroup = _.cloneDeep(this.props.usergroup)
    let prefix = this.prefix()
    _.set(usergroup, `${prefix}.dimension`, name)
    let dim = _.find(dimensions, {name}) || { type: 2 }
    let path1 = `${prefix}.actionType`
    let oldActionType = _.get(usergroup, path1)
    let actionType = 'str'
    if (isNumberDim(dim)) {
      actionType = 'num'
    } else if (isDateDim(dim)) {
      actionType = 'date'
    }

    //actionType = 'num'
    _.set(usergroup, path1, actionType)
    if (actionType !== oldActionType) {
      _.set(
        usergroup,
        `${prefix}.action`,
        actionPool[actionType][0]
      )
    }
    _.set(
      usergroup,
      `${prefix}.value`,
      defaultValueGen(actionType)
    )
    modifier({usergroup})
  }

  renderDimensionSelect = () => {

    let {
      loadingDimension,
      subFilter: {dimension, action},
      disabled,
      dimensions,
      getPopupContainer
    } = this.props
    let props = {
      dropdownMatchSelectWidth: false,
      className: 'width140 mg1r iblock',
      onChange: this.onChangeDimension,
      showSearch: true,
      notFoundContent: loadingDimension ? '载入中...' : '无法找到',
      value: dimension,
      disabled: action.includes('lookup') || disabled,
      optionFilterProp: 'children',
      getPopupContainer
    }
    let arr = loadingDimension
      ? []
      : dimensions.filter(dim => !_.get(dim, 'params.type'))
    return (
      <Loading className="inline" isLoading={loadingDimension}>
        <Select {...props} >
          {
            loadingDimension
              ? <Option key="none" value={onloadingValue}>
              载入中...
              </Option>
              : <Option key="none" value="">
              请选择
              </Option>
          }
          {
            arr.map(m => {
              return (
                <Option key={m.id + ''} value={m.name}>
                  {m.title || m.name}
                </Option>
              )
            })
          }
        </Select>
      </Loading>
    )

  }

  renderRelationTag = () => {
    let {index, usergroup, i} = this.props
    let relation = _.get(usergroup, `params.dimension.filters[${index}].relation`)
    return i
      ? <div className="relation-status">
        {relationTextMap[relation]}
      </div>
      : null
  }

  render () {
    return (
      <div className="sub-filter-wrap">
        {this.renderRelationTag()}
        <div className="sub-filter">
          {this.renderDimensionSelect()}
          {this.renderActionSelect()}
          {this.renderValueSelect()}
          {this.renderRemoveFilter()}
        </div>
      </div>
    )

  }
}
