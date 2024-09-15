// copy pop
import React, { Component } from 'react'
import { CloseCircleOutlined } from '@ant-design/icons'
import { Form, Icon as LegacyIcon } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Modal, Input, Button } from 'antd'

const FormItem = Form.Item
const createForm = Form.create

class CopyModal extends Component{

  handleSubmit = () => {
    this.props.form.validateFields((err) => {
      if (!err) {
        let { copyRole } = this.props
        copyRole()
      }
    })
  }

  render(){
    let { visible, loading, toggleModal, handleChange, role, child } = this.props
    const {getFieldDecorator} = this.props.form
    let title = '复制角色'
    const formItemLayout = {
      labelCol: { span: 4 },
      wrapperCol: { span: 18 }
    }

    let footer = (
      <div className="alignright">
        <Button
          type="ghost"
          icon={<CloseCircleOutlined />}
          className="mg1r iblock"
          onClick={() => {toggleModal(false)}}
        >取消</Button>
        <Button
          htmlType="submit"
          type="success"
          icon={<LegacyIcon type={loading ? 'loading' : 'check'} />}
          className="mg1r iblock"
          onClick={this.handleSubmit}
        >{loading ? '提交中...' : '提交'}</Button>
      </div>
    )

    return (
      <div>
        <Modal
          title={title}
          visible={visible}
          onOk={this.handleSubmit}
          onCancel={() => {toggleModal(false)}}
          footer={footer}
        >
          <Form>
            <FormItem {...formItemLayout} label="角色名称">
              {
                getFieldDecorator('userName', {
                  initialValue: role.userName,
                  rules: [
                    {
                      required: true, 
                      whitespace: true, 
                      message: '请输入用户名称'
                    }, {
                      max: 20,
                      message: '不超过20个字符'
                    }
                  ]
                })(
                  <Input
                    placeholder="请输入用户名称"
                    onChange={(e) => {handleChange(e.target.value,'userName')}}
                    size="default"
                  />
                )
              }
            </FormItem>
            <FormItem {...formItemLayout} label="备注:">
              {
                getFieldDecorator('customDescription', {
                  rules: [{
                    max: 200,
                    message: '不超过200个字符'
                  }],
                  initialValue:role.customDescription
                })(
                  <Input
                    placeholder="请输入备注信息"
                    onChange={(e) => {handleChange(e.target.value, 'customDescription')}}
                    size="default"
                  />
                )
              }
            </FormItem>
            {/* { visible && child(role)} */}
          </Form>
        </Modal>
      </div>
    )
  }
}
export default createForm()(CopyModal)
