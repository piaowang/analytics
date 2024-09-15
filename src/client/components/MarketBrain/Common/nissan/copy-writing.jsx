import React, { Component } from 'react'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Input, Select, Row, Col, message } from 'antd';
import Fetch from '../../../../common/fetch-final'
import { NISSANCHANNELENUM, SENDCHANNELENUM } from 'common/marketBrain/constants'
import { Content } from '../copywritingItem'
import _ from 'lodash'

const { marketBrain: { 
  feature
} } = window.sugo

const FormItem = Form.Item
const { TextArea } = Input
const Option = Select.Option

export default class CopyWriting extends Component {

  state = {
    titleLength: 0,
    contentLength: 0,
    smsContentLength: 0,
    touch_up_way: 0,
    send_channel: 0,
    url: '',
    channelEnum: ['短信']
  }

  componentDidMount() {
    const { item = {} } = this.props
    this.setState({
      send_channel: _.get(item, 'send_channel', undefined)
    })
  }


  render() {
    const { formItemLayout, form, item ={}, disabled, pageLocate = 'event' } = this.props
    const { getFieldDecorator, setFieldsValue, getFieldValue } = form
    let touch_up_way = getFieldValue('touch_up_way') || 0
    let send_channel = getFieldValue('send_channel') || 0

    let shouldContent = true
    let shouldUrl = true

    const sendChannelEnum = SENDCHANNELENUM['nissan']
    switch(sendChannelEnum[touch_up_way][send_channel] || '') {
      case NISSANCHANNELENUM['appPush']:
        shouldContent = true
        shouldUrl = false
        break;
      case NISSANCHANNELENUM['arriveAppPush']:
        shouldContent = true
        shouldUrl = false
        break;
      case NISSANCHANNELENUM['contactPush']:
        shouldContent = false
        shouldUrl = true
        break;
      case '短信':
        shouldContent = false
        shouldUrl = true
        break;
    }

    return (
      <React.Fragment>
        <FormItem  {...formItemLayout} label="触达方式" hasFeedback>
          {getFieldDecorator('touch_up_way', {
            rules: [{
              required: true,
              message: '不能为空'
            }],
            initialValue: _.get(item, 'touch_up_way', 0)
          })(
            <Select
              disabled={disabled}
              getPopupContainer={node => node.parentNode}
              placeholder="请选择触达方式"
              onChange={(v) => {
                this.setState({
                  touch_up_way: v,
                  send_channel: 0
                })
                touch_up_way = v
                setFieldsValue({touch_up_way: v})
                setFieldsValue({send_channel: 0})
              }}
            >
              <Option value={0}>自动</Option>
              <Option value={1}>人工</Option>
            </Select>
          )}
        </FormItem>
        <FormItem  {...formItemLayout} label="发送渠道" hasFeedback>
          {getFieldDecorator('send_channel', {
            rules: [{
              required: true,
              message: '不能为空'
            }],
            initialValue: _.get(item, 'send_channel', 0)
          })(
            <Select
              disabled={disabled}
              getPopupContainer={node => node.parentNode}
              placeholder="请选择发送渠道"
              onChange={(v) => {
                this.setState({
                  send_channel: v
                })
                setFieldsValue({send_channel: v})
              }}
            >
              {
                SENDCHANNELENUM[feature][touch_up_way || 0].map( (i, idx) => (
                  <Option key={idx} value={idx}>{i}</Option>
                ))
              }
            </Select>
          )}
        </FormItem>
        <Content 
          form={form}
          item={item}
          disabled={disabled}
          pageLocate={pageLocate}
          shouldContent={shouldContent}
          shouldUrl={shouldUrl}
          requiredUrl={true}
        />
      </React.Fragment>
    )
  }
}
