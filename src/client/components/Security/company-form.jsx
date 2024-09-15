import React from 'react'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { Form, Icon as LegacyIcon } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Button, Tooltip, message, Input } from 'antd'
import _ from 'lodash'
import Fetch from '../../common/fetch-final'
import {validateFields, combineDecorators} from '../../common/decorators'
import setStatePromise from '../../common/set-state-promise'
import {formItemLayout, tailFormItemLayout} from '../../common/form-utils'
const FormItem = Form.Item
const oldCompany = window.sugo.user.company
import CountDown from '../Common/countdown'
import './security.styl'

function updateProfile (data) {
  return Fetch.post('/app/user/update-company-profile', data)
}

@combineDecorators(validateFields, setStatePromise)
class CompanyForm extends React.Component {

  state = {
    onSubmitProfile: false,
    index: 0,
    countdownState: 'init',
    onsendCellcode: false,
    cellphoneChanged: false,
    disabled: true,
    countdownTotal: 60 , //60s,
    validateStatus:'',
    helper:''
  }

  componentDidMount() {
    setTimeout(() => {
      this.setState({
        disabled: false
      })
    }, 500)
  }

  onCellChange = e => {
    let { value } = e.target
    const { getFieldError } = this.props.form

    if (oldCompany.cellphone === value || !!getFieldError('cellphone') || value.length === 0) {
      this.setState({
        cellphoneChanged: false
      },() => {
        this.setStatePromise({
          countdownState: 'init'
        })
      })
    }else{
      this.setState({
        cellphoneChanged: true
      })
    }
  }

  checkPass = (rule, value, callback) => {
    let res = /^[\da-zA-Z]{6,16}$/.test(value) &&
           /\d/.test(value) &&
           /[a-zA-Z]/.test(value)

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

  submitProfile = async e => {
    e.preventDefault()
    let ok = await this.validateFields()
    if (!ok) return
    let picks = ['cellphone', 'name', 'description'].filter(prop => {
      return ok[prop] !== window.sugo.user.company[prop]
    })

    if (!picks.length) return message.error('您并没有修改，无需提交', 10)
    picks = picks.concat('password', 'cellcode')
    let company = _.pick(ok, picks)
    this.setState({
      onSubmitProfile: true
    })
    let res = await updateProfile(company)
    this.setState({
      onSubmitProfile: false
    })
    if (res) {
      Object.assign(window.sugo.user.company, company)
      message.success('更新成功', 7)
      this.props.form.setFieldsValue({
        password: ''
      })
    }
  }

  validateCompanyName = _.throttle(async (rule, companyName, callback = () => null) => {
    if (companyName === oldCompany.name) return callback()
    let res = await Fetch.post('/common/validate-company-name', {
      companyName
    })

    if (res && res.error) {
      callback(res.error)
    }
    else callback()

  }, 1000)

  validateCellphone = _.throttle(async (rule, cellphone, callback = () => null) => {
    if (!cellphone) return callback()
    if (cellphone === oldCompany.cellphone) return callback()
    let res = await Fetch.post('/common/validate-cellphone', {
      cellphone
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

  checkCellcode = () => {
    const { getFieldError } = this.props.form
    if(getFieldError('cellcode')){
      return false
    }else{
      return true
    }
  }

  handleChange = (e) => {
    let pattern = new RegExp('[`~!@#$^&*()=|{}\':;\',\\[\\].<>/?~！@#￥……&*（）——|{}【】‘；：”“\'。，、？% (^\s*)|(\s*$) ]')
    let result = this.props.form.getFieldValue('name').search(pattern)
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
    let {description, cellphone, name} = window.sugo.user.company
    let {
      onSubmitProfile,
      countdownTotal,
      onsendCellcode,
      countdownState,
      index,
      cellphoneChanged,
      disabled
    } = this.state
    return (
      <Form onSubmit={this.submitProfile}>
        <FormItem
          {...formItemLayout}
          label="公司名称"
          hasFeedback
          validateStatus={this.state.validateStatus}
          help={this.state.helper}
          onChange={this.handleChange}
        >
          {getFieldDecorator('name', {
            initialValue: name,
            rules: [{
              required: true, message: '公司名称'
            }, {
              min: 1,
              max: 50,
              message: '1 ~ 50个字符'
            }]
          })(
            <Input disabled={disabled} />
          )}
        </FormItem>
        <FormItem
          {...formItemLayout}
          label="描述"
          hasFeedback
        >
          {getFieldDecorator('description', {
            initialValue: description,
            rules: [{
              min: 0,
              max: 500,
              message: '0 ~ 500个字符'
            }]
          })(
            <Input disabled={disabled} />
          )}
        </FormItem>
        <FormItem
          {...formItemLayout}
          label="手机号码"
          hasFeedback
        >
          {getFieldDecorator('cellphone', {
            rules: [{
              pattern: /^1\d{10}$/,
              message: '格式不正确'
            }, {
              validator: this.validateCellphone
            }],
            initialValue: cellphone
          })(
            <Input disabled={disabled} addonBefore=" +86 " onBlur={this.onCellChange} />
          )}
        </FormItem>
        {
          cellphoneChanged
            ? <FormItem
              {...formItemLayout}
              label={(
                <span>
                  手机验证码
                  <Tooltip title="点击发送验证码，我们将向您的手机发送验证码，填写您收到的验证码以确认您的手机号码真实有效">
                    <QuestionCircleOutlined className="mg1l" />
                  </Tooltip>
                </span>
              )}
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
                }]
              })(
                <span className="checkbox">
                  <Input className="iblock width100" disabled={disabled} />
                  <i className={
                    this.checkCellcode() 
                      ? 'anticon anticon-check-circle'
                      : 'anticon anticon-close-circle'
                  }
                  />
                </span>
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
            : null
        }
        
        <FormItem
          {...formItemLayout}
          label="个人登录密码"
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
              disabled={disabled}
            />
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
    )
  }
}

export default Form.create()(CompanyForm)
