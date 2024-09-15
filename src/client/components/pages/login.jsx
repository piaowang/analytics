import React from 'react'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Input, Button, Alert } from 'antd'
import Fetch from '../../common/fetch-final'
import setStatePromiseDec from '../../common/set-state-promise'
import * as ls from '../../common/localstorage'
import Icon from '../Common/sugo-icon'
import _ from 'lodash'
import PropTypes from 'prop-types'
import './login.styl'
import SMKit from 'common/jssm4'

const FormItem = Form.Item

@setStatePromiseDec
class Login extends React.Component {
  static propTypes = {
    form: PropTypes.object,
    cdn: PropTypes.string,
    siteName: PropTypes.string,
    loginLogoName: PropTypes.string,
    showRegLink: PropTypes.bool,
    copyrightTextLogin: PropTypes.string,
    regLink: PropTypes.string,
    version: PropTypes.string,
    licenseValid: PropTypes.bool,
    sugoMonitorAlarmApis: PropTypes.object,
    redirect: PropTypes.string,
    loginBgImgUrl: PropTypes.string
  }
  
  constructor(props) {
    super(props)
    this.state = {
      onload: false,
      msg: ''
    }
    //清楚门户登录记录
    localStorage.portalId = ''
    localStorage.portalbasePath = ''
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

  handleSubmit = async(e) => {

    e.preventDefault()

    await this.setStatePromise({
      onload: true,
      msg: ''
    })

    let pass = await this.validate()
    if (!pass) {
      await this.setStatePromise({
        onload: false
      })
      return
    }

    let data = this.props.form.getFieldsValue()
    const { keyComp1: k1 = '', kitPrefix: p1 = '' } = window.sugo
    const params = k1 + p1
    const smKit = new SMKit(params)
    data.password = smKit.encryptData_ECB(data.password)
    // data.password = CryptoJS.AES.encrypt(data.password, 'sugo').toString()
    let res = await Fetch.post('/common/login', data)

    await this.setStatePromise({
      onload: false
    })

    if (!res) return

    if (res.error) {
      await this.setStatePromise({
        msg: res.error
      })
    } else {
      ls.clear([
        'ls_slices',
        'ls_dashboards',
        'ls_usergroups',
        'ls_retentions',
        'ls_funnels'
      ])
      window.location = this.props.redirect || res.redirect || '/console'
    }
  }

  render() {
    const {getFieldDecorator} = this.props.form
    const {
      cdn,
      siteName,
      loginLogoName,
      showRegLink,
      copyrightTextLogin,
      regLink = 'http://sugo.io/info',
      version,
      licenseValid,
      sugoMonitorAlarmApis: {
        email
      },
      loginBgImgUrl
    } = this.props
    let logoPath = loginLogoName.includes('/')
      ? `${cdn}${loginLogoName}`
      : `${cdn}/static/images/${loginLogoName}`
    if (_.startsWith(loginLogoName, 'http') || _.startsWith(loginLogoName, 'data:')) {
      logoPath = loginLogoName
    }
    return (
      <div id='universe-wrapper'>
        <div
          id='universe'
          className='login-bg'
          style={loginBgImgUrl ? {backgroundImage: `url(${loginBgImgUrl})`} : undefined}
        >
          {
            licenseValid ?
              <Button
                className='alignright mg3 fright'
                onClick={() => window.location = '/verify-page'}
              >产品升级</Button>
              : null
          }
        </div>
        <div id='login-content'>
          <div className='login-body'>
            <h1 className='aligncenter mg3b'>
              <img className='iblock mw200' src={logoPath} alt={siteName}/>
            </h1>
            <div className='login-panel'>
              <div className='login-panel-title pd3x font16'>登录到{siteName}</div>
              <div className='login-panel-body pd3x pd3y'>
                <Form onSubmit={this.handleSubmit}>
                  <FormItem>
                    {getFieldDecorator('username', {
                      rules: [
                        {required: true, message: '不能为空'}
                      ]
                    })(
                      <Input
                        placeholder='用户名'
                        size='default'
                        addonBefore={<Icon type='sugo-user' className='color-white' />}
                      />
                    )}
                  </FormItem>
                  <FormItem>
                    {
                      getFieldDecorator('password', {
                        rules: [
                          {required: true, whitespace: true, message: '请填写密码'}
                        ]
                      })(
                        <Input
                          type='password'
                          size='default'
                          placeholder='密码'
                          addonBefore={<Icon type='sugo-lock' className='color-white' />}
                        />
                      )
                    }
                  </FormItem>

                  <div className={this.state.msg ? 'pd1b' : 'hide'}>
                    <Alert message={this.state.msg} type='error' showIcon />
                  </div>

                  <Button className='btn-login' size='large' type='primary' htmlType='submit'>
                    {this.state.onload ? '登录中...' : '登录'}
                  </Button>
                  <div className='pd3y font14 fix login-links'>
                    {
                      showRegLink
                        ? <a href={regLink} className='fleft color-grey pointer' target='_blank'>申请试用</a>
                        : null
                    }
                    {
                      email
                        ? <a href='/retrieve-password' className='fright color-grey pointer'>找回密码</a>
                        : null
                    }
                  </div>
                </Form>
              </div>
            </div>

            <p className='aligncenter login-footer pd3y mg3t color-grey'>
              <span>{copyrightTextLogin} </span>
            v{version}
            </p>
          </div>
        </div>
      </div>
    )
  }
}

export default Form.create()(Login)
