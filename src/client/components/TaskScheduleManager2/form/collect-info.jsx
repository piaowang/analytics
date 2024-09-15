import React, { Component } from 'react'
import { TASK_TREE_TYPE, TASK_OPERTION_FORM_TYPE, TASK_FORM_LAST_SETP, TASK_FORM_SET_HW_STEP, TASK_FORM_ADD_STEP, validInputName } from '../constants'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import {
  Table,
  Button,
  Card,
  Input,
  Select,
  Row,
  Col,
  Divider,
  Tooltip,
  message,
  Tabs,
} from 'antd';
import { validateFields } from '../../../common/decorators'
import moment from 'moment'
import Fetch from 'client/common/fetch-final'
import SetForm from './set-form'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import { connect } from 'react-redux'
import dataCollectModel, { namespace } from '../store/data-collect-model'

const FormItem = Form.Item
const { TabPane } = Tabs
const formItemLayout = {
  labelCol: { span: 2 },
  wrapperCol: { span: 20 }
}
const formItemLayout2 = {
  labelCol: { span: 6 },
  wrapperCol: { span: 16 }
}


@Form.create()
@connect(props => props[namespace])
export default class TaskEditModal extends Component {
  componentDidMount() {
    const { taskInfo, addStep } = this.props
    this.startHeartbeat(_.get(taskInfo, 'name', ''))
    if (addStep === TASK_OPERTION_FORM_TYPE.editTaskInfo) {
      setTimeout(() => { this.changeDataColllectState({ validForm: { ...this.props.validForm, base: this.props.form } }) }, 1)
    }
  }

  startHeartbeat = (taskName) => {
    this.heartbeatId = window.setInterval(async () => await Fetch.get(`/app/new-task-schedule/manager?project=${taskName}&ajax=heartbeat`), 5000)
  }

  clearHeartbeat = () => {
    if (this.heartbeatId) {
      window.clearInterval(this.heartbeatId)
    }
  }

  changeDataColllectState = payload => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload
    })
  }

  componentWillUnmount() {
    this.clearHeartbeat()
    this.props.form.resetFields()
  }

  onEdit = (targetKey, action) => {
    this[action](targetKey)
  }

  add = () => {
    const { addDataSet, fileContent } = this.props
    const newId = _.maxBy(fileContent, p => p.id).id + 1
    addDataSet(newId)
    this.changeDataColllectState({ activeKey: 'dataSetPane_' + newId })
  }

  remove = targetKey => {
    let { activeKey, fileContent } = this.props
    const { removeDataSet } = this.props
    const removeKey = targetKey.replace('dataSetPane_', '')
    if (activeKey === targetKey) {
      this.changeDataColllectState({ activeKey: 'dataSetPane_' + _.maxBy(fileContent.filter(p => p.id.toString() !== removeKey), p => p.id).id })
    }
    removeDataSet(removeKey)
  }

  renderBasInfo = () => {
    let { form: { getFieldDecorator }, taskInfo = {} } = this.props
    return (<Card title="基本信息" size="small" headStyle={{ padding: '5px 24px', backgroundColor: '#eee', minHeight: '20px' }} extra={moment(_.get(taskInfo, 'createTimestamp', 0)).format('YYYY-MM-DD HH:mm')} >
      <Form key="editForm">
        <Row>
          <Col span={8}>
            <FormItem label="任务名称" className="mg1b" hasFeedback {...formItemLayout2}>
              {getFieldDecorator('showName', {
                rules: [{
                  required: true, message: '任务名称必填!'
                },
                ...validInputName],
                initialValue: _.get(taskInfo, 'showName', '')
              })(
                <Input className="width200" />
              )}
            </FormItem>
          </Col>
          <Col span={8}>
            <FormItem label="业务部门" className="mg1b" hasFeedback {...formItemLayout2}>
              {getFieldDecorator('businessDepartment', {
                rules: [{
                  required: true, message: '业务部门必填!'
                },
                ...validInputName],
                initialValue: _.get(taskInfo, 'metadata.businessDepartment', '')
              })(
                <Input className="width200" />
              )}
            </FormItem>
          </Col>
          <Col span={8}>
            <FormItem label="业务名称" className="mg1b" hasFeedback {...formItemLayout2}>
              {getFieldDecorator('businessName', {
                rules: [{
                  required: true, message: '分类名称必填!'
                },
                ...validInputName],
                initialValue: _.get(taskInfo, 'metadata.businessName', '')
              })(
                <Input className="width200" />
              )}
            </FormItem>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <FormItem label="任务描述" className="mg1b" hasFeedback {...formItemLayout}>
              {getFieldDecorator('description', {
                initialValue: _.get(taskInfo, 'description', ''),
                rules: [{
                  max: 200, message: '1~200个字符!'
                }]
              })(
                <Input.TextArea rows={2} />
              )}
            </FormItem>
          </Col>
        </Row>
      </Form>
    </Card>)
  }

  renderDataConfigInfo = () => {
    let { addStep, fileContent = [], dataDbs, taskInfo, activeKey } = this.props
    return (<div>
      {
        addStep === TASK_OPERTION_FORM_TYPE.editTaskInfo
          ? this.renderBasInfo()
          : null
      }
      <Tabs
        className="mg2t"
        onChange={key => this.changeDataColllectState({ activeKey: key })}
        activeKey={activeKey}
        type="editable-card"
        onEdit={this.onEdit}
      >
        {
          fileContent.map((pane, i) => {
            const key = `dataSetPane_${pane.id}`
            return (<TabPane tab={`配置${i + 1}`} key={key} closable={i !== 0} forceRender>
              <SetForm innerRef={ref => this._sliceChartFacade = ref} taskId={taskInfo.id} collectType={'full'} dataDbs={dataDbs} content={pane} />
            </TabPane>)
          })
        }
      </Tabs>
    </div>)
  }

  render() {
    // const { addStep } = this.props
    //  style={{ height: addStep === TASK_OPERTION_FORM_TYPE.editTaskInfo ? '680px' : '580px' }}
    return (<div className="collect-info">
      {this.renderDataConfigInfo()}
    </div>)
  }
}
