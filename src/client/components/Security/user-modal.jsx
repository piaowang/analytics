import React from 'react'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Modal, Button, Input, message, Select, DatePicker } from 'antd'
import _ from 'lodash'
import testPassword from 'common/test-password'
import {immutateUpdates} from '../../../common/sugo-utils'
import DepartmentPicker from '../Departments/department-picker'
import InstitutionsPick from '../Institutions/Institutions-pick'
import moment from 'moment'

const FormItem = Form.Item
const createForm = Form.create
const Option = Select.Option
const needAudit = _.get(window,'sugo.enableDataChecking')

class RoleModal extends React.Component {

  state = {
    pwdDisabled: true
  }

  componentDidMount() {
    setTimeout(() => {
      this.setState({
        pwdDisabled: false
      })
    }, 500)
  }
  
  toggleRole = (role, selected) => {
    return () => {
      let {roles} = this.props.user
      let {changeRole} = this.props
      let arr = roles.slice(0)
      let formErrors = {}
      
      if (selected) {
        arr = arr.filter(obj => obj.id !== role.id)
      } else {
        arr.push(role)
      }
      changeRole(arr)

      //验证角色是否选中
      // if(type !== 'built-in' && arr.length === 0) {
      //   formErrors = {
      //     errors: [{
      //       field: 'userGroup',
      //       message: '至少选择一个角色'
      //     }]
      //   }
      // } 
      this.props.form.setFields({
        userGroup: formErrors
      })
    }
  }

  handleSubmit = (isGoAudit=true) => {
    let {updateUser, addUser, user, hideModal,flashPage} = this.props
    let hasError = false
    
    this.props.form.validateFields((err) => {
      //验证角色是否选择
      // if (user.type !== 'built-in' && user.roles.length === 0) {
      //   this.props.form.setFields({
      //     userGroup: {
      //       errors: [{
      //         field: 'userGroup',
      //         message: '至少选择一个角色'
      //       }]
      //     }
      //   })
      //   hasError = true
      // }
      if (hasError || err) {
        return err
      } else {
        let cb = (res) => {
          if (res && res.result) {
            flashPage()
            hideModal()
            if(needAudit){
              message.success(isGoAudit?'提交成功':'保存成功')
              return
            }
            message.success(user.id ? '修改成功' : '创建成功')
          }
        }
        user = immutateUpdates(user,
          // 没有填则设为 null，避免同名检测报错
          'cellphone', cellphone => cellphone || null,
          'institutions_id', institutions_id => institutions_id || null,
          'email', email => email || null,
          'status', status => _.isNumber(status) ? status : 1,
          'efficacy_at', efficacy_at => efficacy_at,
          'loss_efficacy_at', loss_efficacy_at => loss_efficacy_at
        )
        //不加，当password为''时会报错
        user = _.isEmpty(user.password) ? _.omit(user, 'password') : user

        if(needAudit){
          user.isGoAudit = isGoAudit
          user.id ? this.props.updateUserDraft(user, cb) : this.props.addUserDraft(user, cb)
          return
        }

        user.id ? updateUser(user, cb) : addUser(user, cb)
      }
    })
  }

  render () {
    let {user, roles, visible, loading, hideModal, changeUserProp} = this.props
    let title = user.id ? '编辑用户' : '创建用户'
    let userRoleIds = user?.roles?.map(r => r.id)
    //TODO： 临时解决方案，需要先将password input设置为disable=true，解决自动将Login页面的password填充问题
    let {pwdDisabled} = this.state

    const formItemLayout = {
      labelCol: { span: 4 },
      wrapperCol: { span: 18 }
    }
    const { getFieldDecorator } = this.props.form

    let footer = (
      <div className="alignright">
        <Button
          type="ghost"
          // icon="close-circle-o"
          className="mg1r iblock"
          onClick={hideModal}
        >取消</Button>
        {
          // 新增状态下的 新增审核 审核不通过
          needAudit && (!user.id || (_.get(user,'checkInfo.operationType') ===1
          && ( _.get(user,'checkInfo.status') === -1 || _.get(user,'checkInfo.status') === 2)))
            ?
            <Button
              type="success"
              // icon={loading ? 'loading' : 'check'}
              className="mg1r iblock"
              onClick={()=>this.handleSubmit(false)}
            >
            保存
            </Button>
            :null
        }
        <Button
          type="primary"
          // icon={loading ? 'loading' : 'check'}
          className="mg1r iblock"
          onClick={()=>this.handleSubmit()}
        >
          {loading ? '提交中...' : '提交'}
        </Button>
      </div>
    )

    let disabled = user.type === ''
    return (
      <Modal
        title={title}
        visible={visible}
        onOk={this.handleSubmit}
        onCancel={hideModal}
        maskClosable={false}
        footer={footer}
        bodyStyle={{maxHeight:500, overflow: 'auto'}}
        getContainer={()=>{
          return document.querySelector('.users-lists')
        }}
      >
        <Form layout="horizontal">
          <FormItem {...formItemLayout} label="用户名" hasFeedback>
            {
              getFieldDecorator(
                'userName', {
                  initialValue: user.username,
                  rules: [
                    { 
                      required: true, 
                      message: '请输入用户名，必须为5~16位字母或数字' 
                    },
                    { 
                      pattern: /^[\w.@]{5,24}$/, 
                      message: '用户名必须为5~24位字母或数字' 
                    },
                    {
                      validator: (rule, value, callback) => {
                        if (!_.trim(value)) return callback('请输入用户名')
                        callback()
                      }
                    }
                  ]
                })(
                <Input
                  onChange={changeUserProp('username')}
                  disabled={disabled}
                />
              )
            }
          </FormItem>
          <FormItem {...formItemLayout} label="名字" hasFeedback>
            {
              getFieldDecorator(
                'firstName', {
                  initialValue: user.first_name,
                  rules: [
                    {
                      pattern: /^.{1,24}$/, 
                      message: '名字长度为1~24位'
                    },
                    {
                      required: true,
                      message: ' '
                    },
                    {
                      validator: (rule, value, callback) => {
                        if (!_.trim(value) || value[0] === ' ') return callback('请输入名字')
                        if (!value) return callback('请输入名字')
                        callback()
                      }
                    }
                  ]
                })(
                <Input onChange={changeUserProp('first_name')} />
              )
            }
          </FormItem>

          <FormItem {...formItemLayout} label="邮箱" hasFeedback>
            {
              getFieldDecorator(
                'email', {
                  initialValue: user.email,
                  rules: [
                    {
                      type: 'email',
                      transform(value) {
                        return value ? value.toLowerCase() : value
                      },
                      message: '请输入正确的邮箱' 
                    }
                  ]
                })(
                <Input onChange={changeUserProp('email')} />
              )
            }
          </FormItem>

          <FormItem {...formItemLayout} label="手机" hasFeedback>
            {
              getFieldDecorator(
                'cellphone', {
                  initialValue: user.cellphone,
                  rules: [
                    {
                      type: 'string',
                      pattern: /^1[0-9]{10}$/,
                      message: '请输入正确的手机号码'
                    }
                  ]
                })(
                <Input onChange={changeUserProp('cellphone')} />
              )
            }
          </FormItem>

          <FormItem {...formItemLayout} label="密码" hasFeedback>
            {
              getFieldDecorator(
                'password', {
                  rules: [
                    { 
                      //创建用户需要输入密码
                      required: user.id ? false : true, 
                      message: '请输入密码' 
                    },
                    {
                      validator: (rule, value, callback) => {
                        if (value && !testPassword(value)) {
                          callback('密码必须为6~20位字母和数字组合')
                        } else {
                          callback()
                        }
                      },
                      validateTrigger: 'onBlur'
                    }
                  ]
                })(
                <Input disabled={pwdDisabled} onChange={changeUserProp('password')}
                  placeholder={user.id ? '不填写不会修改': '请输入密码'} type="password" 
                />
              )
            }
          </FormItem>

          <FormItem
            label="用户状态"
            required
            {...formItemLayout}
          >
            {getFieldDecorator('status', {
              initialValue: _.get(user, 'status', 1)
            })(
              <Select disabled={disabled} onChange={changeUserProp('status')}>
                <Option key={1} value={1}>启用</Option>
                <Option key={0} value={0}>停用</Option>
              </Select>
            )}
          </FormItem>

          <FormItem
            label="生效日期"
            required={this.props.form.getFieldValue('efficacy_at') || this.props.form.getFieldValue('loss_efficacy_at')}
            {...formItemLayout}
          >
            {getFieldDecorator('efficacy_at', {
              initialValue: _.get(user, 'efficacy_at') ? moment(_.get(user, 'efficacy_at')) : null
            })(
              <DatePicker
                disabled={disabled}
                getCalendarContainer={node => node.parentNode}
                onChange={changeUserProp('efficacy_at')}
                className="width-100"
                disabledDate={(current) => +moment(current) < +moment().startOf('d')}
              />
            )}
          </FormItem>

          <FormItem
            label="失效日期"
            required={this.props.form.getFieldValue('efficacy_at') || this.props.form.getFieldValue('loss_efficacy_at')}
            {...formItemLayout}
          >
            {getFieldDecorator('loss_efficacy_at', {
              initialValue: _.get(user, 'loss_efficacy_at') ? moment(_.get(user, 'loss_efficacy_at')) : null,
              rules: [{
                validator: (rule, value, callback) => {
                  const efficacy_at = this.props.form.getFieldValue('efficacy_at')
                  if (+moment(efficacy_at) > +moment(value)) return callback('失效时间必须晚于生效时间')
                  callback()
                }
              }]
            })(
              <DatePicker
                disabled={disabled}
                getCalendarContainer={node => node.parentNode}
                onChange={changeUserProp('loss_efficacy_at')}
                className="width-100"
                disabledDate={(current) => +moment(current) < +moment().startOf('d') || +moment(current).startOf('d') === +moment().startOf('d')}
              />
            )}
          </FormItem>

          <FormItem
            label="所属机构"
            {...formItemLayout}
          >
            {getFieldDecorator('institutions_id', {
              initialValue: user.institutions_id
            })(
              <InstitutionsPick className="width-100" allowClear onChange={changeUserProp('institutions_id')} />
            )}
          </FormItem>
          
          {window.sugo.hideDepartmentManage ? null : (
            <FormItem
              label="所属部门"
              {...formItemLayout}
            >
              {getFieldDecorator('departments', {
                initialValue: user.departments
              })(
                <DepartmentPicker style={{width: '100%'}} onChange={changeUserProp('departments')} />
              )}
            </FormItem>
          )}
          
          <FormItem {...formItemLayout} label="角色">
            {
              getFieldDecorator('userGroup')(
                <div>
                  {
                    roles.map(role => {
                      let {id, name, description} = role
                      let selected = _.includes(userRoleIds, id)
                      let type = selected ? 'primary' : 'ghost'
                      let title = `${name}${description ? ':' + description : ''}`
                      let sugoRoles = _.get(window.sugo, 'user.SugoRoles', [])
                      let isAdmin = _.find(sugoRoles, {name: 'admin'})
                      //如果不是admin或者admin角色，不展示admin角色
                      if (_.isEmpty(isAdmin) && name === 'admin') return 
                      return (
                        <Button
                          title={title}
                          key={'user_role_' + id}
                          type={type}
                          disabled={disabled || role.status !== 1}//role.status !== 1 ：角色被停用，不可选择
                          className="mw200 elli mg1b mg1r"
                          onClick={this.toggleRole(role, selected)}
                        >{name}</Button>
                      )
                    })
                  }
                </div>
              )
            }
            
          </FormItem>
        </Form>
      </Modal>
    )
  }
}

export default createForm()(RoleModal)
