import React from 'react'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Button, Input, Modal, Alert } from 'antd'
import Icon from '../Common/sugo-icon'
import _ from 'lodash'
import Fetch from '../../common/fetch-final'
import { validateFields } from '../../common/decorators'
import setStatePromise from '../../common/set-state-promise'
import { Anchor } from '../Common/anchor-custom'
const FormItem = Form.Item

const ERROR_MSG = {
  FAILED: '激活失败，无效的产品序列号，请联系客服',
  LICENSE_EXPIRE: '产品序列号已过期，请联系我们进行产品升级',
  LICENSE_FAILED: '无效的产品序列号，请联系我们进行产品升级',
  PRODCODE_MISSING: '无效的产品注册码和序列号，请联系客服',
  HAS_USED: '无效的产品序列号，此序列号已激活'
}

@validateFields
@setStatePromise
class LicenseModal extends React.Component {
  state = {
    showModal: false,
    onload: false,
    msg: ''
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
    const { licenseExpireTime } = window.sugo
    let registrationCode = _.get(licenseExpireTime, 'code')
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
        title: '产品升级',
        content: '产品升级成功，欢迎继续使用数果智能！',
        onOk: () => {
          window.location = window.location
        }
      })
    }
  }

  render() {
    const { showModal, hideVerify } = this.props
    const { getFieldDecorator } = this.props.form
    let { qqCustomerServiceUrl, customerServicePhoneNumber, licenseExpireTime } = window.sugo
    let registrationCode = _.get(licenseExpireTime, 'code')
    const labelText = `产品注册码：${registrationCode}`
    const footer = (
      <div>
        <Button className='btn-login' size='large' type='primary' onClick={this.handleSubmit}>
          {this.state.onload ? '升级中...' : '完成升级'}
        </Button>
        <Button className='btn-login' size='large' onClick={hideVerify}>
          我知道了
        </Button>
      </div>
    )
    return (
      <div>
        <Modal title='产品序列号' visible={showModal} footer={footer} width={400} onCancel={hideVerify}>
          <div className='login-panel'>
            <div className='login-panel-body pd3x pd1y'>
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
                  <span className='mg2r iblock'>
                    <Anchor href={qqCustomerServiceUrl} target='_blank'>
                      <Button style={{ width: '134px' }}>
                        <span className='normal'>
                          <Icon type='sugo-qq' className='iblock font12' /> QQ咨询
                        </span>
                      </Button>
                    </Anchor>
                  </span>
                  <span className='mg1r fright iblock'>
                    <Button type='info'>
                      <Icon type='sugo-phone' /> {customerServicePhoneNumber}
                    </Button>
                  </span>
                </div>
              </Form>
            </div>
          </div>
        </Modal>
      </div>
    )
  }
}

export default Form.create()(LicenseModal)
