import React, { Component } from 'react'
import { CloseCircleOutlined } from '@ant-design/icons';
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Input, Select, Button } from 'antd';
import { validateFields } from '../../common/decorators'

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 16 }
}
const FormItem = Form.Item
const Option = Select.Option

@Form.create()
@validateFields
export default class EditLiveScreenModal extends Component {

  state = {
    loading: false
  }

  handleClose = () => {
    const { form: { resetFields } } = this.props
    resetFields()
  }

  handleSubmit = async () => {
    const { livescreen, updateLivescreen } = this.props
    const values = await this.validateFields()
    if (!values) {
      return
    }
    updateLivescreen({ values, id: livescreen.id })
  }

  render() {
    let { visible, hideModal, categoryList = [], livescreen } = this.props
    const { loading } = this.state
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
          icon={<LegacyIcon type={loading ? 'loading' : 'check'} />}
          className="mg1r iblock"
          onClick={this.handleSubmit}
        >{loading ? '提交中...' : '提交'}</Button>
      </div>
    )
    return (
      <Modal
        title="编辑实时大屏"
        visible={visible}
        onCancel={hideModal}
        afterClose={this.handleClose}
        footer={footer}
        width={600}
      >
        <Form>
          <FormItem {...formItemLayout} label="大屏名称" hasFeedback>
            {
              getFieldDecorator('title', {
                initialValue: livescreen.title,
                rules: [
                  { required: true, message: '需要填写大屏名称' },
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
                <Input placeholder="请输入大屏名称" />
              )
            }
          </FormItem>
          <FormItem {...formItemLayout} label={'所属分组'} hasFeedback>
            {
              getFieldDecorator('category_id', {
                initialValue: livescreen.category_id
              })(
                <Select>
                  <Option value="">无</Option>
                  {categoryList.map(p => <Option value={p.id} key={`category_${p.id}`}>{p.title}</Option>)}
                </Select>
              )
            }
          </FormItem>
        </Form>
      </Modal>
    )
  }
}
