import { Component } from 'react'
import { commonSelectProps, renderLabel, getValue, formItemLayout } from './contants'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Select } from 'antd';
import _ from 'lodash'
const Option = Select.Option
const FormItem = Form.Item

class Category extends Component {
  
  static getConditionValue(condition) {
    const { fulfillingOptions } = condition
    return fulfillingOptions.map(o => o.toString())
  }

  render() {
    let { param, index, keyToValueMap, getFieldDecorator, options } = this.props
    let {
      key,
      fullName,
      isOptional,
      isHidden,
      description
    } = param
    let arr = _.get(param, 'categories', [])
    let props = Object.assign({}, commonSelectProps, options)
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
          )(<Select
            {...props}
          >
            {
              arr.map((name, i) => {
                return (
                  <Option
                    key={name + '@' + i}
                    value={'' + i}
                  >
                    {name}
                  </Option>
                )
              })
            }
          </Select>)
        }
      </FormItem>
    )
  }

}

export default Category
