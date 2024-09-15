import React from 'react'
import _ from 'lodash'
import {relationTextMap} from './constants'
import SubDimFilter from './filter-sub-item-dimension'
import {update} from './common-functions'
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { Radio } from 'antd';

const RadioGroup = Radio.Group

@update
export default class FilterItemDim extends React.Component {

  setRelation = e => {
    let {value} = e.target
    let {index} = this.props
    this.update(value, `params.dimension.filters[${index}].relation`)
  }
  
  renderRelationTag = (index = this.props.index, path = 'params.dimension.relation') => {
    let {usergroup} = this.props
    let relation = _.get(usergroup, path)
    return index
      ? <div className="relation-status">
        {relationTextMap[relation]}
      </div>
      : null
  }

  addFilter = () => {
    let {modifier, index} = this.props
    let usergroup  = _.cloneDeep(this.props.usergroup)
    let filter = {
      dimension: '',
      action: 'in',
      value: [],
      actionType: 'str'
    }
    usergroup.params.dimension.filters[index].filters.push(filter)
    modifier({usergroup})
  }

  renderAddBtn = (hasLookup) => {
    let {disabled} = this.props
    return disabled || hasLookup
      ? <p className="pd1" />
      : <div className="add-button-wrap fix">
          <span
            className="pointer mg3r"
            onClick={this.addFilter}
            title="增加一个二级条件"
          >
            <PlusOutlined className="mg1r" />
            增加一个二级条件
          </span>
          <span
            className="pointer color-red"
            onClick={this.removeFilter}
            title="删除整个条件"
          >
            <CloseOutlined className="mg1r" />
            删除整个条件
          </span>
      </div>;
  }

  renderSubFilter = (filter, i) => {
    let {index} = this.props
    return (
      <SubDimFilter
        {...this.props}
        key={i + '@subf@' + index}
        subFilter={filter}
        i={i}
      />
    )
  }

  renderSubFilters = () => {
    let {index, usergroup} = this.props
    let filters = _.get(usergroup, `params.dimension.filters[${index}].filters`)
    if (!filters) {
      setTimeout(() => {
        this.update({
          relation: 'and',
          filters: [_.get(usergroup, `params.dimension.filters[${index}]`)]
        }, `params.dimension.filters[${index}]`)
      }, 1)
      return null
    }
    return (
      <div className="sub-filters">
        {filters.map(this.renderSubFilter)}
      </div>
    )
  }

  removeFilter = () => {
    let {index} = this.props
    let path = 'usergroup.params.dimension.filters'
    let filters = _.get(this.props, path)
    filters.splice(index, 1)
    this.update(filters, path)
  }

  render () {
    let {index, usergroup} = this.props
    let relation = _.get(usergroup, `params.dimension.filters[${index}].relation`)
    let hasLookup = _.some(
      _.get(usergroup, `params.dimension.filters[${index}].filters`) || [],
      f => f.action.includes('lookup')
    )
    return (
      <div className="filter-wrap">
        {this.renderRelationTag()}
        <div className="filter-content">
          <div className="relation-set">
            <RadioGroup
              value={relation}
              size="small"
              onChange={this.setRelation}
              disabled={hasLookup}
            >
              <Radio value="and">并且</Radio>
              <Radio value="or">或者</Radio>
            </RadioGroup>
          </div>
          {this.renderSubFilters()}
          {this.renderAddBtn(hasLookup)}
        </div>
      </div>
    )

  }
}
