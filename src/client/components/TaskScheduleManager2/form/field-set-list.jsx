import React, { Component } from 'react'
import { CloseOutlined } from '@ant-design/icons'
import { Table, Tooltip } from 'antd'
import _ from 'lodash'
import { EditableCell } from '../../Common/editable-table'


export default class SetForm extends Component {

  createTableColumns = () => {
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
        render: v => <div className="elli"><Tooltip title={v}>{v}</Tooltip></div>
      },
      {
        title: '目标字段名称',
        dataIndex: 'finalCol',
        width: 200,
        render: (v, o) => {
          return (<EditableCell
            showEditIcon
            editable
            value={v}
            limit={50}
            field={o}
            onChange={(val, obj) => this.onFinishEditFieldName(val, obj)}
                  />)
        }
      },
      {
        title: '目标字段类型',
        dataIndex: 'finalType',
        width: 150,
        render: (v, o) => {
          return (<EditableCell
            showEditIcon
            editable
            value={v}
            limit={50}
            field={o}
            onChange={(val, obj) => this.onFinishEditFieldType(val, obj)}
                  />)
        }
      },
      {
        title: '目标字段描述',
        dataIndex: 'finalComment',
        width: 200,
        render: (v, o) => {
          return (<EditableCell
            showEditIcon
            editable
            value={v}
            limit={50}
            field={o}
            onChange={(val, obj) => this.onFinishEditComment(val, obj)}
                  />)
        }
      },
      {
        title: '删除',
        dataIndex: 'businessName',
        width: 50,
        render: (v, o) => {
          return (
            <CloseOutlined
              onClick={() => {
                let { value, onChange } = this.props
                let dataFields = value.filter(p => p.sourceCol !== o.sourceCol)
                onChange(dataFields )
              }}
            />
          )
        }
      }
    ]
  }

  onFinishEditFieldName = (val, obj) => {
    let { value, onChange } = this.props
    let dataFields = _.cloneDeep(value)
    _.set(dataFields, `${_.findIndex(dataFields, p => p.sourceCol === obj.sourceCol)}.finalCol`, val)
    onChange(dataFields)
  }

  onFinishEditComment = (val, obj) => {
    let { value, onChange } = this.props
    let dataFields = _.cloneDeep(value)
    _.set(dataFields, `${_.findIndex(dataFields, p => p.sourceCol === obj.sourceCol)}.finalComment`, val)
    onChange(dataFields)
  }

  onFinishEditFieldType = (val, obj) => {
    let { value, onChange } = this.props
    let dataFields = _.cloneDeep(value)
    _.set(dataFields, `${_.findIndex(dataFields, p => p.sourceCol === obj.sourceCol)}.finalType`, val)
    onChange(dataFields)
  }

  render() {
    let { value = [], loading } = this.props
    return (<Table
      rowKey="sourceCol"
      loading={loading}
      size="middle"
      columns={this.createTableColumns()}
      dataSource={value}
      scroll={{ y: 217 }}
      pagination={false}
            />)
  }
}
