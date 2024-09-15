import React from 'react'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Select } from 'antd';
import _ from 'lodash'
import smartSearch from '../../../common/smart-search'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import DruidColumnType from '../../../common/druid-column-type'

const FormItem = Form.Item
const {Option} = Select

/**
 * 计算维度类型的表单域视图
 *
 * @export
 * @class DimensionCalcItem
 * @extends {React.PureComponent}
 */
export default class DimensionCastItem extends React.PureComponent {

  static defaultProps = {
    dimension: {
      params: {}
    }
  }

  state = {
    currentFunctionGroup: 'all',
    currentDimensionSearching: null
  }

  render() {
    const {formItemLayout, getFieldDecorator, dimensions, dimension: {params}, updateDimensionParams, disabled} = this.props

    // 这里也先过滤掉复合维度，不确定druid是否支持用复合维度来组成复合维度
    // 目前只支持 字符串 转 数值
    const finalOptions =
       dimensions.filter((dbDim) => _.isEmpty(dbDim.params) && !!dbDim.id && (dbDim.type === DruidColumnType.String || DruidColumnType.StringArray))

    return (
      <div className="formula">
        <FormItem {...formItemLayout} label="转换前维度">
          {
            getFieldDecorator(
              'params.castFrom',
              {
                rules: [
                  {
                    required: true,
                    message: '请选择转换前维度'
                  }
                ],
                initialValue: params.castFrom
              })(
              <Select
                {...enableSelectSearch}
                disabled={disabled}
                placeholder="请选择"
                onChange={val => {
                  updateDimensionParams({
                    type: 'cast',
                    castFrom: val,
                    formula: `$\{${val}\}.cast('NUMBER')`
                  })
                }}
              >
                {finalOptions.map(op => {
                  return (
                    <Option value={op.name} key={op.name}>{op.title || op.name}</Option>
                  )
                })}
              </Select>
            )
          }
        </FormItem>
        <FormItem wrapperCol={{offset: 4}}>
          <lable className="color-red">说明： 类型转换维度目前只支持 数字类型字符串 转 数值类型</lable>
        </FormItem>
      </div>
    )
  }

}
