import React from 'react'
import Bread from '../Common/bread'
import { ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Input, message, Select, Table, Upload } from 'antd';
import _ from 'lodash'
import {getUsers} from '../../actions'
import {connect} from 'react-redux'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {validateFieldsByForm} from '../../common/decorators'
import {browserHistory} from 'react-router'
import {dataSourceListSagaModelGenerator, tableListSagaModelGenerator} from './saga-model-generators'
import DepartmentPicker from '../Departments/department-picker'
import Fetch from '../Common/fetch'
import {delayPromised, guessStrArrayType, immutateUpdate} from '../../../common/sugo-utils'
import FetchFinal from '../../common/fetch-final'
import XLSX from 'xlsx'
import {OfflineCalcDataSourceTypeEnum} from '../../../common/constants'
import {guessDruidStrTypeByDbDataType} from '../../../common/offline-calc-model-helper'

const namespace = 'offline-calc-tables-edit'

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 16 }
}

const {Option} = Select

let mapStateToProps = (state, ownProps) => {
  const modelState = state[namespace] || {}
  const dsList = state['offline-calc-data-sources-list-for-table-edit'] || {}
  return {
    ...modelState,
    offlineCalcDataSources: dsList.offlineCalcDataSources,
    users: _.get(state, 'common.users', [])
  }
}


@connect(mapStateToProps)
@withRuntimeSagaModel([
  dataSourceListSagaModelGenerator('offline-calc-data-sources-list-for-table-edit'),
  tableListSagaModelGenerator(namespace, 'single')
])
@Form.create()
export default class OfflineCalcTableEdit extends React.Component {
  state = {
    selectedFile: null
  }
  
  componentDidMount() {
    this.props.dispatch(getUsers())
  }
  
  /*componentDidUpdate(prevProps, prevState, snapshot) {
    if (isDiffByPath(this.props, prevProps, 'offlineCalcDataSourcesBak')) {
      this.props.form.resetFields()
    }
  }*/
  
  onSubmit = async ev => {
    ev.preventDefault()
    let {offlineCalcTables, dispatch, form, params} = this.props
    let formVals = await validateFieldsByForm(form)
    if (!formVals) {
      return
    }
    const institutionsField = formVals.institutionsField
    let currTable = _.get(offlineCalcTables, [0])
    let fieldInfos = _.get(currTable, 'params.fieldInfos')
    let uploadedData = _.get(currTable, 'params.uploadedData')
    if (_.isEmpty(fieldInfos)) {
      message.warn('没有有效字段，无法保存')
      return
    }
    
    formVals = immutateUpdate(formVals, 'params', params => ({...(params || {}), fieldInfos, uploadedData}))
    const institutionsIndex = _.findIndex(_.get(formVals,'params.fieldInfos', []), p => p.is_institutions)
    if(institutionsIndex > -1) {
      const info = _.get(formVals, ['params', 'fieldInfos', institutionsIndex], {})
      _.set(formVals.params, ['fieldInfos', institutionsIndex], _.omit(info, 'is_institutions'))
    }
    if(institutionsField) {
      const indx = _.findIndex(_.get(formVals, 'params.fieldInfos', []), p => p.field === institutionsField)
      _.set(formVals.params, `fieldInfos.${indx}.is_institutions`, true)
    }
    const currIdInUrl = _.get(params, 'id')
    const isCreating = currIdInUrl === 'new'
    // hive 数据源表的 id 规范： hive_dbName_tableName
    if (_.startsWith(formVals.data_source_id, 'hive_')) {
      formVals.id = `${formVals.data_source_id}_${formVals.name}`
    }
  
    let nextTables = isCreating
      ? [formVals]
      : offlineCalcTables.map(d => d.id === currIdInUrl ? {...d, ...formVals} : d)
    
    await dispatch({
      type: `${namespace}/sync`,
      payload: nextTables,
      callback: async syncRes => {
        let {resCreate, resUpdate} = syncRes || {}
        if (_.isEmpty(resCreate) && _.isEmpty(resUpdate)) {
          message.warn('没有修改数据，无须保存')
          return
        }
        if (_.isEmpty(_.compact(resCreate)) && _.isEmpty(_.compact(resUpdate))) {
          // 保存报错
          return
        }
        const isCreated = _.isEmpty(resUpdate)
        message.success((
          <span>{isCreated ? '创建' : '修改'}维表成功</span>
        ))
        if (isCreated) {
          let createdId = _.get(resCreate, [0, 'result', 'id'])
          browserHistory.push(`/console/offline-calc/tables/${createdId}`)
          dispatch({ type: `${namespace}/fetch`, payload: createdId})
        }
      }
    })
  }
  
  reloadFieldInfo = async () => {
    let {dispatch} = this.props
    const { getFieldValue } = this.props.form
    const dsId = getFieldValue('data_source_id')
    if (dsId === 'uploaded') {
      await this.readFile(this.state.selectedFile)
      return
    }
    const tableName = getFieldValue('name')
    if (!tableName) {
      return
    }
    let fields = await FetchFinal.get(`/app/offline-calc/data-sources/${dsId}/tables/${tableName}`)
    // [{field, type}]
    const nextFieldInfos = fields.map(f => {
      return {
        field: f.Field,
        type: f.Type
      }
    })
    dispatch({
      type: `${namespace}/updateState`,
      payload: prevState => {
        return immutateUpdate(prevState, 'offlineCalcTables[0].params.fieldInfos', () => nextFieldInfos)
      }
    })
  }
  
  getTableColumnsEditorTableCols = () => {
    let {dispatch} = this.props
  
    const hideRow = (ev) => {
      let preDelField = ev.target.getAttribute('data-field')
      dispatch({
        type: `${namespace}/updateState`,
        payload: prevState => {
          return immutateUpdate(prevState, 'offlineCalcTables[0].params.fieldInfos', fieldInfos => {
            return fieldInfos.map(f => f.field === preDelField ? {...f, hide: true} : f)
          })
        }
      })
    }
  
    return [
      {
        title: '字段名',
        dataIndex: 'field',
        key: 'field'
      },
      {
        title: '字段类型',
        dataIndex: 'type',
        key: 'type'
      },
      {
        title: '操作',
        dataIndex: 'field',
        key: 'ops',
        render: (val, record, idx) => {
          return (
            <React.Fragment>
              <a
                className="pointer"
                data-field={record.field}
                title="忽略此字段"
                onClick={hideRow}
              >忽略</a>
            </React.Fragment>
          )
        }
      }
    ]
  }

  readFile = async (file) => {
    let {dispatch, offlineCalcTables} = this.props
    let uploadResults = !file ? (_.get(offlineCalcTables, '[0].params.uploadedData') || []) : await new Promise(resolve => {
      let fileReader = new FileReader()
      let uploadResults0 = []
      fileReader.onload = (e) => {
        let data = new Uint8Array(e.target.result)
        let workbook = XLSX.read(data, {type: 'array'})
        for (let sheet in workbook.Sheets) {
          let array = XLSX.utils.sheet_to_json(workbook.Sheets[sheet])
          uploadResults0.push(...array)
        }
        resolve(uploadResults0)
      }
      fileReader.readAsArrayBuffer(file)
    })

    if (_.isEmpty(uploadResults)) {
      message.warn('加载文件数据失败，请尝试重新上传')
      return
    }
    let samples = _.sampleSize(uploadResults, 10)
    const nextFieldInfos = _.keys(samples[0]).map(fieldName => {
      let guessedType = guessStrArrayType(samples.map(d => d[fieldName]), 'Char')
      return {
        field: fieldName,
        type: guessDruidStrTypeByDbDataType(guessedType)
      }
    })
    dispatch({
      type: `${namespace}/updateState`,
      payload: prevState => {
        return immutateUpdate(prevState, 'offlineCalcTables[0].params', params => ({
          ...params,
          fieldInfos: nextFieldInfos,
          uploadedData: uploadResults
        }))
      }
    })
  }

  render() {
    let {users, params, offlineCalcTables, offlineCalcDataSources, dispatch} = this.props
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form
    let {selectedFile} = this.state

    let currTable = _.get(offlineCalcTables, [0])
    let fieldInfos = _.get(currTable, 'params.fieldInfos') || []
    
    const isCreating = _.get(params, 'id') === 'new'
    const institutionsField = (fieldInfos.find(p => p.is_institutions) || {} ).field
    getFieldDecorator('id', {
      initialValue: isCreating ? undefined : _.get(params, 'id')
    })
  
    return (
      <React.Fragment>
        <Bread
          path={[
            { name: '维表管理', link: '/console/offline-calc/tables' },
            { name: isCreating ? '维表创建' : '维表编辑' }
          ]}
        />
        <div className="overscroll-y" style={{height: 'calc(100% - 44px)'}}>
          <Form
            onSubmit={this.onSubmit}
            className="width600 mg-auto mg3t"
          >
            <Form.Item
              label="所属数据源"
              {...formItemLayout}
            >
              {getFieldDecorator('data_source_id', {
                initialValue: _.get(currTable, 'data_source_id'),
                rules: [{ required: true, message: '未选择数据源' }]
              })(
                <Select
                  allowClear
                  {...enableSelectSearch}
                  onChange={async val => {
                    setFieldsValue({
                      'name': null
                    })
                    dispatch({
                      type: `${namespace}/updateState`,
                      payload: prevState => {
                        return immutateUpdate(prevState, 'offlineCalcTables[0].params', params => ({
                          ...params,
                          fieldInfos: [],
                          uploadedData: null
                        }))
                      }
                    })
                  }}
                  disabled={!isCreating}
                >
                  <Option key="uploaded" value="uploaded">用户上传</Option>
                  {(offlineCalcDataSources || []).map(ds => {
                    return (
                      <Option key={ds.id} value={ds.id}>{ds.name}</Option>
                    )
                  })}
                </Select>
              )}
            </Form.Item>

            {getFieldValue('data_source_id') === 'uploaded'
              ? (
                <Form.Item label="维表名称" {...formItemLayout}>
                  {getFieldDecorator('name', {
                    initialValue: _.get(currTable, 'name'),
                    rules: [
                      { required: true, message: '未输入表名', whitespace: true },
                      { max: 32, message: '名称太长' },
                      { pattern: /^[a-z_]\w+$/i, message: '只能输入英文字母、下划线和数字，首字符不能为数字' }
                    ]
                  })(<Input />)}
                </Form.Item>
              )
              : (
                <Fetch
                  url={`/app/offline-calc/data-sources/${getFieldValue('data_source_id')}/tables`}
                  lazy={!getFieldValue('data_source_id')}
                >
                  {({isFetching, data}) => {
                    return (
                      <Form.Item
                        label="数据来源"
                        {...formItemLayout}
                        validateStatus={isFetching ? 'validating' : undefined}
                      >
                        {getFieldDecorator('name', {
                          initialValue: _.get(currTable, 'name'),
                          rules: [
                            { required: true, message: '未选择表' }
                          ]
                        })(
                          <Select
                            allowClear
                            {...enableSelectSearch}
                            onChange={async tableName => {
                              await delayPromised(100)
                              await this.reloadFieldInfo()
                            }}
                            disabled={!isCreating}
                          >
                            {(data || []).map(tableName => {
                              return (
                                <Option key={tableName} value={tableName}>{tableName}</Option>
                              )
                            })}
                          </Select>
                        )}
                      </Form.Item>
                    )
                  }}
                </Fetch>
              )}

            <Form.Item label="维表别名" {...formItemLayout}>
              {getFieldDecorator('title', {
                initialValue: _.get(currTable, 'title'),
                rules: [
                  { required: false, message: '不能只有空格', whitespace: true },
                  { max: 32, message: '名称太长' }
                ]
              })(<Input />)}
            </Form.Item>

            {getFieldValue('data_source_id') !== 'uploaded' ? null : (
              <Form.Item
                label="上传文件"
                {...formItemLayout}
                required
              >
                <Upload
                  accept=".csv,.xlsx"
                  beforeUpload={file => {
                    if (file.size / 1024 / 1024 > 2) {
                      message.warn('文件太大，请上传小于 2 Mb 的文件')
                      return
                    }
                    this.setState({
                      selectedFile: file
                    }, () => {
                      this.reloadFieldInfo()
                    })
                    return false
                  }}
                  fileList={[]}
                >
                  <Button icon={<UploadOutlined />}>{selectedFile ? `已选择文件：${selectedFile.name}` : '选择文件'}</Button>
                </Upload>
              </Form.Item>
            )}
    
            <Form.Item
              label="有效字段"
              {...formItemLayout}
            >
              <Table
                rowKey={(d, i) => i}
                bordered
                size="small"
                locale={{
                  emptyText: (
                    <span>暂无内容，请先选择数据来源表</span>
                  )
                }}
                dataSource={fieldInfos.filter(f => !f.hide)}
                columns={this.getTableColumnsEditorTableCols()}
              />
              <a
                className="pointer"
                onClick={this.reloadFieldInfo}
              ><ReloadOutlined /> 重新加载表格字段</a>
            </Form.Item>
            
            <Form.Item
              {...formItemLayout}
              label="机构维度"
            >
              {getFieldDecorator('institutionsField', {
                initialValue: institutionsField
              })(
                <Select>
                  {
                    fieldInfos.filter(f => !f.hide).map(p => {
                      return <Select.Option key={`f_${p.field}`} value={p.field}>{p.field}</Select.Option>
                    })
                  }
                </Select>
              )}
            </Form.Item>

            <Form.Item
              label="责任部门"
              {...formItemLayout}
            >
              {getFieldDecorator('params.supervisorDepartments', {
                initialValue: _.get(currTable, 'params.supervisorDepartments') || []
              })(
                <DepartmentPicker style={{width: '100%'}} multiple={false} />
              )}
            </Form.Item>
    
            <Form.Item label="责任人" {...formItemLayout}>
              {getFieldDecorator('supervisor_id', {
                initialValue: _.get(currTable, 'supervisor_id', _.get(window.sugo, 'user.id'))
              })(
                <Select
                  allowClear
                  {...enableSelectSearch}
                >
                  {(users || []).map(user => {
                    const {first_name, username} = user || {}
                    return (
                      <Option
                        key={user.id}
                        value={user.id}
                      >{first_name ? `${first_name}(${username})` : username}</Option>
                    )
                  })}
                </Select>
              )}
            </Form.Item>
    
            <Form.Item label="业务口径" {...formItemLayout}>
              {getFieldDecorator('description', {
                initialValue: _.get(currTable, 'description')
              })(<Input />)}
            </Form.Item>
    
            <Form.Item
              label={'\u00a0'}
              colon={false}
              {...formItemLayout}
            >
              <Button
                type="primary"
                htmlType="submit"
              >{isCreating ? '确认新建' : '保存修改'}</Button>
    
            </Form.Item>
          </Form>
        </div>
      </React.Fragment>
    );
  }
}
