import React from 'react'
import { CloseOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import {
  Button,
  Popconfirm,
  Select,
  Spin,
  Tooltip,
  Radio,
  notification,
  Input,
  message,
} from 'antd';
import Fetch from '../../common/fetch-final'
import {validateFieldsAndScroll} from '../../common/decorators'
import {browserHistory} from 'react-router'
import _ from 'lodash'
import {formItemLayout} from '../Usergroup/constants'
import {diff} from '../../common/diff'
import CompanyList from './list-render'
import deepCopy from '../../../common/deep-copy'
import {enableSelectSearch} from '../../common/antd-freq-use-props'

const FormItem = Form.Item
const RadioButton = Radio.Button
const RadioGroup = Radio.Group
const {Option} = Select
const listPath = '/console/company'
const createCompany = () => {
  return {
    name: '',
    description: '',
    type: 'trial',
    seedProjectId: '',
    email: '',
    password: '',
    cellphone: ''
  }
}
const propsToSubmit = Object.keys(createCompany())

@Form.create()
@validateFieldsAndScroll
export default class CompanyForm extends React.Component {

  constructor(props) {
    super(props)
    let {company = {}} = props
    this.state = {
      company: company.id ? company : createCompany(),
      passwordDirty: false
    }
  }

  componentWillReceiveProps(nextProps) {
    let {company = {}} = nextProps
    if (
      company.id && company.id !== this.state.company.id
    ) {
      this.setState({
        company,
        passwordDirty: false
      }, this.reset)
    }
  }

  controlHeight = () => {
    return { minHeight: window.innerHeight - 99 }
  }

  on404 = () => {
    setTimeout(() => browserHistory.push(listPath), 500)
    return message.error('企业不存在', 7)
  }

  reset = () => {
    this.props.form.resetFields()
  }

  del = async () => {
    let {company} = this.state
    let res = await this.props.delCompany(company)
    if (!res) return
    message.success('删除成功')
    browserHistory.push(listPath)
  }

  addCompany = async (company) => {
    let res = await this.props.addCompany(company)
    if (!res) return
    notification.success({
      message: (
        <div>
          企业创建成功, 已创建企业根账户 <span className="color-green">{company.email}</span>
        </div>
      ),
      duration: 25
    })
    browserHistory.push(`${listPath}/${res.result.id}`)
  }

  updateCompany = async (
    company,
    msg = '修改企业成功'
  ) => {
    let {companys, setProp} = this.props
    let {id} = company
    let oldCompany = _.find(companys, {id: company.id}) || {}
    let update = diff(company, oldCompany, propsToSubmit)
    let res = await this.props.updateCompany(id, update)
    if (!res) return
    let updateObj = {...this.state.company, ...company}

    setProp(
      'update_companys',
      updateObj
    )
    message.success(msg)
  }

  submit = async (e) => {
    e.preventDefault()
    let pass = await this.validateFieldsAndScroll()
    if(!pass) return
    let company = deepCopy(this.state.company)
    let {id} = company
    Object.assign(company, pass)
    if (id) {
      this.updateCompany(company)
    } else {
      this.addCompany(company)
    }

  }

  handlePasswordBlur = e => {
    const value = e.target.value
    this.setState({ passwordDirty: !!value })
  }

  checkPass = (rule, value, callback) => {

    const form = this.props.form
    let res = /^[\da-zA-Z]{6,16}$/.test(value) &&
           /\d/.test(value) &&
           /[a-zA-Z]/.test(value)

    if (value && this.state.passwordDirty) {
      form.validateFields(['confirm'], { force: true })
    }

    callback(res ? undefined : '6~16位，数字和字母必须都有')
  }

  checkPassword = (rule, value, callback) => {
    const {form} = this.props
    if (value && value !== form.getFieldValue('password')) {
      callback('两次密码输入不一致')
    } else {
      callback()
    }
  }

  renderDelBtn = () => {
    let {company} = this.state
    if (company.is_root) return null
    return (
      <Popconfirm
        title={`确定删除用户企业 "${company.name}" 么？`}
        placement="topLeft"
        onConfirm={this.del}
      >
        <Button type="ghost"  icon={<CloseOutlined />}>删除</Button>
      </Popconfirm>
    );
  }

  renderBtns = () => {
    let {id} = this.state.company
    if (!id) return null
    return (
      <FormItem wrapperCol={{ span: 21, offset: 3 }}>
        {this.renderDelBtn()}
      </FormItem>
    )
  }

  validateCompanyName = _.throttle(async (rule, companyName, callback = () => null) => {
    let q = {
      where: {
        name: companyName
      }
    }
    let {id} = this.state.company
    if (id) {
      q.where.id = {
        $ne: id
      }
    }
    let res = await Fetch.get('/app/company/get', q)
    if (res && res.result.length) {
      callback('名称被占用,请换一个名称')
    }
    else callback()
  }, 1000)

  renderFormBtn = id => {
    let txt = id
      ? '更新'
      : '保存'
    return (
      <FormItem wrapperCol={{ span: 18, offset: 3 }}>
        <hr />
        <Button
          type="success"
          htmlType="submit"
        >
          {txt}
        </Button>
      </FormItem>
    )
  }

  renderTitleInput = (name, getFieldDecorator) => {
    return (
      <FormItem
        {...formItemLayout}
        label="企业名称"
        hasFeedback
      >
        {getFieldDecorator('name', {
          rules: [{
            required: true,
            message: '请输入企业名称'
          }, {
            min: 1,
            max: 50,
            type: 'string',
            message: '1~50个字符'
          }, {
            validator: this.validateCompanyName
          }],
          initialValue: name
        })(
          <Input />
        )}
      </FormItem>
    )
  }

  renderDesc = (description, getFieldDecorator) => {
    return (
      <FormItem
        {...formItemLayout}
        label="企业描述"
        hasFeedback
      >
        {getFieldDecorator('description', {
          rules: [{
            min: 1,
            max: 500,
            type: 'string',
            message: '1~500个字符'
          }, {
            validator: this.validateCompanyName
          }],
          initialValue: description
        })(
          <Input.TextArea />
        )}
      </FormItem>
    )
  }

  renderCellPhone = (cellphone, getFieldDecorator) => {
    return (
      <FormItem
        {...formItemLayout}
        label="手机号码"
        hasFeedback
      >
        {getFieldDecorator('cellphone', {
          rules: [{
            pattern: /^1\d{10}$/,
            message: '格式不正确'
          }],
          initialValue: cellphone
        })(
          <Input addonBefore="+86" />
        )}
      </FormItem>
    );
  }

  validateEmail = _.throttle(async (rule, email, callback = () => null) => {
    let q = {
      where: {
        email
      }
    }
    let {id} = this.state.company
    if (id) {
      q.where.id = {
        $ne: id
      }
    }
    let res = await Fetch.get('/app/company/get', q)
    if (res && res.result.length) {
      callback('名称被占用,请换一个名称')
    }
    else callback()
  }, 1000)


  renderEmail = (email, getFieldDecorator) => {
    return (
      <FormItem
        {...formItemLayout}
        label={(
          <span>
            邮件地址
            <Tooltip title="邮件地址将用于找回密码和验证身份，请填写真实的邮件地址">
              <QuestionCircleOutlined className="mg1l" />
            </Tooltip>
          </span>
        )}
      >
        {getFieldDecorator('email', {
          rules: [{
            type: 'email',
            transform(value) {
              return value.toLowerCase()
            },
            message: '格式不正确!'
          }, {
            required: true, message: '请输入邮件地址'
          }, {
            validator: this.validateEmail,
            validateTrigger: 'onBlur'
          }],
          initialValue: email
        })(
          <Input />
        )}
      </FormItem>
    );
  }

  renderType = (type, getFieldDecorator) => {
    if (this.state.company.is_root) return null
    return (
      <FormItem
        {...formItemLayout}
        label={(
          <span>
            类型
            <Tooltip title="试用用户资源使用被严格限制">
              <QuestionCircleOutlined className="mg1l" />
            </Tooltip>
          </span>
        )}
      >
        {getFieldDecorator('type', {
          initialValue: type
        })(
          <RadioGroup>
            <RadioButton value="trial">试用用户</RadioButton>
            <RadioButton value="payed">付款用户</RadioButton>
          </RadioGroup>
        )}
      </FormItem>
    );
  }

  renderPassword = (id, getFieldDecorator) => {
    if (id) return null
    return (
      <FormItem
        {...formItemLayout}
        label="密码"
        hasFeedback
      >
        {getFieldDecorator('password', {
          rules: [{
            required: true, message: '请输入密码'
          }, {
            validator: this.checkPass
          }]
        })(
          <Input
            type="password"
            onBlur={this.handlePasswordBlur}
            placeholder="6~16位，数字和字母必须都有"
          />
        )}
      </FormItem>
    )
  }

  renderPasswordRepeat = (id, getFieldDecorator) => {
    if (id) {
      return null
    }
    return (
      <FormItem
        {...formItemLayout}
        label="确认密码"
        hasFeedback
      >
        {getFieldDecorator('confirm', {
          rules: [{
            required: true, message: '请再次输入密码'
          }, {
            validator: this.checkPassword
          }]
        })(
          <Input type="password" />
        )}
      </FormItem>
    )
  }

  renderProjectSelect = (id, getFieldDecorator) => {
    if (id) return null
    let {projects} = this.props
    return (
      <FormItem
        {...formItemLayout}
        label={(
          <span>
            种子项目
            <Tooltip title="以种子项目数据给企业初始化一个项目以方便用户试用">
              <QuestionCircleOutlined className="mg1l" />
            </Tooltip>
          </span>
        )}
      >
        {getFieldDecorator('seedProjectId', {
          initialValue: ''
        })(
          <Select
            {...enableSelectSearch}
            dropdownMatchSelectWidth={false}
          >
            <Option key="no-seed" value="">不初始化项目</Option>
            {
              projects.map(p => {
                let {id, name} = p
                return (
                  <Option key={id} value={id}>{name}</Option>
                )
              })
            }
          </Select>
        )}
      </FormItem>
    );
  }

  renderForm = () => {
    let {
      name,
      email,
      type,
      cellphone,
      id,
      description
    } = this.state.company
    const {getFieldDecorator} = this.props.form
    return (
      <Form onSubmit={this.submit}>
        {this.renderBtns()}
        {this.renderTitleInput(name, getFieldDecorator)}
        {this.renderEmail(email, getFieldDecorator)}
        {this.renderCellPhone(cellphone, getFieldDecorator)}
        {this.renderType(type, getFieldDecorator)}
        {this.renderPassword(id, getFieldDecorator)}
        {this.renderPasswordRepeat(id, getFieldDecorator)}
        {this.renderProjectSelect(id, getFieldDecorator)}
        {this.renderDesc(description, getFieldDecorator)}
        {this.renderFormBtn(id)}
      </Form>
    )
  }

  render () {
    let {loading, companys} = this.props
    return (
      <Spin spinning={loading}>
        <div className="ug-wrapper relative" style={this.controlHeight()}>
          <CompanyList
            company={this.state.company}
            companys={companys}
          />
          <div className="ug-info pd3t">
            {this.renderForm()}
          </div>
        </div>
      </Spin>
    )
  }
}
