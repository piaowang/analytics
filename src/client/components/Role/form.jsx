import React from 'react'
import { CloseOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import {
  Button,
  Popconfirm,
  Spin,
  Tooltip,
  Input,
  message,
  Tabs,
  Select
} from 'antd'
import { browserHistory } from 'react-router'
import _ from 'lodash'
import { checkPermission } from '../../common/permission-control'
import DataPermissions from './data-permissions'
import FuncPermissions from './func-permissions'
import AppAuth from './app-authorize'
import ReportAuth from './report-authorize/index'
import { validateFieldsAndScroll } from '../../common/decorators'
import deepCopy from '../../../common/deep-copy'
import {
  forAwaitAll,
  immutateUpdate,
  isDiffByPath
} from '../../../common/sugo-utils'
import InstitutionsPick from '../Institutions/Institutions-pick'
import Fetch from '../../common/fetch-final'
import { withDebouncedOnChange } from '../Common/with-debounce-on-change'
import NewPermissions from './new-permissions'
import { connect } from 'react-redux'

const TabPane = Tabs.TabPane
const FormItem = Form.Item

const canDel = checkPermission('app/role/delete')

const listPath = '/console/security/role'
const InputWithDebouncedOnChange = withDebouncedOnChange(
  Input,
  (ev) => ev.target.value,
  1000
)

const formItemLayout1 = {
  labelCol: { span: 3 },
  wrapperCol: { span: 18 }
}
function equals(v1, v2) {
  if (typeof v1 === 'undefined' && typeof v2 === 'undefined') return false
  else if (!v1 && !v2) return true
  return v1 === v2
}
const createRole = (initPermissions, role = {}) => {
  return {
    name: '',
    description: '',
    dataPermissions: {
      datasourceIds: [],
      measureIds: [],
      dimensionIds: []
    },
    apps_id: [],
    funcPermissions: initPermissions || role.permissions,
    institutions_id: [],
    ...role,
    permissions: undefined
  }
}

//对比获得更改的属性
const diff = (state, formData) => {
  let { role, originalRole } = state
  let old = {
    role,
    ..._.pick(originalRole, ['dataPermissions', 'funcPermissions'])
  }
  let n = {
    ...role,
    ...formData
  }
  return Object.keys(createRole([])).reduce((prev, prop) => {
    if (!_.isEqual(old[prop], n[prop])) {
      prev[prop] = n[prop]
    }
    if (prop === 'dataPermissions' && _.isEqual(old[prop], n[prop])) {
      //数据权限全部没选,就和空的equal
      prev[prop] = n[prop]
    }
    return prev
  }, {})
}

@connect((state) => ({
  checkedApp: _.get(state, 'appAuthorizeApplication.checkedApp', [])
}))
@Form.create()
@validateFieldsAndScroll
class RoleForm extends React.Component {
  constructor(props) {
    super(props)
    let { roleId } = props.params
    let { roles, permissions } = props
    let commons = permissions
      .filter((p) => p.common || p.newRoleDefaultPermission)
      .map((o) => o.id)
    let role
    if (roleId && roles.length) {
      role = _.find(roles, { id: roleId })
      if (!role) return this.on404()
      if (role.type === 'built-in') {
        role.permissions = permissions.map((o) => o.id)
      }
      role = createRole(false, role)
    } else {
      role = createRole(commons)
    }
    this.state = {
      role,
      originalRole: role,
      pendingProjects: null,
      checkList: [],
      defaultReportId: ''
    }
  }
  componentDidMount() {
    const { enableReportView } = window.sugo
    let { roleId } = this.props.params
    if (enableReportView && roleId) {
      // 获取选中视图
      this.getReport(roleId)
    }
  }
  componentWillReceiveProps(nextProps) {
    let { roleId } = nextProps.params
    let { roles, permissions } = nextProps
    let oldRole = this.state.role
    if (
      roleId &&
      roles.length &&
      permissions.length &&
      !equals(oldRole.id, roleId)
    ) {
      this.resetRoleData(roles, permissions, roleId)
    } else if (isDiffByPath(this.props, nextProps, 'permissions')) {
      this.fixCommonPermissions(permissions, !roleId)
    }
  }

  getReport(id) {
    Fetch.post('/app/mannings/getRoleReport', { id }).then((res) => {
      if (res.success) {
        const arr = (res.result || []).map((val) => {
          if (val.default)
            this.setState({
              defaultReportId: val.id
            })
          return val.id
        })
        this.setState({
          checkList: arr
        })
      }
    })
  }

  fixCommonPermissions = (permissions, isCreatingRole) => {
    let { funcPermissions } = this.state.role
    let currPermIdsSet = new Set(funcPermissions || [])
    let preInsertCommonPermId = permissions
      .filter((perm) => perm.common && !currPermIdsSet.has(perm.id))
      .map((perm) => perm.id)
    let nextFuncPerm = funcPermissions

    // 如果 common 权限没有选中，恢复 common 权限
    if (!_.isEmpty(preInsertCommonPermId)) {
      nextFuncPerm = [...nextFuncPerm, ...preInsertCommonPermId]
    }
    // 刷新后恢复默认权限
    if (isCreatingRole) {
      currPermIdsSet = new Set(nextFuncPerm || [])
      let preInsertDefaultPermId = permissions
        .filter(
          (perm) =>
            perm.newRoleDefaultPermission && !currPermIdsSet.has(perm.id)
        )
        .map((perm) => perm.id)
      nextFuncPerm = [...nextFuncPerm, ...preInsertDefaultPermId]
    }
    let role = deepCopy(this.state.role)
    role.funcPermissions = nextFuncPerm
    this.setState({ role })
  };

  controlHeight = () => {
    return { minHeight: window.innerHeight - 99 }
  };

  on404 = () => {
    setTimeout(() => browserHistory.push(listPath), 7000)
    return message.error('角色不存在', 7)
  };

  resetRoleData = (roles, permissions, roleId) => {
    let commons = permissions
      .filter((p) => p.common || p.newRoleDefaultPermission)
      .map((o) => o.id)
    let role = roleId ? _.find(roles, { id: roleId }) : createRole(commons)
    if (!role) {
      return this.on404()
    }
    if (roleId) {
      if (role.type === 'built-in') {
        role.permissions = permissions.map((o) => o.id)
      }
      role = role = createRole(false, role)
    }
    this.setState(
      {
        role
      },
      this.reset
    )
  };

  reset = () => {
    this.props.form.resetFields()
  };

  modifier = (...args) => {
    this.setState(...args)
  };

  del = async () => {
    let { role } = this.state
    let res = await this.props.delRole(role)
    if (!res) return
    message.success('删除成功')
    browserHistory.push(listPath)
  };

  addRole = async (formData) => {
    let role = {
      ...this.state.role,
      ...formData
    }

    let res = await this.props.addRole(role)
    if (!res) return

    let { projectList } = this.props
    let { pendingProjects } = this.state
    let roleId = res.result.id
    // save filters
    let addedFilterProjects = _.differenceWith(
      pendingProjects,
      projectList,
      _.isEqual
    )
    await forAwaitAll(addedFilterProjects, async (proj) => {
      proj = immutateUpdate(proj, 'extra_params.roleFiltersDict', (dist) => {
        return _.mapKeys(dist, (v, k) => (k === 'new' ? roleId : k))
      })
      await Fetch.post('/app/project/update', proj)
    })
    message.success('添加成功')
    this.props.refreshDatasources()
  };

  updateRole = async (formData) => {
    let { id } = this.state.role
    let update = diff(this.state, formData)

    //更新视图权限数据
    if (formData.reportList) {
      update.reportList = formData.reportList
      update.defaultReportId = formData.defaultReportId
    }

    update.status = formData.status
    let res = await this.props.updateRole(id, update)
    if (!res) return

    let { projectList } = this.props
    let { pendingProjects } = this.state
    // save filters
    let addedFilterProjects = _.differenceWith(
      pendingProjects,
      projectList,
      _.isEqual
    )
    await forAwaitAll(addedFilterProjects, async (proj) => {
      await Fetch.post('/app/project/update', proj)
    })
    this.props.refreshDatasources()
    message.success('修改成功')
  };

  submit = async (e) => {
    e.preventDefault()
    let formData = await this.validateFieldsAndScroll()
    if (!formData) {
      return
    }
    const { enableReportView } = window.sugo
    //视图权限
    if (enableReportView) {
      (formData.reportList = this.state.checkList),
      (formData.defaultReportId = this.state.defaultReportId)
    }

    let checkedList = this.props.checkedApp

    formData.apps_id = checkedList
    if (!_.trim(formData.name)) {
      let innerScrollDom = document.querySelector('.scroll-content')
      window.scrollTo(0, 0)
      innerScrollDom.scrollTo(0, 0)
      message.warn('请先填写角色名称')
      return
    }
    let { id } = this.state.role
    if (id) {
      await this.updateRole(formData)
    } else {
      await this.addRole(formData)
    }
  };

  del = async () => {
    let { role } = this.state
    let res = await this.props.delRole(role)
    if (!res) return
    message.success('删除成功')
    browserHistory.push(listPath)
  };

  renderDelBtn = () => {
    let { role } = this.state
    return !canDel || !role.id ? null : (
      <Popconfirm
        title={`确定删除角色 "${role.name}" 么？`}
        placement="topLeft"
        onConfirm={this.del}
      >
        <Button type="ghost" icon={<CloseOutlined />} className="mg1l">
          删除
        </Button>
      </Popconfirm>
    )
  };

  renderFormBtn = (role) => {
    let disabled = this.state.role.type === 'built-in'
    if (disabled) return null
    let txt = role.id ? '更新角色' : '保存角色'
    return (
      <FormItem wrapperCol={{ span: 18, offset: 3 }}>
        <hr />
        <Button type="success" htmlType="submit">
          {txt}
        </Button>
        {this.renderDelBtn()}
      </FormItem>
    )
  };

  renderTitleInput = (name, getFieldDecorator) => {
    let disabled = this.state.role.type === 'built-in'
    return (
      <FormItem {...formItemLayout1} label="角色名称" required>
        {getFieldDecorator('name', {
          rules: [
            {
              max: 20,
              message: '不超过20个字符'
            }
          ],
          initialValue: name
        })(<InputWithDebouncedOnChange disabled={disabled} />)}
      </FormItem>
    )
  };

  renderRoleStatusInput = (status, getFieldDecorator) => {
    let disabled = this.state.role.type === 'built-in'
    return (
      <FormItem {...formItemLayout1} label="角色状态" required>
        {getFieldDecorator('status', {
          initialValue: status
        })(
          <Select
            disabled={disabled}
            getPopupContainer={(triggerNode) => triggerNode.parentNode}
          >
            <Select.Option key={1} value={1}>
              启用
            </Select.Option>
            <Select.Option key={0} value={0}>
              停用
            </Select.Option>
          </Select>
        )}
      </FormItem>
    )
  };

  renderInstitutionsInput = (institutions_id, getFieldDecorator) => {
    return (
      <FormItem label="所属机构" {...formItemLayout1}>
        {getFieldDecorator('institutions_id', {
          initialValue: institutions_id
        })(<InstitutionsPick isMultiple className="width-100" allowClear />)}
      </FormItem>
    )
  };

  renderDesc = (description, getFieldDecorator) => {
    let disabled = this.state.role.type === 'built-in'
    return (
      <FormItem {...formItemLayout1} label="备注">
        {getFieldDecorator('description', {
          rules: [
            {
              max: 200,
              message: '不超过200个字符'
            }
          ],
          initialValue: description
        })(<Input disabled={disabled} />)}
      </FormItem>
    )
  };

  renderPermissions = () => {
    let { projectList } = this.props
    let { role, pendingProjects } = this.state
    let {
      dataPermissions: { datasourceIds }
    } = role

    let isPortal = false
    if (_.get(window.sugo, 'microFrontendUrlMap.sugo-portal-app'))
      isPortal = true
    let tab1 = (
      <span>
        功能权限
        {/* <b>({_.size(funcPermissions)})</b> */}
      </span>
    )
    let len = datasourceIds.length
    let title = len ? `已选择${len}个项目` : '数据权限'
    let tab2 = (
      <Tooltip title={title}>
        <span>
          数据权限
          {len ? <b>({len})</b> : null}
        </span>
      </Tooltip>
    )
    let tab3 = (
      <Tooltip title="应用权限">
        <span>应用权限</span>
      </Tooltip>
    )

    let tab4 = (
      <Tooltip title="视图权限">
        <span>视图权限</span>
      </Tooltip>
    )
    const { enableNewMenu = false, enableReportView = false } = window.sugo

    return (
      <Tabs defaultActiveKey="p-func">
        <TabPane tab={tab1} key="p-func">
          {enableNewMenu ? (
            <NewPermissions
              {...this.props}
              role={role}
              modifier={this.modifier}
            />
          ) : (
            <FuncPermissions
              {...this.props}
              role={role}
              modifier={this.modifier}
              pendingProjects={pendingProjects || projectList}
            />
          )}
        </TabPane>
        {/* 门户和万宁项目不要数据权限 */}
        {!isPortal && !enableReportView ? (
          <TabPane tab={tab2} key="p-data" forceRender>
            <DataPermissions
              role={role}
              modifier={this.modifier}
              pendingProjects={pendingProjects || projectList}
              {...this.props}
            />
          </TabPane>
        ) : null}
        <TabPane tab={tab3} key="app-data" forceRender>
          <AppAuth role={_.get(this.state, 'role', {})} />
        </TabPane>
        {enableReportView && (
          <TabPane tab={tab4} key="report-data" forceRender>
            <ReportAuth
              checkList={this.state.checkList}
              defaultReportId={this.state.defaultReportId}
              roleId={this.props.params.roleId}
              setPstate={(v) => this.setState(v)}
            />
          </TabPane>
        )}
      </Tabs>
    )
  };

  renderTabs = () => {
    return (
      <FormItem {...formItemLayout1} label="权限">
        {this.renderPermissions()}
      </FormItem>
    )
  };

  renderForm = () => {
    let { role } = this.state
    let { name, description, institutions_id, status = 1 } = role
    const { getFieldDecorator } = this.props.form
    return (
      <Form onSubmit={this.submit}>
        {this.renderTitleInput(name, getFieldDecorator)}
        {this.renderRoleStatusInput(status, getFieldDecorator)}
        {this.renderInstitutionsInput(institutions_id, getFieldDecorator)}
        {this.renderTabs()}
        {this.renderDesc(description, getFieldDecorator)}
        {this.renderFormBtn(role)}
      </Form>
    )
  };

  render() {
    return (
      <Spin spinning={this.props.loading}>
        <div
          className="ug-wrapper relative role-form"
          style={this.controlHeight()}
        >
          <div className="pd3t">{this.renderForm()}</div>
        </div>
      </Spin>
    )
  }
}
export default RoleForm
