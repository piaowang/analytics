import React from 'react'
import { Select } from 'antd'
import Loading from '../Common/loading'
import MultiSelect from '../Common/multi-select'

const Option = Select.Option

export default class DistinctSelect extends React.Component {

  componentDidCatch(err, info) {
    console.log(err, info)
  }

  renderMultiSelect = (
    value,
    data
  ) => {
    let {
      isFetching,
      onSearch,
      index,
      onPickFilterProp,
      parentIndex
    } = this.props
    let opts = data.map(d => d.value || d)
    return (
      <MultiSelect
        options={opts}
        value={value}
        showSelectAllBtn
        showCleanSelectionBtn
        className="width140 itblock mg1r"
        onChange={(value) => {
          onPickFilterProp(index, parentIndex, value)
        }}
        isLoading={isFetching}
        onSearch={onSearch}
      />
    )
  }

  render () {
    let { isFetching,
      disabled, onSearch, data,
      filter, index, onPickFilterProp, notFoundContent = '查无数据' ,parentIndex } = this.props
    
    data = (data || []).filter(d => d)
    if (isFetching) data = [{
      value: '__loading',
      title: '载入中...'
    }]
    let value = filter.value
    let multipleInputFlag = filter.type === 'in' || filter.type === 'notin'
    if (multipleInputFlag) {
      !value && (value = [])
      return this.renderMultiSelect(value, data)
    }
    return (
      <Loading className="itblock" isLoading={isFetching}>
        <Select
          mode="tags"
          className="itblock width140 mg1r"
          value={value || []}
          disabled={disabled}
          showSearch
          notFoundContent={notFoundContent}
          dropdownMatchSelectWidth={false}
          onSearch={onSearch}
          onChange={(value) => {
            onPickFilterProp(index, parentIndex, value)
          }}
        >
          {
            data.map((m, i) => {
              return m.value
                ? <Option key={i} value={m.value}>
                  {m.title}
                </Option>
                : <Option key={i} value={m}>
                  {m}
                </Option>
            })
          }
        </Select>
      </Loading>
    )
  }
}
