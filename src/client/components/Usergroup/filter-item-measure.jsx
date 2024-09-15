import React from 'react'
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { Radio } from 'antd';
const RadioGroup = Radio.Group
import _ from 'lodash'
import {update} from './common-functions'
import {relationTextMap} from './constants'
import FilterSubItemMeasure from './filter-sub-item-measure'

@update
export default class FilterItemMeasure extends React.Component {

  removeFilter = () => {
    let {index} = this.props
    let filters = _.get(this.props, 'usergroup.params.measure.filters')
    filters.splice(index, 1)
    this.update(filters, 'params.measure.filters')
  }

  renderRelationTag = () => {
    let {index, usergroup} = this.props
    let relation = _.get(usergroup, 'params.measure.relation')
    return index
      ? <div className="relation-status">
        {relationTextMap[relation]}
      </div>
      : null
  }

  setRelation = e => {
    let {value} = e.target
    let {index} = this.props
    this.update(value, `params.measure.filters[${index}].relation`)
  }

  renderSubFilter = (filter, i) => {
    let {index} = this.props
    return (
      <FilterSubItemMeasure
        {...this.props}
        key={i + '@meaf@' + index}
        filter={filter}
        i={i}
      />
    )
  }

  renderSubFilters = () => {
    let {index, filter} = this.props
    let filters = filter.filters
    if (!filter || !filter.relation) {
      setTimeout(() => {
        this.update({
          relation: 'and',
          filters: [filter]
        }, `params.measure.filters[${index}]`)
      }, 1)
      return null
    }
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

  getMeasureFilters() {
    let {datasourceCurrent} = this.props
    let {commonDimensions} = datasourceCurrent.params
    return commonDimensions.map(dimension => {
      return {
        dimension,
        value: ''
      }
    })
  }

  addFilter = () => {
    let {modifier, index} = this.props
    let usergroup  = _.cloneDeep(this.props.usergroup)
    let filter = {
      measure: '',
      action: '>',
      value: 0,
      actionType: 'num',
      formula: 'lucene_count',
      formulaType: 'str',
      filters: this.getMeasureFilters()
    }
    usergroup.params.measure.filters[index].filters.push(filter)
    modifier({usergroup})
  }


  render () {
    let {index} = this.props
    let relation = _.get(this.props.usergroup.params.measure.filters, `[${index}].relation`)
    
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
