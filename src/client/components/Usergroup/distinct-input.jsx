import React from 'react'
import { Select } from 'antd'
import _ from 'lodash'
import Loading from '../Common/loading'

const Option = Select.Option

export default class DistinctSelect extends React.Component {

  shouldComponentUpdate(nextProps) {
    return !_.isEqual(this.props, nextProps)
  }

  render () {
    let { isFetching,
      disabled, onSearch, data, onBlur,
      filter: {
        value, action
      }, onChange, notFoundContent = '查无数据'  } = this.props
    
    data = (data || []).filter(d => d)
    if (isFetching) data = [{
      value: '__loading',
      title: '载入中...'
    }]

    let mode = action === 'in' || action === 'not in'
      ? 'tags'
      : 'default'
    return (
      <Loading className="iblock" isLoading={isFetching}>
        <Select
          className="inline width140 mg1r"
          mode={mode}
          value={value}
          disabled={disabled}
          showSearch
          notFoundContent={notFoundContent}
          dropdownMatchSelectWidth={false}
          onSearch={onSearch}
          onChange={onChange}
          onBlur={onBlur}
        >
          {
            data.map((m, i) => {
              let v = m.value || m
              return (
                <Option key={v + '@fv' + i} value={v}>
                  {m.title || v}
                </Option>
              )
            })
          }
        </Select>
      </Loading>
    )
  }
}
