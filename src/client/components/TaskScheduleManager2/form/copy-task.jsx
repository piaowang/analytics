import React, { Component } from 'react'
import { validInputName } from '../constants'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Input } from 'antd';
import _ from 'lodash'
import { validateFields } from '../../../common/decorators'

const FormItem = Form.Item
@Form.create()
@validateFields
export default class CopyTaskModal extends Component {

  onOk = async () => {
    const { copyOk } = this.props
    const values = await this.validateFields()
    if (!values) return
    copyOk(values.newProjectShowName)
  }

  onCancel = () => {
    const { copyCancel } = this.props
    this.props.form.resetFields()
    copyCancel()
  }

  render() {
    const { visibleCopy, form } = this.props
    const { getFieldDecorator } = form
    return (<Modal
      title="复制任务"
      maskClosable={false}
      visible={visibleCopy}
      onOk={this.onOk}
      onCancel={this.onCancel}
    >
      <Form>
        <FormItem
          label="任务名称"
          hasFeedback
        >
          {getFieldDecorator('newProjectShowName', {
            rules: [{
              required: true, message: '任务名称必填!'
            },
            ...validInputName]
          })(
            <Input />
          )}
        </FormItem>
      </Form>
    </Modal>)
  }
}
