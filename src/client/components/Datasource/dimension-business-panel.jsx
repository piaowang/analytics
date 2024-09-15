import React from 'react'
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Select, message, Input, InputNumber, Tooltip } from 'antd';
import _ from 'lodash'
import Fetch from '../../common/fetch-final'
import { enableSelectSearch } from '../../common/antd-freq-use-props'

const FormItem = Form.Item
const { Option } = Select

/**
 * 业务表维度
 *
 * @export
 * @class DimensionBusinessItem
 * @extends {React.PureComponent}
 */
export default class DimensionBusinessItem extends React.PureComponent {

  static defaultProps = {
    dimension: {
      params: {}
    }
  }

  state = {
    tables: [],
    fields: [],
    loddingTable: false,
    loddingFields: false
  }

  componentWillMount() {
    this.getTables()
  }

  tableSelectChange = (id) => {
    this.getFields(id)
  }

  validateDataType = (rule, defaultVal, callback = () => null) => {
    let {dimension: { params }} = this.props
    if (_.isEmpty(defaultVal)) {
      return callback()
    }
    // let isString = _.get(params, 'table_field_type', 'varchar').indexOf('varchar') === 0
    if (defaultVal === '') {
      return callback('请填写默认值')
    }
    // if (!isString && _.isNaN(_.toNumber(defaultVal))) {
    //   return callback('该字段数据为数值类型')
    // }
    return callback()
  }

  getTables = async () => {
    let { project, dimension: { params }, updateDimensionParams } = this.props
    this.setState({ loddingTable: true })
    let res = await Fetch.post('/app/businessdbsetting/list', {})
    if (res.success) {
      let tables = res.result.filter(p => p.project_id === project.id && p.state)
      this.setState({ loddingTable: false, tables })
      if (params.table_id) {
        this.getFields(params.table_id)
      }
    } else {
      message.error('获取业务表信息失败')
      this.setState({ loddingTable: false })
    }
  }

  getFields = async (id) => {
    let { tables } = this.state
    let info = tables.find(p => p.id === id)
    if (!info) {
      message.error('业务表信息不存在')
    }
    this.setState({ loddingFields: true })
    let res = await Fetch.post('/app/businessdbsetting/test', { ...info, encrypted: true })
    if (res.success) {
      this.setState({ loddingFields: false, fields: res.result.filter(p => info.db_key !== p.field_name) })
    } else {
      message.error('获取业务表字段失败')
      this.setState({ loddingFields: false })
    }
  }

  render() {
    let { formItemLayout, getFieldDecorator, dimension: { params }, updateDimensionParams, disabled } = this.props
    const { tables, fields, loddingTable, loddingFields } = this.state
    params = { ...params }
    if (!params.row_limit) params.row_limit = 10000
    if (!params.load_period) params.load_period = 4
    return (
      <div className="formula">
        <FormItem {...formItemLayout} label="业务表名称">
          {
            getFieldDecorator(
              'params.table_id',
              {
                initialValue: params.table_id
              })(
              <Select
                {...enableSelectSearch}
                disabled={disabled}
                placeholder="请选择"
                validateStatus={loddingTable ? 'validateStatus' : ''}
                showSearch
                filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                onChange={val => {
                  let dbinfo = tables.find(p => p.id === val)
                  this.tableSelectChange(val)
                  updateDimensionParams({
                    ...params,
                    type: 'business',
                    table_id: val,
                    dimension: dbinfo.dimension,
                    table_field: '',
                    table_field_default_value: '',
                    table_field_type: ''
                  })
                  this.props.form.setFieldsValue({ 'params.table_field': '' })
                }}
              >
                {tables.map(op => {
                  return (
                    <Option value={op.id} key={op.id}>{op.table_title}</Option>
                  )
                })}
              </Select>
            )
          }
        </FormItem>
        <FormItem {...formItemLayout} label="业务表字段">
          {
            getFieldDecorator(
              'params.table_field',
              {
                rules: [
                  {
                    required: true,
                    message: '请选择业务表字段'
                  }
                ],
                initialValue: params.table_field
              })(
              <Select
                {...enableSelectSearch}
                disabled={disabled}
                placeholder="请选择"
                validateStatus={loddingFields ? 'validateStatus' : ''}
                showSearch
                filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                onChange={val => {
                  let fieldType = _.find(fields, p => p.field_name === val)
                  // let isString = _.get(fieldType, 'field_type', 'varchar').indexOf('varchar') === 0
                  updateDimensionParams({
                    ...params,
                    table_field: val,
                    table_field_type: fieldType.field_type,
                    table_field_default_value: 'NULL',
                    table_field_miss_value: '未匹配'
                  })
                }}
              >
                {fields.map(op => {
                  return (
                    <Option value={op.field_name} key={op.field_name}>{op.field_name}</Option>
                  )
                })}
              </Select>
            )
          }
        </FormItem>
        <FormItem
          {...formItemLayout}
          label={
            <span>
              同步数据周期
              <Tooltip
                placement="topLeft"
                title={
                  <div>
                    <p>同步业务表数据到服务器的时间周期</p>
                  </div>
                }
              >
                <QuestionCircleOutlined />
              </Tooltip>
            </span>
          }
        >
          {
            getFieldDecorator(
              'params.load_period',
              {
                initialValue: params.load_period
              })(
              <InputNumber
                min={1}
                max={24}
                onChange={val => {
                  updateDimensionParams({
                    ...params,
                    load_period: val
                  })
                }}
              />
            )
          }小时
        </FormItem>
        <FormItem
          {...formItemLayout}
          label={
            <span>
              最大记录数
              <Tooltip
                placement="topLeft"
                title={
                  <div>
                    <p>关联业务表最大记录数</p>
                  </div>
                }
              >
                <QuestionCircleOutlined />
              </Tooltip>
            </span>
          }
        >
          {
            getFieldDecorator(
              'params.row_limit',
              {
                initialValue: params.row_limit
              })(
              <InputNumber
                min={1}
                max={window.sugo.rowLimit}
                onChange={val => {
                  updateDimensionParams({
                    ...params,
                    row_limit: val
                  })
                }}
              />
            )
          }
        </FormItem>
        <FormItem
          {...formItemLayout}
          label={
            <span>
              NULL值填充
              <Tooltip
                placement="topLeft"
                title={
                  <div>
                    <p>业务表维度NULL值时默认显示值</p>
                  </div>
                }
              >
                <QuestionCircleOutlined />
              </Tooltip>
            </span>
          }
        >
          {

            getFieldDecorator(
              'params.table_field_default_value',
              {
                rules: [
                  { required: true, message: '请填写NULL值填充' },
                  { validator: this.validateDataType, validateTrigger: 'onBlur' }
                ],
                initialValue: params.table_field_default_value
              })(
              <Input
                onChange={val => {
                  updateDimensionParams({
                    ...params,
                    table_field_default_value: val.target.value
                  })
                }}
              />)
          }
        </FormItem>
        <FormItem
          {...formItemLayout}
          label={
            <span>
              未匹配填充
              <Tooltip
                placement="topLeft"
                title={
                  <div>
                    <p>业务表未匹配到数据默认显示值</p>
                  </div>
                }
              >
                <QuestionCircleOutlined />
              </Tooltip>
            </span>
          }
        >
          {

            getFieldDecorator(
              'params.table_field_miss_value',
              {
                rules: [
                  { required: true, message: '请填写未匹配填充' }
                ],
                initialValue: params.table_field_miss_value
              })(
              <Input
                onChange={val => {
                  updateDimensionParams({
                    ...params,
                    table_field_miss_value: val.target.value
                  })
                }}
              />)
          }
        </FormItem>
      </div>
    );
  }
}
