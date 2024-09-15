import React from 'react'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Input, Button } from 'antd';
import {validateFields} from '../../common/decorators'
const FormItem = Form.Item

const formItemLayout = {
  labelCol: { span: 5 },
  wrapperCol: { span: 19 }
}

@Form.create()
@validateFields
export default class SaveAsModal extends React.Component {

  submit = async (e) => {
    e.preventDefault()
    let ok = await this.validateFields()
    if (!ok) return
    this.props.hideModal()
    this.props.saveAsUsergroup(ok.title)
  }

  render () {
    let {getFieldDecorator} = this.props.form
    let {visible} = this.props
    return (
      <Modal
        title="另存为用户分群"
        onCancel={this.props.hideModal}
        visible={visible}
        footer={null}
      >
        <Form onSubmit={this.submit}>
          <FormItem {...formItemLayout} label="分群名称">
            {getFieldDecorator('title', {
              rules: [{
                required: true,
                message: '请输入分群名称'
              }, {
                min: 1,
                max: 50,
                type: 'string',
                message: '1~50个字符'
              }]
            })(
              <Input />
            )}
          </FormItem>
          <FormItem wrapperCol={{ span: 19, offset: 5 }}>
            <Button
              type="ghost"
              className="mg1r"
              onClick={this.props.hideModal}
            >取消</Button>
            <Button
              type="success"
              htmlType="submit"
            >
              提交
            </Button>
          </FormItem>
        </Form>
      </Modal>
    )

  }
}
