import React, { Component } from 'react'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Input, Select, Row, Col, message, Modal, Table } from 'antd';
import { getAllPushLandPage } from 'client/services/marketing/push-land-page'
import setStatePromise from 'client/common/set-state-promise'
import { MARKETING_SEND_CHANNEL } from 'common/constants'
import _ from 'lodash'
import {getAllCopyWriting} from '../../../services/market-brain/push-land-page'

const FormItem = Form.Item
const { TextArea } = Input
const Option = Select.Option

@setStatePromise
export default class CopyWriting extends Component {

  state = {
    titleLength: 0,
    contentLength: 0,
    smsContentLength: 0,
    send_channel: undefined,
    pushLandList: [],
    contentModalVisible: false,
    modalLoading: false,
    copyWritingRes: [],
    filter: '',
    page: 1,
    pageSize: 10,
    count: 0
  }

  componentDidMount() {
    const { item = {} } = this.props
    this.setState({
      send_channel: _.get(item, 'send_channel', undefined)
    })
    this.getPushLandPage()
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { item } = nextProps
    if (!_.isEqual(item, this.props.item)) {
      this.setState({
        send_channel: _.get(item, 'send_channel', undefined)
      })
    }
  }

  getPushLandPage = async () => {
    const {result, success} = await getAllPushLandPage()
    if (success) this.setState({pushLandList: result})
  }

  getCopyWriting = async () => {
    const { filter, page, pageSize } = this.state
    const { getFieldValue } = this.props.form
    const send_channel = getFieldValue('send_channel')
    const { result = [], success } = await getAllCopyWriting({ filter, page, pageSize, send_channel })
    this.setState({modalLoading: false })
    if (success) {
      const { count, rows = [] } = result
      this.setState({count, copyWritingRes: rows })
    }
  }

  cancelModal() {
    this.setState({contentModalVisible: false, filter: '', copyWritingRes: []})
  }

  validSmsLength = () => {
    const { getFieldValue, setFields } = this.props.form
    const content = getFieldValue('copywriting.content')
    const url = getFieldValue('copywriting.url')
    const hasUrl = content.includes('${url}')
    let smsContentLength = content.length
    let msg = '超过130字符，请重新输入'
    if (hasUrl) {
      let queryParamsLength = 28
      smsContentLength = content.length + url.length - '${url}'.length + queryParamsLength
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

  copyWriting() {
    const { formItemLayout, form, item ={} } = this.props
    const { getFieldDecorator, setFieldsValue, getFieldValue, setFields } = form
    const { titleLength, send_channel, pushLandList, contentLength, smsContentLength } = this.state
    if (send_channel === undefined) {
      return null
    }
    return (
      <React.Fragment>
        {send_channel === 0 ?
          (
            <React.Fragment>
              <FormItem {...formItemLayout} label="push标题">
                <Row>
                  <Col span={20}>
                    {getFieldDecorator('copywriting.title', {
                      initialValue: _.get(item,'copywriting.title', ''),
                      rules: [{
                        required: true,
                        message: '请输入push标题',
                        whitespace: true
                      }, {
                        min: 1,
                        max: 30,
                        type: 'string',
                        message: '超过30个字符，请重新输入'
                      }]
                    })(
                      <Input
                        onChange={(e) => {
                          this.setState({ titleLength: e.target.value.length })
                        }}
                        addonAfter={`${titleLength}/30`}
                      />
                    )}
                  </Col>
                  <Col span={4}>
                    <Button
                      size="small"
                      type="primary"
                      className="mg2l"
                      onClick={() => {
                        this.setState({contentModalVisible: true, modalLoading: true, filter: ''})
                        this.getCopyWriting()
                      }}
                    >选择文案内容
                    </Button>
                  </Col>
                </Row>
              </FormItem>
              <FormItem {...formItemLayout} label="push正文">
                <Col span={20}>
                  {getFieldDecorator('copywriting.content', {
                    initialValue: _.get(item,'copywriting.content', ''),
                    rules: [{
                      required: true,
                      message: '请输入push正文',
                      whitespace: true
                    }, {
                      min: 1,
                      max: 100,
                      type: 'string',
                      message: '超过100个字符，请重新输入'
                    }]
                  })(
                    <TextArea
                      rows={5}
                      style={{width: '90%'}}
                      onChange={e => {
                        this.setState({ contentLength: e.target.value.length })
                      }}
                      placeholder="100字符"
                    />
                  )}
                  <span className="mg1l">{`${contentLength}/100`}</span>
                </Col>
              </FormItem>
              <FormItem {...formItemLayout} label="落地页">
                {getFieldDecorator('copywriting.pushland', {
                  rules: [{
                    required: true,
                    message: '请选择落地页'
                  }],
                  initialValue: _.get(item,'copywriting.pushland', '')
                })(
                  <Select>
                    {
                      pushLandList.map( i => (
                        <Option key={i.id} value={i.code}>{i.name}</Option>
                      ))
                    }
                  </Select>
                )}
              </FormItem>
            </React.Fragment>
          )
          :
          (
            <React.Fragment>
              <FormItem {...formItemLayout} label="短信正文">
                <Row>
                  <Col span={20}>
                    {getFieldDecorator('copywriting.content', {
                      initialValue: _.get(item,'copywriting.content', ''),
                      rules: [{
                        required: true,
                        message: '请输入短信正文',
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
                            let queryParamsLength = 28
                            smsContentLength = value.length + url.length + queryParamsLength - '${url}'.length
                          }
                          if(smsContentLength > 130 && urlCount === 0) {
                            await callback('超过130字符，请重新输入')
                          } else if (smsContentLength > 130 && urlCount === 1){
                            await callback('短信正文+链接超过130字符，请重新输入')
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
                    }) (
                      <TextArea
                        rows={5}
                        style={{width: '93%'}}
                        placeholder="130字符"
                      />
                    )}
                    <span className="mg1l">{`${smsContentLength}/130`}</span>
                  </Col>
                  <Col span={4}>
                    <Button
                      size="small"
                      type="primary"
                      className="mg2l"
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
                    <Button
                      size="small"
                      type="primary"
                      className="mg2l"
                      onClick={() => {
                        this.setState({contentModalVisible: true, modalLoading: true, filter: ''})
                        this.getCopyWriting()
                      }}
                    >选择文案内容
                    </Button>
                  </Col>
                </Row>
              </FormItem>
              <FormItem {...formItemLayout} label="输入链接">
                {getFieldDecorator('copywriting.url', {
                  initialValue: _.get(item,'copywriting.url', ''),
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
                  }, {
                    type: 'url',
                    message: '请输入标准url'
                  }]
                }) (
                  <Input  />
                )}
              </FormItem>
            </React.Fragment>
          )}
      </React.Fragment>
    )
  }

  renderContentModal() {
    const { contentModalVisible, modalLoading, copyWritingRes, filter, count, page, pageSize, send_channel } = this.state
    let columns = [{
      key: 'title',
      dataIndex: 'title',
      title: '标题'
    },{
      key: 'content',
      dataIndex: 'content',
      title: '正文'
    }]
    if (send_channel === MARKETING_SEND_CHANNEL.SMS) columns = columns.filter(i => i.key !== 'title')
    return (
      <Modal 
        title="请选择文案"
        visible={contentModalVisible}
        onCancel={() => this.cancelModal()}
      >
        <div>
          <div className="width-50 mg2y">
            <Input 
              placeholder="搜索标题/正文"
              value={filter}
              onChange={async (e) => {
                await this.setStatePromise({filter: e.target.value})
                await this.getCopyWriting()
              }}
            />
          </div>
          <div>
            <Table 
              rowKey={record => record.id}
              loading={modalLoading}
              columns={columns}
              dataSource={copyWritingRes}
              onRow={(record) => {
                const { setFields } = this.props.form
                return {
                  onClick: (event) => {
                    const { send_channel } = this.state
                    const { content, title } = record 
                    let params = {
                      'copywriting.content': {
                        value: content
                      }
                    }
                    if (send_channel === MARKETING_SEND_CHANNEL.PUSH) params['copywriting.title'] = { value: title }
                    setFields(params)
                    this.cancelModal()
                  }
                }
              }}
              pagination={{
                total: count,
                current: page,
                showTotal: (total) => '共' + total + '条',
                pageSize,
                onChange: async (page) => {
                  await this.setStatePromise({page})
                  await this.getCopyWriting()
                }
              }}
            />
          </div>
        </div>
      </Modal>
    )
  }

  render() {
    const { formItemLayout, form, item ={} } = this.props
    const { getFieldDecorator, setFieldsValue } = form
    return (
      <React.Fragment>
        <FormItem  {...formItemLayout} label="发送渠道" hasFeedback>
          {getFieldDecorator('send_channel', {
            rules: [{
              required: true,
              message: '不能为空'
            }],
            initialValue: _.get(item, 'send_channel', undefined)
          })(
            <Select
              placeholder="请选择发送渠道"
              onChange={(v) => {
                this.setState({
                  send_channel: v
                })
                setFieldsValue({send_channel: v})
              }}
            >
              <Option value={0}>push</Option>
              <Option value={1}>短信</Option>
            </Select>
          )}
        </FormItem>
        {this.copyWriting()}
        {this.renderContentModal()}
      </React.Fragment>
    )
  }
}
