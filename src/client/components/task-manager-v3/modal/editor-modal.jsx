import React from 'react'
import PropTypes from 'prop-types'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Input, message } from 'antd';

const {Item: FItem} = Form
const { TextArea } = Input
const FormItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 4 }
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 20 }
  }
}

const CreateModal = (props) => {
  const {
    project={},
    visible,
    cancel,
    create,
    editor,
    form: {getFieldDecorator, validateFields, resetFields}
  } = props

  const [loading, setLoading] = React.useState(false)
  React.useEffect(() => {
    visible === false && resetFields()
  }, [visible])

  const onOk = () => {
    validateFields((err, value) => {
      if (err) {
        return
      }

      const {id, name, description} = value
      setLoading(true)
      if (id) {
        editor({id, name, description}, (err) => { 
          if (err) {
            message.error('修改失败失败')
            return
          }
          setLoading(false)
          cancel()
        })
      } else {
        create({name, description}, (err) => { 
          if (err) {
            message.error('创建失败')
            return
          }
          setLoading(false)
          cancel()
        })
      }
    })
  }

  return (
    <Modal
      width={500}
      title={project.id ? '编辑': '创建新项目'}
      visible={visible}
      loading={loading}
      onCancel={cancel}
      onOk={onOk}
    >
      <Form>
        { project.id ? 
          (<FItem {...FormItemLayout} label="项目Id">
            {getFieldDecorator('id', {
              initialValue: project.id || ''
            })(<Input disabled />)
            }
          </FItem>) : null
        }
        <FItem {...FormItemLayout} label="项目名称">
          {getFieldDecorator('name', {
            initialValue: project.name || '',
            rules: [{
              required: true,
              message: '项目名不能为空' 
            }, {
              pattern: /^[\u4e00-\u9fa5_a-zA-Z0-9]+$/g,
              message: '只能是数字、字母和中文组成!'
            },{
              max: 50,
              message: '不应超过50个字符'
            }]
          })(<Input />)
          }
        </FItem>
        <FItem {...FormItemLayout} label="项目描述">
          {getFieldDecorator('description', {
            initialValue: project.description || '',
            rules: [{
              max: 250,
              message: '不应超过250个字符'
            }]
          })(<TextArea rows={3} />)
          }
        </FItem>
      </Form>
    </Modal>
  );
}

CreateModal.propTypes = {
  project: PropTypes.any,
  visible: PropTypes.bool,
  cancel: PropTypes.func,
  create: PropTypes.func,
  editor: PropTypes.func,
  form: PropTypes.any
}

export default Form.create()(CreateModal)
