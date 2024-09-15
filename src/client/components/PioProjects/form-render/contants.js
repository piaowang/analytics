import {tryJsonParse} from 'common/sugo-utils'
import { Input, InputNumber, Tooltip, Select } from 'antd';

const Option = Select.Option

export const commonSelectProps = {
  placeholder: '请选择',
  notFoundContent: '没有找到',
  tags: true,
  showSearch: true,
  allowClear: true,
  optionFilterProp: 'children',
  dropdownMatchSelectWidth: false
}

export const formItemLayout = {
  labelCol: { span: 24 },
  wrapperCol: { span: 24 }
}

export const getValue = (param, keyToValueMap) => {
  let {
    key,
    defaultValue,
    paramType
  } = param
  let v = keyToValueMap[key]
  if (paramType === 'param_type_attributes' || paramType === 'param_type_attribute') {
    return v ? v.split(';') : []
  } else if (paramType === 'param_type_category') {
    return (v || 0) + ''
  } else if (paramType === 'param_type_boolean') {
    return typeof v === 'undefined' ? defaultValue : !(!v || v === 'false')
  }
  return tryJsonParse(v) || tryJsonParse(defaultValue)
}

export const inputTypeMap = {
  param_type_string: Input,
  param_type_int: InputNumber,
  param_type_double: InputNumber,
  param_type_password: Input,
  param_type_sql_query: Input,
  'RegexpAttributeFilter$1': Input,
  'RegexpAttributeFilter$2': Input
}


export const renderLabel = (description, fullName) => {
  return (
    <span>
      <span 
        className="mg1r"
        dangerouslySetInnerHTML={{
          __html: fullName || description
        }}
      />
      {
        // description
        // ? <Tooltip
        //     title={description}
        //   >
        //     <Icon className="font16" type="question-circle-o" />
        //   </Tooltip>
        // : null
      }
    </span>
  )
}

export const renderOptions = arr => {
  return arr
    .filter(a => a.name)
    .map(obj => {
      let {name, value} = obj
      return (
        <Option
          key={value + '@sp'}
          value={value}
        >
          {name}
        </Option>
      )
    })
}
