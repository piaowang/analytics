import React from 'react'
import { InputNumber, Select, Tooltip } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons'
import Loading from '../Common/loading'
import _ from 'lodash'
import {update} from './common-functions'
import {
  relationTextMap,
  actionPool,
  valueActionPool,
  arrayActionPool,
  onloadingValue,
  timeStampFormat,
  ToStampTime,
  ToISOTime,
  defaultDate
} from './constants'
import TimePicker from '../Common/time-picker'
import {convertDateType} from '../../../common/param-transform'

const dateMeasureType = 4
const Option = Select.Option

@update
export default class FilterSubItemMeasure3 extends React.Component {

  prefix = () => {
    let {index, i} = this.props
    return `params.measure3.filters[${index}].filters[${i}]`
  }

  removeFilter = () => {
    let {i, index} = this.props
    let path = `usergroup.params.measure3.filters[${index}].filters`
    let filters = _.get(this.props, path)
    if (filters.length === 1) {
      let levelOneFilters = _.get(this.props, 'usergroup.params.measure3.filters')
      levelOneFilters.splice(index, 1)
      this.update(levelOneFilters, 'params.measure3.filters')
    } else {
      filters.splice(i, 1)
      this.update(filters, path)
    }
  }

  renderRemoveFilter = () => {
    const {disabled} = this.props
    return disabled
      ? null
      : <Tooltip className="inline mg1l" title="移除这个筛选">
        <CloseCircleOutlined
          className="pointer inline"
          onClick={this.removeFilter}
        />
        </Tooltip>
  }

  changeAction = value => {
    let {modifier, filter} = this.props
    let usergroup = _.cloneDeep(this.props.usergroup)
    let prefix = this.prefix()
    let path = `${prefix}.action`
    let path1 = `${prefix}.value`
    let v = _.get(usergroup, path1)
    let oldValue = _.get(usergroup, path)
    let actionType = filter.actionType
    _.set(usergroup, path, value)
    if (
      valueActionPool[actionType].includes(oldValue) &&
      arrayActionPool[actionType].includes(value)
    ) {
      _.set(
        usergroup,
        path1,
        actionType === 'str' ? [v] : [v, v + 1]
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
      filter: {action, actionType, measure},
      measures,
      getPopupContainer
    } = this.props
    let mea = _.find(measures, {name: measure}) || {}
    if (mea.type === dateMeasureType) {
      return null
    }
    return (
      <div className="inline">
        <Select
          dropdownMatchSelectWidth={false}
          className="inline width80 mg1r"
          value={action}
          disabled={disabled}
          onChange={this.changeAction}
          getPopupContainer={getPopupContainer}
        >
          {
            actionPool[actionType].map(m => {
              return (<Option key={m + '@am2t'} value={m}>
                {m}
              </Option>)
            })
          }
        </Select>
      </div>
    )
  }

  onChangeFilterValue1 = value => {
    let prefix = this.prefix()
    this.update(value, `${prefix}.value[1]`)
  }

  onChangeFilterValue0 = value => {
    let prefix = this.prefix()
    this.update(value, `${prefix}.value[0]`)
  }

  onChangeInput = value => {
    let prefix = this.prefix()
    this.update(value, `${prefix}.value`)
  }

  renderBetweenDom = () => {
    let {filter: {value}, disabled} = this.props
    return (
      <div className="inline">
        <InputNumber
          value={value[0]}
          className="inline width80 mg1t"
          disabled={disabled}
          onChange={this.onChangeFilterValue0}
        />
        <span className="mg1r">-</span>
        <InputNumber
          value={value[1]}
          disabled={disabled}
          className="inline width80 mg1t"
          onChange={this.onChangeFilterValue1}
        />
      </div>
    )
  }

  renderInput = () => {
    let {filter: {value}, disabled} = this.props
    if (!_.isNumber(value)) {
      setTimeout(() => {
        let prefix = this.prefix()
        this.update(0, `${prefix}.value`)
      }, 20)
    }
    return (
      <div className="inline">
        <InputNumber
          className="inline width80 mg1t"
          value={value}
          disabled={disabled}
          onChange={this.onChangeInput}
        />
      </div>
    )  
  }

  resetDateValue = () => {
    setTimeout(() => {
      let value = convertDateType(defaultDate)
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

  onChangeDateValue = ({dateRange, dateType}) => {
    let {modifier} = this.props
    let usergroup = _.cloneDeep(this.props.usergroup)
    let prefix = this.prefix()
    _.set(
      usergroup,
      `${prefix}.value`,
      dateRange.map(ToISOTime)
    )
    _.set(
      usergroup,
      `${prefix}.relativeTime`,
      dateType
    )
    modifier({
      usergroup
    })
  }

  renderDateSelect = () => {
    let {
      filter: {value, relativeTime}
    } = this.props
    if (!relativeTime) {
      this.resetDateValue()
      return null
    }

    let props = {
      dateType: relativeTime,
      dateRange: value.map(ToStampTime),
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
      filter: {action, measure},
      measures
    } = this.props

    let mea = _.find(measures, {name: measure}) || {}
    if (mea.type === dateMeasureType) {
      return this.renderDateSelect()
    }
    return action === 'between'
      ? this.renderBetweenDom()
      : this.renderInput()
  }

  onChangeMeasure = (value) => {
    let {measures} = this.props
    let mea = _.find(measures, {name: value}) || {}
    let {modifier} = this.props
    let prefix = this.prefix()
    let usergroup = _.cloneDeep(this.props.usergroup)
    _.set(usergroup, `${prefix}.measure`, value)
    let {formula, type} = mea
    if (type === dateMeasureType) {
      _.set(
        usergroup,
        `${prefix}.action`,
        'between'
      )
    } else if (type !== dateMeasureType) {
      _.set(
        usergroup,
        `${prefix}.action`,
        '>'
      )
      _.set(
        usergroup,
        `${prefix}.relativeTime`,
        undefined
      )
    }
    _.set(
      usergroup,
      `${prefix}.formula`,
      formula
    )
    modifier({
      usergroup
    })
  }

  renderMeasureSelect = () => {

    let {
      loadingDimension,
      filter: {measure},
      disabled,
      measures,
      getPopupContainer
    } = this.props

    let props = {
      dropdownMatchSelectWidth: false,
      className: 'width140 mg1r inline',
      onChange: this.onChangeMeasure,
      showSearch: true,
      notFoundContent: loadingDimension ? '载入中...' : '没有选项',
      value: measure,
      disabled,
      optionFilterProp: 'children',
      getPopupContainer
    }

    return (
      <Loading className="inline" isLoading={loadingDimension}>
        <Select
          {...props}
        >
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
            (loadingDimension ? [] : measures).map((m, i) => {
              let {id, title, name, formula} = m
              let t = title || name
              return (
                <Option
                  key={id + '@!' + i}
                  value={name}
                  title={t + ': ' + formula}
                >
                  {t}
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
    let relation = _.get(usergroup, `params.measure3.filters[${index}].relation`)
    return i
      ? <div className="relation-status">
        {relationTextMap[relation]}
      </div>
      : null
  }

  render () {
    return (
      <div className="filter-wrap">
        {this.renderRelationTag()}
        <div>
          {this.renderMeasureSelect()}
          {this.renderActionSelect()}
          {this.renderValueSelect()}
          {this.renderRemoveFilter()}
        </div>
      </div>
    )

  }
}
