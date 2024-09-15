import React from 'react'
import Bread from '../Common/bread'
import Steps from '../Common/access-steps'
import Papa from 'papaparse'
import { FileAddOutlined, FileUnknownOutlined, InboxOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Table, Upload, message, notification, Modal, Input, Select } from 'antd';
import {dictBy, mapAwaitAll} from '../../../common/sugo-utils'
import {connect} from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {parse} from './formula-parser'
import { TextDimFilterOpNameMap } from './filters-editor-for-offline-calc'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import Fetch from '../../common/fetch-final'
import _ from 'lodash'
import './hideHeadButton.styl'
import {genIndicesId} from '../../common/offline-calc-helper'
import {dataSourceListSagaModelGenerator} from './saga-model-generators'
import {validateFieldsAndScrollByForm} from '../../common/decorators'
import moment from 'moment'
import {getUsers} from '../../actions'
import {OfflineCalcDataSourceTypeEnum} from '../../../common/constants'

const api = '/app/offline-calc/import-tables'
const namespace = 'offline-calc-import-tables'
const FormItem = Form.Item
const {Option} = Select

let formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 14 }
}

let mapStateToProps = (state, ownProps) => {
  let usersDict = dictBy(_.get(state, 'common.users', []), o => o.id)
  return {
    usersDict,
    ...state['offline-calc-import-tablesdatasouce']
  }
}

@Form.create()
@connect(mapStateToProps)
@withRuntimeSagaModel([
  dataSourceListSagaModelGenerator(namespace + 'datasouce', 'list', ['id', 'name', 'type', 'connection_params', 'created_by'])
])
export default class OfflineCalcImportTables extends React.Component {

  state = {
    modalVisible: false,
    stepCurrent: 0,
    datasource_id: '',
    table_name: '',
    dimension: [],
    dimensionValue: [],
    dimensionType: {},
    historyImport: []
  }
  
  componentDidMount() {
    this.props.dispatch(getUsers())
    this.getData()
  }

  async getData() {
    let res = await Fetch.get(api)
    if (res.code === 0) {
      this.setState({
        historyImport: res.result
      })
    }
  }

  init() {
    const { resetFields } = this.props.form
    this.setState({
      modalVisible: false,
      stepCurrent: 0,
      datasource_id: '',
      table_name: '',
      dimension: [],
      dimensionValue: [],
      dimensionType: {}
    })
    resetFields()
    this.getData()
  }

  readFile = (file) => {
    const { stepCurrent } = this.state
    //csv读取方法
    Papa.parse(file, {
      config: {
        header: true,
        dynamicTyping: true, // 自动转换数据格式
        skipEmptyLines: true, // 排除空行
        encoding: 'UTF-8' // 编码
      },
      error: (err, file, inputElem, reason) => {
        notification.error({
          message: '提示',
          description: '上传文件错误：' + err
        })
      },
      complete: (result) => {
        const { data: uploadResults } = result
        let order = uploadResults[0]
        uploadResults.shift()
        let data = [] 
        uploadResults.map( (i,idx) => {
          let res = {}
          if (i.length !== order.length) return ''
          i.map( (val, jdx) => {
            if (_.isEmpty(val)) return
            res[order[jdx]] = val
          })
          if (_.isEmpty(res)) return
          data.push(res)
        })
        this.setState({
          dimension: order,
          dimensionValue: data
        })
        if (stepCurrent === 1) {
          this.setState({
            stepCurrent: 2
          })
        }
        if (stepCurrent === 0) {
          this.doImportValue()
        }
        return
      }
    })
  }

  onChangeFile = async (info) => {
    const { file } = info
    this.setState({ uploadding: true })
    let { status } = file // uploading done error removed

    if (status === 'error') {
      message.error('文件上传失败，请重试')
    } else if (status === 'done') {
      // 文件上传成功，创建文件记录，标记文件 id 到 hash
      // let { filename, originalFilename } = _.get(file, 'response.result') || {}
      // if (!filename) {
      //   message.error('文件上传失败，请重试')
      //   // this.setState({ subStep: SubStepEnum.SettingColumns })
      //   return
      // }
      // try {
      //   let { result: newFile } = await FetchFinal.post('/app/uploaded-files/create', {
      //     name: originalFilename,
      //     type: UploadedFileType.LossPredictTestData,
      //     path: `/f/${filename}`
      //   })
      //   this.updateFile(newFile)
      // } catch (err) {
      //   console.error(err)
      //   message.error('文件上传失败: ' + err.message)
      //   this.setState({ uploadding: false })
      // }
    }
  }
  

  beforeUpload = (file) => {
    // if (!/(\.csv)$/.test(file.name)) {
    //   return notification.error({
    //     message: '提示',
    //     description: '仅支持上传.csv结尾的文件'
    //   })
    // }
    if (!/(\.csv)$/.test(file.name)) {
      return notification.error({
        message: '提示',
        description: '仅支持上传.csv结尾的文件'
      })
    }
    this.readFile(file)
    return !sugo.disableTagUploadHistory
  }

  renderSteps() {
    let { stepCurrent } = this.state
    let steps = [
      {
        title: '填写基本信息'
      },
      {
        title: '导入文件'
      },
      {
        title: '设置数据类型'
      }
    ]

    return (
      <Steps
        steps={steps}
        className="bg-white pd2y pd3x borderb"
        current={stepCurrent}
      />
    )
  }

  renderImport() {

    let draggerProps = {
      name: 'file',
      // action: '/app/offline-calc/indices-import',
      // onChange: this.onChangeFile,
      data:{ 
        // app_version: store.state.vm.uploadVersion,
        // appid: store.state.DataAnalysis.id
      },
      multiple: false,
      beforeUpload: this.beforeUpload
    }

    return (
      <div className="scroll-content always-display-scrollbar">
        <div className="relative pd2y pd3x height500">
          {
            <Upload.Dragger {...draggerProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击选择文件或拖动文件到此区域</p>
            </Upload.Dragger>
          }
        </div>
      </div>
    );
  }

  renderEntry() {
    const { historyImport } = this.state
    const { offlineCalcDataSources = [], usersDict } = this.props
    let datasourceDict = dictBy(offlineCalcDataSources, o => o.id)
    const columns = [{
      key: 'table_name',
      dataIndex: 'table_name',
      title: '表名',
      render: (val, record) => (
        <a 
          title="查看表结构"
          onClick={() => this.setState({modalVisible: `viewTable:${record.id}`})}
        >
          {val}
        </a>
      )
    },{
      key: 'datasource_id',
      dataIndex: 'datasource_id',
      title: '数据源名',
      render: (val) => _.get(datasourceDict[val],'name') || _.get(datasourceDict[val], 'title')
    },{
      key: 'created_by',
      dataIndex: 'created_by',
      title: '创建人',
      render: (val) => _.get(usersDict[val],'username', '')
    },{
      key: 'updated_at',
      dataIndex: 'updated_at',
      title: '最后更新时间',
      render: (val) => moment(val).format('YYYY-MM-DD HH:mm:ss')
    },{
      key: 'id',
      dataIndex: 'id',
      title: '操作',
      render: (val, record) => (
        <React.Fragment>
          <Upload
            showUploadList={false}
            beforeUpload={file => this.beforeUpload(file)}
          >
            <FileAddOutlined
              className='fpointer'
              title='追加数据'
              onClick={() => {
                this.setState({
                  datasource_id: record.datasource_id,
                  table_name: record.table_name,
                  dimensionType: record.dimension_type
                })
              }} />
          </Upload>
          <FileUnknownOutlined
            title="查看表结构"
            className='mg2l fpointer'
            onClick={() => {
              this.setState({
                modalVisible: `viewTable:${record.id}`
              })
            }} />
        </React.Fragment>
      )
    }]
    
    return (
      <HorizontalSplitHelper
        style={{height: 'calc(100% - 44px)'}}
        className="contain-docs-analytic"
      >
        <div 
          className="itblock height-100"
          style={{padding: '10px 10px 10px 5px'}}
          defaultWeight={5}
        >
          <div
            className="height800 pd3x pd2y mg1y bg-white corner"
          >
            <div
              className="height40 fright"
            >
              <Button
                className="mg2r"
                type="primary"
                onClick={() => this.setState({modalVisible: 'create'})}
              >新建维表</Button>
            </div>
            <div className="mg3t">
              <Table 
                rowKey="id"
                id="offline-calc-previewTable"
                columns={columns}
                dataSource={historyImport}
              />
            </div>
          </div>
        </div>
      </HorizontalSplitHelper>
    )
  }

  onSubmit = async () => {
    const { form } = this.props
    let formVals = await validateFieldsAndScrollByForm(form, null, {force: true})
    if (!formVals) return message.error('设置失败')
    this.setState({
      ...formVals,
      stepCurrent: 1,
      modalVisible: false
    })
    message.success('设置成功,请上传文件')
  }

  renderViewTableModal() {
    const { modalVisible = '', historyImport } = this.state
    const { resetFields } = this.props.form
    if (!modalVisible) return
    let tableId = modalVisible.replace('viewTable:', '')
    let datasource = _.get(_.find(historyImport, o => o.id === tableId), 'dimension_type')
    if (_.isEmpty(datasource)) return
    datasource = Object.keys(datasource).map( i => {
      return {
        name: i,
        type: datasource[i]
      }
    })
    return (
      <Modal
        title="表结构"
        footer={null}
        onCancel={() => {
          this.setState({modalVisible: false})
          resetFields()
        }}
        visible={_.startsWith(modalVisible, 'viewTable:')}
      >
        <Table 
          columns={[{
            key: 'tname',
            dataIndex: 'name',
            title: '字段名'
          },{
            key: 'ttype',
            dataIndex: 'type',
            title: '字段类型'
          }]}
          dataSource={datasource}
        />
      </Modal>
    )
  }

  renderCreateModal() {
    const { modalVisible } = this.state
    const { offlineCalcDataSources = [], form } = this.props
    const { getFieldDecorator, resetFields } = form
    return (
      <Modal
        okText="提交"
        onOk={this.onSubmit}
        title="填写基本信息"
        visible={modalVisible === 'create'}
        onCancel={() => {
          this.setState({modalVisible: false})
          resetFields()
        }}
      >
        <Form className="mg2t">
          <FormItem {...formItemLayout} label="数据源">
            {
              getFieldDecorator('datasource_id',
                {
                  rules: [
                    { required: true, message: '不能为空' }
                  ],
                  initialValue: ''
                })(
                <Select
                  showSearch
                  filterOption={(input, option) => {
                    return option.props
                      .children
                      .toLowerCase()
                      .indexOf(input.toLowerCase()) >= 0
                  }}
                >
                  {
                    offlineCalcDataSources.filter( i => i.type !== OfflineCalcDataSourceTypeEnum.Hive).map( i => (
                      <Option title={i.name} key={i.id} value={i.id}>{i.name}</Option>
                    ))
                  }
                </Select>
              )
            }
          </FormItem>
          <FormItem {...formItemLayout} label="表名">
            {
              getFieldDecorator('table_name',
                {
                  rules: [
                    { required: true, message: '不能为空' },
                    {
                      max: 50,
                      type: 'string',
                      message: '最多50字符'
                    },
                    {
                      pattern: /(^_([a-zA-Z0-9]_?)*$)|(^[a-zA-Z](_?[a-zA-Z0-9])*_?$)/,
                      message: '非法表名,英文下划线开头'
                    }
                  ],
                  initialValue: ''
                })(
                <Input />
              )
            }
          </FormItem>
        </Form>
      </Modal>
    );
  }

  columnsCreator () {
    const { dimension, dimensionType } = this.state
    const width = 120

    const dimensionTypes = [
      'boolean',
      'short',
      'int',
      'long',
      'float',
      'double',
      'date',
      'datetime',
      'string'
    ]
    const columns = dimension.map((d, i) => {

      const selector = (
        <Select
          className="width-100"
          showSearch
          defaultValue="string"
          filterOption={(input, option) => {
            return option.props
              .children
              .toLowerCase()
              .indexOf(input.toLowerCase()) >= 0
          }}
          onChange={type => this.setState({
            dimensionType: {
              ...dimensionType,
              [d]: type
            }
          })}
          placeholder="类型"
          size="small"
        >
          {
            dimensionTypes.map(typeName => (
              <Select.Option title={typeName} value={typeName} key={typeName}>
                {typeName}
              </Select.Option>
            ))
          }
        </Select>
      )

      return {
        width,
        key: d,
        // editable: true,
        dataIndex: d,
        title: (
          <div>
            {selector}
          </div>
        ),
        render: (text) => {
          return text
        }
      }
    })

    columns.unshift({
      width: 80,
      key: 'key',
      title: '数据格式',
      dataIndex: 'key',
      editable: false
    })

    return columns
  }

  doImportValue = async () => {
    const { datasource_id, table_name, dimensionValue, dimensionType } = this.state
    const { offlineCalcDataSources } = this.props
    let res = await Fetch.post(api + '/values', {
      datasource_id, 
      datasource: _.find(offlineCalcDataSources, o => o.id === datasource_id),
      table_name, 
      dimensionType,
      dimensionValue
    })
    if (res.code === 0) {
      message.success('上传成功')
      this.init()
    }
  }

  doUpload = async () => {
    const { datasource_id, table_name, dimension, dimensionValue, dimensionType } = this.state
    const { offlineCalcDataSources } = this.props
    if (Object.keys(dimensionType).length !== dimension.length) {
      dimension.map( i => {
        if (!dimensionType[i]) {
          dimensionType[i] = 'string'
        }
      })
    }
    let res = await Fetch.post(api, {
      datasource_id, 
      datasource: _.find(offlineCalcDataSources, o => o.id === datasource_id),
      table_name, 
      dimensionValue, 
      dimensionType
    })
    if (res.code === 0) {
      message.success('上传成功')
      this.init()
    }
  }

  renderSetDataType() {
    const { dimension, dimensionValue } = this.state
    let temp = {
      key: '列标题'
    }
    dimension.map(i => {
      temp[i] = i
    })
    let tempValue = _.slice(dimensionValue,0,10).map( i => {
      let obj = {
        key: ''
      }
      dimension.map( j => {
        obj[j] = i[j]
      })
      return obj
    })
    return (
      <div className="height-100 bg-white">
        <HorizontalSplitHelper
          style={{height: 'calc(100% - 44px)'}}
          className="contain-docs-analytic"
        >
          <div 
            className="height-80"
            style={{padding: '10px 10px 10px 5px'}}
            defaultWeight={5}
          >
            <div
              style={{
                height: '600px'
              }}
              className="pd3x pd2y mg1y bg-white corner"
            >
              <div className="mg3t">
                <Table
                  operationColumnWidth={100}
                  // scroll={{ x, y: 300 }}
                  bordered
                  size="small"
                  columns={this.columnsCreator()}
                  dataSource={[temp, ...tempValue]}
                  pagination={false}
                />
              </div>
              <div className="mg3t fright">
                <Button
                  type="primary"
                  onClick={() => this.doUpload()}
                >上传</Button>
              </div>
            </div>
          </div>
        </HorizontalSplitHelper>
      </div>
    )
  }

  render() {
    let { stepCurrent } = this.state

    let steps = [ 
      this.renderEntry(),
      this.renderImport(),
      this.renderSetDataType()
    ]

    return (
      <React.Fragment>
        <Bread
          path={[
            { name: '导入维表' }
          ]}
        >
          {
            stepCurrent !== 0 && stepCurrent !== 1
              ?
              <Button
                onClick={() => this.setState({stepCurrent: stepCurrent - 1})}
              >返回</Button>
              : null
          }
          {
            stepCurrent !== 0 
              ?
              <Button
                className="mg2l"
                onClick={() => {
                  this.setState({stepCurrent: 0})
                  this.init()
                }}
              >取消</Button>
              : null
          }
        </Bread>
        { 
          stepCurrent !== 0 
            ?
            this.renderSteps()
            : null
        }
        <HorizontalSplitHelper
          style={{height: 'calc(100% - 44px)'}}
          className="contain-docs-analytic"
        >
          <div 
            className="itblock height-100"
            style={{padding: '10px 10px 10px 5px'}}
            defaultWeight={5}
          >
            { steps[stepCurrent] }
          </div>
        </HorizontalSplitHelper>
        {this.renderCreateModal()}
        {this.renderViewTableModal()}
      </React.Fragment>
    )
  }
}
