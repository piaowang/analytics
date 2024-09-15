import _ from 'lodash'
import React from 'react'
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Row, Col, Button, Input, Select, message, Popconfirm } from 'antd';
import { validateFieldsAndScroll } from '~/src/client/common/decorators.js'
import {isDiffByPath} from '~/src/common/sugo-utils.js'

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 15 }
}

const fieldNames = ['name', 'department_id', 'phone', 'email']

/**
 * 监控告警-编辑通讯录控件
 * @export
 * @class LinkmanManager
 * @extends {React.Component}
 */
@Form.create()
@validateFieldsAndScroll
export default class ContactEditDialog extends React.Component {

  state = {
    editingContract: null
  }

  componentWillMount() {
    let {value} = this.props
    this.state.editingContract = value
  }

  componentWillReceiveProps(nextProps) {
    if (isDiffByPath(nextProps, this.props, 'value')) {
      this.setState({editingContract: nextProps.value}, () => {
        this.props.form.setFieldsValue(_.pick(nextProps.value, fieldNames))
      })
    }
  }

  componentDidMount() {
    let {editingContract} = this.state
    if (editingContract) {
      this.props.form.setFieldsValue(editingContract)
    }
  }

  onSubmit = async () => {
    let formData = await this.validateFieldsAndScroll()
    if (!formData) {
      return
    }
    if (!formData) return
    if(!formData.phone && !formData.email) {
      message.warn('请至少填写一项联系人告警方式')
      return
    }
    let {onChange, onCancel} = this.props
    await onChange(formData)
    onCancel()
    message.success('保存成功')
    this.reset()
  }

  reset = () => {
    this.props.form.resetFields()
  }

  render() {
    const {
      onCancel,
      visible,
      form,
      departments
    } = this.props
    const { getFieldDecorator } = form
    const { editingContract = {} } = this.state

    return (
      <Modal
        visible={visible}
        title={`${_.get(editingContract, 'id') ? '编辑' : '创建'}告警接收人`}
        onCancel={() => {
          onCancel()
          this.reset()
        }}
        footer={
          <div className="aligncenter">
            <Button
              type="primary"
              icon={<LegacyIcon type={_.get(editingContract, 'id') ? 'edit' : 'user-add'} />}
              onClick={this.onSubmit}
            >
              {_.get(editingContract, 'id') ? '更新告警接收人' : '添加新的告警接收人'}
            </Button>
          </div>
        }
      >
        <Form>
          <Row gutter={10}>
            <Col>
              <Form.Item
                label="接收人名称"
                {...formItemLayout}
              >
                {getFieldDecorator('name',  {
                  rules: [{ required: true, message: '请输入告警接收人名称', max: 25, whitespace: true }],
                  initialValue: editingContract && editingContract.name || null
                }) ( <Input className="width-100" placeholder="请输入告警接收人名称" /> )}
              </Form.Item>
            </Col>

            <Col>
              <Form.Item
                label="所属部门"
                {...formItemLayout}
              >
                {getFieldDecorator('department_id',  {
                  rules: [{ required: true, message: '请填写所属部门'}],
                  initialValue: editingContract && editingContract.department_id || _.get(_.first(departments), 'id')
                }) (
                  <Select>
                    {(departments || []).map(dep => {
                      return (
                        <Select.Option value={dep.id} key={dep.id}>{dep.name}</Select.Option>
                      )
                    })}
                  </Select>
                )}
              </Form.Item>
            </Col>

            <Col>
              <Form.Item
                label="手机号码"
                {...formItemLayout}
              >
                {getFieldDecorator('phone',  {
                  rules: [{ required: false, message: '手机号码格式错误', len: 11, pattern: /^\d{11}$/}],
                  initialValue: editingContract && editingContract.phone || null
                }) ( <Input className="width-100" placeholder="请输入告警接收人手机号码" /> )}
              </Form.Item>
            </Col>
            <Col>
              <Form.Item
                label="邮件地址"
                {...formItemLayout}
              >
                {getFieldDecorator('email',  {
                  rules: [{ required: false, type: 'email', message: '邮件地址格式错误', max: 50 }],
                  initialValue: editingContract && editingContract.email || null
                }) ( <Input className="width-100" placeholder="请输入告警接收人邮件地址" /> )}
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    );
  }
}
