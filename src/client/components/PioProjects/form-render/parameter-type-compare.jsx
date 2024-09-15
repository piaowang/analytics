import { Component } from 'react'
import { renderLabel, getValue, formItemLayout, commonSelectProps } from './contants'
import { CloseOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Select, Button, Input, Tooltip } from 'antd';
import _ from 'lodash'
import getConditionValue from './get-condition-value'
import setFieldValue from './set-field-value'

const Option = Select.Option
const FormItem = Form.Item

const commonSelectProps1 = Object.assign({}, commonSelectProps, {
  tags: false
})

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

  removeComapreLine = (param, index) => {
    const {setFieldsValue} = this.props.form

    let {key} = param
    let value = this.state.value
    let arr = value.split(';')
    arr.splice(index, 1)
    let res = arr.join(';')

    setFieldsValue({[key]: res})
    this.setState({value: res})
  }

  getComapreValueStr = values => {
    return `${values[0]}:${values[1]}.${values[2]}.${values[3]}`
  }

  changeParameterTypeCompareValue1 = (value1, param, index) => {
    const {setFieldsValue} = this.props.form
    let {key} = param
    let value = this.state.value
    let arr = value.split(';')
    let target = arr[index]
    let values = target.split(/\:|\./g)

    //检查前后类型是否一致，如果不一致，选择该类型的默认条件选项
    let compareOpts = _.get(param, 'compareOpts', [])
    let keyList = _.get(param, 'keyList', [])
    let par = keyList.find(p => p.name === value1)
    let par1 = keyList.find(p => p.name === values[1])
    let value2 = par.type !== par1.type ? this.filterComapreOpts(par.type, compareOpts)[0].name : values[2]

    values[1] = value1
    values[2] = value2
    arr[index] = this.getComapreValueStr(values)
    let res = arr.join(';')
    setFieldsValue({[key]: res})
  }

  changeParameterTypeCompareValue2 = (value2, param, index) => {
    const {setFieldsValue} = this.props.form
    let {key} = param
    let value = this.state.value
    let arr = value.split(';')
    let target = arr[index]
    let values = target.split(/\:|\./g)
    values[2] = value2
    arr[index] = this.getComapreValueStr(values)
    let res = arr.join(';')
    setFieldsValue({[key]: res})
  }

  changeParameterTypeCompareValue3 = (e, param, index) => {
    let value3 = e.target.value
    let arr = this.state.value.split(';')
    let target = arr[index]
    let values = target.split(/\:|\./g)
    values[3] = value3
    arr[index] = this.getComapreValueStr(values)
    let value = arr.join(';')
    this.setState({value})
  }

  filterComapreOpts = (type1, arr) => {
    return arr.filter(obj => {
      let {type} = obj
      return type === -1 ||
        type === type1 ||
        (type1 === 3 && (type === 2))
    })
  }

  renderParameterTypeCompareLine = (param, str, index) => {
    let { key } = param
    let values = str.split(/\:|\./g)
    let value1 = values[1]
    let value2 = values[2]
    let value3 = values[3] || ''
    let compareOpts = _.get(param, 'compareOpts', [])
    let keyList = _.get(param, 'keyList', [])
    let type1 = (_.find(param.keyList, {name: value1}) || {type: 3}).type
    let type2 = (_.find(param.compareOpts, {name: value2}) || {type: -1}).type
    return (
      <div className="pd1y" key={`${index}@${key}`}>
        <Select
          {...commonSelectProps1}
          value={value1}
          className="iblock compare-opt-input mg1r"
          onChange={
            value => this.changeParameterTypeCompareValue1(value, param, index)
          }
        >
          {
            keyList.map((obj, i) => {
              let {name} = obj
              return <Option key={i + '@' + name} value={name}>{name}</Option>
            })
          }
        </Select>
        <Select
          {...commonSelectProps1}
          value={value2}
          className="iblock compare-opt-input mg1r"
          onChange={
            value => this.changeParameterTypeCompareValue2(value, param, index)
          }
        >
          {
            this.filterComapreOpts(type1, compareOpts).map((obj, i) => {
              let {name, desc} = obj
              return <Option key={i + '@' + name} value={name}>{desc}</Option>
            })
          }
        </Select>
        {
          type2 === -1
            ? null
            : <Input
              value={value3}
              className="iblock compare-opt-input mg1r"
              onChange={
                e => this.changeParameterTypeCompareValue3(e, param, index)
              }
              onBlur={this.setFieldValue}
            />
        }
        <Tooltip
          title="删除这个条件"
        >
          <CloseOutlined
            className="font14 pointer"
            onClick={() => this.removeComapreLine(param, index)} />
        </Tooltip>
      </div>
    );
  }

  getDefaultOption = param => {
    return _.get(param, 'keyList[0]', {})
  }

  getDefaultCompareOpt = (param, type) => {
    let arr = this.filterComapreOpts(type, param.compareOpts)[0] || {}
    return arr.name
  }

  addOneLine = param => {
    console.log(param)
    let {key} = param
    const {setFieldsValue} = this.props.form
    let value = this.state.value
    let option = this.getDefaultOption(param)
    let defaultCompareOpt = this.getDefaultCompareOpt(param, option.type)    
    let defaultOption = option.name
    let newValue = value ? `${value};${key}:${defaultOption}.${defaultCompareOpt}.` : `${key}:${defaultOption}.${defaultCompareOpt}.`
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
        <div>
          {arr.map((str, index) => this.renderParameterTypeCompareLine(param, str, index))}
          <div className="pd1y">
            <Button
              type="ghost"
              onClick={() => this.addOneLine(param)}
              icon={<PlusSquareOutlined />}
            >
            添加一个过滤条件
            </Button>
          </div>
        </div>
      </FormItem>
    );
  }
}

export default ParameterTypeCompare
