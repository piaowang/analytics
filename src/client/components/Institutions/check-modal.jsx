import React, {useState } from 'react'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Modal, Input, Radio } from 'antd'

const FormItem = Form.Item

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 18 }
}

function CheckModal(props) {
  const {visible, onCancel, onOk, form: {validateFields, getFieldDecorator} } = props

  function onCheck() {
    validateFields((err, vals) => {
      if(err) return
      onOk(vals)
    })
  }

  return (
    <Modal
      title={'用户信息审核'}
      onCancel={onCancel}
      onOk={() => onCheck()}
      visible={visible}
    >
      <Form layout="horizontal">
        <FormItem {...formItemLayout} label="审核结论" >
          {
            getFieldDecorator(
              'check_status', {
                initialValue: 1
              })(
              <Radio.Group >
                <Radio value={1}>通过</Radio>
                <Radio value={2}>驳回</Radio>
              </Radio.Group>
            )
          }
        </FormItem>
        <FormItem {...formItemLayout} label="审核意见" >
          {
            getFieldDecorator(
              'suggestion', {
                initialValue: ''
              })(
              <Input.TextArea
                style={{width: 300}}
                maxLength={500}
                autoSize={{ minRows: 2, maxRows: 6 }}
              />
            )
          }
        </FormItem>
      </Form>
    </Modal>
  )
}

export default Form.create()(CheckModal)

