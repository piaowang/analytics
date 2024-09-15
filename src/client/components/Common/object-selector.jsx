/**
 * 原生 antd 的 select 不支持 value 直接传对象
 * 这个控件提供支持，例子：
 * <ObjectSelector
 *   options={mySQLDbs || []}
 *   getKey={o => o.id}
 *   getTitle={o => o.title}
 *   onChange={val => { }}
 * />
 */
import React from 'react'
import {Select} from 'antd'
import _ from 'lodash'

const {Option} = Select

export default function ObjectSelector(props) {
  let {options, getKey, getTitle, value, onChange, ...rest} = props
  return (
    <Select
      value={_.isPlainObject(value) ? getKey(value) : value}
      onChange={val => {
        const mapper = v => _.find(options, opt => getKey(opt) === v)
        onChange(_.isArray(val) ? val.map(mapper) : mapper(val))
      }}
      {...rest}
    >
      {(options || []).map(opt => {
        const key = getKey(opt)
        return (
          <Option key={key} value={key}>{getTitle(opt)}</Option>
        )
      })}
    </Select>
  )
}
