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
import { validateFields } from '../../../common/decorators'
import { EditableCell } from '../../Common/editable-table'
import Fetch from '../../../common/fetch-final'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import { connect } from 'react-redux'
import dataCollectModel, { namespace } from '../store/data-collect-model'
import FieldSetList from './field-set-list.jsx'

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

  changeState = payload => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload
    })
  }

  componentDidUpdate(prevProps, prevState) {
    const { loadDataField } = this.state
    if ((loadDataField && loadDataField !== prevState.loadDataField)) {
      this.setState({ dataFields: _.get(this.props.content, 'cleaner.converterList', []), loading: false })
    }
  }

  componentDidMount() {
    let { content = {} } = this.props
    setTimeout(() => { this.changeState({ validForm: { ...this.props.validForm, [content.id]: this.props.form } }) }, 1)
    //if (content.toDataSource) {
    setTimeout(() => this.setState({ loadDataField: true }), 500)
    //} else {
    //this.setState({ loadDataField: true })
    //}
  }

  componentWillUnmount() {
    let { validForm, content = {} } = this.props
    validForm = _.cloneDeep(validForm)
    this.setState({ loadDataField: false })
    this.changeState({ validForm: _.omit(validForm, content.id) })
  }

  render() {
    let { form, taskId = '', collectType, dataDbs = [], content = {} } = this.props
    let { getFieldDecorator, setFieldsValue, getFieldValue } = form
    const { dataTables, dataFields, loadDataField } = this.state
    const hasDbData = !!_.get(content, 'reader.dbId', '')
    const formCollectType = getFieldValue('collectType')
    return (<Card title="输入/输出配置" className="mg2t">
      <Form>
        <Row>
          <Col span={12}>
            <FormItem label="数据库连接" className="mg1b" hasFeedback {...formItemLayout3}>
              {getFieldDecorator('dbId', {
                rules: [{
                  required: true, message: '数据库连接必填!'
                }],
                initialValue: _.get(content, 'reader.dbId', '')
              })(
                <Select className="width200" disabled={hasDbData} onChange={this.getTablesInfo}>
                  {dataDbs.map(p => <Option key={`db-option-${p.id}`} value={p.id}>{p.dbAlais}</Option>)}
                </Select>
              )}
            </FormItem>
          </Col>
          <Col span={12}>
            <FormItem label="表名" className="mg1b" hasFeedback {...formItemLayout3}>
              {getFieldDecorator('datasource', {
                rules: [{
                  required: true, message: '表名必填!'
                }],
                initialValue: _.get(content, 'reader.datasource', '')
              })(
                <Select showSearch className="width200" disabled={hasDbData} onChange={this.getFieldsInfo}>
                  {dataTables.map(p => <Option key={`table-option-${p.tableName}`} value={p.tableName}>{p.tableName}</Option>)}
                </Select>
              )}
            </FormItem>
          </Col>
        </Row>
        <Row>
          <Col span={12}>
            <FormItem label="目标表名" className="mg1b" hasFeedback {...formItemLayout3}>
              {getFieldDecorator('toDataSource', {
                rules: [{
                  required: true, message: '目标表名必填!'
                },
                hasDbData ? null : {
                  pattern: /^stg_[a-zA-Z0-9\_]+$/,
                  message: '目标表名必须以stg_开头并以字母数字组合'
                }, {
                  max: 50, message: '1~50个字符!'
                }].filter(_.identity),
                initialValue: _.get(content, 'toDataSource', '')
              })(
                <Input className="width200" disabled={hasDbData} />
              )}
            </FormItem>

          </Col>
          <Col span={12}>
            <FormItem label="采集方式" className="mg1b" hasFeedback {...formItemLayout3}>
              {getFieldDecorator('collectType', {
                initialValue: collectType
              })(
                <Select className="width200" onChange={v => {
                  // todo edit collectType
                  setFieldsValue({ increaseCollectColumn: '', collectType: v })
                }}
                >
                  <Option value="full">全量采集</Option>
                  <Option value="incremental">增量采集</Option>
                </Select>)}
            </FormItem>
            {
              formCollectType !== 'full'
                ? <FormItem className="mg1b date-cellect-col width200" hasFeedback>
                  {getFieldDecorator('column', {
                    rules: [{
                      required: true, message: '日期字段名称必填!'
                    }, {
                      pattern: /^[a-zA-Z0-9\_]+$/,
                      message: '输入无效,包含非法字符'
                    }, {
                      max: 32, message: '1~32个字符!'
                    }],
                    initialValue: _.get(content, 'reader.offsetSpec.column', '')
                  })(
                    <Select className="width200" placeholder="日期字段名称" >
                      {
                        dataFields.map(p => <Option value={p.sourceCol}>{p.sourceCol}</Option>)
                      }
                    </Select>
                  )}
                </FormItem>
                : null
            }
          </Col>
        </Row>
        {
          !taskId
            ? null
            : <div className="alignright mg1b async-table-btn"><Button onClick={() => this.getFieldsInfo()}>同步表</Button></div>
        }
        <FormItem label="字段" className="mg1b"  {...formItemLayout} wrapperCol={{ span: 21 }}>
          {getFieldDecorator('columnInfo', {
            initialValue: dataFields || []
          })(
            <FieldSetList loading={!loadDataField} />
          )}
        </FormItem>
        <FormItem label="sql条件查询过滤语句" className="mg1b"  {...formItemLayout3}>
          {getFieldDecorator('filterSql', {
            initialValue:  _.get(content, 'reader.filterSql', '')
          })(
            <Input/>
          )}
        </FormItem>
      </Form>
    </Card>)
  }


  getTablesInfo = async (dbId) => {
    let res = await Fetch.get(`/app/new-task-schedule/dataBase?dataType=tableInfo&dbId=${dbId}&update=true`)
    if (res && res.status && res.status === 'success') {
      this.setState({ dataTables: res.tableList })
    } else {
      message.error('获取数据库表信息失败!')
    }
  }

  getFieldsInfo = async (tableName) => {
    const { fileContent, form } = this.props
    const { getFieldValue } = form
    let name = tableName || getFieldValue('datasource')
    const dbId = getFieldValue('dbId')
    if (!name) {
      message.error('请选择数据源表名！')
      return
    }

    let res = await Fetch.get(`/app/new-task-schedule/dataBase?dataType=columnInfo&tableName=${name}&dbId=${dbId}&update=true`)
    if (res && res.status && res.status === 'success') {
      const columnInfo = _.get(fileContent, 'cleaner.converterList', [])
      let columnList = res.columnList.map(p => ({
        finalCol: p.name,
        finalType: 'string',
        finalComment: p.comment,
        sourceCol: p.name,
        sourceType: p.type,
        sourceComment: p.comment
      }))
      const oldNames = columnInfo.map(p => p.finalCol)
      const newNames = columnList.map(p => p.finalCol)
      let fields = []
      _.forEach(_.concat(columnInfo, columnList).map(p => {
        const index = fields.findIndex(d => d.finalCol === p.finalCol)
        if (index < 0) {
          const status = _.includes(oldNames, p.finalCol) && _.includes(newNames, p.finalCol)
            ? 0 : (_.includes(oldNames, p.finalCol) ? -1 : 1)
          fields.push({ ...p, status })
        }
      }))
      this.setState({ dataFields: fields })
    } else {
      message.error('获取数据库表信息失败!')
    }
  }
}
