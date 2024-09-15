import React from 'react'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Input } from 'antd';
import { renderLabel, getValue, formItemLayout } from './contants'
import getConditionValue from './get-condition-value'
import setFieldValue from './set-field-value'

const FormItem = Form.Item

@getConditionValue
@setFieldValue
export default class Textarea extends React.Component {

  constructor(props, context) {
    super(props, context)
    
    this.state = {
      value: ''
    }

    this.change = this.change.bind(this)
    this.setFieldValue = this.setFieldValue.bind(this)
    this.init(props)
  }
  

  render() {
    let { param, index, keyToValueMap, getFieldDecorator } = this.props
    let {
      key,
      fullName,
      isOptional,
      isHidden,
      description
    } = param
    let label = renderLabel(description, fullName)
    let name = fullName || description || key
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
          )(<div/>)
        }
        <Input.TextArea
          value={this.state.value}
          onChange={this.change}
          onBlur={this.setFieldValue}
        />
      </FormItem>
    )
  }
}
