import React from 'react'
import { DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import {
  Tooltip,
  Table,
  Spin,
  message,
  Popconfirm,
  Input,
  Button,
  Modal,
  Select,
  Tag
} from 'antd'
import _ from 'lodash'
import { filterPermission } from '../constants'
import menuData from '../../Home/menu-data'
import { getRes } from '../../../databus/datasource'
import AddBtn from '../add-btn'
import Fetch from '../../../common/fetch-final'
import moment from 'moment'
import { browserHistory } from 'react-router'
import flatMenusType from '../../../../common/flatMenus.js'
import { checkPermission } from '../../../common/permission-control'
//为了兼容没有审核功能的权限，使用旧权限判断
const canAdd = checkPermission('/console/security/role/new')
const canEdit = checkPermission('post:/app/role/update')
const canDel = checkPermission('post:/app/role/delete')

const menus = menuData()

export default class Rolelist extends React.Component {
  state = {
    search: '',
    status: '',
    name: '',
    copyVisible: false,
    userVisible: false,
    curRole: {},
    modalVisible: false,
    copyDataSource: {},
    listData: [],
    pageSize: 30,
    page: 0,
    isSearch: false,
    userList:[]
  };

  componentDidMount() {
    this.getData()
  }
  getData = async () => {
    const { pageSize, page, search, status, isSearch } = this.state
    let data = { pageSize, page, search: '', status: '' }
    if (isSearch) data = { pageSize, page, search, status }
    let res = await Fetch.post('/app/role-draft/getRoleDraft', data)
    this.setState({
      listData: res.result.rows,
      total: res.result.count
    })
  };

  delRole = async id => {
    let res = await Fetch.post('/app/role-draft/delete', { id })
    if (res.success) {
      message.success('删除成功')
      this.getData()
    }
  };

  searchValue = e => {
    this.setState({
      search: e.target.value
    })
  };

  getRoles = role => {
    let permissions = filterPermission(this.props.permissions)
    if (role.type !== 'built-in') {
      permissions = permissions.filter(p => role.funcPermissions.includes(p.id))
    }
    let groupSort = window.sugo.enableNewMenu ? flatMenusType(menus, 'title') 
      : _.flatMap(menus, m => _.map(m.children, p => p.title))
    let groupTree = _.groupBy(permissions, 'group')
    let arr = _.keys(groupTree).map(group => {
      let values = groupTree[group]
      return {
        group,
        class: values[0].class,
        rowSpan: {},
        values
      }
    })
    arr = _.orderBy(arr, p => _.indexOf(groupSort, p.group))
    let res = arr.length ? (
      arr.map((p, i) => (
        <div className="pd1" key={i + '@pl'}>
          <span className="bold mg1r">{p.group}:</span>
          {_.join(
            p.values.map(perm => perm.title),
            '; '
          )}
        </div>
      ))
    ) : (
      <p style={{ marginLeft: 20 }}>当前用户无权限</p>
    )
    return (
      <div>
        <h3 className="pd1">功能权限列表</h3>
        {res}
      </div>
    )
  };

  saveCache = ug => {
    this.setState({
      item: ug,
      copyVisible: true
    })
  };

  getDataSources = async roleId => {
    // 获取用户数据权限
    let res = await getRes()
    if (!res) return
    let update = res.result
    let { dimensions, measures } = update
    let { datasources } = this.props

    let datasourceIds = datasources
      .filter(ds => {
        return ds.role_ids.includes(roleId)
      })
      .map(ds => ds.id)
    let dimensionIds = dimensions
      .filter(ds => {
        return ds.role_ids.includes(roleId)
      })
      .map(ds => ds.id)
    let measureIds = measures
      .filter(ds => {
        return ds.role_ids.includes(roleId)
      })
      .map(ds => ds.id)
    // 如果用户操作过快是否会出现查询未结束就进行创建操作?
    this.setState({
      copyDataSource: {
        datasourceIds: datasourceIds || [],
        dimensionIds: dimensionIds || [],
        measureIds: measureIds || []
      }
    })
  };

  fixStatus(val) {
    switch (val.status) {
      case -1:
        return <Tag color="red">未提交</Tag>
      case 0:
        if(val.operationType === 1){
          return <Tag color="#f90">新增待审核</Tag>
        }else if(val.operationType === 2){
          return <Tag color="#f80">编辑待审核</Tag>
        }
        return <Tag color="#f50">删除待审核</Tag>
      case 1:
        return <Tag color="#87d068">正常</Tag>
      default:
        return <Tag color="#108ee9">已拒绝</Tag>
    }
  }
  fixBtn(item) {
    const type = item.check_detail.status
    switch (type) {
      case -1:
        return (
          <span
            className="btn-span blue"
            onClick={() => this.checkFun(item.id, 1)}
            type="primary"
            size="small"
          >
            提交审核
          </span>
        )
      case 0:
        return (
          <span
            className="btn-span blue"
            onClick={() => this.checkFun(item.id, 0)}
            type="primary"
            size="small"
          >
            撤销审核
          </span>
        )
      default:
        return ''
    }
  }
  //审核
  async checkFun(id, type = 1) {
    let res = await Fetch.post('/app/role-draft/commitCheck', { id, type })
    if (res) {
      message.success('操作成功')
    }
    this.getData()
  }
  changeType = val => {
    this.setState({
      status: val
    })
  };
  renderCheckType = () => {
    const list = [
      {
        id: -1,
        name: '未提交'
      },
      {
        id: 1,
        name: '正常'
      },
      {
        id: 'add',
        name: '新增待审核'
      },
      {
        id: 'edit',
        name: '编辑待审核'
      },
      {
        id: 'del',
        name: '删除待审核'
      }
    ]
    const Option = Select.Option
    return (
      <Select
        allowClear={false}
        value={this.state.status}
        onChange={this.changeType}
        className="itblock width200 mg1r"
      >
        <Option key="fil-none" value={''}>
          请选择审核类型
        </Option>
        {list.map(role => {
          let { name, id } = role
          return (
            <Option key={`fil-${id}`} value={id}>
              {name}
            </Option>
          )
        })}
      </Select>
    )
  };
  handleOk = async () => {
    if (this.state.name) {
      this.state.item.name = this.state.name
      let res = await Fetch.post('/app/role-draft/copyRole', {
        role: this.state.item
      })
      if (res) {
        message.success('操作成功')
        this.handleCancel()
      }
      this.getData()
      return false
    }
    message.error('角色名称不能为空！')
  };
  handleCancel = () => {
    this.setState({
      copyVisible: false,
      item: null,
      name: ''
    })
  };
  changeName(obj) {
    this.setState({
      name: obj.target.value
    })
  }
  userhandleCancel = ()=>{
    this.setState({
      userVisible: false
    })
  }
  userListDom(){
    const { userList } = this.state
    return (
      <Modal
        title="关联用户"
        footer={null}
        visible={this.state.userVisible}
        onCancel={this.userhandleCancel}
      >
        <div className="user-box-list">
          {userList.map((val,index)=>{
            return <Tag key={index} color="blue">{val.SugoUser.username}</Tag>
          })}
        </div>
      </Modal>
    )
  }
  copyDom() {
    const tailLayout = {
      wrapperCol: { offset: 4, span: 18 }
    }
    return (
      <Modal
        title="复制角色"
        visible={this.state.copyVisible}
        onOk={this.handleOk}
        onCancel={this.handleCancel}
      >
        <Form name="basic" className="copy-from">
          <Form.Item
            {...tailLayout}
            label="角色名称"
            name="name"
            rules={[{ required: true, message: '角色名称不能为空' }]}
          >
            <Input
              placeholder="请输入角色名称"
              onChange={val => this.changeName(val)}
              value={this.state.name}
            />
          </Form.Item>
        </Form>
      </Modal>
    )
  }
  async searchFun() {
    this.setState(
      {
        page: 0,
        isSearch: true
      },
      () => {
        this.getData()
      }
    )
  }
  changePage = page => {
    this.setState({ page },()=>{
      this.getData()
    })
  }
  getUserList = (list)=>{
    this.setState({
      userVisible:true,
      userList:list
    })
  }

  columns = [
    {
      title: '角色',
      dataIndex: 'name',
      key: 'name',
      render(text) {
        return <Tooltip placement="topLeft">{text}</Tooltip>
      }
    },
    {
      title: '所属机构',
      dataIndex: 'ins_detail',
      key: 'ins_detail',
      render(val) {
        return val.map(it => {
          return it.name + ','
        })
      }
    },
    {
      title: '用户数',
      dataIndex: 'userRole',
      key: 'userRole',
      render:(val)=> {
        if (!val.length) return '没有绑定用户'
        return (
          <Tooltip placement="topLeft" title="查看用户组用户">
            <span
              className="pointer p-blue"
              onClick={()=>this.getUserList(val)}
            >
              {val.length}(查看用户)
            </span>
          </Tooltip>
        )
      }
    },
    {
      title: '启用状态',
      dataIndex: 'status',
      key: 'status',
      render(val) {
        if (val) return '启用'
        return '停用'
      }
    },
    {
      title: '备注',
      dataIndex: 'description',
      key: 'description',
      render(text) {
        return text ? (
          <Tooltip placement="topLeft" title={text}>
            <div className="mw300 elli">{text}</div>
          </Tooltip>
        ) : null
      }
    },
    {
      title: '审核状态',
      dataIndex: 'check_detail',
      key: 'check_detail',
      render: val => {
        return val ? (
          <Tooltip placement="topLeft">
            <div className="mw300 elli">{this.fixStatus(val)}</div>
          </Tooltip>
        ) : null
      }
    },
    {
      title: '最近更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render(val) {
        return val ? (
          <Tooltip placement="topLeft">
            <div className="mw300 elli">{moment(val).format('YYYY-MM-DD HH:mm:ss')}</div>
          </Tooltip>
        ) : null
      }
    },
    {
      title: '更新人',
      dataIndex: 'change_user',
      key: 'change_user',
      render(val) {
        return val ? (
          <Tooltip placement="topLeft">
            <div className="mw300 elli">{val.username}</div>
          </Tooltip>
        ) : null
      }
    },
    {
      title: <div className="aligncenter">操作</div>,
      key: 'op',
      render: (text, ug) => {
        if (ug.type === 'built-in') return null
        return (
          <div className="aligncenter ctr-box-span">
            {canAdd && (
              <span
                className="btn-span blue"
                onClick={() => {
                  this.saveCache(ug)
                }}
              >
              复制
              </span>
            )}
            
            {(ug.check_detail.status === -1 || ug.check_detail.status === 1) && canEdit ? (
              <span className="btn-span blue" onClick={()=>browserHistory.push(`/console/security/role/${ug.id}`)}>编辑</span>
            ) : null}

            {(ug.check_detail.status === -1 || ug.check_detail.status === 1 ) && canDel ? (
              <Popconfirm
                title={`确定删除“${ug.name}”记录吗？`}
                placement="topLeft"
                onConfirm={() => this.delRole(ug.id)}
              >
                <span className="btn-span blue">删除</span>
              </Popconfirm>
            ) : null}

            {this.fixBtn(ug)}
          </div>
        )
      }
    }
  ]
  render() {
    let { loading } = this.props
    let { search, listData, total, pageSize } = this.state
    const pagination = {
      total,
      defaultPageSize: pageSize,
      onChange: this.changePage,
      showTotal: total => `共 ${total} 条数据`
    }

    return (
      <Spin spinning={loading}>
        <div className="roles-lists pd2y pd3x">
          <div className="pd2b">
            <div className="fix">
              <div className="fleft">
                {this.renderCheckType()}
                <Input
                  onChange={this.searchValue}
                  value={search}
                  placeholder="搜索"
                  className="iblock width260 mg1l"
                />
                <Button
                  className="mg2r mg2l"
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={() => this.searchFun()}
                >
                  搜索
                </Button>
                <Button
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    this.setState(
                      {
                        search: '',
                        status: '',
                        isSearch: false,
                        page: 0
                      },
                      () => {
                        this.getData()
                      }
                    )
                  }}
                >
                  清空
                </Button>
              </div>
              <div className="fright">
                <AddBtn {...this.props} />
              </div>
            </div>
          </div>
          <div className="table-mar">
            <Table
              columns={this.columns}
              pagination={pagination}
              dataSource={listData}
              rowKey="id"
              bordered
              expandedRowRender={(role)=>this.getRoles(role)}
              
            />
          </div>
          {this.copyDom()}
          {this.userListDom()}
        </div>
      </Spin>
    )
  }
}
