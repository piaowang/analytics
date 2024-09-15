import React, { Component } from 'react'
import { Button, Input, Select, Row, Col,  message, Modal, Tag, Tooltip, Radio } from 'antd'
import { Form } from '@ant-design/compatible';
import { DEFAULTCHANNELENUM, SENDCHANNELENUM, JPUSH_TARGET } from 'common/marketBrain/constants'
import Fetch from '../../../../common/fetch-final'
import InterfaceParamsInput from './interface-params-input'
import Icon from '../../../Common/sugo-icon'
import { validateFieldsAndScroll } from 'client/common/decorators'
import _ from 'lodash'


const { marketBrain: { 
  feature
} } = window.sugo


const FormItem = Form.Item
const { TextArea } = Input
const Option = Select.Option

const initialParamsValue =  [
  { key: 'url', val: '' },
  // { key: 'content', val: '${content}' }
]
const formItemLayoutWithOutLabel = {
  wrapperCol: { span: 15, offset: 6 }
}

const platform = ['ios', 'ios-product', 'android', 'winphone']
const platFormName = {
  'ios': 'iOS生产环境',
  'ios-product': 'iOS开发环境',
  'android': '安卓',
  'winphone': 'WinPhone'
}

@validateFieldsAndScroll
export default class CopyWriting extends Component {

  state = {
    titleLength: 0,
    contentLength: 0,
    smsContentLength: 0,
    touch_up_way: 0,
    send_channel: 0,
    url: '',
    modal: '',
    tags: ['registration_id'],
    inputVisible: false,
    inputValue: ''
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

  handleJpushTest = async () => {
    const { getFieldValue } = this.props.form
    const { tags: tagsBak } = this.state
    const copywriting = getFieldValue('copywriting')
    const { pushTarget } = copywriting
    const tags = _.cloneDeep(tagsBak)
    tags.shift()
    if (_.isEmpty(tags)) return message.error(`请至少填写一个${['registration_id', 'alias'][pushTarget]}`)

    let res = await Fetch.post('/app/market-brain-events/testJpush', {copywriting, targetUser: tags})

    if (!res.success) return message.error('发送失败')
    message.success('发送成功')
  }


  handleClose = removedTag => {
    const tags = this.state.tags.filter(tag => tag !== removedTag);
    this.setState({ tags });
  };

  showInput = () => {
    this.setState({ inputVisible: true }, () => this.input.focus());
  };

  handleInputChange = e => {
    this.setState({ inputValue: e.target.value });
  };

  handleInputConfirm = () => {
    const { inputValue } = this.state;
    let { tags } = this.state;
    if (inputValue && tags.indexOf(inputValue) === -1) {
      tags = [...tags, inputValue];
    }
    this.setState({
      tags,
      inputVisible: false,
      inputValue: '',
    });
  };

  saveInputRef = input => (this.input = input);
  


  checkParamInput = async (rule, value, callback, idx) => {
    const { form } = this.props
    const { key, val } = value
    if (_.isEmpty(key) || _.isEmpty(val)) {
      callback('请填填写完整的参数内容')
    }
    // 验证key是否有重复
    const formData = form.getFieldsValue()
    let params = []
    _.each(formData, (val, key) => {
      if (_.startsWith(key, 'param-')) {
        if (formData[key]) {
          params.push(formData[key])
        }
      }
    })
    const keys = _.map(params, p => p['key'])
    if (_.get(_.countBy(keys, k => k), key) > 1) {
      callback('key已存在，请重新输入')
    }
    callback()
  }

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

  validSmsLength = () => {
    const { getFieldValue, setFields } = this.props.form
    const content = getFieldValue('copywriting.content')
    const url = getFieldValue('copywriting.url')
    const hasUrl = content.includes('${url}')
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

  removeParam = (curIdx) => {
    const { form } = this.props
    let params = form.getFieldValue('copywriting.jpushExtra')
    params = _.cloneDeep(params)
    params.splice(curIdx, 1)
    form.setFieldsValue({ ['copywriting.jpushExtra']: params })
  }

  addParam = () => {
    const { form } = this.props
    const params = form.getFieldValue('copywriting.jpushExtra')
    const nextParms = params.concat({key: '', val: ''})
    form.setFieldsValue({
      ['copywriting.jpushExtra']: nextParms
    })
  }


  // 渲染附加字段
  renderParams = ({disabled}) => {
    const { item = {} } = this.props
    const jpushExtra = _.get(item, 'copywriting.jpushExtra', [])
    const { getFieldDecorator, getFieldValue } = this.props.form
    getFieldDecorator('copywriting.jpushExtra', { initialValue:  !_.isEmpty(jpushExtra) ? jpushExtra : initialParamsValue })
    const params = getFieldValue('copywriting.jpushExtra')

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

    return params.map((obj, idx) => {
      if (!obj) return null
      return (
        <Form.Item
          {...formItemLayout}
          label={`附加字段${idx + 1}`}
          required={true}
          key={`${obj.key}-${idx}`}
        >
          {getFieldDecorator(`copywriting.jpushExtraObj.param-${idx}`, {
            initialValue: obj,
            rules: [{ validator: (rule, value, callback) => this.checkParamInput(rule, value, callback, idx) }]
          }) ( <InterfaceParamsInput 
            disabled={disabled}
          /> )}
            <Icon
              title="删除参数"
              className="dynamic-delete-button iblock font16 pointer color-red line-height32"
              type="minus-circle"
              onClick={() => this.removeParam(idx)}
            />
        </Form.Item>
      )
    })
  }

  copyWritingContent({disabled = false }) {
    const { formItemLayout, form, item ={}, pageLocate = 'event' } = this.props
    const { getFieldDecorator, setFieldsValue, getFieldValue, setFields } = form
    const { smsContentLength, url } = this.state
    let send_channel = getFieldValue('send_channel')
    return (
      <React.Fragment>
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
      </React.Fragment>
    )
  }

  renderJpushCopyWritingForm({item, disabled}) {
    const { formItemLayout, form } = this.props
    const { getFieldDecorator, getFieldValue } = form

    return (
      <React.Fragment>
        <FormItem required {...formItemLayout} label="选择目标">
          {getFieldDecorator('copywriting.pushTarget', {
            initialValue: _.get(item, 'copywriting.pushTarget', 0),
            rules: [{
              required: true,
              message: '请输入活动标题'
            }]
          })(
            <Radio.Group 
              disabled={disabled}
              onChange={(e) => {
                this.setState({
                  tags: [JPUSH_TARGET[e.target.value]]
                })
              }}
            >
              <Radio value={0}>注册ID(registration_id)</Radio>
              <Radio value={1}>用户ID(user_id)</Radio>
            </Radio.Group>
          )}
        </FormItem>
        <FormItem required {...formItemLayout} label="标题">
          {getFieldDecorator('copywriting.title', {
            initialValue: _.get(item, 'copywriting.title', ''),
            rules: [{
              required: true,
              message: '请输入活动标题',
              whitespace: true
            }]
          })(
            <Input
              disabled={disabled}
            />
          )}
        </FormItem>
        <FormItem required {...formItemLayout} label="简介">
          {this.copyWritingContent({disabled})}
        </FormItem>
        <FormItem required {...formItemLayout} label="平台">
          {getFieldDecorator('copywriting.platform', {
            initialValue: _.get(item, 'copywriting.platform', ['ios']),
            rules: [{
              required: true,
              validator: (rule, value, callback) => {
                if (value.includes('ios') && value.includes('ios-product')) {
                  callback('iOS生产平台和iOS开发平台只能选一个')
                }
                callback()
              }
            }]
          })(
            <Select
              disabled={disabled}
              getPopupContainer={node => node.parentNode}
              mode="multiple"
              placeholder="请选择触达方式"
            >
              {
                platform.map((i, idx) => (
                  <Option value={i} key={i + idx + 'platform'}>{platFormName[i]}</Option>
                ))
              }
            </Select>
          )}
        </FormItem>
        {this.renderParams({disabled})}
        
      </React.Fragment>
    )
  }

  renderTestTag() {
    const { tags, inputVisible, inputValue } = this.state;
    const { getFieldValue } = this.props.form

    return (
      <div>
        {tags.map((tag, index) => {
          if (index === 0) tag = ['registration_id', 'alias'][getFieldValue('copywriting.pushTarget')]
          const isLongTag = tag.length > 20;
          const tagElem = (
            <Tag key={tag} closable={index !== 0} onClose={() => this.handleClose(tag)}>
              {isLongTag ? `${tag.slice(0, 20)}...` : tag}
            </Tag>
          );
          return isLongTag ? (
            <Tooltip title={tag} key={tag}>
              {tagElem}
            </Tooltip>
          ) : (
            tagElem
          );
        })}
        {inputVisible && (
          <Input
            ref={this.saveInputRef}
            type="text"
            size="small"
            style={{ width: 78 }}
            value={inputValue}
            onChange={this.handleInputChange}
            onBlur={this.handleInputConfirm}
            onPressEnter={this.handleInputConfirm}
          />
        )}
        {!inputVisible && (
          <Tag onClick={this.showInput} style={{ background: '#fff', borderStyle: 'dashed' }}>
            <Icon type="plus" /> 新增
          </Tag>
        )}
      </div>
    );
  }

  jpushCopyWriting() {
    const { formItemLayout, form, item ={}, disabled } = this.props
    const {  getFieldValue } = form

    return (
      <React.Fragment>
        {this.renderJpushCopyWritingForm({item, disabled})}
        <Form.Item {...formItemLayoutWithOutLabel}>
          <span
            className="pointer"
            onClick={this.addParam}
            title="增加一个条件"
          >
            <Icon className="mg1r" type="plus-circle-o" />
            增加一个参数
          </span>
          <span
            className="pointer mg3l"
            onClick={this.resetParams}
            title="重置参数模板"
          >
            <Icon className="mg1r" type="sync" />
            重置参数模板
          </span>
          <span
            className="pointer mg3l"
            onClick={this.resetParams}
            title="用于客户端自定义事件处理。"
          >
           <Icon className="mg1r" type="question-circle" />
          </span>
      </Form.Item>
      <FormItem {...formItemLayout} label="  ">
        <Button 
          type='primary'
          onClick={async () => {
            let values = await this.validateFieldsAndScroll()
            if (!values) return
            this.setState({modal: 'testJpush'})
          }}
        >测试</Button>
      </FormItem>
      <Modal
        title='极光推送测试'
        maskClosable={false}
        width={800}
        visible={this.state.modal}
        onCancel={() => this.setState({modal: ''})}
        okText='测试'
        onOk={() => this.handleJpushTest()}
      >
        {
          this.renderJpushCopyWritingForm({item, disabled: true})
        }
        { this.renderTestTag() }
      </Modal>
      </React.Fragment>
    )
  }

  copyWriting() {
    const { formItemLayout, form, item ={}, disabled, pageLocate = 'event' } = this.props
    const { getFieldDecorator, setFieldsValue, getFieldValue, setFields } = form
    const { smsContentLength, url } = this.state
    let touch_up_way = getFieldValue('touch_up_way')
    let send_channel = getFieldValue('send_channel')

    if (SENDCHANNELENUM[feature][touch_up_way][send_channel] === DEFAULTCHANNELENUM['jPush']) {
      return this.jpushCopyWriting()
    }
    return (
      <React.Fragment>
        <FormItem {...formItemLayout} label="活动文案">
          <Row>
            <Col span={20}>
              {this.copyWritingContent({disabled})}
            </Col>
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
          </Row>
        </FormItem>
        {/* <FormItem {...formItemLayout} label={pageLocate === 'event' ? '输入商品id' : '输入链接'}> */}
        <FormItem {...formItemLayout} label="输入链接">
          {getFieldDecorator('copywriting.url', {
            initialValue: url || _.get(item,'copywriting.url', '') ,
            // initialValue:  _.get(item,'copywriting.url', ''),
            rules: [{
              validator: async (rule, value, callback) => {
                const content = getFieldValue('copywriting.content')
                const hasUrl = content.includes('${url}')
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
      </React.Fragment>
    )
  }

  render() {
    const { formItemLayout, form, item ={}, disabled } = this.props
    const { getFieldDecorator, setFieldsValue, getFieldValue } = form
    let touch_up_way = getFieldValue('touch_up_way') || 0
    return (
      <React.Fragment>
        <FormItem required  {...formItemLayout} label="触达方式" hasFeedback>
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
        <FormItem required {...formItemLayout} label="发送渠道" hasFeedback>
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
        {this.copyWriting()}
      </React.Fragment>
    )
  }
}
