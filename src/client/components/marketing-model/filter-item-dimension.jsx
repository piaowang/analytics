import React from 'react'
import _ from 'lodash'
import SubDimFilter from './filter-sub-item-dimension'
import { CloseOutlined, PlusOutlined } from '@ant-design/icons'
import { Radio } from 'antd'
import { immutateUpdate } from '~/src/common/sugo-utils'

const RadioGroup = Radio.Group

const relationTextMap = {
  or: '或者',
  and: '并且'
}

export default class FilterItemDim extends React.Component {

  update(value, path) {
    let { modifier } = this.props
    let content = _.cloneDeep(this.props.content)
    _.set(content, path, value)
    modifier({ content })
  }
  
  setRelation = e => {
    let { value } = e.target
    let { index, basePath } = this.props
    this.update(value, `${basePath}.filters[${index}].relation`)
  }

  renderRelationTag = (index = this.props.index, path) => {
    let { content, basePath } = this.props
    let relation = _.get(content, path || `${basePath}.relation`)
    return index
      ? <div className="relation-status">
        {relationTextMap[relation]}
      </div>
      : null
  }

  addFilter = () => {
    let { modifier, index, basePath } = this.props
    let content = _.cloneDeep(this.props.content)
    let filter = {
      dimension: '',
      action: 'in',
      value: [],
      actionType: 'str'
    }
    const newContent = immutateUpdate(content, `${basePath}.filters[${index}].filters`, val =>  [...val, filter])
    modifier({ content: newContent })
  }

  renderAddBtn = (hasLookup) => {
    let { disabled } = this.props
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
      </div>
  }

  renderSubFilter = (filter, i) => {
    let { index } = this.props
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
    let { index, content, basePath } = this.props
    let filters = _.get(content, `${basePath}.filters[${index}].filters`)
    if (!filters) {
      setTimeout(() => {
        this.update({
          relation: 'and',
          filters: [_.get(content, `${basePath}.filters[${index}]`)]
        }, `params.filters[${index}]`)
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
    let { index, basePath } = this.props
    let path = `content.${basePath}.filters`
    let filters = _.get(this.props, path)
    filters.splice(index, 1)
    this.update(filters, path)
  }

  render() {
    let { index, content, basePath } = this.props
    let relation = _.get(content, `${basePath}.filters[${index}].relation`)
    let hasLookup = _.some(
      _.get(content, `${basePath}.filters[${index}].filters`) || [],
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
