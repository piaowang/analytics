import React from 'react'
import './reg.styl'
import { CheckCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Input, Button, Tooltip, Modal, Col, Row, message } from 'antd';
import Fetch from '../../common/fetch-final'
import setStatePromise from '../../common/set-state-promise'
import {validateFields} from '../../common/decorators'
import CountDown from '../Common/countdown'
import _ from 'lodash'
import LeftMenu from './page-left-menu'
const FormItem = Form.Item

@validateFields
@setStatePromise
class Reg extends React.Component {

  state = {
    onload: false,
    index: 0,
    success: false,
    data: {}, //注册成功的数据
    passwordDirty: false,
    showAgreement: false,
    countdownState: 'init',
    onsendCellcode: false,
    onReg: false,
    countdownTotal: 60 //60s
  }

  handleSubmit = async e => {
    e.preventDefault()
    let ok = await this.validateFields()
    if (!ok) return
    this.setState({
      onReg: true
    })
    let res = await Fetch.post('/common/reg', ok)
    this.setState({
      onReg: false
    })
    if (res) {
      this.setState({
        success: true,
        data: ok
      })
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

  checkField = (field) => {
    const {validateFields} = this.props.form
    return new Promise((resolve) => {
      validateFields([field], (errors, values) => {
        if (errors) resolve(false)
        else resolve(values)
      })
    })
  }

  checkPassword = (rule, value, callback) => {
    const {form} = this.props
    if (value && value !== form.getFieldValue('password')) {
      callback('两次密码输入不一致')
    } else {
      callback()
    }
  }

  showAgreement = () => {
    this.setState({
      showAgreement: true
    })
  }

  hideAgreement = () => {
    this.setState({
      showAgreement: false
    })
  }

  validateEmail = _.throttle(async (rule, email, callback = () => null) => {

    let res = await Fetch.post('/common/validate-email', {
      email
    })

    if (res && res.error) {
      callback(res.error)
    }
    else callback()

  }, 1000)

  validateCompanyName = _.throttle(async (rule, companyName, callback = () => null) => {

    let res = await Fetch.post('/common/validate-company-name', {
      companyName
    })

    if (res && res.error) {
      callback(res.error)
    }
    else callback()

  }, 1000)

  validateCellphone = _.throttle(async (rule, cellphone, callback = () => null) => {

    let res = await Fetch.post('/common/validate-cellphone', {
      cellphone
    })

    if (res && res.error) {
      callback(res.error)
    }
    else callback()

  }, 1000)

  checkCellcode = _.throttle(async (rule, cellcode, callback = () => null) => {
    if (!cellcode) return callback()

    let res = await Fetch.post('/common/validate-cellcode', {
      cellcode
    })

    if (res && res.error) {
      callback(res.error)
    }
    else callback()

  }, 1000)

  sendCellcode = async () => {
    let ok = await this.checkField('cellphone')
    if (!ok) return

    const {form} = this.props
    this.setState({
      onsendCellcode: true
    })
    let cell = form.getFieldValue('cellphone')
    let res = await Fetch.post('/common/send-cellcode', {
      cell 
    })

    await this.setStatePromise({
      onsendCellcode: false
    })
    
    if (!res) {
      return
    }

    if (!res.result.Model) {
      return message.error('发送短信失败了，请尝试重新发送或者换一个号码', 25)
    }
    message.success('验证码已经发送, 请注意查收', 10)

    let {index} = this.state
    await this.setStatePromise({
      countdownState: 'start',
      index: index + 1
    })

  }

  render() {

    let {
      countdownState,
      countdownTotal,
      showAgreement,
      onsendCellcode,
      index,
      data,
      onReg,
      success
    } = this.state
    let height = window.innerHeight
    let style = {
      minHeight: height
    }
    const { getFieldDecorator } = this.props.form
    const formItemLayout = {
      labelCol: { span: 6 },
      wrapperCol: { span: 14 }
    }
    const tailFormItemLayout = {
      wrapperCol: {
        span: 14,
        offset: 6
      }
    }

    let form = (
      <Form layout="horizontal" onSubmit={this.handleSubmit}>
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
          hasFeedback
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
            }]
          })(
            <Input />
          )}
        </FormItem>
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
        <FormItem
          {...formItemLayout}
          label="企业名称"
          hasFeedback
        >
          {getFieldDecorator('companyName', {
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
            }]
          })(
            <Input />
          )}
        </FormItem>

        <FormItem
          {...formItemLayout}
          label="手机号码"
          hasFeedback
        >
          {getFieldDecorator('cellphone', {
            rules: [{
              required: true,
              message: '请输入手机号码'
            }, {
              pattern: /^1\d{10}$/,
              message: '格式不正确'
            }, {
              validator: this.validateCellphone
            }]
          })(
            <Input addonBefore="+86" />
          )}
        </FormItem>
        <FormItem
          {...formItemLayout}
          label={(
            <span>
              手机验证码
              <Tooltip title="点击发送验证码，我们将向您的手机发送验证码，填写您收到的验证码以确认您的手机号码真实有效">
                <QuestionCircleOutlined className="mg1l" />
              </Tooltip>
            </span>
          )}
          hasFeedback
        >
          {getFieldDecorator('cellcode', {
            rules: [{
              required: true,
              message: '请输入验证码!'
            }, {
              min: 1,
              max: 4,
              type: 'string',
              message: '请填写正确的验证码'
            }, {
              validator: this.checkCellcode
            }]
          })(
            <Input className="iblock width100" />
          )}

          <CountDown
            state={countdownState}
            count={countdownTotal}
            index={index}
          >
            {
              ({count, onCountdown, state}) => {
                let txt = '发送验证码'
                if (onsendCellcode) txt = '发送验证码中...'
                else if (state !== 'init') {
                  txt = `${count}秒后可以再次发送`
                }
                return (
                  <Button
                    className="iblock mg1l"
                    disabled={onCountdown || onsendCellcode}
                    size="large"
                    onClick={this.sendCellcode}
                  >
                    {txt}
                  </Button>
                )
              }
            }
          </CountDown>
              
        </FormItem>
        <FormItem {...tailFormItemLayout}>
          <p>
            点击注册即意味着您已经阅读并且同意
            <a href="#" onClick={this.showAgreement}>使用协议</a>
          </p>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            disabled={onReg}
            icon={<LegacyIcon type={onReg ? 'loading' : 'check-circle'} />}
          >
            {
              onReg ? '注册中...请稍等' : '注册'
            }
          </Button>
          <p className="pd1t">
            已经有账号了？
            <a href="/">前往登录</a>
          </p>
        </FormItem>
      </Form>
    )

    return (
      <div id="universe-wrapper">
        <div id="universe" />
        <div id="wrapper">
          <Row id="main">
            <LeftMenu activeMenu={'/reg'} />
            {
              success
                ? <Col span={19} className="center-content pd3"  style={style}>
                  <h1>
                    <CheckCircleOutlined className="color-green mg1r" />
                    注册成功
                  </h1>
                  <hr />
                  <ul className="font14">
                    <li>
                      <b>邮箱(登录用户名)</b>：{data.email}
                    </li>
                    <li>
                      <b>企业名称</b>：{data.companyName}
                    </li>
                    <li>
                      <b>手机号码</b>：{data.cellphone}
                    </li>
                  </ul>
                  <hr />
                  <p className="pd1t font14">
                    <a href="/">前往登录</a>
                  </p>
                  <p className="font14">
                    您就可以开始试用数果星盘了。
                    另外，一封邮件已经发送到您的注册邮箱
                    <b className="color-green">{data.email}</b>,
                    请登录您的邮箱，按照邮件的指示验证您的邮箱。
                  </p>

                </Col>
                : <Col span={19} className="center-content pd3"  style={style}>
                  <h1>注册成为数果星盘用户，开始发现数据价值</h1>
                  <hr />
                  {form}
                </Col>
            }  
          </Row>
          <Modal
            title="服务协议"
            visible={showAgreement}
            footer={null}
            onCancel={this.hideAgreement}
          >
            <div className="font14">
              <p>欢迎访问数果星盘，使用本站服务，即意味着您已经同意以下隐私和服务条款，您不接受本隐私声明，请不要安装、使用、注册或以其他方式申请试用我站的服务。我站有权随时修改本服务协议，如果您继续使用我站的服务，那就意味着您接受对服务协议的全部修改。</p>
              <p>1.本站产品可能会使用包括第三方工具在内的工具收集您的注册资料和使用信息。并可能用于商业等用途。</p>
              <p>2.本站有权随时终止试用用户的试用，收取费用。</p>
              <p>3.本站不保证保留试用用户的资料和分析结果等数据。</p>
              <p>4.本站不会泄露您的信息，但是不保证您由于其他操作导致的信息泄露。由此产生的后果由您自行承担</p>
            </div>
          </Modal>
        </div>
      </div>
    );
  }
}

export default Form.create()(Reg)
