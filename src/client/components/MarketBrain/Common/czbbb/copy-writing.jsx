import React, { Component } from 'react'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Input, Select, Row, Col, message } from 'antd';
import Fetch from '../../../../common/fetch-final'
import { SENDCHANNELENUM } from 'common/marketBrain/constants'
import _ from 'lodash'
import { Content } from '../copywritingItem'

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

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { item, pageLocate } = nextProps
    if (!_.isEqual(item, this.props.item)) {
      if (pageLocate !== 'event') {
        this.fetchGoodsDetail4Store(item)
      }
      this.setState({
        send_channel: _.get(item, 'send_channel', undefined),
        url: _.get(item,'copywriting.url', '')
      })
    }
    if (pageLocate !== 'event') {
      this.fetchGoodsDetail4Store(item)
    }
  }

  //掌车的定制接口 请求该门店的商品详情
  async fetchGoodsDetail4Store(item) {
    let reg = /^(https?:\/\/)([0-9a-z.]+)(:[0-9]+)?([/0-9a-z.]+)?(\?[0-9a-z&=]+)?(#[0-9-a-z]+)?/i
    let url = _.get(item,'copywriting.url', '')
    if (reg.test(url)) return 

    const { jwt_company_id, jwt_store_id } = _.get(window,'sugo.jwtData.others', {})
    if (!jwt_store_id && !jwt_company_id) return 

    //该接口由扩展包实现 约定接口名都使用这个 结果结构约定 
    /**  ctx.body = {
    code: 'SUCCESS',
    msg: null,
    data: {
      detailUrl
    }
  } */
    let res = {}
    try {
     res = await Fetch.post('/fetchGoodsDetail4Store', { jwt_company_id, jwt_store_id, url }, { handleErr: (e) => null })
    } catch (e) {
      console.log(e)
    }
    let { code } = res
    if (code === 'SUCCESS')  return this.setState({url: _.get(res, 'data.detailUrl', url)})
    return
  }


  render() {
    const { formItemLayout, form, item ={}, disabled, pageLocate = 'event' } = this.props
    const { getFieldDecorator, setFieldsValue, getFieldValue } = form
    let touch_up_way = getFieldValue('touch_up_way')
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
        />
      </React.Fragment>
    )
  }
}
