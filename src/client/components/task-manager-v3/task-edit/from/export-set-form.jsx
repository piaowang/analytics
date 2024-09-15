import React, { Component } from 'react'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import {
  Table,
  Button,
  Card,
  Input,
  Select,
  Row,
  Col,
  Divider,
  Tooltip,
  message,
  Tabs,
} from 'antd';
import Fetch from '../../../../common/fetch-final'
import { connect } from 'react-redux'
import { namespace } from '../model'
import FieldSetList from './field-set-list.jsx'
import _ from 'lodash'

const FormItem = Form.Item
const Option = Select.Option
const formItemLayout = {
  labelCol: { span: 2 },
  wrapperCol: { span: 20 }
}
const formItemLayout3 = {
  labelCol: { span: 4 },
  wrapperCol: { span: 18 }
}

@Form.create()
@connect(props => props[namespace])
export default class SetForm extends Component {

  state = {
    dataFields: [],
    dataTables: [],
    loadDataField: false
  }

  changeState = ({ validForm }) => {
    this.props.changeForm(validForm)
  }

  componentDidUpdate(prevProps, prevState) {
    const { loadDataField } = this.state
    if ((loadDataField && loadDataField !== prevState.loadDataField)) {
      this.setState({ dataFields: _.get(this.props.content, 'columnInfo', []), loading: false })
    }
  }

  componentDidMount() {
    let { content = {} } = this.props
    setTimeout(() => { this.changeState({ validForm: { ...this.props.validForm, [content.id]: this.props.form } }) }, 1)
    setTimeout(() => this.setState({ loadDataField: true }), 500)
  }

  componentWillUnmount() {
    let { validForm, content = {} } = this.props
    validForm = _.cloneDeep(validForm)
    this.setState({ loadDataField: false })
    this.changeState({ validForm: _.omit(validForm, content.id) })
  }

  render() {
    let { form, dataDbs = [], content = {}, changeParentStatus, disabled, hiveDbInfo, isExport } = this.props
    let { getFieldDecorator, setFieldsValue, getFieldValue } = form
    const { dataTables, dataFields, loadDataField } = this.state
    const hasDbData = !!_.get(content, 'reader.dbId', '')
    return (<Card title="输入/输出配置" className="mg2t">
      <Form>
        <Row>
          <Col span={12}>
            <FormItem label="输入库名" className="mg1b" hasFeedback {...formItemLayout3}>
              {getFieldDecorator('hiveDbName', {
                rules: [{
                  required: true, message: '数据库连接必填!'
                }],
                initialValue: _.get(content, 'hiveDbName', '')
              })(
                <Select className="width200" disabled={disabled} >
                  {hiveDbInfo.map(p => <Option key={`db-option-${p}`} value={p}>{p}</Option>)}
                </Select>
              )}
            </FormItem>
          </Col>
          <Col span={12}>
            <FormItem label="输出库名" className="mg1b" hasFeedback {...formItemLayout3}>
              {getFieldDecorator('dbId', {
                rules: [{
                  required: true, message: '数据库连接必填!'
                }],
                initialValue: _.get(content, 'dbId', '')
              })(
                <Select className="width200" disabled={hasDbData || disabled} onChange={this.getTablesInfo}>
                  {dataDbs.map(p => <Option key={`db-option2-${p.id}`} value={p.id}>{p.dbAlais}</Option>)}
                </Select>
              )}
            </FormItem>
          </Col>
        </Row>
        <Row>
          <Col span={12}>
            <FormItem label="输入表名" className="mg1b" hasFeedback {...formItemLayout3}>
              {getFieldDecorator('hiveTableName', {
                rules: [{
                  required: true, message: '目标表名必填!'
                },
                hasDbData ? null : {
                  pattern: /^[a-zA-Z0-9\_]+$/,
                  message: '目标表名必须以stg_开头并以字母数字组合'
                }, {
                  max: 50, message: '1~50个字符!'
                }].filter(_.identity),
                initialValue: _.get(content, 'hiveTableName', '')
              })(
                <Input.Search className="width200" disabled={disabled} onSearch={this.getFieldsInfo} /> // 
              )}
            </FormItem>
          </Col>
          <Col span={12}>
            <FormItem label="输出表名" className="mg1b" hasFeedback {...formItemLayout3}>
              {getFieldDecorator('tableName', {
                rules: [{
                  required: true, message: '表名必填!'
                }],
                initialValue: _.get(content, 'tableName', '')
              })(
                <Select showSearch className="width200" disabled={hasDbData || disabled} >
                  {dataTables.map(p => <Option key={`table-option2-${p.tableName}`} value={p.tableName}>{p.tableName}</Option>)}
                </Select>
              )}
            </FormItem>
          </Col>
        </Row>
        <FormItem label="字段" className="mg1b"  {...formItemLayout} wrapperCol={{ span: 21 }}>
          {getFieldDecorator('columnInfo', {
            initialValue: dataFields || []
          })(
            <FieldSetList disabled={disabled} changeParentStatus={changeParentStatus} loading={!loadDataField} isExport={isExport} />
          )}
        </FormItem>
      </Form>
    </Card>)
  }


  getTablesInfo = async (dbId) => {
    let res = await Fetch.get(`/app/new-task-schedule/dataBase?dataType=tableInfo&dbId=${dbId}&update=true`)
    if (res && res.status && res.status === 'success') {
      this.setState({ dataTables: _.get(res, 'tableList', []) || [] })
    } else {
      message.error('获取数据库表信息失败!')
    }
  }

  getFieldsInfo = async (value) => {
    const { content, form, changeParentStatus } = this.props
    const { getFieldValue } = form
    let name = value
    const dbId = getFieldValue('hiveDbName')
    if (!name) {
      message.error('请选择数据源表名！')
      return
    }
    let res = await Fetch.get(`/app/hive/${dbId}/${name}/schema`)
    if (res && res.result) {
      const columnInfo = _.get(content, 'columnInfo', [])
      let columnList = res.result.schema.map(p => ({
        sourceCol: p.name,
        sourceType: p.type,
        sourceComment: p.comment
      }))
      const oldNames = columnInfo.map(p => p.sourceCol)
      const newNames = columnList.map(p => p.sourceCol)
      let fields = []
      _.forEach(_.concat(columnInfo, columnList).map(p => {
        const index = fields.findIndex(d => d.sourceCol === p.sourceCol)
        if (index < 0) {
          const status = _.includes(oldNames, p.sourceCol) && _.includes(newNames, p.sourceCol)
            ? 0 : (_.includes(oldNames, p.sourceCol) ? -1 : 1)
          fields.push({ ...p, status })
        }
      }))
      this.setState({ dataFields: fields })
      changeParentStatus && changeParentStatus()
    } else {
      message.error('获取数据库表信息失败!')
    }
  }
}
