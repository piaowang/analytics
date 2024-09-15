import React, { Component } from 'react'
import { commonSelectProps, renderLabel, formItemLayout } from './contants'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Select } from 'antd';
import setFieldValue from './set-field-value'
const Option = Select.Option
const FormItem = Form.Item
import {immutateUpdate} from '../../../../common/sugo-utils'
import _ from 'lodash'

const KEY = {
  slice: 'single_view',
  datasource: 'data_source',
  datasourceName: 'data_source_name',
  params: 'param',
  url: 'url'
}

@setFieldValue
class DynamicCategory extends Component {
  constructor(props, context) {
    super(props, context)
    this.state = {
      value: null
    }

    this.init(props)
  }

  onChange = value => {
    const { param, form, getFieldId } = this.props
    const { setFieldsValue } = form
    const key = getFieldId(param.key)  //有可能是数据源，也有可能是单图key
    const sKey = getFieldId(KEY.slice)  //单图key
    const paramKey = getFieldId(KEY.params)  //param参数的key
    let keyValue = {
      [key]: value
    }
    let slice = null
    if(param.key === KEY.slice) {
      slice = this.context.slices.find(s => s.id === value)
    } else {
      //改了数据源之后，单图也需要更改为该数据源下第一个单图
      slice = this.context.slices.find(s => s.druid_datasource_id === value)
    }

    if(slice) {
      let paramStr = JSON.stringify({
        ...slice.params,
        ..._.pick(slice, ['druid_datasource_id', 'datasource_name'])
      })
      keyValue[sKey] = slice.id
      keyValue[paramKey] = paramStr
      keyValue[KEY.url] = location.host
    }

    setFieldsValue(keyValue)
    this.setState({value})
  }

  render() {
    const { slices, datasources } = this.context    
    let { param, index, getFieldDecorator, keyToValueMap,options } = this.props
    let {
      key,
      fullName,
      isHidden,
      description
    } = param

    let data = []
    if (key === KEY.datasourceName) {
      data = datasources.map(s => ({name: s.title, id: s.name}))
    } else if (key === KEY.datasource) {
      data = datasources.filter(d => slices.find(s => s.druid_datasource_id === d.id)).map(s => ({name: s.title, id: s.id}))
    } else {
      let datasource = keyToValueMap[KEY.datasource]
      data = datasource ? slices.filter(s => s.druid_datasource_id === datasource) : slices
      data = data.map(s => ({name: s.slice_name, id: s.id}))
    }
    let label = renderLabel(description, fullName)
    let props = Object.assign({}, commonSelectProps, options)

    return (
      <FormItem
        className={isHidden ? 'hide' : ''}
        {...formItemLayout}
        colon={false}
        key={key + '@ft' + index}
        label={label}
      >
        {getFieldDecorator(key)(<div/>)}
        <Select
          {...props}
          onChange={this.onChange}
          value={this.state.value}
        >
          {
            data.map(obj=> {
              let {name, id} = obj
              return (
                <Option
                  key={id}
                  value={id}
                >
                  {name}
                </Option>
              )
            })
          }
        </Select>
      </FormItem>
    )
  }
}

DynamicCategory.contextTypes = {
  slices: React.PropTypes.array,
  datasources: React.PropTypes.array
}

export default DynamicCategory
