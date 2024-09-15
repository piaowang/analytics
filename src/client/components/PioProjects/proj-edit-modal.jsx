import React from 'react'
import _ from 'lodash'
import { CheckOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Input, Modal, Button, Select } from 'antd';
import {validateFields} from '../../common/decorators'

const Option = Select.Option

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 20 }
}

const createForm = Form.create
const FormItem = Form.Item
const propsArr = ['name', 'description']

@validateFields
class ProjEditModal extends React.Component {

  constructor(props, context) {
    super(props, context)
    this.state = {
      process: {
        name: '',
        description: '',
        type: ''
      }
    }

    if(props.templateTypes && props.templateTypes.length) {
      this.state.process.type = props.templateTypes[0].id
    }
  }

  componentWillReceiveProps(nextProps) {
    if (
      !_.isEqual(
        _.pick(nextProps.process, propsArr),
        _.pick(this.props.process, propsArr)
      )
    ) {
      this.setState({
        process: _.pick(nextProps.process, propsArr)
      }, () => this.props.form.resetFields())
    }
  }

  submit = async () => {
    let res = await this.validateFields()
    if (!res) return
    this.props.handleEdit(res)
  }

  render() {

    let {process: {
      name, description
    }} = this.state
    
    let processName = this.props.process.name
    const {getFieldDecorator} = this.props.form
    const {onCancel, visible, templateTypes} = this.props
    let title = processName
      ? `编辑项目 "${processName}"`
      : '新建项目'

    let footer = (
      <div className="alignright pd2y">
        <Button
          type="ghost"
          icon={<CloseCircleOutlined />}
          className="mg1r iblock"
          onClick={onCancel}
        >取消</Button>
        <Button
          type="success"
          icon={<CheckOutlined />}
          className="mg1r iblock"
          onClick={this.submit}
        >提交修改</Button>
      </div>
    )

    let props = {
      title,
      visible,
      width: 500,
      onCancel: onCancel,
      footer
    }
    return (
      <Modal
        {...props}
      >
        <Form
          onSubmit={this.submit}
        >
          <FormItem
            {...formItemLayout}
            label="项目名"
            hasFeedback
          >
            {
              getFieldDecorator(
                'name',
                {
                  rules: [
                    {
                      required: true,
                      message: '请输入项目名，至少2~50个字符'
                    },
                    {
                      min: 2,
                      max: 50,
                      message: '请输入项目名，至少2~50个字符'
                    }
                  ],
                  initialValue: name
                }
              )(
                <Input
                  autoComplete="off"
                />
              )
            }
          </FormItem>
          {
            templateTypes && templateTypes.length
              ? <FormItem
                {...formItemLayout}
                label="模板类型"
                hasFeedback
              >
                {
                  getFieldDecorator('type', {initialValue: templateTypes[0].id})(
                    <Select>
                      {
                        templateTypes.map(t => <Option value={t.id} key={t.id}>{t.name}</Option>)
                      }
                    </Select>
                  )
                }
              </FormItem>
              : null
          }
          <FormItem
            {...formItemLayout}
            label="项目描述"
            hasFeedback
          >
            {
              getFieldDecorator(
                'description',
                {
                  rules: [
                    {
                      max: 500,
                      message: '不超过500个字符'
                    }
                  ],
                  initialValue: description
                }
              )(
                <Input.TextArea
                  rows={4}
                />
              )
            }
          </FormItem>
        </Form>
      </Modal>
    )
  }
}

export default createForm()(ProjEditModal)
