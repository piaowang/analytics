import React, { Component } from 'react'
import _ from 'lodash'
import { connect } from 'react-redux'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { QuestionCircleOutlined, UpOutlined, DownOutlined, SyncOutlined } from '@ant-design/icons'
import { Button, Card, Input, Select, Row, Col, Tooltip, message } from 'antd'

import Fetch from '../../../../common/fetch-final'
import { namespace } from '../../saga-models/task-project'
import FieldSetList from './field-set-list.jsx'
import { getDataFieldsList, getDataTableList } from '../services'
import { HIVE_DATATYPES_MAPS } from '../../constants'

const FormItem = Form.Item
const Option = Select.Option
const formItemLayout = {
  labelCol: { span: 3 },
  wrapperCol: { span: 20 }
}
const formItemLayout2 = {
  labelCol: { span: 0 },
  wrapperCol: { span: 24 }
}
const formItemLayout3 = {
  labelCol: { span: 6 },
  wrapperCol: { span: 16 }
}

@Form.create()
@connect(props => props[namespace])
export default class SetForm extends Component {
  state = {
    dataTables: [], // 源表
    dataFields: [], // 输入配置 - 字段
    targetDataTables: [], // 目标表
    targetDataFields: [], // 输出配置 - 字段
    mergeFields: [], // 合并输入、输出配置字段：增量字段、表格字段信息
    loadDataField: false, // 输出配置 - 字段表格 - loading
    isHideExtra: true, // 是否隐藏高级配置
    columnFamily: [], // 列族
    targetDataType: ''
  }

  changeState = ({ validForm }) => {
    this.props.changeForm(validForm)
  }

  componentDidUpdate(prevProps, prevState) {
    const { loadDataField } = this.state
    const { content = {}, disabled } = this.props
    if (loadDataField && loadDataField !== prevState.loadDataField) {
      const converterList = _.get(content, 'cleaner.converterList', [])
      const filterSql = _.get(content, 'reader.filterSql')

      const extraType = ['output_sync_time', 'hbase_output_sync_time', 'output_serial_number', 'hbase_output_serial_number']
      const filterCList = _.filter(converterList, item => !_.includes(extraType, item.type))
      this.setState(
        {
          dataFields: _.map(filterCList, item => ({
            name: item.sourceCol,
            type: item.sourceType,
            comment: item.sourceComment
          })),
          mergeFields: filterCList,
          isHideExtra: !filterSql && converterList.length === filterCList.length
        },
        () => {
          const toDataSource = _.get(content, 'writer.toDataSource')
          toDataSource && this.getFieldsInfo(toDataSource, 'target', false)
        }
      )
    }
  }

  componentDidMount() {
    let { content = {} } = this.props
    setTimeout(() => {
      this.changeState({
        validForm: { ...this.props.validForm, [content.id]: this.props.form }
      })
    }, 1)
    setTimeout(() => this.setState({ loadDataField: true }), 500)
  }

  componentWillUnmount() {
    let { validForm, content = {} } = this.props
    validForm = _.cloneDeep(validForm)
    this.setState({ loadDataField: false })
    this.changeState({ validForm: _.omit(validForm, content.id) })
  }

  /**
   * 获取表数据
   * @param {*} dbId 已选择的数据库id
   * @param {*} type 类型：空->源数据 target->目标数据
   */
  getTablesInfo = async (dbId, type) => {
    const { dataDbs } = this.props
    const { setFieldsValue } = this.props.form
    if (type === 'target') {
      setFieldsValue({ toDataSource: undefined })
      this.setState({ targetDataTables: [], targetDataFields: [] }, () => {
        this.renderMergeFields()
      })
    } else {
      const dbType = _.find(dataDbs, db => db.id === dbId)?.dbType
      setFieldsValue({ datasource: undefined })
      this.setState({ dataTables: [], dataFields: [], dataType: dbType }, () => {
        this.renderMergeFields()
      })
    }
    let res = await getDataTableList(dbId)
    if (_.get(res, 'status') !== 'success') {
      message.error('获取数据库表信息失败!')
      return
    }
    let dataTables = res?.result?.table || []
    // if (dbType === DATASOURCE_TYPE.oracle) {
    //   dataTables = _(res?.result?.schema).values().flatten().value()
    // } else if (dbType === DATASOURCE_TYPE.mysql) {
    //   dataTables = _(res?.result?.database).values().flatten().value()
    // } else if (dbType === DATASOURCE_TYPE.hana || dbType === DATASOURCE_TYPE.hbase) {
    //   dataTables = _(res?.result?.namespace).values().flatten().value()
    // } else if (dbType === DATASOURCE_TYPE.kudu) {
    //   dataTables = res?.result?.table
    // }
    if (type === 'target') {
      this.resetExtraFields()
      this.setState({ targetDataTables: dataTables })
      return
    }
    this.setState({ dataTables })
  }

  hiveChangeTable = _.throttle(tableName => {
    this.getFieldsInfo(tableName, 'target', true, true)
  }, 300)

  /**
   * 根据选中的数据表获取增量字段信息
   * @param {*string} tableName 已选择的数据表名
   * @param {*string} type 类型：空->源数据 target->目标数据
   * @param {*boolean} flashMergeTable true->刷新字段表格 false->不刷新
   */
  getFieldsInfo = async (tableName, type, flashMergeTable = true, isHive = false) => {
    const { form, changeParentStatus, dataDbs } = this.props
    const { dataType } = this.state
    const { getFieldValue } = form
    const dbId = getFieldValue('dbId')
    let thatObj = _.find(dataDbs, db => db.id === dbId) || {}
    if (type === 'target') {
      const toDataBase = getFieldValue('toDataBase')
      thatObj = _.find(dataDbs, db => db.id === toDataBase) || {}
      this.resetExtraFields()
    }
    const params = {
      dbInfoId: thatObj.id,
      type: thatObj.dbType,
      namespace: thatObj.dbAlais,
      table: tableName
    }
    const res = await getDataFieldsList(params)
    if (_.get(res, 'status') !== 'success') {
      return message.error(`获取字段信息失败 ${res.message}`)
    }
    let fieldState = 'dataFields'
    if (type === 'target') {
      fieldState = 'targetDataFields'
    }
    let resColumnList = _.get(res, 'data.columns', []).map(item => ({
      ...item,
      value: item.name
    }))

    if (isHive && !resColumnList.length) {
      const { dataFields } = this.state
      resColumnList = dataFields.map(p => {
        const keys = _.chain(HIVE_DATATYPES_MAPS).get(dataType, {}).keys().value()
        let eq = keys.find(key => key === _.toLower(p.type))
        if (!eq) {
          eq = keys.find(key => _.toLower(p.type).startsWith(key))
        }
        const val = _.get(HIVE_DATATYPES_MAPS, [dataType, eq], 'string')
        return { ...p, type: val }
      })
    }

    const rowKey = [{ name: 'RowKey', value: 'RowKey' }]
    const columnFamily = _.get(res, 'data.columnFamily', []).map(item => ({
      name: item.name,
      value: item.name
    }))
    this.setState(
      {
        [fieldState]: resColumnList,
        columnFamily: _.concat(rowKey, columnFamily)
      },
      () => {
        flashMergeTable && this.renderMergeFields()
      }
    )
  }

  /**
   * 渲染字段表格
   */
  renderMergeFields = () => {
    const { content, changeParentStatus, form, dataDbs } = this.props
    const { dataFields, targetDataFields } = this.state
    const toDataBase = form.getFieldValue('toDataBase')
    const thatObj = _.find(dataDbs, db => db.id === toDataBase) || {}
    const columnInfo = _.get(content, 'cleaner.converterList', [])
    const columnList = dataFields.map((p, i) => {
      const targetField = _.get(targetDataFields, `[${i}]`, {})
      const obj = {
        finalCol: targetField.name || '',
        finalType: targetField.type || '',
        finalComment: targetField.comment || '',
        sourceCol: p.name,
        sourceType: p.type,
        sourceComment: p.comment,
        type: 'col_map'
      }
      if (thatObj.dbType === 'hbase') {
        obj.finalCF = p.finalCF
        obj.finalCol = ''
        obj.finalType = ''
        obj.type = 'hbase_col_map'
      }
      return obj
    })
    const oldNames = columnInfo.map(p => p.sourceCol)
    const newNames = columnList.map(p => p.sourceCol)
    let fields = []
    _.forEach(
      _.concat(columnInfo, columnList).map(p => {
        const index = fields.findIndex(d => d.sourceCol === p.sourceCol)
        if (index < 0) {
          const status = _.includes(oldNames, p.sourceCol) && _.includes(newNames, p.sourceCol) ? 0 : _.includes(oldNames, p.sourceCol) ? -1 : 1
          fields.push({ ...p, status })
        }
      })
    )
    this.setState({ mergeFields: fields }, () => {
      form.setFieldsValue({ columnInfo: fields })
    })
    changeParentStatus && changeParentStatus()
  }

  resetExtraFields = () => {
    const { resetFields } = this.props.form
    resetFields(['output_sync_time_cf', 'hbase_output_sync_time', 'output_sync_time', 'output_serial_number_cf', 'hbase_output_serial_number', 'output_serial_number'])
  }

  /**
   * 展开或隐藏高级配置
   */
  handleExtraClick = () => {
    const { isHideExtra } = this.state
    this.setState({ isHideExtra: !isHideExtra })
  }

  handleChangeTargetDatasource = val => {
    let { dataDbs = [] } = this.props
    let { dataFields = [] } = this.state
    const dbInfo = dataDbs.find(p => p.id === val)
    // if (dbInfo.dbType !== 'hive') {
    this.getTablesInfo(val, 'target')
    this.setState({ targetDataType: dbInfo.dbType })
    //   return
    // }
    this.setState(
      {
        targetDataType: dbInfo.dbType,
        targetDataFields: dataFields.map(p => ({ ...p, type: 'string' }))
      },
      () => this.renderMergeFields()
    )
  }

  render() {
    let { form, taskId = '', dataDbs = [], content = {}, disabled, changeParentStatus } = this.props
    const converterList = _.get(content, 'cleaner.converterList', [])
    const { getFieldDecorator, setFieldsValue, getFieldValue } = form
    const { dataTables, targetDataTables, dataFields, targetDataFields, loadDataField, isHideExtra, columnFamily, mergeFields } = this.state
    const hasDbData = !!_.get(content, 'reader.dbId', '')
    const formCollectType = getFieldValue('collectType')
    const toDataBase = getFieldValue('toDataBase') // 目标库
    const toDataSource = getFieldValue('toDataSource') // 目标表
    const thatObj = _.find(dataDbs, db => db.id === toDataBase) || {}
    const isHBase = thatObj.dbType === 'hbase' && !!toDataSource
    return (
      <div className='overscroll-y always-display-scrollbar pd2' style={{ height: 'calc(100vh - 240px)' }}>
        <Card title='输入配置' className='mg2b'>
          <Form>
            <Row>
              <Col span={8}>
                <FormItem label='源数据库' hasFeedback {...formItemLayout3}>
                  {getFieldDecorator('dbId', {
                    rules: [
                      {
                        required: true,
                        message: '源数据库必填!'
                      }
                    ],
                    initialValue: _.get(content, 'reader.dbId')
                  })(
                    <Select disabled={hasDbData || disabled} onChange={val => this.getTablesInfo(val)} placeholder='请选择源数据库'>
                      {dataDbs.map(p => (
                        <Option key={`db-option-${p.id}`} value={p.id}>
                          {p.dbAlais}
                        </Option>
                      ))}
                    </Select>
                  )}
                </FormItem>
              </Col>
              <Col span={8}>
                <FormItem label='表名' hasFeedback {...formItemLayout3}>
                  {getFieldDecorator('datasource', {
                    rules: [
                      {
                        required: true,
                        message: '表名必填!'
                      }
                    ],
                    initialValue: _.get(content, 'reader.datasource')
                  })(
                    <Select showSearch disabled={hasDbData || disabled} onChange={this.getFieldsInfo} placeholder='请选择表名'>
                      {dataTables.map(p => (
                        <Option key={`table-option-${p}`} value={p}>
                          {p}
                        </Option>
                      ))}
                    </Select>
                  )}
                </FormItem>
              </Col>
              <Col span={8}>
                <FormItem label='采集方式' hasFeedback {...formItemLayout3}>
                  {getFieldDecorator('collectType', {
                    initialValue: _.get(content, 'reader.offsetSpec.column') ? 'incremental' : 'full'
                  })(
                    <Select
                      disabled={disabled}
                      onChange={v => {
                        setFieldsValue({ increaseCollectColumn: '' })
                      }}
                      placeholder='请选择采集方式'
                    >
                      <Option value='full'>全量采集</Option>
                      <Option value='incremental'>增量采集</Option>
                    </Select>
                  )}
                </FormItem>
              </Col>
              <Col span={8}>
                {formCollectType !== 'full' ? (
                  <FormItem label='增量字段' hasFeedback {...formItemLayout3}>
                    {getFieldDecorator('column', {
                      rules: [
                        {
                          required: true,
                          message: '增量字段名称必填!'
                        },
                        {
                          pattern: /^[a-zA-Z0-9_]+$/,
                          message: '输入无效,包含非法字符'
                        },
                        {
                          max: 32,
                          message: '1~32个字符!'
                        }
                      ],
                      initialValue: _.get(content, 'reader.offsetSpec.column')
                    })(
                      <Select disabled={disabled} placeholder='请选择增量字段'>
                        {mergeFields.map(p => (
                          <Option key={`df_${p.sourceCol}`} value={p.sourceCol}>
                            {p.sourceCol}
                          </Option>
                        ))}
                      </Select>
                    )}
                  </FormItem>
                ) : null}
              </Col>
            </Row>
          </Form>
        </Card>
        <Card title='输出配置'>
          <Form>
            <Row>
              <Col span={8}>
                <FormItem label='目标数据库' className='mg1b' hasFeedback {...formItemLayout3}>
                  {getFieldDecorator('toDataBase', {
                    rules: [
                      {
                        required: true,
                        message: '目标数据库必填!'
                      }
                    ],
                    initialValue: _.get(content, 'writer.dbId')
                  })(
                    <Select disabled={hasDbData || disabled} onChange={this.handleChangeTargetDatasource} placeholder='请选择目标数据库'>
                      {dataDbs.map(p => (
                        <Option key={`db-option-${p.id}`} value={p.id}>
                          {p.dbAlais}
                        </Option>
                      ))}
                    </Select>
                  )}
                </FormItem>
              </Col>
              <Col span={8}>
                <FormItem label='目标表名' hasFeedback {...formItemLayout3}>
                  {getFieldDecorator('toDataSource', {
                    rules: [
                      {
                        required: true,
                        message: '目标表名必填!'
                      }
                    ],
                    initialValue: _.get(content, 'writer.toDataSource')
                  })(
                    this.state.targetDataType === 'hive' ? (
                      <Input placeholder='请输入表名' onBlur={e => this.hiveChangeTable(e.target.value)} />
                    ) : (
                      <Select showSearch disabled={hasDbData || disabled} placeholder='请选择目标表名' onChange={val => this.getFieldsInfo(val, 'target')}>
                        {targetDataTables.map(p => (
                          <Option key={`table-option-${p}`} value={p}>
                            {p}
                          </Option>
                        ))}
                      </Select>
                    )
                  )}
                </FormItem>
              </Col>
              <Col span={8}>
                <FormItem
                  label={
                    <span>
                      替换字符&nbsp;
                      <Tooltip title="用于替换数据中的换行符，'space'表示一个空格，也可以使用'\t'等字符，不填则不替换">
                        <QuestionCircleOutlined />
                      </Tooltip>
                    </span>
                  }
                  className='mg1b'
                  hasFeedback
                  {...formItemLayout3}
                >
                  {getFieldDecorator('replaceChart', {
                    initialValue: _.get(content, 'cleaner.assembler.replaceChart', '').replace(/\s+/g, 'space'),
                    getValueFromEvent: event => event.target.value.replace(/\s+/g, 'space')
                  })(<Input placeholder='请输入替换字符' />)}
                </FormItem>
              </Col>
              {thatObj.dbType !== 'hbase' ? null : (
                <Col span={8}>
                  <FormItem label='RowKey连接符' className='mg1b' hasFeedback {...formItemLayout3}>
                    {getFieldDecorator('concatStr', {
                      initialValue: _.get(
                        _.filter(converterList, item => item.type === 'hbase_rowkey_map', []),
                        '[0].concatStr'
                      )
                    })(<Input placeholder='请输入RowKey连接符' />)}
                  </FormItem>
                </Col>
              )}
            </Row>
            <div className='alignright mg1b async-table-btn'>
              <Tooltip title='同步源表字段信息'>
                <Button type='link' onClick={() => this.getFieldsInfo(form.getFieldValue('datasource'))} icon={<SyncOutlined />} />
              </Tooltip>
            </div>
            <FormItem {...formItemLayout2}>
              {getFieldDecorator('columnInfo', {
                initialValue: mergeFields || []
              })(
                <FieldSetList
                  changeParentStatus={changeParentStatus}
                  loading={!loadDataField}
                  disabled={disabled}
                  isHBase={isHBase}
                  columnFamily={columnFamily}
                  targetDataFields={targetDataFields}
                />
              )}
            </FormItem>
            {isHideExtra ? null : (
              <div className='mg2t'>
                <FormItem label='sql条件查询过滤语句' {...formItemLayout}>
                  {getFieldDecorator('filterSql', {
                    initialValue: _.get(content, 'reader.filterSql', '')
                  })(<Input disabled={disabled} placeholder='请输入sql条件查询过滤语句' className='width-50' />)}
                </FormItem>
                <FormItem label='同步时间输出字段' {...formItemLayout}>
                  {!isHBase
                    ? null
                    : getFieldDecorator('output_sync_time_cf', {
                        initialValue: _.find(converterList, item => item.type === 'hbase_output_sync_time', {})?.finalCF
                      })(
                        <Select className='mg2r width-20' placeholder='请选择列族'>
                          {_.map(columnFamily, data => (
                            <Option key={data.value} value={data.value}>
                              {data.name}
                            </Option>
                          ))}
                        </Select>
                      )}
                  {isHBase
                    ? getFieldValue('output_sync_time_cf') === 'RowKey'
                      ? null
                      : getFieldDecorator('hbase_output_sync_time', {
                          initialValue: _.find(converterList, item => item.type === 'hbase_output_sync_time', {})?.finalCol
                        })(<Input className='width-30' disabled={disabled} placeholder='请输入同步时间输出字段（仅支持时间戳格式）' />)
                    : getFieldDecorator('output_sync_time', {
                        initialValue: _.find(converterList, item => item.type === 'output_sync_time', {})?.finalCol
                      })(
                        <Select className='width-50' placeholder='请选择同步时间输出字段'>
                          {_.map(targetDataFields, data => (
                            <Option key={data.value} value={data.value}>
                              {data.name}
                            </Option>
                          ))}
                        </Select>
                      )}
                </FormItem>
                <FormItem label='序列号输出字段' {...formItemLayout}>
                  {!isHBase
                    ? null
                    : getFieldDecorator('output_serial_number_cf', {
                        initialValue: _.find(converterList, item => item.type === 'hbase_output_serial_number', {})?.finalCF
                      })(
                        <Select className='mg2r width-20' placeholder='请选择列族'>
                          {_.map(columnFamily, data => (
                            <Option key={data.value} value={data.value}>
                              {data.name}
                            </Option>
                          ))}
                        </Select>
                      )}
                  {isHBase
                    ? getFieldValue('output_serial_number_cf') === 'RowKey'
                      ? null
                      : getFieldDecorator('hbase_output_serial_number', {
                          initialValue: _.find(converterList, item => item.type === 'hbase_output_serial_number', {})?.finalCol
                        })(<Input className='width-30' disabled={disabled} placeholder='请输入序列号输出字段（仅支持uuid格式）' />)
                    : getFieldDecorator('output_serial_number', {
                        initialValue: _.find(converterList, item => item.type === 'output_serial_number', {})?.finalCol
                      })(
                        <Select className='width-50' placeholder='请选择序列号输出字段'>
                          {_.map(targetDataFields, data => (
                            <Option key={data.value} value={data.value}>
                              {data.name}
                            </Option>
                          ))}
                        </Select>
                      )}
                </FormItem>
                <FormItem label='是否分区' {...formItemLayout}>
                  {getFieldDecorator('isPartition', {
                    initialValue: _.get(content, 'writer.isPartition', true)
                  })(
                    <Select className='width-50'>
                      <Option key={'op1'} value={true}>
                        分区
                      </Option>
                      <Option key={'op2'} value={false}>
                        不分区
                      </Option>
                    </Select>
                  )}
                </FormItem>
              </div>
            )}
            <div className='aligncenter mg2t' onClick={this.handleExtraClick}>
              {isHideExtra ? (
                <a>
                  展开高级配置 <DownOutlined />
                </a>
              ) : (
                <a>
                  隐藏高级配置 <UpOutlined />
                </a>
              )}
            </div>
          </Form>
        </Card>
      </div>
    )
  }
}
