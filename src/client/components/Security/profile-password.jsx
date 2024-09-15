import React from 'react'
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Input, message } from 'antd';
import {updateProfile} from './profile'
import {validateFields} from '../../common/decorators'
import {formItemLayout, tailFormItemLayout} from '../../common/form-utils'
import _ from 'lodash'
import testPassword from 'common/test-password'

const FormItem = Form.Item

@validateFields
class ProfilePass extends React.Component {

  state = {
    onSubmitPass: false,
    passwordDirty: false
  }

  checkPassword = (rule, value, callback) => {
    const {form} = this.props
    if (value && value !== form.getFieldValue('password')) {
      callback('两次密码输入不一致')
    } else {
      callback()
    }
  }

  checkPass = (rule, value, callback) => {
    const form = this.props.form
    let res = testPassword(value)

    if (value && this.state.passwordDirty) {
      form.validateFields(['confirm'], { force: true })
    }

    callback(res ? undefined : '6~20位，数字和字母必须都有')
  }

  submitPass = async e => {
    e.preventDefault()
    let ok = await this.validateFields()
    if (!ok) return
    this.setState({
      onSubmitPass: true
    })
    let user = _.pick(ok, ['password', 'oldPassword'])
    let res = await updateProfile(user)
    this.setState({
      onSubmitPass: false
    })
    if (res) {
      this.props.form.resetFields()
      message.success('更新成功', 7)
    }
  }

  handlePasswordBlur = e => {
    const value = e.target.value
    this.setState({ passwordDirty: !!value })
  }

  render() {
    const { getFieldDecorator } = this.props.form
    let {onSubmitPass} = this.state
    return (
      <Form onSubmit={this.submitPass}>
        <FormItem
          {...formItemLayout}
          label="旧密码"
          hasFeedback
        >
          {getFieldDecorator('oldPassword', {
            rules: [{
              required: true, message: '请输入旧密码'
            }, {
              validator: this.checkPass
            }]
          })(
            <Input
              type="password"
            />
          )}
        </FormItem>
        <FormItem
          {...formItemLayout}
          label="新密码"
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
              placeholder="6~20位，数字和字母必须都有"
            />
          )}
        </FormItem>
        <FormItem
          {...formItemLayout}
          label="确认新密码"
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
            disabled={onSubmitPass}
            icon={<LegacyIcon type={onSubmitPass ? 'loading' : 'check-circle'} />}
          >
            {
              onSubmitPass ? '提交中...请稍等' : '提交'
            }
          </Button>
        </FormItem>
      </Form>
    );
  }
}

export default Form.create()(ProfilePass)

