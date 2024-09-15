import React, { Component } from 'react'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Input, Select, Radio, InputNumber, Checkbox } from 'antd'
import { ALARM_API_TEMPLATE, ALARM_API_TEMPLATE_CONTENT, ALARM_WAY } from './alarm-api-template'
import { ALARM_API_TYPE } from '../../../../../common/convert-alarm-info'

const FormItem = Form.Item
const Option = Select.Option
const TextArea = Input.TextArea
const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 18 }
}

@Form.create()
export default class AlarmForm extends Component {
  state = {
    templateType: ''
  }

  componentDidMount() {
    let { validForm, changeState, apiAlertInfo } = this.props
    setTimeout(() => {
      changeState({ validForm: { ...validForm, [apiAlertInfo.id]: this.props.form } }, true)
    }, 200)
  }

  componentDidUpdate(prevProps) {
    let { validForm, changeState, apiAlertInfo } = this.props
    if (apiAlertInfo.id && !_.get(validForm, apiAlertInfo.id, undefined)) {
      setTimeout(() => {
        changeState({ validForm: { ...validForm, [apiAlertInfo.id]: this.props.form } })
      }, 200)
    }
  }

  renderExecTimeOutPanel = () => {
    let { apiAlertInfo, changeAlarmInfo } = this.props
    const { getFieldDecorator, setFieldsValue } = this.props.form
    return (
      <div>
        <FormItem label='执行时长超过(分钟)' className='mg1b' hasFeedback {...formItemLayout}>
          {getFieldDecorator('timeoutMills', {
            initialValue: apiAlertInfo.timeoutMills || 30
          })(
            <InputNumber
              min={30}
              max={600}
              step={30}
              onChange={v => {
                changeAlarmInfo && changeAlarmInfo({ ...apiAlertInfo, timeoutMills: v })
                setFieldsValue({ content: `你的任务因为执行时长超过${v}分钟，触发了告警，及时处理` })
              }}
            />
          )}
        </FormItem>
        <FormItem label='告警时间间隔' className='mg1b' hasFeedback {...formItemLayout}>
          {getFieldDecorator('intervalMills', {
            initialValue: apiAlertInfo.intervalMills || 5
          })(
            <Select onChange={v => changeAlarmInfo && changeAlarmInfo({ ...apiAlertInfo, intervalMills: v })}>
              <Select.Option value={0}>无</Select.Option>
              <Select.Option value={5}>5分钟</Select.Option>
              <Select.Option value={10}>10分钟</Select.Option>
              <Select.Option value={15}>15分钟</Select.Option>
            </Select>
          )}
        </FormItem>
        <FormItem label='告警内容' className='mg1b' hasFeedback {...formItemLayout}>
          {getFieldDecorator('content', {
            initialValue: apiAlertInfo.content || _.get(ALARM_API_TEMPLATE_CONTENT, `${ALARM_API_TYPE.execTimeoutAlarm}.paramMap.text.content`)
          })(<TextArea rows={4} disabled />)}
        </FormItem>
      </div>
    )
  }

  renderExecStatePanel = () => {
    let { apiAlertInfo, changeAlarmInfo } = this.props
    const { getFieldDecorator } = this.props.form
    const templateType = apiAlertInfo.templateType || 'custom'
    let content = _.get(apiAlertInfo, 'paramMap', {})
    let paramsInput = []
    if (templateType === ALARM_API_TYPE.custom) {
      content = JSON.stringify(_.get(apiAlertInfo, 'paramMap', {}), null, 2)
      paramsInput = [
        <FormItem key='customContent' label='参数' className='mg1b' hasFeedback {...formItemLayout}>
          {getFieldDecorator('customContent', {
            initialValue: content,
            rules: [{ max: 400, message: '1~400个字符!' }]
          })(<TextArea rows={4} onChange={e => changeAlarmInfo && changeAlarmInfo({ ...apiAlertInfo, customContent: e.target.value })} />)}
        </FormItem>,
        <div className='alignright' key='format'>
          <a
            style={{ marginRight: '60px' }}
            onClick={() => {
              let val = this.props.form.getFieldValue('customContent')
              try {
                val = JSON.stringify(eval(`(${val})`), null, 2)
                this.props.form.setFieldsValue({ customContent: val })
              } catch (e) {
                this.props.form.setFields({ customContent: { value: val, errors: [new Error('不是有效的json格式')] } })
              }
            }}
          >
            格式化
          </a>
        </div>
      ]
    } else if (templateType === ALARM_API_TYPE.execStateAlarmStandard || templateType === ALARM_API_TYPE.execStateAlarmCustom) {
      content = _.get(apiAlertInfo, 'paramMap.text.content', '')
      paramsInput = [
        <FormItem label='告警模板' key={'content'} className='mg1b' hasFeedback {...formItemLayout}>
          {getFieldDecorator('content', {
            initialValue: content || _.get(ALARM_API_TEMPLATE_CONTENT, `${templateType}.paramMap.text.content`),
            rules: [
              {
                max: 200,
                message: '1~200个字符!'
              }
            ]
          })(
            <TextArea
              rows={4}
              disabled={templateType === ALARM_API_TYPE.execStateAlarmStandard}
              onChange={e => changeAlarmInfo && changeAlarmInfo({ ...apiAlertInfo, content: e.target.value })}
              placeholder={`执行开始时，\${starttime}
执行结束时间，\${endtime}
任务耗时，\${duration}
工作流组或工作流名称 \${projectname}
成功和失败状态：\${status}
创建人：\${createname}
任务失败链接：\${url}
          `}
            />
          )}
        </FormItem>
      ]
    }
    return [
      <FormItem label='告警类型' key={'alterType'} className='mg1b' {...formItemLayout}>
        {getFieldDecorator('alterType', {
          initialValue: apiAlertInfo.alterType || 'on_all'
        })(
          <Select onChange={v => changeAlarmInfo && changeAlarmInfo({ ...apiAlertInfo, alterType: v })}>
            <Option value='on_all'>全部</Option>
            <Option value='on_success'>成功</Option>
            <Option value='on_failed'>失败</Option>
          </Select>
        )}
      </FormItem>,
      ...paramsInput
    ]
  }

  render() {
    let { apiAlertInfo, userList, changeAlarmInfo } = this.props
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form
    const templateType = apiAlertInfo.templateType || 'custom'
    const alarmType = apiAlertInfo.alarmType || ALARM_API_TYPE.custom
    const templeChild = _.get(ALARM_API_TEMPLATE, [apiAlertInfo.alarmType, 'children'], [])
    const alarmWay = apiAlertInfo.alarmWay || ['api']
    return (
      <Form>
        <FormItem label='告警类型' className='mg1b' hasFeedback {...formItemLayout}>
          {getFieldDecorator('alarmType', {
            initialValue: alarmType
          })(
            <Select
              onChange={v => {
                const templateType = _.get(ALARM_API_TEMPLATE, `${v}.children.0.key`, v)
                changeAlarmInfo && changeAlarmInfo({ ...apiAlertInfo, alarmType: v, templateType })
                if (v === ALARM_API_TYPE.custom) {
                  setFieldsValue({ customContent: '{}', content: '{}' })
                  return
                }
                let val = _.get(ALARM_API_TEMPLATE_CONTENT, `${templateType}.paramMap.text.content`)
                setFieldsValue({ customContent: val, content: val })
              }}
            >
              {_.keys(ALARM_API_TEMPLATE).map(p => {
                return (
                  <Select.Option key={p} value={p}>
                    {_.get(ALARM_API_TEMPLATE, [p, 'title'], p)}
                  </Select.Option>
                )
              })}
              <Select.Option value={ALARM_API_TYPE.custom}>自定义</Select.Option>
            </Select>
          )}
        </FormItem>
        <FormItem label='告警方式' className='mg1b' {...formItemLayout}>
          {getFieldDecorator('alarmWay', {
            rules: [{ required: true, message: '请选择一种告警方式' }],
            initialValue: alarmWay
          })(
            <Checkbox.Group
              options={[
                { label: '钉钉告警', value: 'api' },
                { label: '邮件告警', value: 'email' }
              ]}
              onChange={v => {
                changeAlarmInfo && changeAlarmInfo({ ...apiAlertInfo, alarmWay: v })
              }}
            />
          )}
        </FormItem>
        {_.isEmpty(templeChild) && _.includes(alarmWay, ALARM_WAY.api) ? null : (
          <FormItem label='告警模板' className='mg1b' hasFeedback {...formItemLayout}>
            {getFieldDecorator('templateType', {
              initialValue: apiAlertInfo.templateType || _.get(templeChild, '0.key')
            })(
              <Select
                onChange={v => {
                  changeAlarmInfo && changeAlarmInfo({ ...apiAlertInfo, templateType: v })
                  let val = _.get(ALARM_API_TEMPLATE_CONTENT, `${v}.paramMap.text.content`, '')
                  setFieldsValue({ customContent: val, content: val })
                }}
              >
                {templeChild.map(p => {
                  return (
                    <Select.Option key={p.key} value={p.key}>
                      {p.title}
                    </Select.Option>
                  )
                })}
              </Select>
            )}
          </FormItem>
        )}

        {_.includes(alarmWay, ALARM_WAY.api) ? (
          <FormItem label='请求方式' className='mg1b' {...formItemLayout}>
            {getFieldDecorator('method', {
              initialValue: apiAlertInfo.method || 'get'
            })(
              <Radio.Group onChange={e => changeAlarmInfo && changeAlarmInfo({ ...apiAlertInfo, method: e.target.value })}>
                <Radio value='get'>get</Radio>
                <Radio value='post'>post</Radio>
              </Radio.Group>
            )}
          </FormItem>
        ) : null}
        {_.includes(alarmWay, ALARM_WAY.api) ? (
          <FormItem label='URL' className='mg1b' hasFeedback {...formItemLayout}>
            {getFieldDecorator(`url`, {
              rules: [
                {
                  pattern: /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/,
                  message: '输入无效,包含非法字符'
                }
              ],
              initialValue: apiAlertInfo.url
            })(<TextArea rows={3} onChange={e => changeAlarmInfo && changeAlarmInfo({ ...apiAlertInfo, url: e.target.value })} />)}
          </FormItem>
        ) : null}

        {_.includes(alarmWay, ALARM_WAY.email) ? (
          <FormItem label='告警邮箱' className='mg1b' hasFeedback {...formItemLayout}>
            {getFieldDecorator('emails', {
              rules: [{ required: true, message: '邮箱必填' }],
              initialValue: apiAlertInfo.emails
            })(
              <TextArea placeholder='执行失败通知这些邮件地址。逗号隔开' rows={5} onChange={e => changeAlarmInfo && changeAlarmInfo({ ...apiAlertInfo, emails: e.target.value })} />
            )}
          </FormItem>
        ) : null}
        {templateType === ALARM_API_TYPE.execStateAlarmStandard && userList === ALARM_API_TYPE.execStateAlarmCustom ? (
          <FormItem label='告警人员' className='mg1b' hasFeedback {...formItemLayout}>
            {getFieldDecorator('alterUsers', {
              initialValue: apiAlertInfo.alterUsers
            })(
              <Select
                mode='multiple'
                onChange={v => changeAlarmInfo && changeAlarmInfo({ ...apiAlertInfo, alterUsers: v })}
                filterOption={(input, option) => option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
              >
                {userList
                  .filter(p => p.cellphone)
                  .map(p => (
                    <Option key={p.id} value={p.cellphone}>
                      {p.first_name || p.username}
                    </Option>
                  ))}
              </Select>
            )}
          </FormItem>
        ) : null}
        {alarmType === ALARM_API_TYPE.execTimeoutAlarm ? this.renderExecTimeOutPanel() : this.renderExecStatePanel()}
      </Form>
    )
  }
}
