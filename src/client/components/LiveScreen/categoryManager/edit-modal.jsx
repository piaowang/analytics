import React, { Component } from 'react'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Input, Button } from 'antd';
import { validateFields } from '../../../common/decorators'

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 16 }
}
const FormItem = Form.Item

@Form.create()
@validateFields
export default class EditLiveScreenCategoryModal extends Component {

  handleClose = () => {
    const { form: { resetFields } } = this.props
    resetFields()
  }

  handleSubmit = async () => {
    const { category, updateCategory } = this.props
    const values = await this.validateFields()
    if (!values) {
      return
    }
    updateCategory({ ...values, id: category.id })
  }

  render() {
    let { visible, hideModal, category } = this.props
    const { getFieldDecorator } = this.props.form
    let footer = (
      <div className="alignright">
        <Button
          type="ghost"
          icon={<CloseCircleOutlined />}
          className="mg1r iblock"
          onClick={hideModal}
        >取消</Button>
        <Button
          type="success"
          className="mg1r iblock"
          icon={<CheckCircleOutlined />}
          onClick={this.handleSubmit}
        >提交</Button>
      </div>
    )
    return (
      <Modal
        title="修改分类名称"
        visible={visible}
        onCancel={hideModal}
        afterClose={this.handleClose}
        footer={footer}
        width={600}
      >
        <Form>
          <FormItem {...formItemLayout} label="分类名称" hasFeedback>
            {
              getFieldDecorator('title', {
                initialValue: category.title,
                rules: [
                  { required: true, message: '需要填写分类名称' },
                  {
                    pattern: new RegExp("[^a-zA-Z0-9\_\u4e00-\u9fa5]", "i"),
                    message: '输入无效,包含非法字符',
                    validator: (rule, value, callback) => {
                      if (rule.pattern.test(value)) {
                        callback(rule.message)
                      }
                      callback()
                    }
                  }, {
                    max: 30,
                    message: '1~30个字符'
                  }]
              })(
                <Input placeholder="请输入分类名称" />
              )
            }
          </FormItem>
        </Form>
      </Modal>
    )
  }
}
