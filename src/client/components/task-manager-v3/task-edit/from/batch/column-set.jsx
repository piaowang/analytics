/**
 * 批量采集配置-字段设置
 */
import React, { Component } from 'react'
import { Popconfirm, Table, Button, Tooltip, Input, Modal } from 'antd'
import { CloseCircleOutlined } from '@ant-design/icons'
import _ from 'lodash'

import NoUseColumn from './no-use-column'

export default class ColumnSet extends Component {
  constructor(props) {
    super(props)
    this.state = {
      originSource: [],
      showAddColumnVisiable: false, // 添加列模态框
      dataSource: [],
      noUseList: [] // 未使用的列
    }
  }

  componentDidMount() {
    const { isHive } = this.props
    let obj = this.props.columnData || []
    // 不存在字段时,默认展示所有字段
    _.isEmpty(this.props.columnData) &&
      this.props.columnList?.map((item, i) => {
        obj.push({
          id: i + 1,  
          sourceCol: item.name,
          sourceType: item.type,
          sourceComment: item.comment,
          finalCol: item.name,
          finalType: isHive ? 'string' : item.type,
          finalComment: item.comment
        })
      })
    this.setState({
      dataSource: obj
    })
  }

  showAdd = () => {
    const { dataSource } = this.state
    let obj = []
    // 统计哪些字段被删掉了
    this.props.columnList?.map((item, i) => {
      let flag = false
      dataSource.map((it, k) => {
        if (it.sourceCol === item.name) {
          flag = true
        }
      })
      if (!flag) obj.push(item)
    })
    this.setState({
      showAddColumnVisiable: true,
      noUseList: obj
    })
  }

  handleOk = () => {
    let obj = [], i = 1
    const { dataSource } = this.state
    this.refs.noUseColumn.state.checkData?.map(value => {
      let item = _.filter(this.props.columnList, p => p.name === value)[0]

      let newData = {
        id: dataSource.length > 0 ? _.maxBy(dataSource, p => p.id).id + i++ : 1,
        sourceCol: item.name,
        sourceType: item.type,
        sourceComment: item.comment,
        finalCol: '',
        finalType: '',
        finalComment: ''
      }
      obj.push(newData)
    })

    this.setState(
      {
        showAddColumnVisiable: false,
        dataSource: [...this.state.dataSource, ...obj]
      },
      () => {
        this.props.changeDataSource(this.props.id, this.state.dataSource)
      }
    )
  }

  // 监控每一行数据的改变
  changeValue = (id, key, value) => {
    const { dataSource } = this.state
    dataSource.map(item => {
      if (item.id === id) {
        item[key] = value
      }
    })
    this.setState(
      {
        dataSource
      },
      () => {
        // 将改变的值同步到表行数据里
        this.props.changeDataSource(this.props.id, this.state.dataSource)
      }
    )
  }

  handleDelete = id => {
    this.setState(
      {
        dataSource: _.filter(this.state.dataSource, item => item.id !== id)
      },
      () => {
        this.props.changeDataSource(this.props.id, this.state.dataSource)
      }
    )
  }

  render() {
    const { disabled } = this.props

    const columns = [
      {
        title: '源字段名称',
        dataIndex: 'sourceCol',
        align: 'center',
        width: '15%'
      },
      {
        title: '源数据类型',
        dataIndex: 'sourceType',
        align: 'center',
        width: '10%'
      },
      {
        title: '字段描述',
        dataIndex: 'sourceComment',
        align: 'center',
        width: '22%'
      },
      {
        title: '目标字段名称',
        dataIndex: 'finalCol',
        align: 'center',
        width: '15%',
        render: (text, record) => {
          return <Input value={text} disabled={disabled} onChange={e => this.changeValue(record.id, 'finalCol', e.target.value)} />
        }
      },
      {
        title: '目标字段类型',
        dataIndex: 'finalType',
        align: 'center',
        width: '10%',
        render: (text, record) => {
          return <Input value={text} disabled={disabled} onChange={e => this.changeValue(record.id, 'finalType', e.target.value)} />
        }
      },
      {
        title: '目标字段描述',
        dataIndex: 'finalComment',
        align: 'center',
        width: '22%',
        render: (text, record) => {
          return <Input value={text} disabled={disabled} onChange={e => this.changeValue(record.id, 'finalComment', e.target.value)} />
        }
      },
      {
        title: '删除',
        dataIndex: 'operator',
        align: 'center',
        width: '6%',
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
    const { dataSource, showAddColumnVisiable, noUseList } = this.state
    return (
      <div>
        <div className='mg2'>
          <Button type='primary' disabled={disabled} onClick={() => this.showAdd()}>
            添加行
          </Button>
        </div>
        <Table
          bordered
          rowKey='id'
          dataSource={dataSource}
          columns={columns}
          size='middle'
          pagination={{
            showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`,
            total: dataSource.length,
            showSizeChanger: true,
            defaultPageSize: 10
          }}
        />
        <Modal
          title='添加字段'
          visible={showAddColumnVisiable}
          width={500}
          onCancel={() => {
            this.setState({
              showAddColumnVisiable: false
            })
          }}
          onOk={this.handleOk}
        >
          <NoUseColumn noUseList={noUseList} key={noUseList} ref='noUseColumn' />
        </Modal>
      </div>
    )
  }
}
