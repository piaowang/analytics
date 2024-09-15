import * as React from 'react'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Select, Input, Upload, Checkbox, Radio, message, Tooltip } from 'antd'
import _ from 'lodash'

import FieldSetting from './fields-setting'

const FormItem = Form.Item
const { Option } = Select
const { TextArea } = Input
const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 16 }
}

class ImmediateTaskConfig extends React.Component {
  state = {
    type: '' // 选择的数据源类型
  }

  componentDidMount() {
    this.props.onRef(this)
  }

  componentWillUpdate(prevProps) {
    const { id } = this.props
    // 选中节点切换 清空表单信息
    if (id !== prevProps.id) {
      this.props.form.resetFields()
    }
  }

  // 切换类型
  onChaOption = type => {
    this.setState({ type })
  }

  // 导出数据
  exportData = () => {
    const { form } = this.props
    let data
    form.validateFields((error, value) => {
      if (!_.isEmpty(error)) {
        data = {}
      }
      const { dbType, dbAlais, ...dbContent } = value
      data = {
        dbType,
        dbAlais,
        dbContent
      }
      // form.resetFields()
    })
    return data
  }

  renderEle(common) {
    const {
      dataInfo,
      dataSourceList,
      id,
      form: { getFieldDecorator }
    } = this.props

    // const draggerProps = {
    //   name: 'file',
    //   // showUploadList: false,
    //   // beforeUpload: this.beforeUpload,
    //   action: 'https://www.mocky.io/v2/5cc8019d300000980a055e76',
    //   onChange(info) {
    //     const { status } = info.file
    //     if (status !== 'uploading') {
    //       // console.log(info.file, info.fileList)
    //     }
    //     if (status === 'done') {
    //       message.success(`${info.file.name} 上传成功.`)
    //     } else if (status === 'error') {
    //       message.error(`${info.file.name} 上传失败.`)
    //     }
    //   }
    // }

    // if(_.get(common, 'type', 'noType') === 'upload') {
    //   return  <FormItem key={common.value}>
    //   <Upload.Dragger {...draggerProps}>
    //     <p className='ant-upload-drag-icon pd3t'>
    //       <InboxOutlined />
    //     </p>
    //     <p className='ant-upload-text pd3b pd2t'>
    //       点击或者拖拽文件到这个区域上传
    //     </p>
    //   </Upload.Dragger>
    // </FormItem>
    // }

    const options = _.get(common, 'option', [])

    let control = null

    let defaultValue = ''
    switch (_.get(common, 'type', 'noType')) {
      case 'input':
        control = <Input placeholder={common.tips} />
        break
      case 'select':
        control = (
          <Select style={{ width: 120 }}>
            {_.get(common, 'option', []).map(item => {
              return (
                <Option value={item.value} key={item.value}>
                  {item.label}
                </Option>
              )
            })}
          </Select>
        )
        break
      case 'password':
        control = <Input.Password placeholder={common.tips} />
        break
      case 'checkbox':
        control = <Checkbox.Group options={options} />
        break
      case 'radio':
        control = (
          <Radio.Group>
            {_.get(common, 'option', []).map(item => {
              return (
                <Radio value={item.value} key={item.value}>
                  {item.name}
                </Radio>
              )
            })}
          </Radio.Group>
        )
        break
      case 'textarea':
        control = <TextArea rows={4} placeholder={common.tips} />
        break
      case 'api':
        defaultValue = _.get(dataSourceList, '0.value', '')
        control = (
          <Select style={{ width: 200 }} onChange={this.onChaOption}>
            {(dataSourceList || []).map(item => {
              return (
                <Option value={item.id.toString()} key={item.id}>
                  {item.dbAlais}
                </Option>
              )
            })}
          </Select>
        )
        break
      case 'flinkSqlAddField':
        defaultValue = []
        control = <FieldSetting config={common} id={id} />
        break
      default:
        break
    }

    let rules = []
    if (common?.necessary === '1') {
      rules.push([
        {
          required: true,
          message: `${common?.label}必填`
        }
      ])
    }

    let label = common.label
    if (common?.remark) {
      label = (
        <span>
          {common.label}
          <Tooltip title={common?.remark}>
            <QuestionCircleOutlined className='mg1' />
          </Tooltip>
        </span>
      )
    }

    return (
      <FormItem key={common.value} {...formItemLayout} label={label} help={common.help}>
        {getFieldDecorator(common.value, {
          rules,
          initialValue: _.get(dataInfo, common.value) || defaultValue
        })(control)}
      </FormItem>
    )
  }

  render() {
    const { typeList, id } = this.props
    // 节点字段信息直接返回为空
    if (!typeList?.length) {
      return null
    }
    return (
      <React.Fragment>
        <div className='mg2l'>
          <Form key={`${id}_form`} className='font-14' name='data-model' labelAlign='left'>
            {(typeList || []).map(item => {
              return this.renderEle(item)
            })}
          </Form>
        </div>
      </React.Fragment>
    )
  }
}

export default Form.create()(ImmediateTaskConfig)
