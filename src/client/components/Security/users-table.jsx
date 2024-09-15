import React from 'react'
import '@ant-design/compatible/assets/index.css'
import { DeleteOutlined, PlusCircleOutlined, SearchOutlined } from '@ant-design/icons'
import {
  Tooltip,
  Table,
  Spin,
  message,
  Popconfirm,
  Input,
  Button,
  Select,
  Pagination,
  Tag
} from 'antd'
import UserModal from './user-modal'
import _ from 'lodash'
import { checkPermission } from '../../common/permission-control'
import { enableSelectSearch } from '../../common/antd-freq-use-props'
import { browserHistory, Link } from 'react-router'
import { immutateUpdate } from '../../../common/sugo-utils'
import * as actions from '../../actions/institutions'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import InstitutionsPick from '../Institutions/Institutions-pick'
import CompareModal from './compare-modal'
import moment from 'moment'

const { Option } = Select
let canAdd = checkPermission('app/user/create')
let canDel = checkPermission('app/user/delete')
let canEdit = checkPermission('app/user/update')
const needAudit = _.get(window, 'sugo.enableDataChecking')

const getAuditStatusName = (record = {}) => {
  let { operationType, status } = record
  if (_.isUndefined(operationType) || _.isUndefined(status)) {
    return '异常'
  }

  switch (status) {
    case -1:
      return <Tag color="red">未提交</Tag>
    case 0:
      if(operationType === 1){
        return <Tag color="#f90">新增待审核</Tag>
      }else if(operationType === 2){
        return <Tag color="#f80">编辑待审核</Tag>
      }
      return <Tag color="#f50">删除待审核</Tag>
    case 1:
      return <Tag color="#87d068">正常</Tag>
    case 2:
      return <Tag color="#108ee9">已拒绝</Tag>
    default:
      return <Tag color="#108ee9">异常</Tag>
  }  
}

const limitMap = {
  username: 20,
  first_name: 200,
  email: 200
}


@connect(
  state => _.pick(state.common, ['institutionsList']),
  dispatch => bindActionCreators(actions, dispatch)
)
export default class Userlist extends React.Component {
  state = {
    user: {},
    modalVisible: false,
    pagination: {
      current: 1,
      defaultCurrent: 1,
      pageSize: 10,
      pageSizeOptions: ['10', '20'],
      showSizeChanger: true,
      total: 0,
      showTotal: total => `共${total}条`
    },
    search: '',
    viewVisible: false,
    audit_status: '',
    filterRoleId: '',
    institutionsId: '',
    timer: null
  };

  componentDidMount() {
    this.flashPage()
    // this.props.getUsersDraft(this.state.pagination,(res)=>{
    //   this.setTotal(res)
    // })
    this.props.getInstitutions()
  }

  setTotal(res) {
    let { count } = res
    this.setState(() => {
      return {
        ...this.state,
        pagination: {
          ...this.state.pagination,
          total: count
        }
      }
    })
  }

  changeViewVisible = (bl = true) => {
    this.setState({
      viewVisible: bl
    })
  };

  flashPage = () => {
    let {
      pagination,
      search,
      audit_status,
      filterRoleId,
      institutionsId
    } = this.state
    this.props.getUsersDraft(
      {
        ...pagination,
        search,
        audit_status,
        filterRoleId,
        institutionsId
      },
      res => {
        this.setTotal(res)
      }
    )
    // this.props.getUsersDraft(this.state.pagination,(res)=>{
    //   this.setTotal(res)
    // })
    this.props.getInstitutions()
  };

  onChange = e => {
    this.setState(
      {
        search: e.target.value
      },
      // () => {
      //   if (!needAudit) {
      //     return
      //   }
      //   if (timer) {
      //     clearTimeout(timer)
      //   }
      //   this.setState({
      //     timer: setTimeout(() => {
      //       this.flashPage()
      //     }, 500)
      //   })
      // }
    )
  };

  changeUserProp = prop => {
    let limit = limitMap[prop]
    return ev => {
      let value = _.has(ev, 'target') ? ev.target.value : ev
      if (
        prop === 'efficacy_at' ||
        prop === 'loss_efficacy_at'
      ) {
        return this.setState({
          user: immutateUpdate(this.state.user, prop, () => value && moment(value).format('YYYY-MM-DD') || undefined)
        })
      }
      this.setState({
        user: immutateUpdate(this.state.user, prop, () => 
        prop === 'institutions_id' || prop === 'status'
        ? value : value.slice(0, limit))
      })
    }
  };

  changeRole = roles => {
    let user = { ...this.state.user }
    this.setState({
      user: {
        ...user,
        roles: roles
      }
    })
  };

  newUser = () => {
    this.setState({
      modalVisible: true,
      user: {
        name: '',
        description: '',
        roles: []
      }
    })
  }

  edit = user => {
    return () => {
      this.setState({
        user,
        modalVisible: true
      })
    }
  };

  delUser = user => {
    return () =>
      this.props.delUser(user, res => {
        this.flashPage()
        if (res) message.success('删除成功', 5)
      })
  };

  hideModal = () => {
    this.setState({
      modalVisible: false
    })
  };

  cleanSearch = () =>{
    this.setState(()=>{
      return {
        ...this.state,
        pagination:{
          ...this.state.pagination,
          current:1
        },
        search: '',
        audit_status: '',
        filterRoleId: '',
        institutionsId: ''
      }
    },()=>{
      this.flashPage()
    })
  }

  onChangeRoleFilter = filterRoleId => {
    if (needAudit) {
      this.setState(() => {
        return {
          ...this.state,
          filterRoleId
        }
      }, 
        // this.flashPage
      )
      return
    }
    browserHistory.push(`/console/security/user?role=${filterRoleId}`)
  };

  onChangeStatusFilter = val => {
    if (needAudit) {
      this.setState(() => {
        return {
          ...this.state,
          audit_status: val
        }
      }, 
        // this.flashPage
      )
      return
    }
    browserHistory.push(`/console/security/user?audit_status=${val}`)
  };

  onChangeInstitutionsFilter = val => {
    if (needAudit) {
      this.setState(() => {
        return {
          ...this.state,
          institutionsId: val
        }
      }, 
        // this.flashPage
      )
      return
    }
    if (!val) {
      browserHistory.push('/console/security/user')
      return
    }
    browserHistory.push(`/console/security/user?institutionsId=${val}`)
  };

  onPaginationChange = (page, pageSize) => {
    this.setState(
      () => {
        return {
          ...this.state,
          pagination: {
            ...this.state.pagination,
            pageSize,
            current: page
          }
        }
      },
      () => {
        this.props.getUsersDraft(this.state.pagination, res => {
          this.setTotal(res)
        })
      }
    )
  };

  onShowSizeChange = (current, size) => {
    this.setState(
      () => {
        return {
          ...this.state,
          pagination: {
            ...this.state.pagination,
            pageSize: size,
            current
          }
        }
      },
      () => {
        this.props.getUsersDraft(this.state.pagination, res => {
          this.setTotal(res)
        })
      }
    )
  };

  renderRoleFilter = (roles, role) => {
    let { filterRoleId } = this.state
    return (
      <Select
        {...enableSelectSearch}
        allowClear={false}
        value={filterRoleId || role || ''}
        className="itblock width200 mg1r"
        onChange={this.onChangeRoleFilter}
      >
        <Option key="fil-none" value={''}>
          全部角色
        </Option>
        {roles.map(role => {
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

  renderStatusFilter = audit_status => {
    let options = [
      {
        title: '未提交',
        value: '*_-1'
      },
      {
        title: '正常',
        value: '*_1'
      },
      {
        title: '新增待审核',
        value: '1_0'
      },
      {
        title: '编辑待审核',
        value: '2_0'
      },
      {
        title: '删除待审核',
        value: '3_0'
      }
    ]

    let { audit_status: auditStatus } = this.state

    return (
      <Select
        className="itblock width200 mg1r"
        onChange={this.onChangeStatusFilter}
        value={auditStatus || audit_status || ''}
      >
        <Option key="fil-none" value={''}>
          所有审核类型
        </Option>
        {options.map(i => {
          return (
            <Select.Option key={i.value} value={i.value}>
              {i.title}{' '}
            </Select.Option>
          )
        })}
      </Select>
    )
  };

  render() {
    let {
      updateUser,
      addUser,
      users = [],
      usersDraft,
      loading,
      roles = [],
      institutionsList = []
    } = this.props
    let institutionsMap = _.keyBy(institutionsList, p => p.id)
    let { search, user, modalVisible, pagination, viewVisible } = this.state
    let { SugoRoles } = window.sugo.user
    let userRolesIds = SugoRoles.map(s => s.id)
    let isAdmin = _.some(SugoRoles, s => s.type === 'built-in')
    let {
      role: filterRoleId,
      institutionsId,
      audit_status
    } = this.props.location.query
    let filterRole = _.find(roles, { id: filterRoleId })

    const usersMapName = _.reduce(
      users,
      (total, current) => {
        total[current.id] = current.first_name
        return total
      },
      {}
    )

    let usersGroup = needAudit ? usersDraft : users

    // roles = isAdmin ? roles : roles.filter(r => userRolesIds.includes(r.id))
    // usersGroup = isAdmin
    //   ? usersGroup
    //   : usersGroup.filter(u => _.some(u.roles, r => userRolesIds.includes(r)))
    let users0 =
      ( search && !needAudit )
        ? usersGroup.filter(ug => {
          return (
            (ug.username + ug.first_name + ug.email)
              .toLowerCase()
              .indexOf(search.trim().toLowerCase()) > -1
          )
        })
        : usersGroup
    if (filterRoleId) {
      users0 = users0.filter(user => {
        return user?.roles?.map(r => r.id).includes(filterRoleId)
      })
    }
    if (institutionsId) {
      users0 = users0.filter(user => {
        return user.institutions_id === institutionsId
      })
    }
    if (audit_status) {
      if (!audit_status) {
        return
      }
      let arr = audit_status.split('_')
      users0 = users0.filter(user => {
        return (
          (_.get(user, 'checkInfo.operationType') === arr[0] ||
            arr[0] === '*') &&
          _.get(user, 'checkInfo.status') === arr[1]
        )
      })
    }
    // const pagination = {
    //   total: users0.length,
    //   showSizeChanger: true,
    //   defaultPageSize: 30
    // }

    let columns = [
      {
        title: '用户名',
        dataIndex: 'username',
        key: 'username',
        sorter: (a, b) => (a.username > b.username ? 1 : -1),
        render(text) {
          return (
            <Tooltip placement="topLeft" title={text}>
              <div className="mw200 elli">{text}</div>
            </Tooltip>
          )
        }
      },
      {
        title: '名字',
        dataIndex: 'first_name',
        key: 'first_name',
        render(text) {
          return text ? (
            <Tooltip placement="topLeft" title={text}>
              <div className="mw300 elli">{text}</div>
            </Tooltip>
          ) : null
        }
      },
      {
        title: '邮箱',
        dataIndex: 'email',
        key: 'email',
        render(text) {
          return text ? (
            <Tooltip placement="topLeft" title={text}>
              <div className="mw200 elli">{text}</div>
            </Tooltip>
          ) : null
        }
      },
      {
        title: '手机',
        dataIndex: 'cellphone',
        key: 'cellphone',
        render(cellphone) {
          return cellphone ? (
            <Tooltip placement="topLeft" title={cellphone}>
              <div className="mw200 elli">{cellphone}</div>
            </Tooltip>
          ) : null
        }
      },
      {
        title: '所属机构',
        dataIndex: 'institutions_id',
        key: 'institutions_id',
        render(val) {
          return _.get(institutionsMap, [val, 'name'], '')
        }
      },
      {
        title: '角色',
        dataIndex: 'roles',
        key: 'roles',
        width: 400,
        render(roles=[]) {
          return roles.map(r => {
            let { name, description, id } = r
            let title = `${name}:${description || ''}`
            return (
              <Tooltip title={title} key={r.name}>
                <Link to={`/console/security/user?role=${id}`}>
                  <Button
                    size="small"
                    type="ghost"
                    key={r.name}
                    className="mw200 elli mg1b mg1r"
                  >
                    {r.name}
                  </Button>
                </Link>
              </Tooltip>
            )
          })
        }
      },
      {
        title: '用户状态',
        dataIndex: 'status',
        key: 'status',
        render: val => (val ? '启用' : '停用')
      },
      {
        title: '生效日期',
        dataIndex: 'efficacy_at',
        key: 'efficacy_at',
        render: val =>
          typeof val === 'string'
            ? moment(val)
              .startOf('d')
              .format('YYYY-MM-DD')
            : '无'
      },
      {
        title: '失效日期',
        dataIndex: 'loss_efficacy_at',
        key: 'loss_efficacy_at',
        render: val =>
          typeof val === 'string'
            ? moment(val)
              .startOf('d')
              .format('YYYY-MM-DD')
            : '无'
      },
      {
        title: <div className="aligncenter">操作</div>,
        key: 'op',
        render: (text, ug) => {
          return (
            <div className="aligncenter">
              {canEdit &&
              (ug.type !== 'built-in' || window.sugo.user.id === ug.id) ? (
                  <a 
                    className="mg2l"
                    onClick={this.edit(ug)}
                  >
                  编辑
                  </a>
                ) : null}
              {ug.type === 'built-in' || !canDel ? null : (
                <Popconfirm
                  title={`确定删除用户 "${ug.username}" 么？`}
                  placement="topLeft"
                  onConfirm={this.delUser(ug)}
                >
                  <Tooltip title="删除">
                    <a className="mg2l">删除</a>
                  </Tooltip>
                </Popconfirm>
              )}
            </div>
          )
        }
      }
    ]

    if (needAudit) {
      let tempArr = [
        'username',
        'first_name',
        'email',
        'cellphone',
        'institutions_id',
        'status'
      ]
      columns = [
        ...columns.filter(i => tempArr.includes(i.dataIndex)),
        {
          title: '审核状态',
          dataIndex: 'checkInfo.status',
          key: 'audit_status',
          render: (val, record) => getAuditStatusName(record.checkInfo)
        },
        {
          title: '最近更新',
          dataIndex: 'updated_at',
          key: 'updated_at',
          render: val =>
            val
              ? moment(val)
                .startOf('d')
                .format('YYYY-MM-DD')
              : '无'
        },
        {
          title: '更新人',
          dataIndex: 'changed_by_fk',
          key: 'changed_by_fk',
          render: val => usersMapName[val] || '无'
        },
        {
          title: <div className="aligncenter">操作</div>,
          key: 'op',
          render: (text, ug) => {
            return (
              <div className="aligncenter">
                {// <Tooltip title="查看详情">
                //   <Icon type="eye"
                //     className="color-grey font16 pointer"
                //     onClick={()=>{this.props.setCompareInfo(ug,()=>{
                //       browserHistory.push('/console/compare-page')
                //     })}}
                //   />
                // </Tooltip>
                  _.get(ug, 'checkInfo.status') === 0 ? (
                    <a
                      className="color-blue pointer"
                      onClick={() => {
                        this.props.setCompareInfo(ug, () => {
                          browserHistory.push(
                            `/console/compare-page?from=${
                              browserHistory.getCurrentLocation().pathname
                            }&id=${ug.id}`
                          )
                        })
                      }}
                    >
                    查看详情
                    </a>
                  ) : null}
                {canEdit &&
                canEdit&&(ug.type !== 'built-in' || window.sugo.user.id === ug.id) &&
                _.get(ug, 'checkInfo.status') !== 0 ? (
                  // <Tooltip title="编辑">
                  //   <Icon
                  //     type="edit"
                  //     className="mg2l color-grey font16 pointer"
                  //     onClick={this.edit(ug)}
                  //   />
                  // </Tooltip>
                    <a
                      className="mg2l color-blue pointer"
                      onClick={this.edit(ug)}
                    >
                    编辑
                    </a>
                  ) : null}
                {ug.type === 'built-in' ||
                !canDel ||
                _.get(ug, 'checkInfo.status') === 0 ? null : (
                    <Popconfirm
                      title={`确定删除用户 "${ug.username}" 么？`}
                      placement="topLeft"
                      onConfirm={() => {
                        this.props.delUserDraft(ug, res => {
                          if (res.code === 0) {
                            message.success('删除提交成功')
                          }
                          this.flashPage()
                        })
                      }}
                    >
                      {/* <Tooltip title="删除">
                        <Icon type="close-circle-o" className="mg2l font16 color-grey pointer" />
                      </Tooltip> */}
                      <a className="mg2l color-blue pointer">删除</a>
                    </Popconfirm>
                  )}
                {
                  _.get(window,'sugo.user.id') === _.get(ug,'checkInfo.userDraftId') ||
                  _.get(window,'sugo.user.id') === _.get(ug,'checkInfo.applyId')?
                    (_.get(ug, 'checkInfo.status') === -1 ? (
                      <a
                        className="mg2l color-blue pointer"
                        onClick={() => {
                          this.props.submitOrRecall(ug, res => {
                            if (res?.code === 0) {
                              message.success(res.result)
                            } else {
                              message.error(res.result)
                            }
                            this.flashPage()
                          })
                        }}
                      >
                      提交审核
                      </a>
                    ) : _.get(ug, 'checkInfo.status') === 0 ? (
                      <a
                        className="mg2l color-blue pointer"
                        onClick={() => {
                          this.props.submitOrRecall(ug, res => {
                            if (res?.code === 0) {
                              message.success(res.result)
                            } else {
                              message.error(res.result)
                            }
                            this.flashPage()
                          })
                        }}
                      >
                      撤销
                      </a>
                    ) : null):null
                }
              </div>
            )
          }
        }
      ]
    }
    return (
      <Spin spinning={loading}>
        <div className="users-lists pd2y pd3x">
          <div className="pd2b">
            <div className="fix">
              <div className="fleft">
                {this.renderRoleFilter(roles, filterRoleId)}
                {needAudit ? this.renderStatusFilter(audit_status) : null}
                <InstitutionsPick
                  className="mg1r itblock"
                  allowClear
                  isMultiple={false}
                  value={this.state.institutionsId || institutionsId}
                  addAllSelect={[{ key: 'all', value: '', title: '全部机构', level: '' }]}
                  dropdownStyle={{minWidth:200,maxHeight:500}}
                  onChange={this.onChangeInstitutionsFilter}
                />
                <Input
                  onChange={this.onChange}
                  value={search}
                  placeholder="搜索"
                  className="itblock width260"
                />
                <Button 
                  type="primary" 
                  icon={<SearchOutlined />}
                  style={{marginLeft:'5px'}}
                  onClick={()=>{
                    this.flashPage()
                  }}
                >
                  搜索
                </Button>
                <Button 
                  icon={<DeleteOutlined />}
                  style={{marginLeft:'5px'}}
                  onClick={()=>{
                    this.cleanSearch()
                  }}
                >
                  清空
                </Button>
              </div>
              <div className="fright">
                {canAdd ? (
                  <Button
                    type="primary"
                    onClick={this.newUser}
                    icon={<PlusCircleOutlined />}
                    className="mg1r itblock"
                  >
                    新建用户
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          <Table
            columns={columns}
            pagination={!needAudit}
            dataSource={users0}
            onChange={this.handleChange}
            locale={{
              emptyText: `暂无数据或无权限查看，只有 ${
                filterRole ? `${filterRole.name}小组成员 和 管理员` : '管理员'
              } 可以查看`
            }}
          />
          {
            needAudit 
              ? (
                <Pagination
                  {...pagination}
                  onChange={(page, pageSize) => {
                    this.onPaginationChange(page, pageSize)
                  }}
                  onShowSizeChange={(cur, size) => {
                    this.onShowSizeChange(cur, size)
                  }}
                  style={{ textAlign: 'center', marginTop: '10px' }}
                />
              )
              : null
          }
          {modalVisible ? (
            <UserModal
              roles={roles}
              loading={loading}
              user={user}
              visible={modalVisible}
              hideModal={this.hideModal}
              updateUser={updateUser}
              addUser={addUser}
              changeUserProp={this.changeUserProp}
              changeRole={this.changeRole}
              flashPage={this.flashPage}
              {...this.props}
            />
          ) : null}
          <CompareModal
            viewVisible={viewVisible}
            changeViewVisible={this.changeViewVisible}
            targetUser={user}
            {...this.props}
          />
        </div>
      </Spin>
    )
  }
}
