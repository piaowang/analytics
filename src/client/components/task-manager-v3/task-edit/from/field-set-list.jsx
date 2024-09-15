import React, { Component } from 'react'
import { CloseOutlined } from '@ant-design/icons'
import { Table, Tooltip } from 'antd'
import { EditableCell } from '../../../../components/Common/editable-table'
import _ from 'lodash'

export default class FieldSetList extends Component {
  createTableColumns = () => {
    const { isExport, disabled, isHBase, columnFamily, targetDataFields } = this.props
    return [
      {
        title: '源字段名称',
        dataIndex: 'sourceCol',
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
        dataIndex: 'sourceType',
        width: 150
      },
      {
        title: '字段描述',
        dataIndex: 'sourceComment',
        width: 150,
        render: v => (
          <div className='elli'>
            <Tooltip title={v}>{v}</Tooltip>
          </div>
        )
      },
      // 只有 hbase 类型的数据库才显示
      !isHBase
        ? null
        : {
            title: '列族',
            dataIndex: 'finalCF',
            width: 200,
            render: (v, o) => {
              return disabled ? (
                v
              ) : (
                <EditableCell
                  showEditIcon
                  value={v}
                  limit={50}
                  field={o}
                  onChange={(val, obj) => this.onFinishEdit(val, obj, 'finalCF')}
                  disabled={disabled}
                  type='select'
                  selectData={columnFamily}
                />
              )
            }
          },
      // 目标数据库为 hbase 类型的特殊处理
      !isHBase
        ? null
        : {
            title: '目标字段名称',
            dataIndex: 'finalCol',
            width: 200,
            render: (v, o) => {
              return disabled ? (
                v
              ) : (
                <EditableCell
                  showEditIcon={o.finalCF !== 'RowKey'}
                  value={o.finalCF === 'RowKey' ? '' : v}
                  limit={50}
                  field={o}
                  onChange={(val, obj) => this.onFinishEdit(val, obj, 'finalCol')}
                  disabled={disabled || o.finalCF === 'RowKey'}
                />
              )
            }
          },
      isExport || isHBase
        ? null
        : {
            title: '目标字段名称',
            dataIndex: 'finalCol',
            width: 200,
            render: (v, o) => {
              return disabled ? (
                v
              ) : (
                <EditableCell
                  showEditIcon
                  value={v}
                  limit={50}
                  field={o}
                  onChange={(val, obj) => this.onFinishEdit(val, obj, 'finalCol')}
                  disabled={disabled}
                  type='select'
                  selectData={targetDataFields}
                />
              )
            }
          },
      isExport || isHBase
        ? null
        : {
            title: '目标字段类型',
            dataIndex: 'finalType',
            width: 150,
            render: (v, o) => {
              return disabled ? (
                v
              ) : (
                <EditableCell disabled={disabled} showEditIcon value={v} limit={50} field={o} onChange={(val, obj) => this.onFinishEdit(val, obj, 'finalType')} />
              )
            }
          },
      {
        title: '删除',
        dataIndex: 'businessName',
        width: 50,
        render: (v, o) => {
          if (o.status !== -1 && o.status !== 1) {
            return null
          }
          return disabled ? null : (
            <CloseOutlined
              disabled
              onClick={() => {
                let { value, onChange, changeParentStatus } = this.props
                changeParentStatus && changeParentStatus()
                let mergeFields = value.filter(p => p.sourceCol !== o.sourceCol)
                onChange(mergeFields)
              }}
            />
          )
        }
      }
    ].filter(_.identity)
  }

  onFinishEdit = (val, obj, type) => {
    let { value, onChange, changeParentStatus, targetDataFields } = this.props
    let mergeFields = _.cloneDeep(value)
    const targetIndex = _.findIndex(mergeFields, p => p.sourceCol === obj.sourceCol)
    if (type === 'finalCol') {
      const valType = _.find(targetDataFields, field => field.value === val)?.type
      _.set(mergeFields, `${targetIndex}.finalCol`, val)
      _.set(mergeFields, `${targetIndex}.finalType`, valType)
    }
    if (type === 'finalCF') {
      _.set(mergeFields, `${targetIndex}.finalCF`, val)
      if (val === 'RowKey') {
        _.set(mergeFields, `${targetIndex}.type`, 'hbase_rowkey_map')
      }
    }
    if (type === 'finalType') {
      _.set(mergeFields, `${targetIndex}.finalType`, val)
    }
    onChange(mergeFields)
    changeParentStatus && changeParentStatus()
  }

  render() {
    let { value = [], loading } = this.props
    return (
      <Table className='mg2t' rowKey='sourceCol' loading={loading} size='middle' columns={this.createTableColumns()} dataSource={value} scroll={{ y: 217 }} pagination={false} />
    )
  }
}
