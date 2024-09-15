import React, { Component } from 'react'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Input, Select, Radio } from 'antd'
import _ from 'lodash'
import { ALARM_API_TEMPLATE, ALARM_API_TYPE } from './alarm-api-template'

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
    setTimeout(() => { changeState({ validForm: { ...validForm, [apiAlertInfo.id]: this.props.form } }) }, 200)
  }

  componentDidUpdate(prevProps) {
    let { validForm, changeState, apiAlertInfo } = this.props
    if (apiAlertInfo.id && !_.get(validForm, apiAlertInfo.id, undefined)) {
      setTimeout(() => { changeState({ validForm: { ...validForm, [apiAlertInfo.id]: this.props.form } }) }, 200)
    }
  }

  render() {
    let { apiAlertInfo } = this.props
    const { getFieldDecorator, getFieldValue } = this.props.form
    const templateType = getFieldValue('templateType') || 'custom'
    const template = _.get(ALARM_API_TEMPLATE, templateType)
    let content = ''
    if (template) {
      content = _.get(apiAlertInfo, ['paramMap', ...template.templatePath], '')
    } else {
      content = JSON.stringify(_.get(apiAlertInfo, 'paramMap', {}), null, 2)
    }
    return (
      <Form>
        <FormItem label="告警模板" className="mg1b" hasFeedback {...formItemLayout}>
          {getFieldDecorator('templateType', {
            initialValue: apiAlertInfo.templateType || ALARM_API_TYPE.custom
          })(
            <Select onChange={v => {
              changeAlarmInfo && changeAlarmInfo('templateType', v)
              let val = _.get(ALARM_API_TEMPLATE, `${v}.paramMap.text.content`, v === ALARM_API_TYPE.custom ? '{}' : '') 
              setFieldsValue({ customContent: val, content: val })
            }}
            >
              {
                _.keys(ALARM_API_TEMPLATE).map(p => {
                  return <Select.Option key={p} value={p}>{_.get(ALARM_API_TEMPLATE, [p, 'title'], p)}</Select.Option>
                })
              }
              <Select.Option value={ALARM_API_TYPE.custom}>自定义</Select.Option>
            </Select>
          )
          }
        </FormItem>
        <FormItem label="URL" className="mg1b" hasFeedback {...formItemLayout}>
          {getFieldDecorator('url', {
            rules: [{
              pattern: /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/,
              message: '输入无效,包含非法字符'
            }],
            initialValue: apiAlertInfo.url
          })(
            <TextArea rows={3} onChange={e => changeAlarmInfo && changeAlarmInfo('url', e.target.value)} />
          )}
        </FormItem>
        <FormItem label="请求方式" className="mg1b" {...formItemLayout}>
          {getFieldDecorator('method', {
            initialValue: apiAlertInfo.method || 'get'
          })(
            <Radio.Group>
              <Radio value="get">get</Radio>
              <Radio value="post">post</Radio>
            </Radio.Group>
          )}
        </FormItem>
        <FormItem label="告警类型" className="mg1b" {...formItemLayout}>
          {getFieldDecorator('alterType', {
            initialValue: apiAlertInfo.alterType || 'on_all'
          })(
            <Select onChange={v => changeAlarmInfo && changeAlarmInfo('alterType', v)}>
              <Option value="on_all">全部</Option>
              <Option value="on_success">成功</Option>
              <Option value="on_failed">失败</Option>
            </Select>
          )}
        </FormItem>
        {
          templateType !== ALARM_API_TYPE.custom && userList !== undefined
            ? <FormItem label="告警人员" className="mg1b" hasFeedback {...formItemLayout}>
              {getFieldDecorator('alterUsers', {
                initialValue: apiAlertInfo.alterUsers
              })(
                <Select
                  mode="multiple"
                  onChange={v => changeAlarmInfo && changeAlarmInfo('alterUsers', v)}
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {
                    userList.filter(p => p.cellphone).map(p => <Option key={p.id} value={p.cellphone}>{p.first_name || p.username}</Option>)
                  }
                </Select>
              )}
            </FormItem>
            : null
        }
        {paramsInput}
      </Form>
    )
  }
}
