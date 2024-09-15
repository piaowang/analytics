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
class RetrievePassword extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      onReg: false,
      success: false,
      data: {}
    }
  }

  handleSubmit = async e => {
    e.preventDefault()
    let ok = await this.validateFields()
    if (!ok) return
    this.setState({
      onReg: true
    })
    let res = await Fetch.post('/common/apply-reset-password', ok)
    this.setState({
      onReg: false
    })
    if (res) {
      this.setState({
        success: true
      })
    }
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

  render() {

    let {
      onReg,
      success,
      data
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
            }]
          })(
            <Input />
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
                    邮件已发送
                  </h1>
                  <p className="font14">
                    一封邮件已经发送到您的注册邮箱
                    <b className="color-green">{data.email}</b>,
                    请在24小时内登录您的邮箱，按照邮件的指示重置密码。
                  </p>
                  <p className="pd1t font14">
                    已经重置密码完成？
                    <a href="/">前往登录</a>
                  </p>
                </Col>
                : <Col span={19} className="center-content pd3"  style={style}>
                  <h1>找回密码</h1>
                  <p className="pd1t">
                    <a href="/">返回登录</a>
                  </p>
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

export default Form.create()(RetrievePassword)
