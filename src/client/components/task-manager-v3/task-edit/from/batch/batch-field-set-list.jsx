/**
 * 批量采集配置--table 字段设置
 */
import React, { Component } from 'react'
import { Form } from '@ant-design/compatible'
import { Table, Tooltip, Select, Input, Popconfirm, Modal, message } from 'antd'
import { CloseCircleOutlined, EyeOutlined } from '@ant-design/icons'
import Fetch from 'client/common/fetch-final'
import ColumnSet from './column-set'
import _ from 'lodash'
import { es } from 'sugo-license-manager/lib/encrypt-kit'
import './style.styl'

const Option = Select.Option

export default class BatchFieldSetList extends Component {
  constructor(props) {
    super(props)
    this.state = {
      showViewModal: false, // 查看模态框
      columnMap: {}, // 存放给行表对应的字段列
      columnList: [], // 存放查看框对应的字段列表,表有哪些字段
      columnData: [], // 存放查看框存放的字段列表,保留下来的字段
      customOpts: {} // 自定义 option
    }
  }

  componentDidMount() {
    this.props.setChild(this)
  }

  // 删除一行
  handleDelete = id => {
    this.props.setDataSource(_.filter(this.props.dataSource, item => item.id !== id))
  }

  // 打开
  handleView = async record => {
    let columnList = this.state.columnMap[record.datasource]
    // 如果不存在数据,则根据表名去获取字段列表
    if (_.isEmpty(columnList)) {
      const { dbId } = this.props
      let res = await Fetch.get(`/app/task-schedule-v3/dataBase?action=columnInfo&dbId=${dbId}&tableName=${record.datasource}`)

      if (!res || !res.status || res.status !== 'success') {
        message.error('获取数据库表信息失败！')
        return
      }
      this.setState({
        columnMap: {
          ...this.state.columnMap,
          [record.datasource]: _.get(res, 'columnList', []) || []
        }
      })
      columnList = _.get(res, 'columnList', [])
    }

    this.setState({
      viewId: record.id,
      viewRecord: record,
      columnList: columnList,
      columnData: record?.columnList || [],
      showViewModal: !this.state.showViewModal
    })
  }

  // 点击增量字段、主键字段时判断字段是否有数据
  getColumnList = async record => {
    let columnList = this.state.columnMap[record.datasource]
    if (_.isEmpty(columnList)) {
      const { dbId } = this.props
      let res = await Fetch.get(`/app/task-schedule-v3/dataBase?action=columnInfo&dbId=${dbId}&tableName=${record.datasource}`)

      if (!res || !res.status || res.status !== 'success') {
        message.error('获取数据库表信息失败！')
        return
      }
      this.setState({
        columnMap: {
          ...this.state.columnMap,
          [record.datasource]: _.get(res, 'columnList', []) || []
        }
      })
    }
  }

  // 监控每一行数据的改变
  changeValue = (id, key, value) => {
    const { dataSource } = this.props
    dataSource.map(item => {
      if (item.id === id) {
        // 源表名
        if (key === 'datasource') {
          if (_.isEmpty(value)) {
            item.datasourceFlag = true
          } else {
            item.datasourceFlag = false
          }
        }
        // 目标表名
        if (key === 'toDataSource') {
          if (_.isEmpty(value)) {
            item.toDataFlag = true
          } else {
            item.toDataFlag = false
          }
        }
        if (key === 'collectType' && value === 'full') {
          item.offsetFlag = false
        }
        // 增量字段
        if (key === 'offsetSpec') {
          if (_.isEmpty(value)) {
            item.offsetFlag = true
          } else {
            item.offsetFlag = false
          }
        }
        item[key] = value
      }
    })
    this.props.setDataSource(dataSource)
  }

  // 监控查看字段列表数据的变动
  changeDataSource = (id, columnItem) => {
    const { dataSource } = this.props
    dataSource.map(item => {
      if (item.id === id) {
        item['columnList'] = columnItem
      }
    })
    this.props.setDataSource(dataSource)
  }

  // 根据表变动查询字段列表
  getColumnsInfo = async (id, key, value) => {
    const { dbId } = this.props
    this.changeValue(id, key, value)
    // 去除主键字段选好的值
    this.changeValue(id, 'primaryKeys', '')
    this.changeValue(id, 'offsetSpec', '')
    this.changeValue(id, 'offsetFlag', false)

    let res = await Fetch.get(`/app/task-schedule-v3/dataBase?action=columnInfo&dbId=${dbId}&tableName=${value}`)

    if (res && res.status && res.status === 'success') {
      this.setState({
        columnMap: {
          ...this.state.columnMap,
          [value]: _.get(res, 'columnList', []) || []
        }
      })
      return
    }
    message.error('获取数据库表信息失败！')
  }

  handleSearchChange = (value, index) => {
    this.setState({
      customOpts: {
        ...this.state.customOpts,
        [index]: value
      }
    })
  }

  createTableColumns = () => {
    const { dataTables, disabled, dataSource } = this.props
    const { columnMap } = this.state
    return [
      {
        title: '源表名',
        dataIndex: 'datasource',
        align: 'center',
        className: 'columnStyle',
        width: 120,
        render: (text, record, index) => {
          let customOpt = this.state.customOpts[record.id]
          // 控制导入表名存在时,去重
          if (customOpt && _.some(dataTables, ['tableName', customOpt])) {
            customOpt = ''
          }
          let tableList = dataTables || []
          dataSource.map(item => {
            if (item.id !== record.id && !_.isEmpty(item.datasource)) {
              tableList = tableList.filter(value => value.tableName != item.datasource)
            }
          })
          return (
            <div>
              <Select
                disabled={disabled}
                showSearch
                allowClear
                defaultValue={text}
                style={{ border: `${record.datasourceFlag ? '1px solid red' : 'none'}`, borderRadius: '4px' }}
                onSearch={val => this.handleSearchChange(val, record.id)}
                onChange={val => this.getColumnsInfo(record.id, 'datasource', val)}
              >
                {[
                  ...tableList.map(item => (
                    <Option key={item.tableName} value={item.tableName}>
                      {item.tableName}
                    </Option>
                  )),
                  customOpt ? (
                    <Option key={customOpt} value={customOpt}>
                      {customOpt}
                    </Option>
                  ) : (
                    []
                  )
                ]}
              </Select>
              {record.datasourceFlag && <span style={{ color: 'red' }}>必填</span>}
            </div>
          )
        }
      },
      {
        title: '目标表名',
        dataIndex: 'toDataSource',
        className: 'columnStyle',
        align: 'center',
        width: 120,
        render: (text, record) => {
          return (
            <div>
              <Input
                value={text}
                disabled={disabled}
                style={{ border: `1px solid ${record.toDataFlag ? 'red' : '#d9d9d9'}` }}
                onChange={e => this.changeValue(record.id, 'toDataSource', e.target.value)}
              />
              {record.toDataFlag && <span style={{ color: 'red' }}>必填</span>}
            </div>
          )
        }
      },
      {
        title: 'sql条件查询过滤语句',
        dataIndex: 'filterSql',
        className: 'columnStyle',
        align: 'center',
        width: 260,
        render: (text, record) => {
          return <Input value={text} disabled={disabled} onChange={e => this.changeValue(record.id, 'filterSql', e.target.value)} />
        }
      },
      {
        title: '字段',
        dataIndex: 'columnInfo',
        align: 'center',
        width: 60,
        render: (text, record) => {
          return (
            <Tooltip title='查看'>
              <EyeOutlined onClick={() => this.handleView(record)} style={{ fontSize: '22px', color: '#2fecec' }} />
            </Tooltip>
          )
        }
      },
      {
        title: '采集方式',
        dataIndex: 'collectType',
        align: 'center',
        width: 80,
        className: 'columnStyle',
        render: (text, record) => {
          return (
            <Select defaultValue={text} disabled={disabled} onChange={value => this.changeValue(record.id, 'collectType', value)}>
              <Option value='full'>全量采集</Option>
              <Option
                value='
              '
              >
                增量采集
              </Option>
            </Select>
          )
        }
      },
      {
        title: '增量字段',
        dataIndex: 'offsetSpec',
        align: 'center',
        className: 'columnStyle',
        width: 130,
        render: (text, record) => {
          return (
            <div>
              <Tooltip title='只可选有序类型'>
                <Select
                  allowClear
                  key={record.datasource}
                  defaultValue={text}
                  style={{ border: `${record.offsetFlag ? '1px solid red' : 'none'}`, borderRadius: '4px' }}
                  disabled={record.collectType === 'full' || disabled}
                  onChange={value => this.changeValue(record.id, 'offsetSpec', value)}
                  onClick={() => this.getColumnList(record)}
                >
                  {columnMap[record.datasource]?.map(p => (
                    <Option key={p.name} value={p.name}>
                      {p.name + ':' + p.type}
                    </Option>
                  ))}
                </Select>
              </Tooltip>
              {record.offsetFlag && <span style={{ color: 'red' }}>必填</span>}
            </div>
          )
        }
      },
      {
        title: '主键字段',
        dataIndex: 'primaryKeys',
        align: 'center',
        className: 'columnStyle',
        width: 130,
        render: (text, record) => {
          return (
            <Select
              allowClear
              mode='multiple'
              key={record.datasource}
              defaultValue={text ? text : []}
              disabled={disabled}
              onChange={value => this.changeValue(record.id, 'primaryKeys', value)}
              onClick={() => this.getColumnList(record)}
            >
              {columnMap[record.datasource]?.map(p => (
                <Option key={p.name} value={p.name}>
                  {p.name + ':' + p.type}
                </Option>
              ))}
            </Select>
          )
        }
      },
      {
        title: '操作',
        dataIndex: 'operator',
        align: 'center',
        width: 60,
        render: (text, record) => {
          return (
            <Popconfirm disabled={disabled} title='确认删除吗？' onConfirm={() => this.handleDelete(record.id)}>
              <Tooltip title='删除'>
                <CloseCircleOutlined style={{ fontSize: '22px', color: '#f96464' }} />
              </Tooltip>
            </Popconfirm>
          )
        }
      }
    ]
  }

  render() {
    const { dataSource, total = 0, dataTables, disabled, isHive, dbId } = this.props
    const { showViewModal, viewId, viewRecord, columnList, columnData } = this.state

    return (
      <div>
        <Table
          className='batchTable'
          bordered
          rowKey='id'
          dataSource={dataSource}
          columns={this.createTableColumns()}
          size='middle'
          style={{ width: '93%', margin: 'auto' }}
          pagination={{
            showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`,
            total: dataSource.length,
            showSizeChanger: true,
            defaultPageSize: 10
          }}
        />

        <Modal
          title='字段设置'
          visible={showViewModal}
          width={1080}
          onCancel={() => {
            this.setState({ showViewModal: false })
          }}
          footer={null}
        >
          <ColumnSet
            key={isHive + viewRecord?.datasource}
            id={viewId}
            isHive={isHive}
            disabled={disabled}
            columnList={columnList}
            columnData={columnData}
            changeDataSource={this.changeDataSource}
          />
        </Modal>
      </div>
    )
  }
}
