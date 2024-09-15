import React from 'react'
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { Radio } from 'antd';
const RadioGroup = Radio.Group
import _ from 'lodash'
import {update} from './common-functions'
import {relationTextMap} from './constants'
import FilterSubItemMeasure from './filter-sub-item-measure3'

@update
export default class FilterItemMeasure extends React.Component {

  removeFilter = () => {
    let {index} = this.props
    let filters = _.get(this.props, 'usergroup.params.measure3.filters')
    filters.splice(index, 1)
    this.update(filters, 'params.measure3.filters')
  }

  renderRelationTag = () => {
    let {index, usergroup} = this.props
    let relation = _.get(usergroup, 'params.measure3.relation')
    return index
      ? <div className="relation-status">
        {relationTextMap[relation]}
      </div>
      : null
  }

  setRelation = e => {
    let {value} = e.target
    let {index} = this.props
    this.update(value, `params.measure3.filters[${index}].relation`)
  }

  renderSubFilter = (filter, i) => {
    let {index} = this.props
    return (
      <FilterSubItemMeasure
        {...this.props}
        key={i + '@mea2f@' + index}
        filter={filter}
        i={i}
      />
    )
  }

  renderSubFilters = () => {
    let {filter} = this.props
    let filters = filter.filters
    return (
      <div className="sub-filters">
        {filters.map(this.renderSubFilter)}
      </div>
    )
  }

  renderAddBtn = () => {
    let {disabled} = this.props
    return disabled
      ? null
      : <div className="add-button-wrap fix">
          <span
            className="pointer mg3r"
            onClick={this.addFilter}
            title="增加一个二级筛选"
          >
            <PlusOutlined className="mg1r" />
            增加一个二级筛选
          </span>
          <span
            className="pointer color-red"
            onClick={this.removeFilter}
            title="删除整个筛选"
          >
            <CloseOutlined className="mg1r" />
            删除整个筛选
          </span>
      </div>;
  }

  addFilter = () => {
    let {modifier, index} = this.props
    let usergroup  = _.cloneDeep(this.props.usergroup)
    let filter = {
      measure: '',
      action: '>',
      value: 0,
      actionType: 'num',
      formula: ''
    }
    usergroup.params.measure3.filters[index].filters.push(filter)
    modifier({usergroup})
  }


  render () {
    let {index} = this.props
    let relation = _.get(this.props.usergroup.params.measure3.filters, `[${index}].relation`)
    
    return (
      <div className="filter-wrap">
        {this.renderRelationTag()}
        <div className="filter-content">
          <div className="relation-set">
            <RadioGroup
              value={relation}
              size="small"
              onChange={this.setRelation}
            >
              <Radio value="and">并且</Radio>
              <Radio value="or">或者</Radio>
            </RadioGroup>
          </div>
          {this.renderSubFilters()}
          {this.renderAddBtn()}
        </div>
      </div>
    )
  }
}
