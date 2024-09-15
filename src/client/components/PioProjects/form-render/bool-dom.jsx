import { Component } from 'react'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Checkbox } from 'antd';
import { getValue, formItemLayout} from './contants'
import getConditionValue from './get-condition-value'

const FormItem = Form.Item

@getConditionValue
class BoolDom extends Component {
  render() {
    let { param, keyToValueMap, getFieldDecorator } = this.props
    let {
      key,
      fullName,
      isHidden
    } = param
    let hasFeedback = false //'ParameterTypeCompare' !== paramType && 'param_type_boolean' !== paramType
    
    return (
      <FormItem
        className={isHidden ? 'hide' : ''}
        {...formItemLayout}
        hasFeedback={hasFeedback}
        colon={false}
      >
        {
          getFieldDecorator(
            key,
            {
              valuePropName: 'checked',
              initialValue: getValue(param, keyToValueMap)
            }
          )(<Checkbox>{fullName}</Checkbox>)
        }
      </FormItem>
    )
  }
}

export default BoolDom
