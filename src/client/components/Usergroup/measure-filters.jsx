import React from 'react'
import {formItemLayout as defaultFormItemLayout} from './constants'
import { PlusCircleOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Radio } from 'antd';
import FilterItemDimension from './filter-item-measure'
import _ from 'lodash'
import {Auth} from '../../common/permission-control'
import {update} from './common-functions'
import {formulaPool, dsSettingPath} from './constants'
import {Link} from 'react-router'

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
    this.update(value, 'params.measure.relation')
  }

  getMeasureFilters() {
    let {datasourceCurrent} = this.props
    let {commonDimensions = []} = datasourceCurrent.params
    return commonDimensions.map(dimension => {
      return {
        dimension,
        value: ''
      }
    })
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
        formula: formulaPool.str[0].name,
        formulaType: 'str',
        filters: this.getMeasureFilters()
      }]
    }
    usergroup.params.measure.filters.push(filter)
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
          return <FilterItemDimension {...props} key={index + '@meaf'} />
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
          title="增加一个用户行为筛选"
        >
          <PlusCircleOutlined className="mg1r" />
          增加一个用户行为筛选
        </span>
      </div>;
  }

  render () {
    let {
      usergroup: {
        params: {
          measure: {
            relation,
            filters
          }
        }
      },
      disabled,
      projectCurrent,
      datasourceCurrent,
      formItemLayout = defaultFormItemLayout
    } = this.props
    let commonMetric = _.get(datasourceCurrent, 'params.commonMetric') || []
    if (!commonMetric.length) {
      return (
        <FormItem {...formItemLayout} label="用户行为筛选">
          要使用用户行为筛选, 请到
          <Auth
            auth={dsSettingPath}
            alt={<b>场景数据设置</b>}
          >
            <Link
              className="pointer bold mg1x"
              to={`${dsSettingPath}?id=${projectCurrent.datasource_id}`}
            >场景数据设置</Link>
          </Auth>
          设定<b className="color-red mg1x">用户行为维度</b>
        </FormItem>
      )
    }
    return (
      <FormItem {...formItemLayout} label="用户行为筛选">
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
