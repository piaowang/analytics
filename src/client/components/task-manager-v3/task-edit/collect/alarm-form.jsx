import React, { Component } from 'react'
import _ from 'lodash'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Input, Select, Radio, Checkbox } from 'antd'

const FormItem = Form.Item
const Option = Select.Option
const TextArea = Input.TextArea
const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 18 }
}

// 告警类型
const ALARM_TYPE = [
  { title: '任务执行失败', value: 'execution' },
  { title: '表结构发生变化', value: 'ddl' },
  { title: '输出操作异常', value: 'operatorError' },
  { title: '连接异常', value: 'connectError' },
  { title: '程序异常退出', value: 'unexpected' },
  { title: '表移除异常', value: 'tableRemoveException' }
]

/** 告警类型名称字典 */
const ALARM_TYPE_DICT = ALARM_TYPE.reduce((prev, curr) => {
  prev[curr.value] = curr.title
  return prev
}, {})

// 告警模板
// const ALARM_TEMPLATE = [
//   { title: '标准模板', value: 'standard' },
//   { title: 'API自定义', value: 'custom' }
// ]

// 模板内容
const TEMPLATE_CONTENT = {
  execution: '"${name}" has ${status} on ${azkabanName}\n任务开始时间：${startTime}\n任务结束时间：${endTime}\n任务耗时:${duration}\n',
  ddl: '工作流名称: ${showName}\n执行记录id: ${execId}\n数据源别名: ${dbAlias}\n连接地址: ${url}\n数据源类型: ${dbType}\n表结构的变化信息: ${msg}\n',
  operatorError: '工作流名称: ${showName}\n执行记录id: ${execId}\n数据源别名: ${dbAlias}\n连接地址: ${url}\n数据源类型: ${dbType}\n输出操作异常信息: ${msg}\n',
  connectError: '工作流名称: ${showName}\n执行记录id: ${execId}\n数据源别名: ${dbAlias}\n连接地址: ${url}\n数据源类型: ${dbType}\n连接异常信息: ${msg}\n',
  unexpected: '工作流名称: ${showName}\n执行记录id: ${execId}\n程序异常退出信息: ${msg}\n',
  tableRemoveException: '工作流名称: ${showName}\n执行记录id: ${execId}\n数据源别名: ${dbAlias}\n连接url: ${url}\n数据源类型: ${dbType}\n数据库: ${schema}\n表移除异常信息: ${msg}'
}

const TEMPLATE_PLACEHOLDER = {
  execution: `执行开始时，\${starttime}
  执行结束时间，\${endtime}
  任务耗时，\${duration}
  工作流组或工作流名称 \${projectname}
  成功和失败状态：\${status}
  创建人：\${createname}
  任务失败链接：\${url}`,
  ddl: '执行记录id: ${execId}\n数据源别名: ${dbAlias}\n连接地址: ${url}\n数据源类型: ${dbType}\n表结构的变化信息: ${msg}\n',
  operatorError: '执行记录id: ${execId}\n数据源别名: ${dbAlias}\n连接地址: ${url}\n数据源类型: ${dbType}\n输出操作异常信息: ${msg}\n',
  connectError: '执行记录id: ${execId}\n数据源别名: ${dbAlias}\n连接地址: ${url}\n数据源类型: ${dbType}\n连接异常信息: ${msg}\n',
  unexpected: '执行记录id: ${execId}\n程序异常退出信息: ${msg}\n',
  tableRemoveException: `执行记录id: \${execId}
  数据源别名: \${dbAlias}
  连接url: \${url}
  数据源类型: \${dbType}
  数据库: \${schema}
  表移除异常信息: \${msg}
  `
}

@Form.create()
export default class AlarmForm extends Component {
  componentDidMount() {
    const { validForm, changeState, apiAlertInfo } = this.props
    changeState({
      validForm: { ...validForm, [apiAlertInfo.id]: this.props.form }
    })
  }

  componentDidUpdate(prevProps) {
    const { validForm, changeState, apiAlertInfo } = this.props
    if (apiAlertInfo.id && !_.get(validForm, apiAlertInfo.id)) {
      changeState({
        validForm: { ...validForm, [apiAlertInfo.id]: this.props.form }
      })
    }
  }

  render() {
    const { apiAlertInfo: infoList = [] } = this.props
    // 现在接口返回的是一个数组
    const apiAlertInfo = _.get(infoList, '[0]', {})
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form
    // 将接口数据转换为Form表单回绑所需数据格式
    /**
     * 界面回绑所需数据结构
     *apiAlertInfos = {
      alarmType: ["execution", "ddl"]
      alarmWay: ["api"]
      content_ddl: "执行记录id: ${execId}↵数据源别名: ${dbAlias}↵连接地址: ${url}↵数据源类型: ${dbType}↵表结构的变化信息: ${msg}↵"
      content_execution: ""${name}" has ${status} on ${azkabanName}↵任务开始时间：${startTime}↵任务结束时间：${endTime}↵任务耗时:${duration}↵"
      method: "get"
      templateType: "standard"
      url: "d"
    }
    // 接口返回数据结构
    [{"type":"realtime_collect","condition":{"type":"operatorError"},"senders":[{"type":"api","url":"d","method":"get","paramMap":{"msgtype":"text","text":{"content":"执行记录id: ${execId}\n数据源别名: ${dbAlias}\n连接地址: ${url}\n数据源类型: ${dbType}\n输出操作异常信息: ${msg}\n"}}}],"id":"8Qv4XGAD1"},{"type":"realtime_collect","condition":{"type":"ddl"},"senders":[{"type":"api","url":"d","method":"get","paramMap":{"msgtype":"text","text":{"content":"执行记录id: ${execId}\n数据源别名: ${dbAlias}\n连接地址: ${url}\n数据源类型: ${dbType}\n表结构的变化信息: ${msg}\n"}}}],"id":"mZ19oo7qbx"},{"type":"execution","condition":{"type":"execution","alertOn":"on_failed"},"senders":[{"type":"api","url":"d","method":"get","paramMap":{"msgtype":"text","text":{"content":"\"${name}\" has ${status} on ${azkabanName}\n任务开始时间：${startTime}\n任务结束时间：${endTime}\n任务耗时:${duration}\n"}}}],"id":"3diACFcoXL"}]
      */
    const defualtAlarmType = [] // 允许为空
    const vals = infoList.reduce((prev, curr) => {
      if (!prev.alarmType) prev.alarmType = new Set(defualtAlarmType)
      if (!prev.alarmWay) prev.alarmWay = new Set(_.get(curr, 'senders', []).map(item => item.type))
      const alarmType = _.get(curr, 'condition.type')
      prev.alarmType.add(alarmType)
      prev[`content_${alarmType}`] = _.get(curr, 'senders[0].paramMap.text.content')
      return prev
    }, {})

    if (vals.alarmType) {
      vals.alarmType = Array.from(vals?.alarmType)
    }
    if (vals.alarmWay) {
      vals.alarmWay = Array.from(vals?.alarmWay)
    }
    // alarmType现数组类型（多选）
    const alarmType = (vals.alarmType || defualtAlarmType).filter(_.identity)
    const alarmWay = (vals.alarmWay || []).filter(_.identity)
    const senders = _.get(apiAlertInfo, 'senders', [])
    const apiSender = _.find(senders, s => s?.type === 'api') || {}
    const mailSender = _.find(senders, s => s?.type === 'mail') || {}
    return (
      <Form>
        <FormItem label='告警类型' className='mg1b' {...formItemLayout}>
          {getFieldDecorator('alarmType', {
            // rules: [{ required: true, message: '请选择告警类型' }],
            initialValue: alarmType
          })(
            // <Select
            //   placeholder='请选择告警类型'
            //   onChange={val => {
            //     if (getFieldValue('templateType') === 'standard') {
            //       setFieldsValue({ content: _.get(TEMPLATE_CONTENT, [val]) })
            //     }
            //   }}
            // >
            //   {_.map(ALARM_TYPE, p => (
            //     <Select.Option key={p.value} value={p.value}>
            //       {p.title}
            //     </Select.Option>
            //   ))}
            // </Select>
            <Checkbox.Group placeholder='请选择告警类型' options={_.map(ALARM_TYPE, p => ({ label: p.title, value: p.value }))} />
          )}
        </FormItem>
        <FormItem label='告警方式' className='mg1b' {...formItemLayout}>
          {getFieldDecorator('alarmWay', {
            // 设置了告警类型时才校验告警方式
            rules: _.isEmpty(getFieldValue('alarmType')) ? [] : [{ required: true, message: '请选择一种告警方式' }],
            initialValue: alarmWay
          })(
            <Checkbox.Group
              disabled={_.isEmpty(getFieldValue('alarmType'))}
              options={[
                { label: '钉钉告警', value: 'api' },
                { label: '邮件告警', value: 'mail' }
              ]}
            />
          )}
        </FormItem>
        {getFieldValue('alarmWay').includes('api') ? (
          <>
            <FormItem label='请求方式' className='mg1b' {...formItemLayout}>
              {getFieldDecorator('method', {
                initialValue: apiSender?.method || 'get'
              })(
                <Radio.Group>
                  <Radio value='get'>get</Radio>
                  <Radio value='post'>post</Radio>
                </Radio.Group>
              )}
            </FormItem>
            <FormItem label='URL' className='mg1b' hasFeedback {...formItemLayout}>
              {getFieldDecorator(`url`, {
                rules: [
                  {
                    pattern: /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/,
                    message: '输入无效,包含非法字符'
                  }
                ],
                initialValue: apiSender?.url
              })(<TextArea rows={3} placeholder='请输入' />)}
            </FormItem>
          </>
        ) : null}
        {getFieldValue('alarmWay').includes('mail') ? (
          <FormItem label='告警邮箱' className='mg1b' hasFeedback {...formItemLayout}>
            {getFieldDecorator('emails', {
              rules: [{ required: true, message: '邮箱必填' }],
              initialValue: _.get(mailSender, 'toAddresses', []).join(',')
            })(<TextArea placeholder='执行失败通知这些邮件地址。逗号隔开' rows={5} />)}
          </FormItem>
        ) : null}
        {(getFieldValue('alarmType') || defualtAlarmType).map(type => {
          return (
            <FormItem label={`${ALARM_TYPE_DICT[type]}告警模板`} className='mg1b' hasFeedback {...formItemLayout}>
              {getFieldDecorator(`content_${type}`, {
                initialValue: TEMPLATE_CONTENT[type],
                rules: [{ max: 200, message: '1~200个字符!' }]
              })(<TextArea rows={4} placeholder={TEMPLATE_PLACEHOLDER[type]} />)}
            </FormItem>
          )
        })}
      </Form>
    )
  }
}
