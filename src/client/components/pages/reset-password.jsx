import React from 'react'
import './reg.styl'
import { CheckCircleOutlined } from '@ant-design/icons';
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Input, Button, Col, Row } from 'antd';
import Fetch from '../../common/fetch-final'
import LeftMenu from './page-left-menu'
import {validateFields} from '../../common/decorators'
const FormItem = Form.Item

@validateFields
class ResetPassword extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      success: false,
      data: {}, //注册成功的数据
      passwordDirty: false,
      onReg: false
    }
  }

  componentDidMount() {
    universe()
  }

  handleSubmit = async e => {
    e.preventDefault()
    let ok = await this.validateFields()
    if (!ok) return
    this.setState({
      onReg: true
    })
    ok.id = window.sugo.id
    let res = await Fetch.post('/common/reset-password', ok)
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

  render() {

    let {
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

        <FormItem {...tailFormItemLayout}>
          <Button
            type="success"
            htmlType="submit"
            size="large"
            disabled={onReg}
            icon={<LegacyIcon type={onReg ? 'loading' : 'check-circle'} />}
          >
            {
              onReg ? '提交中...请稍等' : '提交'
            }
          </Button>
          <p className="pd1t">
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
            <LeftMenu activeMenu={'/retrieve-password'} />
            {
              success
                ? <Col span={19} className="center-content pd3"  style={style}>
                  <h1>
                    <CheckCircleOutlined className="color-green mg1r" />
                    重置密码成功
                  </h1>
                  <hr />
                  <p className="pd1t font14">
                    <a href="/">前往登录</a>
                  </p>
                </Col>
                : <Col span={19} className="center-content pd3"  style={style}>
                  <h1>重置密码</h1>
                  <hr />
                  {form}
                </Col>
            }  
          </Row>
        </div>
      </div>
    );
  }
}

export default Form.create()(ResetPassword)
