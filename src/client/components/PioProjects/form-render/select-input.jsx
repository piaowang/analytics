import React from 'react'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { AutoComplete } from 'antd';
import { renderLabel, getValue, formItemLayout } from './contants'
import getConditionValue from './get-condition-value'

const FormItem = Form.Item

@getConditionValue
export default class SelectInput extends React.Component {
  render() {
    let { param, keyToValueMap, getFieldDecorator } = this.props
    let {
      key,
      fullName,
      isHidden,
      description,
      categories
    } = param
    let label = renderLabel(description, fullName)
    let hasFeedback = false //'ParameterTypeCompare' !== paramType && 'param_type_boolean' !== paramType
    let dataSource = categories.filter(c => c)
    return (
      <FormItem
        className={isHidden ? 'hide' : ''}
        {...formItemLayout}
        label={label}
        hasFeedback={hasFeedback}
        colon={false}
      >
        {
          getFieldDecorator(
            key,
            {
              initialValue: getValue(param, keyToValueMap)
            }
          )(<AutoComplete dataSource={dataSource} filterOption={false} />)
        }
      </FormItem>
    )
  }
}
