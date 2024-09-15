import React from 'react'
import { CloseCircleOutlined } from '@ant-design/icons'
import { InputNumber, Select, Tooltip } from 'antd';
const Option = Select.Option
import DistinctCascadeFetcher from '../Fetcher/distinct-cascade-fetcher'
import DistinctSelect from '../Usergroup/distinct-input'
import TimePicker from '../Common/time-picker'
import Loading from '../Common/loading'
import _ from 'lodash'
import { convertDateType, isRelative } from 'common/param-transform'
import {
  relationTextMap, actionPool,
  valueActionPool, arrayActionPool, isNumberDim,
  isDateDim,
  onloadingValue,
  timeStampFormat,
  defaultDate
} from '../Usergroup/constants'
import moment from 'moment'

const defaultValueGen = (actiontype) => {
  if (actiontype === 'str') return []
  else if (actiontype === 'num') return 0
  else return defaultDate
}

export default class FilterSubItemDim extends React.Component {

  prefix = () => {
    let { index, i, basePath } = this.props
    return `${basePath}.filters[${index}].filters[${i}]`
  }

  update(value, path) {
    let { modifier } = this.props
    let content = _.cloneDeep(this.props.content)
    _.set(content, path, value)
    modifier({ content })
  }

  removeFilter = () => {
    let { i, index, basePath } = this.props
    let path = `content.${basePath}.filters[${index}].filters`
    let filters = _.get(this.props, path)
    if (filters.length === 1) {
      let levelOneFilters = _.get(this.props, `content.${basePath}.filters`)
      levelOneFilters.splice(index, 1)
      this.update(levelOneFilters, `${basePath}.filters`)
    } else {
      filters.splice(i, 1)
      this.update(filters, path)
    }
  }

  renderRemoveFilter = () => {
    const { disabled } = this.props
    return disabled
      ? <p className="mg1t" />
      : <Tooltip className="iblock" title="移除这个筛选">
        <CloseCircleOutlined 
          className="pointer iblock"
          onClick={this.removeFilter}
        />
      </Tooltip>;
  }

  changeAction = value => {
    let { modifier } = this.props
    let content = _.cloneDeep(this.props.content)
    let prefix = this.prefix()
    let path = `${prefix}.action`
    let path1 = `${prefix}.value`
    let v = _.get(content, path1)
    let oldValue = _.get(content, path)
    let actionType = _.get(content, `${prefix}.actionType`)
    _.set(content, path, value)
    if (
      valueActionPool[actionType].includes(oldValue) &&
      arrayActionPool[actionType].includes(value)
    ) {
      _.set(
        content,
        path1,
        actionType === 'str' ? [v] : [v || 0, (v || 0) + 1]
      )
    } else if (
      valueActionPool[actionType].includes(value) &&
      arrayActionPool[actionType].includes(oldValue)
    ) {
      _.set(content, path1, v[0])
    }
    modifier({ content })
  }

  renderActionSelect = () => {
    const {
      disabled,
      subFilter: { action, actionType = 'str' },
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
    let { modifier } = this.props
    let content = _.cloneDeep(this.props.content)
    _.set(content, `${prefix}.value[0]`, value)
    let v2 = _.get(content, path1)
    if (value > v2) {
      _.set(content, path1, value + 1)
    }
    modifier({ content })
  }

  onChangeInput = value => {
    this.update(value, `${this.prefix()}.value`)
  }

  renderBetweenDom = () => {
    let { subFilter: { value }, disabled } = this.props
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
    let { subFilter: { value }, disabled } = this.props
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
    let { subFilter: { value }, usergroups } = this.props
    let ug = _.find(
      usergroups,
      {
        id: value
      }
    ) || { title: value }
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

  onChangeDateValue = ({ dateRange, dateType }) => {
    let { modifier } = this.props
    let content = _.cloneDeep(this.props.content)
    let prefix = this.prefix()
    _.set(
      content,
      `${prefix}.value`,
      dateType === 'custom'
        ? dateRange
        : dateType
    )
    modifier({
      content
    })
  }

  resetDateValue = () => {
    setTimeout(() => {
      let value = defaultDate
      let prefix = this.prefix()
      let { modifier } = this.props
      let content = _.cloneDeep(this.props.content)
      _.set(content, `${prefix}.value`, value)
      _.set(content, `${prefix}.relativeTime`, defaultDate)
      modifier({
        content
      })
    }, 10)
  }

  renderDateSelect = () => {
    let {
      subFilter: { value }
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
      style: { marginTop: -3 },
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
      subFilter: { dimension, actionType, action },
      content,
      dimensions,
      datasourceCurrent: {
        id: druid_datasource_id
      },
      basePath
    } = this.props
    const { relativeTime = 'custom', since, until } = _.get(content, `${basePath}`, {})
    let { subFilter } = this.props
    let useRelativeTime = relativeTime || 'custom'
    let arr = useRelativeTime === 'custom'
      ? [moment().add(-1, 'y').startOf('d').format('YYYY-MM-DD HH:mm:ss'), moment().endOf('d').format('YYYY-MM-DD HH:mm:ss')]
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
          {({ isFetching, data, onSearch, isWaitingForInput }) => {
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
    let { dimensions, modifier } = this.props
    let content = _.cloneDeep(this.props.content)
    let prefix = this.prefix()
    _.set(content, `${prefix}.dimension`, name)
    let dim = _.find(dimensions, { name }) || { type: 2 }
    let path1 = `${prefix}.actionType`
    let oldActionType = _.get(content, path1)
    let actionType = 'str'
    if (isNumberDim(dim)) {
      actionType = 'num'
    } else if (isDateDim(dim)) {
      actionType = 'date'
    }

    //actionType = 'num'
    _.set(content, path1, actionType)
    if (actionType !== oldActionType) {
      _.set(
        content,
        `${prefix}.action`,
        actionPool[actionType][0]
      )
    }
    _.set(
      content,
      `${prefix}.value`,
      defaultValueGen(actionType)
    )
    modifier({ content })
  }

  renderDimensionSelect = () => {

    let {
      loadingDimension,
      subFilter: { dimension, action },
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
    let { index, content, i, basePath } = this.props
    let relation = _.get(content, `${basePath}.filters[${index}].relation`)
    return i
      ? <div className="relation-status">
        {relationTextMap[relation]}
      </div>
      : null
  }

  render() {
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
