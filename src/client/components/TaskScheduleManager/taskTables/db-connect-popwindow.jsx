import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Button, Input, Col, Row, Select, Spin, InputNumber } from 'antd';
import React from 'react'
import {validateFieldsAndScroll} from '../../../common/decorators'


@Form.create()
@validateFieldsAndScroll
export default class DbPopWindow extends React.Component {

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
      labelCol: {span: 5},
      wrapperCol: {span: 17}
    }
    const {
      getFieldDecorator
    } = this.props.form

    const {visible, handleCancel, data, changeProp} = this.props
    let title = data.id != null ? '编辑数据库连接' : '创建数据库连接'
    return (
      <div>



        <Modal
          title={title}
          visible={visible}
          onCancel={handleCancel}
          onOk={this.handleSubmit}
          width={700}
        >
          <Form layout="horizontal">
            <Form.Item {...formItemLayout} label="别名" hasFeedback>
              {
                getFieldDecorator(
                  'db_alais', {
                    initialValue: _.get(data, 'db_alais'),
                    rules: [
                      {
                        required: true,
                        message: '请输入链接别名'
                      }
                    ]
                  })
                (<Input
                  onChange={(e) => changeProp({db_alais: e.target.value})}
                />)
              }
            </Form.Item>

            <Form.Item {...formItemLayout} label="数据库类型" hasFeedback>
              {
                getFieldDecorator(
                  'db_type', {
                    initialValue: _.get(data, 'db_type'),
                    rules: [
                      {
                        required: true,
                        message: '请输入数据库类型'
                      }
                    ]
                  })(
                  <Select
                    onChange={(e) => changeProp({db_type: e})}
                  >
                    <Option key="dt1" value="mysql">MySQL</Option>
                    <Option key="dt2" value="PostgreSQL">PostgreSQL</Option>
                    <Option key="dt3" value="oracle">oracle</Option>
                    <Option key="dt4" value="sqlserver">sqlserver</Option>
                  </Select>
                )
              }
            </Form.Item>

            <Form.Item {...formItemLayout} label="数据库账号" hasFeedback>
              {
                getFieldDecorator(
                  'db_user', {
                    initialValue: _.get(data, 'db_user'),
                    rules: [
                      {
                        required: true,
                        message: '请输入数据库账号'
                      }
                    ]
                  })(
                  <Input
                    onChange={(e) => changeProp({db_user: e.target.value})}
                  />)
              }
            </Form.Item>
            <Form.Item {...formItemLayout} label="数据库密码" hasFeedback>
              {
                getFieldDecorator(
                  'db_pwd', {
                    initialValue: _.get(data, 'db_pwd'),
                    rules: [
                      {
                        required: true,
                        message: '请输入数据库密码'
                      }
                    ]
                  })(
                  <Input
                    type="password"
                    onChange={(e) => changeProp({db_pwd: e.target.value})}
                  />)
              }
            </Form.Item>
            <Row>
              <Col span={22} className="alignright mg2b">
                  注意：浏览器会同步记住登录账号及密码，请用户修改数据库账号/密码为数据库的账号及密码
              </Col>
            </Row>


            <Form.Item {...formItemLayout} label="ip地址" hasFeedback>
              {
                getFieldDecorator(
                  'db_ip', {
                    initialValue: _.get(data, 'db_ip'),
                    rules: [
                      {
                        required: true,
                        message: '请输入ip地址'
                      }
                    ]
                  })(
                  <Input
                    onChange={(e) => changeProp({db_ip: e.target.value})}
                  />)
              }
            </Form.Item>

            <Form.Item {...formItemLayout} label="端口号" hasFeedback>
              {
                getFieldDecorator(
                  'db_port', {
                    initialValue: _.get(data, 'db_port'),
                    rules: [
                      {
                        required: true,
                        message: '请输入端口号'

                      }
                    ]
                  })(<Input
                  min={1}
                  onChange={(e) => changeProp({db_port: e.target.value})}
                />)
              }
            </Form.Item>


            <Form.Item {...formItemLayout} label="默认数据库" hasFeedback>
              {
                getFieldDecorator(
                  'default_db', {
                    initialValue: _.get(data, 'default_db'),
                    rules: [
                      {
                        required: true,
                        message: '请输入默认数据库'
                      }
                    ]
                  })(
                  <Input
                    onChange={(e) => changeProp({default_db: e.target.value})}
                  />)
              }
            </Form.Item>

            <Row className="mg2b">
              <Col span={22} className="alignright">
                <Button
                  onClick={
                    async () => {
                      let pass = await this.validateFieldsAndScroll()
                      console.log('bypass', pass)
                      // if (pass) test()
                    }
                  }
                  // loading={testing}
                >
                    测试连接
                </Button>
              </Col>
            </Row>

          </Form>
        </Modal>
      </div>
    )
  }
}

