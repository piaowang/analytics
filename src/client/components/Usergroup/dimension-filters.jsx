import React from 'react'
import {formItemLayout as defaultFormItemLayout} from './constants'
import { PlusCircleOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Radio } from 'antd';
import FilterItemDimension from './filter-item-dimension'
const FormItem = Form.Item
const RadioButton = Radio.Button
const RadioGroup = Radio.Group
import _ from 'lodash'
import {immutateUpdate} from '../../../common/sugo-utils'

export default class DimFilters extends React.Component {

  // shouldComponentUpdate(nextProps) {
  //   // return !_.isEqual(
  //   //   _.pick(this.props, propsToCheck),
  //   //   _.pick(nextProps, propsToCheck)
  //   // ) || !_.isEqual(
  //   //   this.props.usergroup.params,
  //   //   nextProps.usergroup.params
  //   // )
  //   return true
  // }

  setRelation = e => {
    let {modifier, usergroup} = this.props
    let {value: nextRelation} = e.target
    modifier({
      usergroup: immutateUpdate(usergroup, 'params.dimension.relation', () => nextRelation)
    })
  }

  addFilter = () => {
    let {modifier} = this.props
    let usergroup  = _.cloneDeep(this.props.usergroup)
    let filter = {
      relation: 'and',
      filters: [{
        dimension: '',
        action: 'in',
        value: [],
        actionType: 'str'
      }]
    }
    usergroup.params.dimension.filters.push(filter)
    modifier({usergroup})
  }

  renderFilters = (filters) => {
    return (
      <div className="filters">
        {filters.map((filter, index) => {
          let props = {
            ...this.props,
            filter,
            index
          }                                   
          return <FilterItemDimension {...props} key={index + '@dimf'} />
        })}
      </div>
    )

  }

  renderAddBtn = disabled => {
    return disabled
      ? null
      : <div className="add-button-wrap">
        <span
          className="pointer"
          onClick={this.addFilter}
          title="增加一个条件"
        >
          <PlusCircleOutlined className="mg1r" />
          增加一个条件
        </span>
      </div>;
  }

  render () {
    let {
      usergroup: {
        params: {
          dimension: {
            relation,
            filters
          }
        }
      },
      disabled,
      formItemLayout = defaultFormItemLayout
    } = this.props
    return (
      <FormItem {...formItemLayout} label="条件筛选">
        <div className="relation-set">
          <RadioGroup
            value={relation}
            onChange={this.setRelation}
          >
            <RadioButton value="and">并且</RadioButton>
            <RadioButton value="or">或者</RadioButton>
          </RadioGroup>
        </div>
        {this.renderFilters(filters)}
        {this.renderAddBtn(disabled)}
      </FormItem>
    )

  }
}
