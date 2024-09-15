import React, { Component } from 'react'
import { TASK_TREE_TYPE, TASK_OPERTION_FORM_TYPE, TASK_FORM_LAST_SETP, TASK_FORM_SET_HW_STEP, TASK_FORM_ADD_STEP, validInputName } from '../constants'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Table, Button, Modal, Input, Select, Row, Col, Divider, Tooltip } from 'antd';
import { validateFields } from '../../../common/decorators'
import TaskScheduleDesign from '../flow/flow-design'
import moment from 'moment'
import Fetch from 'client/common/fetch-final'

const FormItem = Form.Item
const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 18 }
}

@Form.create()
@validateFields
export default class TaskEditModal extends Component {

  componentDidMount() {
    const { taskInfo } = this.props
    this.startHeartbeat(_.get(taskInfo, 'name', ''))
  }

  startHeartbeat = (taskName) => {
    this.heartbeatId = window.setInterval(async () => await Fetch.get(`/app/new-task-schedule/manager?project=${taskName}&ajax=heartbeat`), 5000)
  }

  clearHeartbeat = () => {
    if (this.heartbeatId) {
      window.clearInterval(this.heartbeatId)
    }
  }

  componentWillUnmount() {
    this.clearHeartbeat()
    this.props.form.resetFields()
  }

  // componentWillReceiveProps(nextProps) {
  //   const { projectId, value, location } = this.props
  //   if (location.query.activeKey === 'flow' && (projectId !== nextProps.projectId || value.name !== nextProps.value.name)) {
  //     this.clearHeartbeat()
  //     this.startHeartbeat(nextProps.projectId, nextProps.value.name)
  //   } 
  //   if(location.query.activeKey !==  nextProps.location.query.activeKey ) {
  //     this.clearHeartbeat()
  //     if(nextProps.location.query.activeKey === 'flow') {
  //       this.startHeartbeat(nextProps.projectId, nextProps.value.name)
  //     }
  //     this.setState({
  //       activeKey: nextProps.location.query.activeKey || 'overview
  //     })
  //   }
  // }

  render() {
    let { form: { getFieldDecorator }, taskInfo = {}, addStep } = this.props
    return (<div>
      {
        addStep === TASK_OPERTION_FORM_TYPE.editTaskInfo ?
          <Row>
            <Col span={8}>
              <FormItem label="任务名称" className="mg1b" hasFeedback labelCol={{ span: 6 }} wrapperCol={{ span: 17 }}>
                {getFieldDecorator('showName', {
                  rules: [{
                    required: true, message: '任务名称必填!'
                  },
                  ...validInputName],
                  initialValue: _.get(taskInfo, 'showName', '')
                })(
                  <Input />
                )}
              </FormItem>
            </Col>
            <Col span={8}>
              <FormItem label="任务描述" className="mg1b" hasFeedback {...formItemLayout}>
                {getFieldDecorator('description', {
                  initialValue: _.get(taskInfo, 'description', '')
                })(
                  <Input />
                )}
              </FormItem>
            </Col>
            <Col span={8}>
              <FormItem label="创建时间" className="mg1b" {...formItemLayout}>
                {getFieldDecorator('createTimestamp', {
                  initialValue: moment(_.get(taskInfo, 'createTimestamp', 0)).format('YYYY-MM-DD HH:mm')
                })(
                  <Input disabled />
                )}
              </FormItem>
            </Col>
          </Row>
          : null
      }
      <TaskScheduleDesign taskName={taskInfo.name} value={taskInfo} />
    </div>)
  }
}
