import React from 'react'
import {formItemLayout, getValue, renderLabel} from './contants'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Input } from 'antd';
import getConditionValue from './get-condition-value'
import setFieldValue from './set-field-value'
const FormItem = Form.Item

@getConditionValue
@setFieldValue
export default class CharInput extends React.Component {

  constructor(props, context) {
    super(props, context)
    this.state = {
      value: ''
    }

    this.setFieldValue = this.setFieldValue.bind(this)
    this.init(props)
  }

  onChange = (e) => {
    const { param, form } = this.props
    const { setFieldsValue } = form
    let v = e.target.value
    const { key } = param
    let value = Array.from(v).pop() || ''
    this.setState({ value })
    setFieldsValue({[key]: value})
    e.stopPropagation()
  }

  render() {
    let { param, index, keyToValueMap, getFieldDecorator } = this.props
    let {
      key,
      isHidden,
      fullName,
      description
    } = param
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
              initialValue: getValue(param, keyToValueMap)
            }
          )(<div><Input autoComplete="off" className="width-100" onChange={this.onChange} value={this.state.value}/></div>)
        }
      </FormItem>
    )
  }
}
