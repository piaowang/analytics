import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Modal, Button, Input, Col, Row, Select, Spin, InputNumber } from 'antd'
import React from 'react'
import { validateFieldsAndScroll } from '../../../common/decorators'
import { connect } from 'react-redux'
import _ from 'lodash'
import dataTypes from '../../TaskScheduleManager2/db-connect/db-connect-manager'

const formItemLayout = {
  labelCol: { span: 5 },
  wrapperCol: { span: 17 }
}

@connect(({ TaskProjectModel }) => ({ ...TaskProjectModel }))
@Form.create()
@validateFieldsAndScroll
export default class DbPopWindow extends React.Component {
  componentDidMount() {
    this.props.onRef(this)
  }

  componentDidUpdate(prevProps) {
    const { data } = this.props
    if (data.id && data.id !== prevProps.data.id) {
      this.getSchemaList(data)
    }
  }

  handleSubmit = async () => {
    const { data, projectId } = this.props
    const values = await this.validateFieldsAndScroll()
    if (!values) {
      return
    }
    if (data.id) {
      values.id = data.id
    }
    this.props.dispatch({
      type: 'TaskProjectModel/createAndUseDB',
      payload: { projectId, values },
      callback: () => this.props.form.resetFields()
    })
  }

  getSchemaList = params => {
    this.props.dispatch({
      type: 'TaskProjectModel/getSchemaList',
      payload: params
    })
  }

  getFormComponent = ({ component, params, options, extraAttrs }, extraParam) => {
    const { TextArea } = Input
    const { Option } = Select
    if (extraAttrs && extraParam) {
      extraAttrs.map(({ key, attr }) => {
        if (extraParam[key]) params[attr] = extraParam[key]
      })
    }
    switch (component) {
      case 'select':
        return (
          <Select {...params}>
            {options instanceof Array &&
              options.map(({ key, value, title }) => (
                <Option key={key} value={value}>
                  {title}
                </Option>
              ))}
          </Select>
        )
      case 'password':
        return <Input type='password' {...params} />
      case 'inputNumber':
        return <InputNumber {...params} />
      case 'text':
        return <TextArea {...params} rows='4' style={{ resize: 'none' }} />
      case 'redio':
        return (
          <Radio.Group>
            {options instanceof Array &&
              options.map(({ key, value, title }) => (
                <Radio key={key} value={value}>
                  {title}
                </Radio>
              ))}
          </Radio.Group>
        )
      default:
        return <Input {...params} />
    }
  }

  render() {
    const { getFieldDecorator } = this.props.form
    const { data, schemaList } = this.props
    const { attrs = [] } = dataTypes.find(({ name }) => name === data.dbType)
    const extraParam = {
      schemaFocusFunc: async () => {
        const values = await this.validateFieldsAndScroll()
        if (!_.isEmpty(values)) {
          getSchemaList(values)
        }
      },
      schemaList: schemaList.map((p, i) => ({ key: `schema-${i}`, value: p, title: p }))
    }

    return (
      <div>
        <Form layout='horizontal'>
          {attrs.map(item => {
            return (
              <Form.Item {...formItemLayout} help={item.help} label={item.label} key={item.name}>
                {getFieldDecorator(item.name, {
                  ...item,
                  initialValue: _.get(data, item.name)
                })(this.getFormComponent(item, extraParam))}
              </Form.Item>
            )
          })}
        </Form>
      </div>
    )
  }
}
