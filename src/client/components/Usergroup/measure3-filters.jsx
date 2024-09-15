import React from 'react'
import {formItemLayout as defaultFormItemLayout} from './constants'
import { PlusCircleOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Radio } from 'antd';
import FilterItem from './filter-item-measure3'
import _ from 'lodash'
import {update} from './common-functions'

const FormItem = Form.Item
const RadioButton = Radio.Button
const RadioGroup = Radio.Group

@update
export default class MeaFilters extends React.Component {

  // shouldComponentUpdate(nextProps) {
  //   return !_.isEqual(
  //     _.pick(this.props, propsToCheck),
  //     _.pick(nextProps, propsToCheck)
  //   ) || !_.isEqual(
  //     this.props.usergroup.params,
  //     nextProps.usergroup.params
  //   )
  // }

  setRelation = e => {
    let {value} = e.target
    this.update(value, 'params.measure3.relation')
  }

  addFilter = () => {
    let {modifier} = this.props
    let usergroup  = _.cloneDeep(this.props.usergroup)
    let filter = {
      relation: 'and',
      filters: [{
        measure: '',
        action: '>',
        value: 0,
        actionType: 'num',
        formula: ''
      }]
    }
    usergroup.params.measure3.filters.push(filter)
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
          return <FilterItem {...props} key={index + '@mea2f'} />
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
          title="增加一个指标筛选"
        >
          <PlusCircleOutlined className="mg1r" />
          增加一个指标筛选
        </span>
      </div>;
  }

  render () {
    let {
      usergroup: {
        params: {
          measure3: {
            relation,
            filters
          }
        }
      },
      disabled,
      formItemLayout = defaultFormItemLayout
    } = this.props
    return (
      <FormItem {...formItemLayout} label="指标筛选">
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
