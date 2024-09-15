import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Button, Input, Col, Row, Select, Spin, InputNumber } from 'antd';
import React from 'react'
import {validateFieldsAndScroll} from '../../../common/decorators'

@Form.create()
@validateFieldsAndScroll
export default class editPopwindow extends React.Component {

  componentDidMount() {
    // To disabled submit button at the beginning.
    //this.props.form.validateFields();
  }


  handleSubmit = async () => {
    const {data, handleOk} = this.props
    const values = await this.validateFieldsAndScroll()
    if (!values) return
    if (data.id) {
      values.id = data.id
    }
    handleOk(values)
  }

  render() {
    const formItemLayout = {
      labelCol: {span: 4},
      wrapperCol: {span: 18}
    }
    const {
      getFieldDecorator
    } = this.props.form

    const {visible, handleCancel, data, changeProp} = this.props
    return (
      <div>
        <Modal
          title={title}
          visible={visible}
          onCancel={handleCancel}
          onOk={this.handleSubmit}
          width={700}
        >
          <Button>btn</Button>
        </Modal>
      </div>
    )
  }
}

