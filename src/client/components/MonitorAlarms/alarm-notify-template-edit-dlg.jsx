import React from 'react'
import _ from 'lodash'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import {
  Modal,
  Row,
  Col,
  Button,
  Input,
  Tooltip,
  message,
  Popconfirm,
  Select,
  Radio,
  notification,
} from 'antd';
import { validateFieldsAndScroll } from '~/src/client/common/decorators.js'
import { DEFAULT_TEMPLATES, SUGO_ALARMS_API_KEYS } from '~/src/common/constants.js'
import FixWidthHelper from '~/src/client/components/Common/fix-width-helper-no-hidden.js'
import Fetch from '~/src/client/common/fetch-final.js'
import moment from 'moment'
import {isDiffByPath} from '~/src/common/sugo-utils.js'
import {synchronizer} from '../Fetcher/synchronizer'

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 15 }
}

const formItemLayoutWithOutLabel = {
  wrapperCol: { span: 15, offset: 6 }
}

const initialParamsValue =  [
  { key: 'contacts', val: '${contacts}' },
  { key: 'content', val: '${content}' }
]

const fieldNames = ['name', 'interface_id', 'error_template', 'normal_template']

/**
 *  监控告警-告警通知模版管理对话框控件
 * @export
 * @class AlarmInterfaces
 * @extends {React.Component}
 */
@Form.create()
@synchronizer(() => ({
  url: '/app/monitor-alarms/contact-wx/persons',
  modelName: 'wechatPersons',
  debounce: 500
}))
@validateFieldsAndScroll
export default class AlarmNotifyTemplateEditDialog extends React.Component {
  state = {
    testingReceivers: []
  }

  componentWillReceiveProps(nextProps) {
    if (isDiffByPath(nextProps, this.props, 'value')) {
      this.props.form.setFieldsValue(_.pick(nextProps.value, fieldNames))
    }
  }

  componentDidMount() {
    let {value, form} = this.props
    form.setFieldsValue(_.pick(value, fieldNames))
  }

  reset() {
    this.props.form.resetFields()
  }

  onSubmit = async () => {
    let formData = await this.validateFieldsAndScroll()
    if (!formData) {
      return
    }
    let {onChange, onCancel} = this.props
    await onChange(formData)
    onCancel()
    message.success('保存成功')
    this.reset()
  }

  // 测试告警通知接口
  handleTesting = async () => {
    let {projectCurrent, form} = this.props
    let {interface_id: curInterface, name, error_template, normal_template} = form.getFieldsValue()
    let { testingReceivers: receivers } = this.state

    if (!curInterface) {
      message.warn('请选择接告警方式')
      return
    }
    if (receivers.length === 0) {
      message.warn('请选择接收人')
      return
    }
    //测试post参数(params)格式： { dbThreshold, metric_rules: { title, rules }, query_params, alarm_types, project_name, name}
    const metric_rules = {
      title: '总记录数-接口测试',
      rules: [{
        operator: 'greaterThan',
        threshold: 0
      }]
    }
    const alarm_types = [{ curInterface, receivers, error_template, normal_template }]
    const query_params = {
      filters: [{col: '__time', op: 'in', eq: '-900 second'}]
    }
    const params = {
      dbThreshold: 100,
      query_params,
      metric_rules,
      alarm_types,
      project_name: projectCurrent && projectCurrent.name || '(项目名称)',
      name: name || '测试告警',
      project_id: projectCurrent && projectCurrent.id
    }
    // 告警
    // res: {"result":{"time":"2017-08-30T02:49:13.292Z","state":true,"notify_mode":"短信告警"},"code":0}
    const res = await Fetch.post('/app/monitor-alarms/interface-test', params)
    const { result: [{ notify_mode, time, state }] } = res
    notification.success({
      message: <p className="font16">测试接口通知</p>,
      description: <div className="font11">
        <p>接口类型：{notify_mode}</p>
        <p>接口发送状态：{state ? '已通知' : '未通知'}</p>
        <p>接口发送时间：{moment(time).format('YYYY年MM月DD日 HH时mm分ss秒')}</p>
      </div>,
      duration: 15
    })
  }

  render() {
    let { onCancel, visible, form, interfaces, persons, wechatPersons, value } = this.props
    const { getFieldDecorator } = form
    let { testingReceivers} = this.state

    let curInterfaceId = form.getFieldValue('interface_id')
    let curInterfaceType = _.get(_.find(interfaces, {id: curInterfaceId}), 'type')
    if (curInterfaceType === SUGO_ALARMS_API_KEYS.SMS.type) {
      persons = persons.filter(p => p.phone)
    } else if (curInterfaceType === SUGO_ALARMS_API_KEYS.EMAIL.type) {
      persons = persons.filter(p => p.email)
    } else if (curInterfaceId === SUGO_ALARMS_API_KEYS.WECHAT.id) {
      persons = wechatPersons.map(wp => ({...wp, id: wp.userid}))
    }
    return (
      <Modal
        width="800px"
        visible={visible}
        title={`${_.get(value, 'id') ? '修改' : '创建'}告警通知模版`}
        onCancel={() => {
          onCancel()
          this.reset()
        }}
        footer={
          <div className="aligncenter">
            <Button
              key="back"
              size="large"
              onClick={this.onSubmit}
            >保存</Button>
          </div>
        }
      >
        <Form>
          <Form.Item
            {...formItemLayout}
            label="通知模版名称"
          >
            {getFieldDecorator('name',  {
              rules: [{ required: true, message: '请输入通知模版名称', max: 25, whitespace: true }],
              initialValue: _.get(value, 'name', null)
            }) ( <Input className="width-100" placeholder="请输入通知模版名称" /> )}
          </Form.Item>

          <Form.Item
            {...formItemLayout}
            label="目标告警接口"
          >
            {getFieldDecorator('interface_id',  {
              rules: [{ required: true, message: '请填写目标告警接口' }],
              initialValue: _.get(interfaces, '[0].id') || undefined
            }) (
              <Select
                onChange={curInterfaceId => {
                  // 根据目标告警接口保留有手机号或邮箱的用户
                  let personIdDict = _.keyBy(persons, 'id')
                  this.setState({
                    testingReceivers: (testingReceivers || []).filter(cId => {
                      let p = personIdDict[cId]
                      return curInterfaceId === SUGO_ALARMS_API_KEYS.SMS.id
                        ? p.phone
                        : curInterfaceId === SUGO_ALARMS_API_KEYS.EMAIL.id ? p.email : true
                    })
                  })
                }}
              >
                {interfaces.filter( i => i.id !== SUGO_ALARMS_API_KEYS.SHELL.id).map(intf => {
                  return (
                    <Select.Option value={intf.id} key={intf.id}>{intf.name}</Select.Option>
                  )
                })}
              </Select>
            )}
          </Form.Item>

          <Form.Item
            {...formItemLayout}
            label="异常通知模版"
            hasFeedback
          >
            {getFieldDecorator('error_template',  {
              rules: [{ required: true, message: '请填写异常通知模版' }],
              initialValue: _.get(value, 'error_template', DEFAULT_TEMPLATES.error_template)
            }) ( <Input.TextArea rows={6} /> )}
          </Form.Item>

          <Form.Item
            {...formItemLayout}
            label="恢复正常通知模版"
            hasFeedback
          >
            {getFieldDecorator('normal_template',  {
              rules: [{ required: true, message: '请填写恢复正常通知模版' }],
              initialValue: _.get(value, 'normal_template', DEFAULT_TEMPLATES.normal_template)
            }) ( <Input.TextArea rows={6} /> )}
          </Form.Item>

          <Form.Item
            {...formItemLayout}
            label="测试"
            hasFeedback
          >
            <FixWidthHelper
              toFix="last"
              toFixWidth="80px"
            >
              <Select
                placeholder="请选择接收人"
                mode="multiple"
                value={testingReceivers}
                onChange={vals => {
                  this.setState({testingReceivers: vals})
                }}
              >
                {persons.map(person => {
                  return (
                    <Select.Option value={person.id} key={person.id}>{person.name}</Select.Option>
                  )
                })}
              </Select>
              <Button className="mg2l" onClick={this.handleTesting}>测试</Button>
            </FixWidthHelper>
          </Form.Item>
        </Form>
      </Modal>
    )
  }
}
