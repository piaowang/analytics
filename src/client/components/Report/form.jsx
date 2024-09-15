/*
 * @Author: xuxinjiang
 * @Date: 2020-06-19 16:24:29
 * @LastEditTime: 2020-07-01 16:48:21
 * @Description: 视图表单组件
 * @FilePath: \sugo-analytics\src\client\components\Report\form.jsx
 */

import React from 'react'
import { Button, Input, Form } from 'antd'

export default class FormData extends React.Component {
  constructor(props) {
    super(props)
    this.formRef = React.createRef()
  }

  componentWillReceiveProps(nextProps) {
    const { formData } = nextProps
    if (formData?.id && this.formRef.current) {
      this.formRef.current.setFields([
        { name: 'title', value: formData.title },
        { name: 'name', value: formData.name }
      ])
    }else{
      this.formRef.current.setFields([
        { name: 'title', value: '' },
        { name: 'name', value: '' }
      ])
    }
  }
  onFinish(data) {
    const id = this.props.formData?.id || ''
    if (id) {
      data.id = id
    }
    this.props.onOk(data)
  }
  onFinishFailed() {}
  render() {
    const layout = {
      labelCol: { span: 6 },
      wrapperCol: { span: 16 }
    }
    const tailLayout = {
      wrapperCol: { offset: 6, span: 16 }
    }
    const { formData, onCancel } = this.props
    return (
      <Form
        {...layout}
        name="basic"
        ref={this.formRef}
        initialValues={formData}
        onFinish={(data) => this.onFinish(data)}
        onFinishFailed={this.onFinishFailed}
      >
        <Form.Item
          label="视图标题"
          name="title"
          rules={[{ required: true, message: '请输入视图标题' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="视图路径"
          name="name"
          rules={[{ required: true, message: '请输入视图路径' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item>
          <div style={{paddingLeft:'120px', marginTop:'-20px', color:'#ff4d4f'}}>示例：/view/*</div>
        </Form.Item>

        <Form.Item {...tailLayout}>
          <Button type="primary" htmlType="submit" className="mg2r">
            {formData?.id ? '保存' : '新增'}
          </Button>
          <Button onClick={() => onCancel()}>取消</Button>
        </Form.Item>
      </Form>
    )
  }
}
