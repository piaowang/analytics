import React, { Component } from 'react'
import { CloseOutlined } from '@ant-design/icons'
import { Table, Tooltip, Select, Input } from 'antd'
import _ from 'lodash'

const SelectOption = Select.Option

const notIncludeTypes = ['timeMapping', 'uuidMapping', 'datetimeMapping', 'datetimeMappingDateFormat']

export default function FieldSetList(props) {
  const { outputFields = [], disabled, onChange, inputFields = [], isHbase = false, loading = false, mapping = '' } = props

  const handleChangeFieldName = (val, obj) => {
    let dataFields = _.cloneDeep(inputFields)
    const targetInfo = outputFields.find(p => p.name === val)
    const index = _.findIndex(dataFields, p => p.name === obj.name)
    _.set(dataFields, `${index}.targetName`, val)
    _.set(dataFields, `${index}.targetType`, targetInfo?.type)
    onChange(dataFields)
  }

  const handleChangeFamily = (val, obj) => {
    let dataFields = _.cloneDeep(inputFields)
    const index = _.findIndex(dataFields, p => p.name === obj.name)
    _.set(dataFields, `${index}.targetFamily`, val)
    onChange(dataFields)
  }

  const handleDelete = obj => {
    onChange(inputFields.filter(p => p.name !== obj.name))
  }

  const createTableColumns = () => {
    return [
      {
        title: '源字段名称',
        dataIndex: 'name',
        width: 150,
        render: (v, o) => {
          if (o.status === -1) {
            return <div style={{ color: '#f50' }}>{v}</div>
          }
          if (o.status === 1) {
            return <div style={{ color: '#87d068' }}>{v}</div>
          }
          return v
        }
      },
      {
        title: '源数据类型',
        dataIndex: 'type',
        width: 150
      },
      {
        title: '目标字段名称',
        dataIndex: 'targetName',
        width: 200,
        render: (v, obj, index) => {
          return disabled ? (
            v
          ) : (
            <Select value={v} onChange={val => handleChangeFieldName(val, obj)} disabled={disabled} showSearch>
              {outputFields.map(p => {
                return (
                  <SelectOption value={p.name} key={p.name}>
                    {p.name}
                  </SelectOption>
                )
              })}
            </Select>
          )
        }
      },
      {
        title: '目标字段类型',
        dataIndex: 'targetType',
        width: 150
      },
      {
        title: '删除',
        dataIndex: 'operation',
        width: 50,
        render: (v, o) => {
          return disabled ? null : <CloseOutlined disabled onClick={() => handleDelete(o)} />
        }
      }
    ]
  }

  const createHbaseTableColumns = () => {
    return [
      {
        title: '源字段名称',
        dataIndex: 'name',
        width: 150,
        render: (v, o) => {
          if (o.status === -1) {
            return <div style={{ color: '#f50' }}>{v}</div>
          }
          if (o.status === 1) {
            return <div style={{ color: '#87d068' }}>{v}</div>
          }
          return v
        }
      },
      {
        title: '源数据类型',
        dataIndex: 'type',
        width: 150
      },
      {
        title: '列族',
        dataIndex: 'targetFamily',
        width: 200,
        render: (v, obj) => {
          return disabled ? (
            v
          ) : (
            <Select value={v} showSearch onChange={val => handleChangeFamily(val, obj)} disabled={disabled}>
              <SelectOption vlaue='rowKey' key={'rowKey'}>
                rowKey
              </SelectOption>
              {outputFields.map(p => {
                return (
                  <SelectOption vlaue={p.name} key={p.name}>
                    {p.name}
                  </SelectOption>
                )
              })}
            </Select>
          )
        }
      },
      {
        title: '目标字段名称',
        dataIndex: 'targetName',
        width: 200,
        render: (v, obj) => {
          return obj.targetFamily === 'rowKey' ? 'rowKey' : <Input value={v} onChange={e => _.debounce(handleChangeFieldName(e.target.value, obj), 300)} />
        }
      },
      {
        title: '删除',
        dataIndex: 'operation',
        width: 50,
        render: (v, o) => {
          return disabled ? null : <CloseOutlined disabled onClick={() => handleDelete(o)} />
        }
      }
    ]
  }

  return (
    <Table
      rowKey='name'
      loading={loading}
      size='middle'
      columns={isHbase ? createHbaseTableColumns() : createTableColumns()}
      dataSource={inputFields.filter(p => p.type && !notIncludeTypes.includes(p.type))}
      scroll={{ y: 217 }}
      pagination={false}
    />
  )
}
