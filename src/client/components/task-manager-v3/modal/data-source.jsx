import React from 'react'
import { SearchOutlined } from '@ant-design/icons'
import { Table, Button, Tabs, Checkbox, Modal, Input, Popconfirm } from 'antd'
import { connect } from 'react-redux'
import CreateConnect from './create-connect'
import { checkPermission } from '../../../common/permission-control'
import './data-source.styl'

const { TabPane } = Tabs

@connect(({ TaskProjectModel }) => ({
  ...TaskProjectModel
}))
class DataSource extends React.Component {
  state = {
    tab: 'add'
  }
  // eslint-disable-next-line react/sort-comp
  columns = [
    {
      title: '别名',
      dataIndex: 'dbAlais',
      key: 'dbAlais',
      align: 'center',
      width: 150
    },
    {
      title: '用户名称',
      key: 'dbUser',
      dataIndex: 'dbUser',
      align: 'center',
      width: 100
    },
    {
      title: '数据库类型',
      key: 'dbType',
      dataIndex: 'dbType',
      align: 'center',
      width: 100
    },
    {
      title: 'ip地址',
      key: 'connectUrl',
      dataIndex: 'connectUrl',
      align: 'left',
      width: 250
    },
    {
      title: '操作',
      align: 'center',
      width: 100,
      render: (text, record) => {
        return !this.showDelCheckDB ? (
          ''
        ) : (
          <Popconfirm placement='top' title='确定删除该连接吗？' onConfirm={() => this.onDelDB(record)} okText='确定' cancelText='取消'>
            <a>删除</a>
          </Popconfirm>
        )
      }
    }
  ]

  componentDidMount() {
    const { projectId, dispatch } = this.props
    dispatch({
      type: 'TaskProjectModel/getUsedDB',
      payload: { projectId }
    })
    this.showCreateAndUseDB = checkPermission('app/task-v3/createAndUseDB')
    this.showDelCheckDB = checkPermission('app/task-v3/delCheckDB')
  }

  onRef = child => {
    this.child = child
  }

  onDelDB = record => {
    const { projectId, dispatch } = this.props
    dispatch({
      type: 'TaskProjectModel/delCheckDB',
      payload: { projectId, dbIds: record.id }
    })
  }

  changeState = payload => {
    this.props.dispatch({
      type: 'TaskProjectModel/changeState',
      payload
    })
  }

  onSubmit = async () => {
    const { tab } = this.state
    const { useDbIds, projectId } = this.props
    if (tab === 'create') {
      this.child.handleSubmit()
    } else if (tab === 'add') {
      this.props.dispatch({
        type: 'TaskProjectModel/updateCheckDB',
        payload: { projectId, dbIds: useDbIds.join(',') }
      })
    }
  }

  // checkbox
  onChaOptions = values => {
    this.changeState({
      useDbIds: values
    })
  }

  // 搜索数据库
  onSearchDB = async value => {
    this.changeState({
      search: value
    })
  }

  onChaSearch = e => {
    const { value } = e.target
    this.changeState({
      search: value
    })
  }

  onShowModal = () => {
    this.changeState({
      isShowDBConnectModal: true
    })
  }

  onCloseModal = () => {
    this.changeState({
      isShowDBConnectModal: false,
      search: ''
    })
  }

  // eslint-disable-next-line react/sort-comp
  render() {
    const { useDbList } = this.props
    return (
      <React.Fragment>
        {!this.showCreateAndUseDB ? (
          ''
        ) : (
          <div className='pd2b'>
            <Button value='creat' onClick={this.onShowModal}>
              添加数据源链接
            </Button>
          </div>
        )}

        <Table rowKey='id' size='middle' bordered dataSource={useDbList} columns={this.columns} pagination={false} scroll={{ y: 600 }} />
        {this.renderModal()}
      </React.Fragment>
    )
  }

  renderModal = () => {
    const { dbList, isShowDBConnectModal, search, useDbIds, projectId } = this.props
    const filList = search !== '' ? dbList.filter(p => p.label.includes(search)) : dbList
    return (
      <Modal maskClosable={false} title={'添加数据源链接'} visible={isShowDBConnectModal} onCancel={this.onCloseModal} onOk={this.onSubmit} width={700}>
        <div>
          {dbList.length > 0 ? (
            <Input
              placeholder='请输入数据库别名'
              style={{ width: 200 }}
              className='mg2b'
              onChange={this.onChaSearch}
              value={search}
              suffix={<SearchOutlined style={{ color: '#333' }} />}
            />
          ) : (
            <div>请联系管理员授权数据源给当前项目</div>
          )}
          <Checkbox.Group options={filList} value={useDbIds} onChange={this.onChaOptions} className='checkbox' style={{ display: 'block' }} />
        </div>
      </Modal>
    )
  }
}

export default DataSource
