import React from 'react'
import { CheckOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Input, Button, InputNumber, Tooltip } from 'antd';
import _ from 'lodash'
import {validateFields} from '../../common/decorators'
const formItemLayout = {
  labelCol: { span: 10 },
  wrapperCol: { span: 14 }
}

const createForm = Form.create
const FormItem = Form.Item

const inputTypeMap = {
  param_type_string: Input,
  param_type_int: InputNumber,
  param_type_double: InputNumber
}

@validateFields
class ProcessModal extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      data: props.unitData
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(nextProps.unitData, this.props.unitData)) {
      this.setState({
        data: nextProps.unitData
      }, () => this.props.form.resetFields())
    }
  }

  submit = async () => {
    let res = await this.validateFields()
    if (!res) return
    let {hideModal, update} = this.props
    this.props.form.resetFields()
    update(this.state.data, res)
    hideModal()
  }

  render () {
    let {data} = this.state
    let {name, operatorType} = data
    let params = _.get(data, 'parameters.parameterTypes', [])
    let {modalVisible, hideModal} = this.props
    let footer = (
      <div className="alignright pd2y">
        <Button
          type="ghost"
          icon={<CloseCircleOutlined />}
          className="mg1r iblock"
          onClick={hideModal}
        >取消</Button>
        <Button
          type="primary"
          icon={<CheckOutlined />}
          className="mg1r iblock"
          onClick={this.submit}
        >确定</Button>
      </div>
    )

    const {getFieldDecorator} = this.props.form

    return (
      <Modal
        visible={modalVisible}
        footer={footer}
      >
        <p className="font14 pio-setting-title alignright borderb"><b>{operatorType}</b>计算单元设定</p>
        <div className="pd2x pd2t">
          <Form
            onSubmit={this.onSubmit}
          >
            <FormItem {...formItemLayout} label="id">
              {name}
            </FormItem>
            {
              params.map((param, i) => {
                return this.buildFormItem(param, i, getFieldDecorator)
              })
            }
          </Form>
          
          {footer}
        </div>
      </Modal>

    )
  }

}

export default createForm()(ProcessModal)
