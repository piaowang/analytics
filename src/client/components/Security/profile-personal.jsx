import React from 'react'
import { Form, Icon as LegacyIcon } from '@ant-design/compatible'
import {
  QuestionCircleOutlined
} from '@ant-design/icons'
import '@ant-design/compatible/assets/index.css'
import { Button, Tooltip, message, Input } from 'antd'
import {updateProfile} from './profile'
import _ from 'lodash'
import Fetch from '../../common/fetch-final'
import {validateFields} from '../../common/decorators'
import setStatePromise from '../../common/set-state-promise'
import {formItemLayout, tailFormItemLayout} from '../../common/form-utils'
import moment from 'moment'
import LicenseModal from './license-modal'

const FormItem = Form.Item

@validateFields
@setStatePromise
class ProfilePersonal extends React.Component {

  state = {
    onSubmitProfile: false,
    showModal: false,
    onload: false
  }

  submitProfile = async e => {
    e.preventDefault()
    let ok = await this.validateFields()
    if (!ok) return
    let picks = ['email', 'first_name', 'cellphone'].filter(prop => ok[prop] !== window.sugo.user[prop])
    if (!picks.length) return message.error('您并没有修改，无需提交', 10)
    let user = _.pick(ok, picks)
    if ('cellphone' in user) {
      user.cellphone = user.cellphone || null
    }
    if ('email' in user) {
      user.email = user.email || null
    }
    this.setState({
      onSubmitProfile: true
    })
    let res = await updateProfile(user)
    this.setState({
      onSubmitProfile: false
    })
    if (res) {
      Object.assign(window.sugo.user, user)
      message.success('更新成功', 7)
    }
  }

  validateEmail = _.throttle(async (rule, email, callback = () => null) => {

    if (email === window.sugo.user.email) return callback()

    let res = await Fetch.post('/common/validate-email', {
      email
    })

    if (res && res.error) {
      callback(res.error)
    }
    else callback()

  }, 1000)

  goVerifyPage = () => {
    // window.location = '/verify-page'
    this.setState({
      showModal: true
    })
  }

  hideVerify = () => {
    this.setState({
      showModal: false
    })
  }

  validate() {
    return new Promise((resolve) => {
      this.props.form.validateFields((errors) => {
        if (errors) {
          resolve(false)
        } else resolve(true)
      })
    })
  }
  
  handleChange = (e) => {
    let pattern = new RegExp('[`~!@#$^&*()=|{}\':;\',\\[\\].<>/?~！@#￥……&*（）——|{}【】‘；：”“\'。，、？% (^\s*)|(\s*$) ]')
    let result = this.props.form.getFieldValue('first_name').search(pattern)
    if( result === -1){
      this.setState(()=>{
        return {
          ...this.state,
          validateStatus : '',
          helper : ''
        }
      })
    }else{
      this.setState(()=> {
        return {
          ...this.state,
          validateStatus : 'error',
          helper : '包含特殊字符'
        }
      })
    }
  }

  render () {
    const { getFieldDecorator } = this.props.form
    let { user, licenseExpireTime, licenseValid } = window.sugo
    let {username, first_name, email, cellphone} = user
    let {onSubmitProfile, showModal} = this.state
    return (
      <div>
        <Form onSubmit={this.submitProfile}>
          <FormItem
            {...formItemLayout}
            label="登录用户名"
            hasFeedback
          >
            <b>{username}</b>
          </FormItem>
          {!licenseValid ? null
            :
            <FormItem
              {...formItemLayout}
              label="账号到期时间"
              hasFeedback
            >
              <b>
                {moment(licenseExpireTime.expireTime).format('YYYY年MM月DD日 HH时mm分ss秒')}(距离到期时间还有：{licenseExpireTime.days + 1}天)
                <Button className="mg3l" onClick={() => this.goVerifyPage()}>
                  产品升级
                </Button>
              </b>
            </FormItem>
          }
          <FormItem
            {...formItemLayout}
            label="姓名"
            hasFeedback
          >
            {getFieldDecorator('first_name', {
              initialValue: first_name,
              rules: [{
                required: true, message: '请输入姓名'
              }, {
                min: 1,
                max: 50,
                message: '1 ~ 50个字符'
              }]
            })(
              <Input />
            )}
          </FormItem>

          <FormItem
            {...formItemLayout}
            label={(
              <span>
                邮件地址
                <Tooltip title="邮件地址将用于找回密码和验证身份，请填写真实的邮件地址">
                  <QuestionCircleOutlined className="mg1l"/>
                </Tooltip>
              </span>
            )}
            hasFeedback
          >
            {getFieldDecorator('email', {
              initialValue: email,
              rules: [{
                type: 'email',
                transform(value) {
                  return value.toLowerCase()
                },
                message: '格式不正确!'
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
            label="手机号码"
            hasFeedback
          >
            {getFieldDecorator('cellphone', {
              initialValue: cellphone,
              rules: [{
                type: 'string',
                pattern: /^1[0-9]{10}$/,
                message: '格式不正确!'
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
              disabled={onSubmitProfile}
              icon={<LegacyIcon type={onSubmitProfile ? 'loading' : 'check-circle'} />}
            >
              {
                onSubmitProfile ? '提交中...请稍等' : '提交'
              }
            </Button>
          </FormItem>
        </Form>
        {
          !licenseValid
            ? null
            : <LicenseModal
              showModal={showModal}
              hideVerify={this.hideVerify}
              />
        }
      </div>
    )
  }
}

export default Form.create()(ProfilePersonal)

