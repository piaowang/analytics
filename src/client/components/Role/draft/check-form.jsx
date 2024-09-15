import React from 'react'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Button, Spin, Tooltip, Select, Input, message, Tabs } from 'antd'
import { browserHistory } from 'react-router'
import _ from 'lodash'
import DataPermissions from '../data-permissions'
import FuncPermissions from '../func-permissions'
import NewPermissions from '../new-permissions'
import AppAuth from '../app-authorize'
import { validateFieldsAndScroll } from '../../../common/decorators'

import InstitutionsPick from '../../Institutions/Institutions-pick'
import { connect } from 'react-redux'
import Fetch from '../../../common/fetch-final'
import { withDebouncedOnChange } from '../../Common/with-debounce-on-change'

const TabPane = Tabs.TabPane
const FormItem = Form.Item
const Option = Select.Option


const listPath = '/console/security/role'
const InputWithDebouncedOnChange = withDebouncedOnChange(
  Input,
  ev => ev.target.value,
  1000
)

const formItemLayout1 = {
  labelCol: { span: 3 },
  wrapperCol: { span: 18 }
}
@connect(state => ({
  checkedApp: _.get(state, 'appAuthorizeApplication.checkedApp', [])
}))
@Form.create()
@validateFieldsAndScroll
export default class RoleForm extends React.Component {
  constructor(props) {
    super(props)
  }
  state = {
    role: {
      name: '',
      description: '',
      dataPermissions: {
        datasourceIds: [],
        measureIds: [],
        dimensionIds: []
      },
      status: 1,
      check_detail:{status:null},
      apps_id: [],
      funcPermissions: [],
      institutionsIds: [],
      permissions: undefined
    }
  };
  componentDidMount() {
    let { roleId } = this.props.params
    if (roleId) {
      this.getData(roleId)
    } else {
      const pers = this.getInitPermissions(this.props)
      if (pers) {
        this.setState(state => {
          state.role.funcPermissions = pers
          return state.role
        })
      }
    }
  }
  componentWillReceiveProps(nextProps) {
    //填补之前外面传permissions进来刷新页面的坑
    let { funcPermissions } = this.state.role
    if (nextProps.permissions.length && !funcPermissions.length) {
      const pers = this.getInitPermissions(nextProps.permissions)
      if (pers) {
        this.setState(state => {
          state.role.funcPermissions = pers
          return state.role
        })
      }
    }
  }
  //获取默认权限
  getInitPermissions(permissions) {
    if (permissions && permissions.length) {
      return permissions
        .filter(perm => perm.newRoleDefaultPermission)
        .map(perm => perm.id)
    }
    return false
  }
  getData = async id => {
    const res = await Fetch.post('/app/role-draft/detail', { id })
    this.setState({
      role: res.result,
      originalRole: res.result
    })
  };

  controlHeight = () => {
    return { minHeight: window.innerHeight - 99 }
  };

  on404 = () => {
    setTimeout(() => browserHistory.push(listPath), 7000)
    return message.error('角色不存在', 7)
  };

  modifier = (...args) => {
    this.setState(...args)
  };

  addRole = async formData => {
    let role = {
      ...this.state.role,
      ...formData
    }
    this.addRoleDraft(role)
  };
  //添加草稿角色
  async addRoleDraft(role) {
    const res = await Fetch.post('/app/role-draft/addRole', { role })
    if (res.success) {
      message.success('添加成功')
      browserHistory.push('/console/security/role')
    }
  }
  updateRole = async formData => {
    const update = {...this.state.role,...formData}
    update.isCheck = true
    update.isCommit = formData.isCommit ? true : false
    let res = await Fetch.post('/app/role-draft/updataRole', {data:update})
    if (res.success) {
      message.success('更新成功')
      browserHistory.push('/console/security/role')
    }
  }

  submit = async (e, check = false) => {
    e.preventDefault()
    let formData = await this.validateFieldsAndScroll()
    if (!formData) {
      return
    }
    // 是否提交复核
    formData.isCommit = check ? true : false
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

  del = async (id) => {
    let res = await Fetch.post('/app/role-draft/delete', {id})
    if (res.success) {
      message.success('更新成功')
      browserHistory.push('/console/security/role')
    }
  }
  renderFormBtn = role => {
    let disabled = this.state.role.type === 'built-in'
    if (disabled) return null
    return (
      <FormItem wrapperCol={{ span: 18, offset: 3 }}>
        <hr />
        <Button
          onClick={() => browserHistory.push(listPath)}
          className="mr12"
        >
          取消
        </Button>
        { role.check_detail.status ===1 ? null : <Button className="mr12" type="success" htmlType="submit">
          保存
        </Button>}
        <Button
          className="mr12"
          type="primary"
          onClick={e => this.submit(e, 1)}
        >
          提交
        </Button>
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
          <Select disabled={disabled}>
            <Option key={1} value={1}>
              启用
            </Option>
            <Option key={0} value={0}>
              停用
            </Option>
          </Select>
        )}
      </FormItem>
    )
  };

  renderInstitutionsInput = (institutionsIds, getFieldDecorator) => {
    return (
      <FormItem label="所属机构" {...formItemLayout1}>
        {getFieldDecorator('institutionsIds', {
          initialValue: institutionsIds
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
    } = role.dataPermissions && role

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
    return (
      <Tabs defaultActiveKey="p-func">
        <TabPane tab={tab1} key="p-func">
          {window.sugo.enableNewMenu ? (
            <NewPermissions {...this.props} role={role} modifier={this.modifier} />
          ) : (
            <FuncPermissions
              {...this.props}
              role={role}
              modifier={this.modifier}
            />
          )}
        </TabPane>
        {/* 门户系统不要数据权限 */}
        {!isPortal ? (
          <TabPane tab={tab2} key="p-data" forceRender>
            <DataPermissions
              role={role}
              modifier={this.modifier}
              pendingProjects={pendingProjects || projectList}
              {...this.props}
            />
          </TabPane>
        ) : (
          <TabPane tab={tab3} key="app-data" forceRender>
            <AppAuth role={_.get(this.state, 'role', {})} />
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
    let { name, description, institutionsIds, status = 1 } = role
    const { getFieldDecorator } = this.props.form
    return (
      <Form onSubmit={this.submit}>
        {this.renderTitleInput(name, getFieldDecorator)}
        {this.renderRoleStatusInput(status, getFieldDecorator)}
        {this.renderInstitutionsInput(institutionsIds, getFieldDecorator)}
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
