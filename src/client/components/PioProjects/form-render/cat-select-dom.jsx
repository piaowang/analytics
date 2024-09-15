import { Component } from 'react'
import { renderOptions, commonSelectProps, renderLabel, getValue, formItemLayout } from './contants'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Select } from 'antd';
import _ from 'lodash'
import getConditionValue from './get-condition-value'

const FormItem = Form.Item

@getConditionValue
class CatSelectDom extends Component {
  render() {
    let { param, index, keyToValueMap, getFieldDecorator, options } = this.props
    let {
      key,
      fullName,
      isOptional,
      isHidden,
      description
    } = param
    let attributeMetaData = _.get(param, 'categories', [])
    let categoriesDesc = _.get(param, 'categoriesDesc', [])
    let props = Object.assign({}, commonSelectProps, options)
    let arr = attributeMetaData.map((value, i) => {
      let name = categoriesDesc[i]
      return { name, value }
    })
    let name = fullName || description || key
    let label = renderLabel(description, fullName)

    let hasFeedback = false //'ParameterTypeCompare' !== paramType && 'param_type_boolean' !== paramType
    return (
      <FormItem
        className={isHidden ? 'hide' : ''}
        {...formItemLayout}
        label={label}
        hasFeedback={hasFeedback}
        colon={false}
        key={key + '@ft' + index}
      >
        {
          getFieldDecorator(
            key,
            {
              rules: [
                {
                  required: !isOptional,
                  message: `请输入${name}，至少2个字符`
                }
              ],
              initialValue: getValue(param, keyToValueMap)
            }
          )(<Select
            {...props}
          >
            {renderOptions(arr)}
          </Select>)
        }
      </FormItem>
    )
  }
}

export default CatSelectDom
