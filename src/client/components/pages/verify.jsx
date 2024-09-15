import React from 'react'
import './login.styl'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Input, Button, Alert, Modal } from 'antd'
import Fetch from '../../common/fetch-final'
import setStatePromiseDec from '../../common/set-state-promise'
import * as ls from '../../common/localstorage'
import Icon from '../Common/sugo-icon'
import { Anchor } from '../Common/anchor-custom'

const FormItem = Form.Item

const ERROR_MSG = {
  FAILED: '激活失败，无效的产品序列号，请联系客服',
  LICENSE_EXPIRE: '产品序列号已过期，请联系我们进行产品升级',
  LICENSE_FAILED: '无效的产品序列号，请联系我们进行产品升级',
  PRODCODE_MISSING: '无效的产品注册码和序列号，请联系客服',
  HAS_USED: '无效的产品序列号，此序列号已激活'
}

@setStatePromiseDec
class Verify extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      onload: false,
      msg: ''
    }
  }

  componentWillMount() {
    const { licenseError } = window.sugo
    if (licenseError === 'LICENSE_FAILED' || licenseError === 'LICENSE_EXPIRE') {
      // 手动删除或者修改了license记录
      this.setState({
        msg: '您的序列号已过期，请联系我们进行产品升级。'
      })
    }
  }

  validate() {
    return new Promise(resolve => {
      this.props.form.validateFields(errors => {
        if (errors) {
          resolve(false)
        } else resolve(true)
      })
    })
  }

  handleSubmit = async e => {
    e.preventDefault()
    let pass = await this.validate()
    if (!pass) return

    let data = this.props.form.getFieldsValue()
    await this.setStatePromise({
      onload: true,
      msg: ''
    })
    const { registrationCode } = window.sugo
    data.code = registrationCode
    let res = await Fetch.post('/common/verify', data)
    await this.setStatePromise({
      onload: false
    })

    if (!res) return
    if (!res.result.success) {
      const msg = ERROR_MSG[res.result.message]
      await this.setStatePromise({
        msg: msg
      })
      return
    }

    if (res.result.success) {
      Modal.success({
        title: '激活成功',
        content: '欢迎使用数果智能产品！',
        onOk: () => {
          window.location = res.redirect || '/login'
        }
      })
    }
  }

  render() {
    const { getFieldDecorator } = this.props.form
    let { cdn, siteName, loginLogoName, hideCopyright, copyrightTextLogin, version, registrationCode, qqCustomerServiceUrl, customerServicePhoneNumber } = window.sugo
    if (!qqCustomerServiceUrl) {
      qqCustomerServiceUrl = 'http://wpa.qq.com/msgrd?v=3&uin=3069681839&site=qq&menu=yes'
    }
    if (!customerServicePhoneNumber) {
      customerServicePhoneNumber = '020-29882969'
    }
    let logoPath = loginLogoName.includes('/') ? `${cdn}${loginLogoName}` : `${cdn}/static/images/${loginLogoName}`
    const labelText = `产品注册码：${registrationCode}`
    return (
      <div id='universe-wrapper'>
        <div id='universe'>
          <Button className='alignright mg3 fright' onClick={() => (window.location = '/login')}>
            马上登陆
          </Button>
        </div>
        <div id='login-content'>
          <div className='login-body'>
            <h1 className='aligncenter'>
              <img className='iblock mw200' src={logoPath} alt={siteName} />
            </h1>
            <div className='color-grey pd2y font16 aligncenter' />
            <div className='login-panel'>
              <div className='login-panel-title pd3x font20'>产品序列号</div>
              <div className='login-panel-body pd3x pd3y'>
                <Form onSubmit={this.handleSubmit}>
                  <div className='mg2b font14 fix login-links'>
                    <label className='pd2b' title={labelText}>
                      {labelText}
                    </label>
                  </div>
                  <FormItem>
                    {getFieldDecorator('license', {
                      rules: [{ required: true, whitespace: true, message: '请填写产品序列号' }]
                    })(<Input placeholder='产品序列号' size='default' />)}
                  </FormItem>

                  <div className={this.state.msg ? 'pd1b' : 'hide'}>
                    <Alert message={this.state.msg} type='error' showIcon />
                  </div>

                  <div className='pd1y font14 fix login-links'>联系我们获取产品序列号</div>
                  <div className='pd2y font14 fix login-links'>
                    <span className='mg3r'>
                      <Anchor href={qqCustomerServiceUrl} target='_blank'>
                        <Button className='customer-service-btn' style={{ width: '134px' }}>
                          <span className='normal'>
                            <Icon type='sugo-qq' className='iblock font12' /> QQ咨询
                          </span>
                        </Button>
                      </Anchor>
                    </span>
                    <span className='mg1r fright'>
                      <Button type='info' className='customer-service-btn'>
                        <Icon type='sugo-phone' /> {customerServicePhoneNumber}
                      </Button>
                    </span>
                  </div>
                  <Button className='btn-login' size='large' type='primary' htmlType='submit'>
                    {this.state.onload ? '激活中...' : '完成激活'}
                  </Button>
                </Form>
              </div>
            </div>

            <p className='aligncenter login-footer pd3y mg3t color-grey'>
              {hideCopyright ? null : <span>{copyrightTextLogin}</span>}v{version}
            </p>
          </div>
        </div>
      </div>
    )
  }
}

export default Form.create()(Verify)
