import React, { Component } from 'react'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Col, Menu, Tabs, Input, Radio, Row, Button, InputNumber, Select } from 'antd';
import AlarmForm from './alarm-Form'
import SetScheduleExecute from './set-schedule-execute'
import alarmModel, { namespace } from './model'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import { validateFieldsAndScrollByForm, validateFields } from '../../../common/decorators'
import { connect } from 'react-redux'
import { ALARM_API_TEMPLATE, ALARM_API_TEMPLATE_CONTENT } from './alarm-api-template'

const { TabPane } = Tabs
const FormItem = Form.Item
const { TextArea } = Input
const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 18 }
}

@withRuntimeSagaModel(alarmModel)
@connect(props => props[namespace])
export default class index extends Component {

  changeState = payload => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload
    })
  }

  componentDidMount() {
    const { taskId, taskName } = this.props
    this.props.dispatch({
      type: `${namespace}/getAlarmInfo`,
      payload: { id: taskId, name: taskName }
    })
  }

  componentDidUpdate(prevProps) {
    if (this.props.taskId !== prevProps.taskId && this.taskId) {
      this.props.dispatch({
        type: `${namespace}/getAlarmInfo`,
        payload: { id: taskId }
      })
    }
  }

  // renderFlow = () => {

  // }

  addAlarmForm = () => {
    const { apiAlertInfos = [] } = this.props
    const maxId = _.maxBy(apiAlertInfos, p => p.id)
    this.changeState({ apiAlertInfos: [...apiAlertInfos, { id: maxId !== undefined ? maxId.id + 1 : 0 }] })
  }

  delAlarmForm = (id) => {
    const { apiAlertInfos = [], validForm = {} } = this.props
    this.changeState({ apiAlertInfos: apiAlertInfos.filter(p => p.id !== id), validForm: _.omit(validForm, [id]) })
  }

  renderApiForm = () => {
    const { apiAlertInfos = [], validForm } = this.props
    const showDel = apiAlertInfos.length !== 1
    return (
      <div>
        {
          apiAlertInfos.map((p, i) => {
            return (
              <div className="alarm-api-group mg2b pd1y">
                <AlarmForm key={`alarm-from-${i}`} apiAlertInfo={p} validForm={validForm} changeState={obj => this.changeState(obj)} />
                {
                  showDel ? <div className="delete-api-group">
                    <a className="color-disable pointer" onClick={() => this.delAlarmForm(p.id)}>
                      <MinusCircleOutlined className="color-disable mg1r" />
                      删除API告警
                    </a>
                  </div>
                    : null
                }
              </div>
            );
          })
        }
        <div className="alignright">
          <a
            className="pointer"
            onClick={() => this.addAlarmForm()}
            title="添加一个API告警"
          >
            <PlusCircleOutlined className="mg1r" />
            添加一个API告警
          </a>
        </div>
      </div>
    );
  }

  renderAlarm = () => {
    const { successEmails, selectedKey, viewType, emailAlertType } = this.props
    return (<Tabs type="card" style={{ display: selectedKey === 'alarm' && viewType === 'alarm' ? 'block' : 'none' }}>
      <TabPane tab={'邮件告警配置'} key="tab1" forceRender>
        <FormItem label="邮件通知"   {...formItemLayout}>
          <TextArea rows={5} value={successEmails} onChange={e => this.changeState({ successEmails: e.target.value })} />
          <div>执行成功、失败通知这些邮件地址。逗号隔开</div>
        </FormItem>
        <FormItem label="告警类型" className="mg1b" {...formItemLayout}>
          <Select value={emailAlertType} onChange={val => this.changeState({ emailAlertType: val })}>
            <Option value="on_all">全部</Option>
            <Option value="on_success">成功</Option>
            <Option value="on_failed">失败</Option>
          </Select>
        </FormItem>
      </TabPane>
      <TabPane tab={'API告警配置'} key="tab2" forceRender>
        {this.renderApiForm()}
      </TabPane>
    </Tabs >)
  }

  renderParams = () => {
    const { executors = [], idealExecutorIds = '', executeType = 1, flowPriority=5 } = this.props
    return (<Form className="pd2t">
      <FormItem label="任务优先级" className="mg1b" hasFeedback {...formItemLayout}>
        <InputNumber value={flowPriority} min={1} onChange={val => this.changeState({ flowPriority: val })} max={10} step={1} />
      </FormItem>
      <FormItem label="执行器" className="mg1b" {...formItemLayout}>
        <Radio.Group
          onChange={e => {
            this.changeState({ executeType: e.target.value, idealExecutorIds: '' })
          }}
          value={executeType}
        >
          <Radio value={1}>默认</Radio>
          <Radio value={2}>指定执行器</Radio>
        </Radio.Group>
        {
          executeType === 2
            ? <Select className="width200" defaultValue={idealExecutorIds} onChange={v => this.changeState({ idealExecutorIds: v })}>
              {executors.map(p => <Option value={p.id}>{p.host}</Option>)}
            </Select>
            : null
        }
      </FormItem>
    </Form>)
  }

  validForms = async () => {
    const { validForm, successEmails, flowPriority, idealExecutorIds, emailAlertType } = this.props
    const apiAlertInfos = []
    for (let i in validForm) {
      const val = await validateFieldsAndScrollByForm(validForm[i])
      if (!val) {
        this.changeState({ selectedKey: 'alarm' })
        return false
      }
      if (val.url) {
        const template = _.get(ALARM_API_TEMPLATE_CONTENT, val.templateType, {})
        let paramMap = {}
        if (_.isEmpty(template)) {
          try {
            paramMap = eval(`(${val.customContent})`)
          } catch (error) {
            validForm[i].setFields({ customContent: { value: val.customContent, errors: [new Error('不是有效的json格式')] } })
            this.changeState({ selectedKey: 'alarm' })
            return false
          }
        } else {
          paramMap = template.params
          _.set(paramMap, template.templatePath, val.content)
        }
        const data = {
          url: val.url,
          templateType: val.templateType,
          paramMap,
          method: val.method,
          alterType: val.alterType
        }
        apiAlertInfos.push(data)
      }
    }
    return {
      successEmails: emailAlertType !== 'on_failed' ? successEmails : '',
      failureEmails: emailAlertType !== 'on_success' ? successEmails : '',
      flowPriority,
      idealExecutorIds,
      apiAlertInfos
    }
  }

  onExecuteFlow = async () => {
    const { taskId, taskName, hideModal } = this.props
    const data = await this.validForms()
    if (!data) {
      this.changeState({ selectedKey: 'alarm' })
      return
    }
    this.props.dispatch({
      type: `${namespace}/startTask`,
      payload: {
        id: taskId,
        name: taskName,
        ...data,
        hideModal
      }
    })
  }

  onShowSetCron = async () => {
    const { taskId, taskName } = this.props
    const data = await this.validForms()
    if (!data) {
      this.changeState({ selectedKey: 'alarm' })
      return
    }
    this.changeState({
      viewType: 'execute',
      alarmInfo: {
        id: taskId,
        name: taskName,
        ...data
      }
    })
  }

  onSaveScheduleCron = () => {
    const { scheduleId, hideModal } = this.props
    this.props.dispatch({
      type: `${namespace}/saveScheduleCron`,
      payload: { scheduleId, hideModal }
    })
  }

  render() {
    const { selectedKey = 'alarm', viewType, showAlarmSet, hideModal, cronInfo } = this.props
    let content = null
    let footer = null
    if (viewType === 'alarm') {
      footer = (<Row>
        <Col span={12} className="alignleft">
          <Button
            type="success"
            icon={<ClockCircleOutlined />}
            className="mg1r iblock"
            onClick={this.onShowSetCron}
          >定时调度</Button>
        </Col>
        <Col span={12} className="alignright">
          <Button
            type="ghost"
            icon={<CloseCircleOutlined />}
            className="mg1r iblock"
            onClick={hideModal}
          >取消</Button>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            className="mg1r iblock"
            onClick={() => this.onExecuteFlow()}
          >手动执行</Button>
        </Col>
      </Row>)
      if (selectedKey === 'flow') {
        content = this.renderFlow()
      } else if (selectedKey === 'params') {
        content = this.renderParams()
      }
    } else {
      content = <div className="pd2t"><SetScheduleExecute cronInfo={cronInfo} changeState={this.changeState} /></div>
      footer = [<Button
        type="ghost"
        icon={<CloseCircleOutlined />}
        className="mg1r iblock"
        onClick={hideModal}
                >取消</Button>,
      <Button
        type="primary"
        icon={<CheckCircleOutlined />}
        className="mg1r iblock"
        onClick={() => this.onSaveScheduleCron()}
      >保存</Button>]
    }
    return (
      <Modal
        maskClosable={false}
        title={'设置'}
        wrapClassName="vertical-center-modal"
        visible={showAlarmSet}
        width="50%"
        className="alarm-set"
        bodyStyle={{ padding: '10px 10px 10px 20px', height: '500px' }}
        footer={footer}
        onCancel={hideModal}
      >
        <div className="itblock height-100" style={{ width: 200 }}>
          {
            viewType === 'alarm'
              ? <Menu
                className="height-100"
                style={{ width: 200 }}
                defaultSelectedKeys={[selectedKey]}
                onClick={val => this.changeState({ selectedKey: val.key })}
                >
                {/* <Menu.Item key="flow">
                      <Icon type="mail" /> 流程图
                    </Menu.Item> */}
                <Menu.Item key="alarm">
                  <LegacyIcon type="alarm" /> 通知告警
                </Menu.Item>
                <Menu.Item key="params">
                  <LegacyIcon type="params" /> 执行参数
                </Menu.Item>
              </Menu>
              : null
          }
        </div>
        <div className="itblock alarm-scroll-content always-display-scrollbar" style={{ width: 'calc( 100% - 210px )', paddingLeft: '10px', paddingRight: '10px' }}>
          {content}
          {this.renderAlarm()}
        </div>
      </Modal>
    );
  }
}
