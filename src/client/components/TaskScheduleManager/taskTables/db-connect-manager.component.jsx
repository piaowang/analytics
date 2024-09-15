import React from 'react'
import { PlusOutlined } from '@ant-design/icons';
import {Button, Input, Table,Modal} from 'antd'
import Bread from 'client/components/Common/bread'
import DbPopWindow from './db-connect-popwindow'
import {namespace} from './db-connect-model'
import {connect} from 'react-redux'


@connect(state => ({...state[namespace], ...state['sagaCommon']}))
class Dbconnectmanager extends React.Component {

  constructor(props, context) {
    super(props, context)
  }

  componentWillMount() {
    const {limit,search,offset} = this.props
    this.handleQueryList(search,limit,offset)
  }

  search = (search) => {
    const {limit} = this.props
    this.changeState({
      search,
      offset:0
    })
    this.handleQueryList(search,limit,0)
  }

  handleQueryList = (search,limit,offset) =>{
    this.props.dispatch({
      type: `${namespace}/queryList`,
      payload: {
        search,
        limit,
        offset
      }
    })
  }


  handleEditWindowOk = payload => {
    this.props.dispatch({
      type: `${namespace}/save`,
      payload
    })
  }

  handleDeleteWindowOk = payload =>{
    this.props.dispatch({
      type: `${namespace}/delete`,
      payload: payload.id
    })
  }

  handleSelectPage=page =>{
    const {limit,search} = this.props
    this.changeState({
      offset:page-1
    })
    this.handleQueryList(search,limit,page-1)
  }


  changeState = params => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload: params
    })
  }

  handleCancel = () => {
    this.changeState({
      editPopWindowVisible: false,
      deletePopWindowVisible:false
    })
  }

  showModal = () => {
    this.changeState({
      editPopWindowVisible: true,
      data: {
        db_type: 'MySQL'
      }
    })
  }

  deleteDataSource = (data)=>{
    this.changeState({
      deletePopWindowVisible: true,
      data
    })
  }

  editDataSource = data => {
    this.changeState({
      editPopWindowVisible: true,
      data
    })
  }


  render() {
    const {editPopWindowVisible,deletePopWindowVisible, data, dataSource, sum,offset} = this.props

    let tableColumns = [{
      title: '别名',
      dataIndex: 'db_alais',
      key: 'db_alais'
    }, {
      title: '用户名称',
      key: 'db_user',
      dataIndex: 'db_user'
    }, {
      title: '数据库类型',
      key: 'db_type',
      dataIndex: 'db_type'
    }, {
      title: '默认数据库名称',
      key: 'default_db',
      dataIndex: 'default_db'
    }, {
      title: '端口号',
      key: 'db_port',
      dataIndex: 'db_port'
    }, {
      title: 'ip地址',
      key: 'db_ip',
      dataIndex: 'db_ip'
    }, {
      title: '状态',
      key: 'status_name',
      dataIndex: 'status_name'
    }, {
      title: '操作',
      key: 'op',
      className: 'aligncenter',
      //
      render: (v, obj) =>
        (<div>
          <Button type="primary" className="mg1r" onClick={() => this.editDataSource(obj)}>编辑</Button>
          <Button type="primary" onClick={() => this.deleteDataSource(obj)}>删除</Button>
        </div>)
    }]

    return (
      <div className="height-100 bg-white">
        <Bread path={[{name: '数据库连接管理'}]}/>
        {/* ==================*/}
        <div className="pd3x pd2y">
          <div className="itblock width200 mg1l">
            <Input
              placeholder="请输入数据库表名称"
              onChange={(e) => this.search(e.target.value)}
            />
          </div>
          <div className="fright">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={this.showModal}
            >创建数据库连接</Button>
          </div>
        </div>
        {/* ==================*/}
        <div className="pd3x">
          <Table
            bordered
            size="small"
            rowKey="id"
            columns={tableColumns}
            dataSource={dataSource}
            pagination={{
              total: sum,
              showSizeChanger: true,
              defaultPageSize: 10,
              current: offset+1,
              onChange: (page) => this.handleSelectPage(page),
              showTotal: (total, range) => `总计 ${sum} 条，当前展示第 ${range.join('~')} 条`
            }}

          />

          <DbPopWindow
            visible={editPopWindowVisible}
            handleCancel={this.handleCancel}
            data={data}
            handleOk={this.handleEditWindowOk}
            changeProp={this.changeState}
          />

          <Modal
            title="删除数据库连接"
            visible={deletePopWindowVisible}
            onOk={()=>this.handleDeleteWindowOk(data)}
            onCancel={this.handleCancel}
          >
            <p>是否删除{data.db_alais}数据库连接?</p>

          </Modal>


        </div>
      </div>
    );

  }
}


export default Dbconnectmanager
