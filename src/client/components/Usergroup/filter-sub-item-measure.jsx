import React from 'react'
import { CloseCircleOutlined } from '@ant-design/icons'
import { InputNumber, Select, Tooltip } from 'antd';
const Option = Select.Option
import SingleDistinct from '../Common/distinct-cascade'
import _ from 'lodash'
import {update} from './common-functions'
import {convertDateType} from 'common/param-transform'
import {relationTextMap, actionPool, valueActionPool, arrayActionPool} from './constants'

@update
export default class FilterSubItemMeasure extends React.Component {

  removeFilter = () => {
    let {i, index} = this.props
    let path = `usergroup.params.measure.filters[${index}].filters`
    let filters = _.get(this.props, path)
    if (filters.length === 1) {
      let levelOneFilters = _.get(this.props, 'usergroup.params.measure.filters')
      levelOneFilters.splice(index, 1)
      this.update(levelOneFilters, 'params.measure.filters')
    } else {
      filters.splice(i, 1)
      this.update(filters, path)
    }
  }

  renderRemoveFilter = () => {
    const {disabled} = this.props
    return disabled
      ? null
      : <Tooltip className="iblock mg1l" title="移除这个筛选">
          <CloseCircleOutlined
            className="pointer iblock"
            onClick={this.removeFilter}
          />
        </Tooltip>;
  }

  
  changeAction = value => {
    let {index, modifier, filter, i} = this.props
    let usergroup = _.cloneDeep(this.props.usergroup)
    let path = `params.measure.filters[${index}].filters[${i}].action`
    let path1 = `params.measure.filters[${index}].filters[${i}].value`
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
      filter,
      getPopupContainer
    } = this.props
    return (
      <div className="inline">
        <Select
          dropdownMatchSelectWidth={false}
          className="iblock width80 mg1r"
          value={filter.action}
          disabled={disabled}
          onChange={this.changeAction}
          getPopupContainer={getPopupContainer}
        >
          {
            actionPool[filter.actionType].map(m => {
              return (<Option key={m + '@amt'} value={m}>
                {m}
              </Option>)
            })
          }
        </Select>
      </div>
    )
  }

  onChangeFilterValue1 = value => {
    let {index, i} = this.props
    this.update(value, `params.measure.filters[${index}].filters[${i}].value[1]`)
  }

  onChangeFilterValue0 = value => {
    let {index, i} = this.props
    this.update(value, `params.measure.filters[${index}].filters[${i}].value[0]`)
  }

  onChangeInput = value => {
    let {index, i} = this.props
    this.update(value, `params.measure.filters[${index}].filters[${i}].value`)
  }

  renderBetweenDom = () => {
    let {filter: {value}, disabled} = this.props
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
    let {filter: {value}, disabled} = this.props
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

  renderValueSelect = () => {

    let {
      filter: {action}
    } = this.props

    return action === 'between'
      ? this.renderBetweenDom()
      : this.renderInput()
  }

  onChangeDimension = (value, measureIndex) => {
    let {index, i} = this.props
    this.update(value, `params.measure.filters[${index}].filters[${i}].filters[${measureIndex}].value`)
  }

  renderMeasureSelect = () => {

    let {
      filter: {filters},
      //disabled,
      dimensions,
      datasourceCurrent: {id: druid_datasource_id},
      usergroup: {params},
      getPopupContainer
    } = this.props
    let useRelativeTime = params.relativeTime || 'custom'
    let arr = useRelativeTime === 'custom'
      ? [params.since, params.until]
      : convertDateType(useRelativeTime)
    let finalSince = arr[0]
    let finalUntil = arr[1]
    return (
      <div className="inline">
        {
          filters.map((fil, measureIndex) => {
            let { dimension, value } = fil
            let dim = _.find(dimensions, {name: dimension}) || {}
            let prevLayerValues = measureIndex
              ? _.take(filters, measureIndex).reduce((prev, obj) => {
                if(obj.value) prev.push({
                  val: obj.value,
                  col: obj.dimension
                })
                return prev
              }, [])
              : []
            return (
              <SingleDistinct
                key={dimension + '@' + measureIndex}
                dbDim={dim}
                doFetch={false}
                since={finalSince}
                until={finalUntil}
                relativeTime={useRelativeTime}
                dataSourceId={druid_datasource_id}
                prevLayerValues={prevLayerValues}
                value={value}
                onChange={v => this.onChangeDimension(v, measureIndex)}
                getPopupContainer={getPopupContainer}
              />
            )
          })
        }
      </div>
    )
  }

  renderRelationTag = () => {
    let {index, usergroup, i} = this.props
    let relation = _.get(usergroup, `params.measure.filters[${index}].relation`)
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
