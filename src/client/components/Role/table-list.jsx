import React from 'react'
import { CloseCircleOutlined, CopyOutlined, EditOutlined, PushpinOutlined } from '@ant-design/icons';
import { Tooltip, Table, Spin, message, Popconfirm, Input, Modal,Tag } from 'antd';
import { Link } from 'react-router'
import { Auth } from '../../common/permission-control'
import _ from 'lodash'
import { filterPermission } from './constants'
import menuData from '../Home/menu-data'
import CopyModal from './copy-modal'
import { getRes } from '../../databus/datasource'
import * as actions from '../../actions/institutions'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import InstitutionsPick from '../Institutions/Institutions-pick'
import AddBtn from './add-btn'
import flatMenusType from '../../../common/flatMenus.js'
import PermissionDetail from './permission-detail'
import Fetch from '../../common/fetch-final'

const menus = menuData()

@connect(state => _.pick(state.common, ['institutionsList']), dispatch => bindActionCreators(actions, dispatch))
export default class Rolelist extends React.Component {

  state = {
    search: '',
    curRole: {},
    modalVisible: false,
    copyDataSource: {},
    selectInstitutions: '',
    reportList: []
  }

  componentDidMount () {
    this.props.getInstitutions()
  }

  onChange = e => {
    this.setState({
      search: e.target.value
    })
  }

  delRole = role => {
    return async () => {
      let res = await this.props.delRole(role)
      if (!res) return
      message.success('删除成功')
    }
  }

  getRoles = role => {
    let permissions = filterPermission(this.props.permissions)
    if (role.type !== 'built-in') {
      permissions = permissions.filter(
        p => role.permissions.includes(p.id)
      )
    }

    let groupSort = window.sugo?.enableNewMenu ? flatMenusType(menus, 'title')
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
    let res = arr.length
      ? arr.map((p, i) => (
        <div className="pd1" key={i + '@pl'}>
          <span className="bold mg1r">{p.group}:</span>
          {_.join(p.values.map(perm => perm.title), '; ')}
        </div>
      ))
      : <p style={{ marginLeft: 20 }}>当前用户无权限</p>
    return (
      <div>
        <h3 className="pd1">功能权限列表</h3>
        {res}
      </div>
    )
  }
  getNewRoles = role => {
    let permissions = this.props.permissions
    if (!permissions.length) return (<p style={{ marginLeft: 20 }}>当前用户无权限</p>)
    if (role.type !== 'built-in') {
      permissions = permissions.filter(
        p => role.permissions.indexOf(p.id) >= 0
      )
    }
    return <PermissionDetail permissions={permissions} />
  }

  copyRole = async () => {
    // 校验通过,进行提交
    let { curRole, copyDataSource } = this.state
    let { id, userName, customDescription, institutions_id } = curRole
    let { addRole, roles } = this.props // datasources 用于数据权限
    let nowRole = roles.filter(item => id === item.id)

    // let dataPermissions = await this.getDataSources(id)
    let data = {
      name: userName,
      institutions_id,
      description: customDescription,
      dataPermissions: copyDataSource,
      funcPermissions: nowRole[0].permissions
    }

    let res = await addRole({ ...data })
    if (!res) return
    message.success('复制成功')
    this.props.refreshDatasources()
    this.toggleModal(false)
  }

  saveCache = (ug) => {
    this.setState({
      curRole: ug
    }, () => {
      this.getDataSources(ug.id)
    })
  }

  changeRole = (e, val) => {
    // 角色信息改变
    let { curRole } = this.state
    this.setState({
      curRole: { ...curRole, [val]: e }
    })
  }

  toggleModal = (val) => {
    // 开关弹出层
    if (val) {
      this.setState({
        modalVisible: val
      })
    } else {
      this.setState({
        modalVisible: val,
        curRole: {},
        copyDataSource: {}
      })
    }
  }
  async getReportList (id) {
    window.sugo.$loading.show()
    const res = await Fetch.post('/app/mannings/getRoleReport', { id })
    window.sugo.$loading.hide()
    if(res.success){
      this.setState({
        reportVisible: true,
        reportList: res.result || []
      })
    }else{
      message.info('没有关联的视图')
    }
    
  }
  reportHandleCancel = () => {
    this.setState({
      reportVisible: false
    })
  }

  getDataSources = async (roleId) => {
    // 获取用户数据权限
    let res = await getRes()
    if (!res) return
    let update = res.result
    let { dimensions, measures } = update
    let { datasources } = this.props

    let datasourceIds = datasources.filter(ds => {
      return ds.role_ids.includes(roleId)
    }).map(ds => ds.id)
    let dimensionIds = dimensions.filter(ds => {
      return ds.role_ids.includes(roleId)
    }).map(ds => ds.id)
    let measureIds = measures.filter(ds => {
      return ds.role_ids.includes(roleId)
    }).map(ds => ds.id)
    // 如果用户操作过快是否会出现查询未结束就进行创建操作?
    this.setState({
      copyDataSource: {
        datasourceIds: datasourceIds || [],
        dimensionIds: dimensionIds || [],
        measureIds: measureIds || []
      }
    })
  }
  //判断是否有视图权限
  isReportFun = () => {
    if (window.sugo.enableReportView) {
      return {
        title: '视图权限',
        dataIndex: 'id',
        key: 'id',
        render:(id)=> {
          const roleId  = id
          return (
            <Tooltip placement="topLeft" title="查看视图权限">
              <span
                className="pointer p-blue"
                onClick={() => this.getReportList(roleId)}
              >
                查看关联视图
            </span>
            </Tooltip>
          )
        }
      }
    }
    return null
  }
  render () {
    let { roles, loading, institutionsList } = this.props
    let institutionsMap = _.keyBy(institutionsList, p => p.id)
    let { search, modalVisible, curRole, selectInstitutions } = this.state
    const { enableNewMenu = false } = window.sugo
    let roles0 = search
      ? roles.filter(ug => (ug.name + '____' + (ug.description || '')).toLowerCase().indexOf(search.trim().toLowerCase()) > -1)
      : roles
    roles0 = selectInstitutions
      ? roles0.filter(p => p.institutions_id.includes(selectInstitutions))
      : roles0

    const pagination = {
      total: roles0.length,
      showSizeChanger: true,
      defaultPageSize: 10,
      showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`,
    }
    const columns = [{
      title: '角色',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name > b.name ? 1 : -1,
      render (text, ug) {
        return (
          <Tooltip placement="topLeft" title={`点击查看 "${text}"`}>
            <div className="mw200 elli">
              <Auth auth="/console/security/role/:roleId" alt={text}>
                <Link className="pointer" to={`/console/security/role/${ug.id}`}>
                  {text}
                </Link>
              </Auth>
            </div>
          </Tooltip>
        )
      }
    }, {
      title: '所属机构',
      dataIndex: 'institutions_id',
      key: 'institutions_id',
      render (val) {
        return val.map(p => _.get(institutionsMap, [p, 'name'], '-')).join(',')
      }
    }, {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render (text, rec) {
        return <span>{+text === 0 ? '停用' : '启用'}</span>
      }
    },
    {
      title: '用户数',
      dataIndex: 'user_count',
      key: 'user_count',
      render (text, rec) {
        if (text === '0') return text
        return (
          <Tooltip placement="topLeft" title="查看角色用户">
            <Link className="pointer" to={`/console/security/user?role=${rec.id}`}>{text}(查看用户)</Link>
          </Tooltip>
        )
      }
    },
    this.isReportFun(),
    {
      title: '备注',
      dataIndex: 'description',
      key: 'description',
      render (text) {
        return text
          ? <Tooltip placement="topLeft" title={text}>
            <div className="mw300 elli">{text}</div>
          </Tooltip>
          : null
      }
    }, {
      title: <div className="aligncenter">操作</div>,
      key: 'op',
      render: (text, ug) => {
        if (ug.type === 'built-in') return null
        return (
          <div className="aligncenter">
            <Auth auth="/console/security/role/new">
              <span onClick={() => { this.toggleModal(true); this.saveCache(ug) }}>
                <a className="mg2l">复制</a>
              </span>
            </Auth>
            <Auth auth="app/role/update">
              <Link to={`/console/security/role/${ug.id}`}>
                <a className="mg2l">编辑</a>
              </Link>
            </Auth>
            <Auth auth="app/role/delete">
              <Popconfirm
                title={`确定删除角色 "${ug.name}" 么？`}
                placement="topLeft"
                onConfirm={this.delRole(ug)}
              >
                <a className="mg2l">删除</a>
              </Popconfirm>
            </Auth>
          </div>
        );
      }
    }].filter((v) => v)

    return (
      <Spin spinning={loading}>
        <div className="roles-lists pd2y pd3x">
          <div className="pd2b">
            <div className="fix">
              <div className="fright">
                <span className="mg1r iblock">
                  <AddBtn {...this.props} />
                </span>
                <InstitutionsPick
                  className="mg1r iblock"
                  allowClear
                  addAllSelect={[{ key: '', value: '', title: '全部机构', level: '' }]}
                  isMultiple={false}
                  value={selectInstitutions}
                  onChange={v => this.setState({ selectInstitutions: v })}
                />
                <Input
                  onChange={this.onChange}
                  value={search}
                  placeholder="搜索"
                  className="iblock width260"
                />
              </div>
            </div>
          </div>
          <Table
            columns={columns}
            pagination={pagination}
            dataSource={roles0}
            rowKey="id"
            expandedRowRender={enableNewMenu ? this.getNewRoles : this.getRoles}
          />
          {/* copy modal pop  hideModal={this.hideModal}*/}
          {
            modalVisible &&
            <CopyModal
              role={curRole}
              loading={loading}
              visible={modalVisible}
              copyRole={this.copyRole}
              handleChange={this.changeRole}
              toggleModal={this.toggleModal}
              child={this.getRoles}
            />
          }
          <Modal
            title="关联视图"
            footer={null}
            visible={this.state.reportVisible}
            onCancel={this.reportHandleCancel}
          >
            <div className="user-box-list">
              {this.state.reportList.map((val, index) => {
                return <Tag key={index} color="blue">{val.title}</Tag>
              })}
            </div>
          </Modal>
        </div>
      </Spin>
    )
  }
}
