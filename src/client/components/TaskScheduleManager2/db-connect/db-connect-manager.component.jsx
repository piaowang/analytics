import React from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { Button, Input, Table, Modal, Popconfirm } from 'antd'
import Bread from 'client/components/Common/bread'
import DbPopWindow from './db-connect-popwindow'
import { namespace } from './db-connect-model'
import { connect } from 'react-redux'
import moment from 'moment'
import AuthorizeModal from './db-connect-authorize-modal'
import { checkAdmin } from '../../../../common/user-role-checker'

@connect(state => ({ ...state[namespace], ...state['sagaCommon'] }))
class Dbconnectmanager extends React.Component {
  constructor(props, context) {
    super(props, context)
  }

  componentDidMount() {
    const { limit, search, offset } = this.props
    this.handleQueryList(search, limit, offset)
  }

  search = search => {
    this.changeState({
      search,
      offset: 0
    })
  }

  handleQueryList = (search, limit, offset) => {
    this.props.dispatch({
      type: `${namespace}/getDataTables`,
      payload: {
        search,
        limit,
        offset
      }
    })
  }

  handleDeleteWindowOk = payload => {
    this.props.dispatch({
      type: `${namespace}/delete`,
      payload: payload.id
    })
  }

  changeState = params => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload: params
    })
  }

  getSchemaList = params => {
    this.props.dispatch({
      type: `${namespace}/getSchemaList`,
      payload: params
    })
  }

  handleCancel = () => {
    this.changeState({
      editPopWindowVisible: false,
      deletePopWindowVisible: false,
      isShowAuthorizeModal: false,
      authorizeList: []
    })
  }

  showModal = () => {
    this.changeState({
      editPopWindowVisible: true,
      data: {
        dbType: 'mysql'
      },
      schemaList: []
    })
  }

  editDataSource = data => {
    this.changeState({
      editPopWindowVisible: true,
      data,
      schemaList: []
    })
  }

  onClkAuthorize = data => {
    this.changeState({
      isShowAuthorizeModal: true,
      dbId: data.id
    })
    this.props.dispatch({
      type: 'dbConnect/fetAuthorizeList',
      payload: { dbId: data.id }
    })
  }

  onSaveAuthorize = dataList => {
    const { dispatch, dbId } = this.props
    dispatch({
      type: 'dbConnect/updateAuthorize',
      payload: { db_id: dbId, porjects: dataList.join(',') }
    })
    this.handleCancel()
  }

  handleTestConnect = payload => {
    const { dispatch } = this.props
    dispatch({
      type: 'dbConnect/testConnect',
      payload
    })
  }

  handleTestSyncPermission = payload => {
    const { dispatch } = this.props
    dispatch({
      type: 'dbConnect/testSyncPermission',
      payload
    })
  }

  render() {
    const {
      editPopWindowVisible,
      isShowAuthorizeModal,
      deletePopWindowVisible,
      data = {},
      authorizeInfo = [],
      authorizeList = [],
      dataSource = [],
      limit,
      sum,
      offset,
      search,
      schemaList,
      authorize
    } = this.props
    var newData = search ? dataSource.filter(p => p.dbAlais.indexOf(search) > -1) : _.cloneDeep(dataSource)
    let tableColumns = [
      {
        title: '别名',
        dataIndex: 'dbAlais',
        key: 'dbAlais'
      },
      {
        title: '数据库类型',
        key: 'dbType',
        dataIndex: 'dbType'
      },
      {
        title: '连接地址',
        key: 'connectUrl',
        dataIndex: 'connectUrl'
      },
      {
        title: '创建人',
        key: 'createUser',
        dataIndex: 'createUser'
      },
      {
        title: '创建时间',
        key: 'createTime',
        dataIndex: 'createTime',
        render: value => moment(value).format('YYYY-MM-DD HH:mm:ss')
      },
      {
        title: '更新时间',
        key: 'updateTime',
        dataIndex: 'updateTime',
        render: value => moment(value).format('YYYY-MM-DD HH:mm:ss')
      },
      {
        title: '操作',
        key: 'op',
        className: 'aligncenter',
        render: (v, obj) => {
          const { SugoRoles } = window.sugo.user
          const isAdmin = checkAdmin(SugoRoles)
          return (
            <div>
              {isAdmin && (
                <a type='primary' className='mg3r' onClick={() => this.onClkAuthorize(obj)}>
                  授权
                </a>
              )}

              <a type='primary' className='mg3r' onClick={() => this.editDataSource(obj)}>
                编辑
              </a>
              <Popconfirm placement='top' title='确定删除' onConfirm={() => this.handleDeleteWindowOk(obj)} okText='确定' cancelText='取消'>
                <a type='primary'>删除</a>
              </Popconfirm>
            </div>
          )
        }
      }
    ]

    return (
      <div className='height-100 bg-white '>
        <Bread path={[{ name: '数据源管理' }]} />
        <div className='scroll-content always-display-scrollbar'>
          <div className='pd3x pd2y'>
            <div className='itblock width200 mg1l'>
              <Input placeholder='请输入数据库别名' onChange={e => this.search(e.target.value)} />
            </div>
            <div className='fright'>
              <Button type='primary' icon={<PlusOutlined />} onClick={this.showModal}>
                创建数据库连接
              </Button>
            </div>
          </div>
          <div className='pd3x'>
            <Table
              bordered
              size='middle'
              rowKey='id'
              columns={tableColumns}
              dataSource={_.orderBy(newData, ['updateTime'], ['desc'])}
              pagination={{
                total: newData.length,
                showSizeChanger: true,
                defaultPageSize: 10,
                showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`
              }}
            />
            <DbPopWindow
              visible={editPopWindowVisible}
              handleCancel={this.handleCancel}
              changeProp={this.changeState}
              schemaList={schemaList}
              getSchemaList={this.getSchemaList}
              onTestConnect={this.handleTestConnect}
              onTestSyncPermission={this.handleTestSyncPermission}
            />
            <AuthorizeModal visible={isShowAuthorizeModal} handleCancel={this.handleCancel} handleOk={this.onSaveAuthorize} />
          </div>
        </div>
      </div>
    )
  }
}

export default Dbconnectmanager
