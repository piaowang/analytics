import React from 'react'
import { CloseCircleOutlined } from '@ant-design/icons';
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Button, Input, message } from 'antd';
import { validateFields } from '../../../common/decorators'

const FormItem = Form.Item
const createForm = Form.create

@validateFields
class AddScreenModal extends React.Component {

  state = {
    loading: false
  }

  handleSubmit = async () => {
    const { doAddLiveScreen, hideModal } = this.props
    const values = await this.validateFields()
    if (!values) return
    this.setState({
      loading: true
    })
    doAddLiveScreen(values, (res) => {
      if (res) {
        hideModal()
        message.success('添加成功')
      }
      this.setState({
        loading: false
      })
    })
  }

  handleClose = () => {
    const { form: { resetFields } } = this.props
    resetFields()
  }

  render() {
    let { visible, hideModal, value } = this.props
    const { loading } = this.state
    const formItemLayout = {
      labelCol: { span: 6 },
      wrapperCol: { span: 16 }
    }
    const { getFieldDecorator } = this.props.form

    let footer = (
      <div className='alignright'>
        <Button 
          type='ghost'
          icon={<CloseCircleOutlined />}
          className='mg1r iblock'
          onClick={hideModal}
        >取消</Button>
        <Button
          type='success'
          icon={<LegacyIcon type={loading ? 'loading' : 'check'} />}
          className='mg1r iblock'
          onClick={this.handleSubmit}
        >{loading ? '提交中...' : '提交'}</Button>
      </div>
    )

    return (
      <Modal
        title='修改节点名称'
        visible={visible}
        onOk={this.handleSubmit}
        onCancel={hideModal}
        afterClose={this.handleClose}
        footer={footer}
        width={360}
      >
        <Form layout='horizontal'>
          <FormItem {...formItemLayout} label='节点名称' hasFeedback>
            {
              getFieldDecorator('name', {
                initialValue: value,
                rules: [
                  {
                    required: true,
                    message: '需要填写节点名称'
                  }
                ]
              })(
                <Input placeholder='请输入节点名称' />
              )
            }
          </FormItem>
        </Form>
      </Modal>
    )
  }
}

export default createForm()(AddScreenModal)
