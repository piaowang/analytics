import React, { Component } from 'react'
import { TASK_TREE_TYPE, TASK_OPERTION_FORM_TYPE, TASK_FORM_LAST_SETP, TASK_FORM_SET_HW_STEP, TASK_FORM_ADD_STEP, validInputName } from '../constants'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Table, Button, Modal, Input, Select, Row, Col, Divider, Tooltip, message } from 'antd';
import { validateFields } from '../../../common/decorators'

const FormItem = Form.Item
const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 18 }
}

@Form.create()
@validateFields
export default class TaskEditModal extends Component {

  componentDidUpdate(prevProps) {
    const { taskInfo = {} } = this.props
    if (taskInfo.id !== prevProps.taskInfo.id) {
      this.props.form.resetFields()
    }
  }

  renderAddCollect = () => {
    let { form: { getFieldDecorator }, taskInfo = {}, addStep = TASK_OPERTION_FORM_TYPE.addBaseInfo, showAllFeilds = true } = this.props
    if (addStep === TASK_OPERTION_FORM_TYPE.addBaseInfo) {
      return (<Form key="addForm">
        <FormItem label="任务名称" className="mg1b" hasFeedback {...formItemLayout}>
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
        {
          showAllFeilds
            ? <FormItem label="业务部门" className="mg1b" hasFeedback {...formItemLayout}>
              {getFieldDecorator('businessDepartment', {
                rules: [{
                  required: true, message: '业务部门必填!'
                },
                ...validInputName],
                initialValue: _.get(taskInfo, 'metadata.businessDepartment', '')
              })(
                <Input />
              )}
            </FormItem>
            : null
        }
        {
          showAllFeilds
            ? <FormItem label="业务名称" className="mg1b" hasFeedback {...formItemLayout}>
              {getFieldDecorator('businessName', {
                rules: [{
                  required: true, message: '分类名称必填!'
                },
                ...validInputName],
                initialValue: _.get(taskInfo, 'metadata.businessName', '')
              })(
                <Input />
              )}
            </FormItem>
            : null
        }
        <FormItem label="任务描述" className="mg1b" hasFeedback {...formItemLayout}>
          {getFieldDecorator('description', {
            initialValue: _.get(taskInfo, 'description', ''),
            rules: [{
              max: 200, message: '1~200个字符!'
            }]
          })(
            <Input.TextArea rows={4} />
          )}
        </FormItem>
      </Form>)
    }
  }
  render() {
    return this.renderAddCollect()
  }
} 
