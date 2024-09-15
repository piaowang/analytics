import React, { Component } from 'react'
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Select, Button, Divider, Input, Radio, message, Tooltip, InputNumber, Row, Col } from 'antd';

const { marketBrain: { 
  feature,
  shouldSetGlobalSceneParams
} } = window.sugo

const FormItem = Form.Item
const { TextArea } = Input
const Option = Select.Option

const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 3 }
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 10 }
  }
}

export class Content extends Component{

  state = {
    titleLength: 0,
    contentLength: 0,
    smsContentLength: 0,
    touch_up_way: 0,
    send_channel: 0,
    url: '',
    channelEnum: ['短信']
  }

  validSmsLength = () => {
    const { getFieldValue, setFields } = this.props.form
    const content = getFieldValue('copywriting.content')
    const url = getFieldValue('copywriting.url')
    const hasUrl = content && content.includes('${url}')
    let smsContentLength = _.get(content, 'length', 0)
    let msg = '超过130字符，请重新输入'
    if (hasUrl) {
      smsContentLength = _.get(content, 'length', 0) + _.get(url,'length',0) - '${url}'.length
      msg = '短信正文+链接超过130字符，请重新输入'
    }
    this.setState({ smsContentLength })
    if (smsContentLength > 130) {
      setFields({
        'copywriting.content': {
          value: content,
          errors: [new Error(msg)]
        }
      })
      return false
    } else {
      setFields({
        'copywriting.content': {
          value: content,
          errors: null
        }
      })
      return true
    }
  }

  render() {

    const { form, item ={}, disabled, pageLocate = 'event', shouldContent = true, shouldUrl = true, requiredUrl = false } = this.props
    const { getFieldDecorator, setFieldsValue, getFieldValue, setFields } = form
    const { smsContentLength, url } = this.state
    let send_channel = getFieldValue('send_channel')

    return (
      <React.Fragment>
      {
        shouldContent
        ? (
          <FormItem {...formItemLayout} label="活动文案">
            <Row>
              <Col span={shouldUrl ? 20 : 24}>
                {getFieldDecorator('copywriting.content', {
                  initialValue: _.get(item, 'copywriting.content', ''),
                  rules: [{
                    required: true,
                    message: '请输入活动文案',
                    whitespace: true
                  }, {
                    validator: async (rule, value, callback) => {
                      const urlCount = value.split('${url}').length - 1
                      if (urlCount > 1) {
                        return await callback('只能插入一个链接参数')
                      }
                      const url = getFieldValue('copywriting.url')
                      let smsContentLength = value.length
                      if (urlCount === 1) {
                        smsContentLength = value.length + _.get(url, 'length', 0) - '${url}'.length
                      }

                      if (send_channel === 0) {
                        if (smsContentLength > 130 && urlCount === 0) {
                          await callback('超过130字符，请重新输入')
                        } else if (smsContentLength > 130 && urlCount === 1) {
                          await callback('短信正文+链接超过130字符，请重新输入')
                        }
                      }

                      this.setState({
                        smsContentLength
                      })
                      if (urlCount === 1 && !url) {
                        return setFields({
                          'copywriting.url': {
                            value: '',
                            errors: [new Error('请输入链接')]
                          }
                        })
                      }
                      await callback()
                    }
                  }]
                })(
                  <TextArea
                    disabled={disabled}
                    rows={5}
                    style={{ width: '93%' }}
                    placeholder={send_channel === 0 ? '130字符' : '无限制'}
                  />
                )}
                {
                  send_channel === 0 ? <span className="mg1l">{`${smsContentLength || _.get(item, 'copywriting.content', '').length}/130`}</span>
                    : <span className="mg1l">{`${smsContentLength || _.get(item, 'copywriting.content', '').length}`}</span>
                }
              </Col>
              {
                shouldContent && shouldUrl
                ? (
                  <Col span={4}>
                    <Button
                      size="small"
                      type="primary"
                      className="mg2l"
                      disabled={disabled}
                      onClick={() => {
                        let content = getFieldValue('copywriting.content')
                        const hasUrl = content.includes('${url}')
                        if (hasUrl) return message.error('只能插入一个超链接参数')
                        content = content + '${url}'
                        setFieldsValue({ 'copywriting.content': content })
                        this.validSmsLength()
                      }}
                    >插入链接参数
                    </Button>
                  </Col>
                )
                : null
              }
            </Row>
          </FormItem>
        ) : null
      }
      {/* <FormItem {...formItemLayout} label={pageLocate === 'event' ? '输入商品id' : '输入链接'}> */}
      {
        shouldUrl 
        ? (
          <FormItem {...formItemLayout} label="输入链接">
            {getFieldDecorator('copywriting.url', {
              initialValue: url || _.get(item,'copywriting.url', '') ,
              // initialValue:  _.get(item,'copywriting.url', ''),
              rules: [{
                required: true,
                validator: async (rule, value, callback) => {
                  if (requiredUrl) {
                    const url = getFieldValue('copywriting.url')
                    if (!url) return callback('请填写url')
                    return callback()
                  }
                  const content = getFieldValue('copywriting.content') || ''
                  const hasUrl = content && content.includes('${url}')
                  if ( hasUrl && !value) {
                    return await callback('请输入链接')
                  }
                  if (!this.validSmsLength()){
                    return
                  }
                  await callback()
                }
              }]
            }) (
              <Input disabled={disabled} />
            )}
          </FormItem>
        ) : null
      }
    </React.Fragment>
    )
  }
}