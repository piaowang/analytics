import { Component } from 'react'
import { renderLabel, getValue, formItemLayout, inputTypeMap } from './contants'
import { CloseOutlined, PlusSquareOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Button, Input, Tooltip } from 'antd'
import getConditionValue from './get-condition-value'
import setFieldValue from './set-field-value'

const FormItem = Form.Item

const getEventValue = e => {
  return e.target ? e.target.value : e
}

@getConditionValue
@setFieldValue
class ParameterTypeCompare extends Component {

  constructor(props, context) {
    super(props, context)
    
    this.state = {
      value: ''
    }

    this.setFieldValue = this.setFieldValue.bind(this)
    this.init(props)
  }

  valueChange = (e, param, index, i) => {
    let value1 = getEventValue(e)
    let arr = this.state.value.split(';')
    let target = arr[index]
    let values = target.split(/\:/g)
    values[i] = value1 + ''
    arr[index] = values.join(':')
    let value = arr.join(';')
    this.setState({value})
  }

  removeLine = (param, index) => {
    const {setFieldsValue} = this.props.form
    let {key} = param
    let value = this.state.value
    let arr = value.split(';')
    arr.splice(index, 1)
    let res = arr.join(';')
    setFieldsValue({[key]: res})
    this.setState({value: res})
  }

  renderLine = (param, str, index) => {
    let {
      key,
      keyType: {
        description: description1,
        fullName: fullName1,
        paramType: paramType1
      },
      valueType: {
        description: description2,
        fullName: fullName2,
        paramType: paramType2
      }
    } = param
    let values = str.split(/\:/g)
    let value1 = values[0] || ''
    let value2 = values[1] || ''
    let Dom1 = inputTypeMap[paramType1] || Input
    let Dom2 = inputTypeMap[paramType2] || Input
    return (
      <div className="pd1y" key={`${index}@${key}`}>
        <Dom1
          value={value1}
          placeholder={fullName1 || description1}
          className="inline list-opt-input width100 mg1r"
          onChange={
            e => this.valueChange(e, param, index, 0)
          }
          onBlur={this.setFieldValue}
        />
        <Dom2
          value={value2}
          placeholder={fullName2 || description2}
          className="inline list-opt-input width100 mg1r"
          onChange={
            e => this.valueChange(e, param, index, 1)
          }
          onBlur={this.setFieldValue}
        />
        <Tooltip
          title="删除这个条件"
        >
          <CloseOutlined className="font14 pointer" onClick={() => this.removeLine(param, index)} />
        </Tooltip>
      </div>
    )
  }

  addOneLine = param => {
    let {key} = param
    const {setFieldsValue} = this.props.form
    let value = this.state.value
    let newValue = value ? `${value};:` : ':'
    setFieldsValue({
      [key]: newValue
    })
    this.setState({value: newValue})
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
    let value = this.state.value
    let arr = value ? value.split(';') : []
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
        {arr.map((str, index) => this.renderLine(param, str, index))}
        <div className="pd1y">
          <Button
            type="ghost"
            onClick={() => this.addOneLine(param)}
            icon={<PlusSquareOutlined />}
          >
        添加一个条件
          </Button>
        </div>
      </FormItem>
    )
  }
}

export default ParameterTypeCompare
