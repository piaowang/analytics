import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Modal, Button, Input, Radio, Row, Select, Spin, InputNumber } from 'antd'
import React from 'react'
import { connect } from 'react-redux'
import _ from 'lodash'
import { validateFieldsAndScroll } from '../../../common/decorators'
import dbTypes, { DATASOURCE_TYPE, CONNECTION_TOOLTIP } from './db-connect-manager'
import { namespace } from './db-connect-model'

const formItemLayout = {
  labelCol: { span: 5 },
  wrapperCol: { span: 17 }
}

const getFormComponent = ({ component, params, options, extraAttrs }, extraParam) => {
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

@connect(
  state => ({ data: state[namespace].data }),
  dispatch => ({
    changeDbType: dbType =>
      dispatch({
        type: `${namespace}/changeDbType`,
        dbType
      }),
    getSchemaList: payload => {
      dispatch({
        type: `${namespace}/getSchemaList`,
        payload
      })
    },
    saveDataSource: (payload, callback) => {
      dispatch({
        type: `${namespace}/save`,
        payload,
        callback
      })
    }
  })
)
@Form.create({
  onValuesChange: ({ changeDbType }, { dbType }) => {
    if (dbType) {
      changeDbType(dbType)
    }
  }
})
@validateFieldsAndScroll
export default class DbPopWindow extends React.Component {
  // componentDidUpdate(prevProps) {
  //   const { data, getSchemaList } = this.props
  //   if (data.id && data.id !== prevProps.data.id && ['redis', 'kafka', 'hdfs'].some(item => item !== data.dbType)) {
  //     getSchemaList(data)
  //   }
  // }

  handleSubmit = async () => {
    const { data, saveDataSource } = this.props
    const values = await this.validateFieldsAndScroll()
    if (!values) return
    if (data.id) {
      values.id = data.id
      values.createUser = window.sugo.user.id
    }
    saveDataSource(values, result => {
      if (result) {
        this.props.form.resetFields()
        this.props.handleCancel()
      }
    })
  }

  handelCancel = () => {
    const { handleCancel } = this.props
    this.props.form.resetFields()
    handleCancel()
  }

  handelTestConnect = async () => {
    const values = await this.validateFieldsAndScroll()
    if (!values) {
      return
    }
    this.props.onTestConnect(values)
  }
  // TODO：待完善此方法接口
  handelTestSyncPermission = async () => {
    const values = await this.validateFieldsAndScroll()
    if (!values) {
      return
    }
    this.props.onTestSyncPermission(values)
  }

  render() {
    const { getFieldDecorator } = this.props.form
    const { visible, data, schemaList, getSchemaList } = this.props
    const { attrs = [] } = dbTypes.find(({ name }) => name === data.dbType)
    let title = data.id != null ? '编辑数据库连接' : '创建数据库连接'
    const extraParam = {
      schemaFocusFunc: async () => {
        const values = await this.validateFieldsAndScroll()
        if (!_.isEmpty(values)) {
          getSchemaList(values)
        }
      },
      schemaList: schemaList.map((p, i) => ({ key: `schema-${i}`, value: p, title: p }))
    }
    const footer = (
      <div>
        <div className='width-50 iblock pd2x alignleft'>
          {data.dbType === DATASOURCE_TYPE.hive ||
          data.dbType === DATASOURCE_TYPE.mysql ||
          data.dbType === DATASOURCE_TYPE.oracle ||
          data.dbType === DATASOURCE_TYPE.sqlserver ||
          data.dbType === DATASOURCE_TYPE.db2 ||
          data.dbType === DATASOURCE_TYPE.hana ||
          data.dbType === DATASOURCE_TYPE.kudu ||
          data.dbType === DATASOURCE_TYPE.starrocks ||
          data.dbType === DATASOURCE_TYPE.postgresql ? (
            <Button className='mg1r' onClick={this.handelTestConnect}>
              测试连接
            </Button>
          ) : null}
          {data.dbType === DATASOURCE_TYPE.mysql ||
          data.dbType === DATASOURCE_TYPE.oracle ||
          data.dbType === DATASOURCE_TYPE.sqlserver ||
          data.dbType === DATASOURCE_TYPE.db2 ||
          data.dbType === DATASOURCE_TYPE.postgresql ? (
            <Button className='mg1r' onClick={this.handelTestSyncPermission}>
              实时同步权限检测
            </Button>
          ) : null}
        </div>
        <div className='width-50 iblock pd2x'>
          <Button className='mg1r' onClick={this.handelCancel}>
            取消
          </Button>
          <Button className='mg1r' type='primary' onClick={this.handleSubmit}>
            确定
          </Button>
        </div>
      </div>
    )
    return (
      <div>
        <Modal maskClosable={false} title={title} visible={visible} footer={footer} onCancel={this.handelCancel} width={700}>
          <Form layout='horizontal'>
            {attrs.map(item => {
              const help = item.name === 'connectUrl' ? `例如: ${_.get(CONNECTION_TOOLTIP, data.dbType, '')}` : item?.help
              return (
                <Form.Item {...formItemLayout} label={item.label} key={item.name} help={help}>
                  {getFieldDecorator(item.name, {
                    ...item,
                    initialValue: _.get(data, item.name)
                  })(getFormComponent(item, extraParam, data.dbType))}
                </Form.Item>
              )
            })}
          </Form>
        </Modal>
      </div>
    )
  }
}
