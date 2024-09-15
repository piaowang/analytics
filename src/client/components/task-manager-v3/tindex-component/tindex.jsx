import React from 'react'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Input, Select, Row, Col, message } from 'antd';
import _ from 'lodash'
import { generate } from 'shortid'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'//common/sugo-utils
import { immutateUpdate, immutateUpdates } from '../../../../common/sugo-utils'
import Fetch from '../../../common/fetch-final'
import Eidtor from '../monaco-editor/react-monaco'
import { namespace } from '../task-edit/model'
import FieldTable from './field-mapping-table'
import ToolBar from './tool-bar'
import { FLOW_NODE_INFOS } from '../constants'
import { validateFieldsAndScroll } from '../../../common/decorators'

const { Item: FItem } = Form
const { Option } = Select

const formItemLayout = {
  labelCol: {
    span: 9
  },
  wrapperCol: {
    span: 15
  }
}

const defaultScript = `{
  "type": "lucene_upsert",
    "dataSchema": {
      "dataSource": "",
      "parser": {
        "parseSpec": {
          "format": "tsv",
          "timestampSpec": {
            "column": "",
            "format": ""
          },
          "delimiter": "\\u0001",
          "listDelimiter": "\\u0002",
          "dimensionsSpec": {
            "dimensionExclusions": [],
            "dimensions": [],
            "spatialDimensions": []
          },
          "columns": [],
          "sourceColumns": {},
          "type": "hdfs"
        }
      },
      "metricsSpec": [],
      "granularitySpec": {
        "intervals": [
          "1001/2999"
        ],
        "rollup": false,
        "segmentGranularity": "DAY",
        "queryGranularity": {
          "type": "none"
        },
        "type": "uniform"
      }
    },
    "ioConfig": {
      "type": "lucene_index",
      "firehose": {
        "type": "hdfs",
        "filter": "*",
        "baseDir": "",
        "parser": null,
        "readThreads": 3
      }
    },
    "tuningConfig": {
      "type": "lucene_index",
      "maxRowsPerSegment": 50000,
      "numShards": -1,
      "basePersistDirectory": null,
      "overwrite": false,
      "reportParseExceptions": true,
      "useDataSequenceMode": true,
      "scanThreads": 2
    },
     "writerConfig": {
    "type": "lucene",
    "maxBufferedDocs": -1,
    "ramBufferSizeMB": 16,
    "indexRefreshIntervalSeconds": 6,
    "isIndexMerge": true,
    "mergedNum": 1,
    "isCompound": false,
    "maxMergeAtOnce": 5,
    "maxMergedSegmentMB": 5120,
    "maxMergesThreads": 1,
    "mergeSegmentsPerTire": 10,
    "writeThreads": 5,
    "limiterMBPerSec": 0,
    "useDefaultLockFactory": false
  },
  "filterColumns": [],
  "actionColumn": "",
  "context": {
    "debug": true,
    "throwAwayBadData": false,
    "disableUpSet": false
  }
}`

const contentPath = {
  formatType: 'dataSchema.parser.parseSpec.timestampSpec.formatType',
  format: 'dataSchema.parser.parseSpec.timestampSpec.format',
  storageType: 'dataSchema.parser.type',
  overwrite: 'tuningConfig.overwrite', // 是否覆盖分区
  baseDir: 'ioConfig.firehose.baseDir', // hivers路径
  segmentGranularity: 'dataSchema.granularitySpec.segmentGranularity', // 分区存储粒度
  datasource: 'dataSchema.dataSource', // 名称
  actionColumn: 'actionColumn', // 操作列
  filterColumns: 'filterColumns', // 主键列
  disableUpSet: 'context.disableUpSet', // Task类型 true是增量插入
  timestampSpec: 'dataSchema.parser.parseSpec.timestampSpec.column', //主时间列
  dimensions: 'dataSchema.parser.parseSpec.dimensionsSpec.dimensions'// 映射关系
  // columns: 'dataSchema.parser.parseSpec.columns'// 映射关系
}
@connect(props => props[namespace])
@Form.create()
@validateFieldsAndScroll
export default class Tindex extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      info: {},
      disabled: true,
      showEditor: false,
      showCustomTimeType: true,
      hiveDbName: '',
      hiveTableName: '',
      storageType: 'parquet',
      scriptContent: {},
      dataDbs: [],
      dataFields: [],
      jobParams: []
    }
  }

  componentDidMount() {
    const { id, projectId, taskId, dispatch } = this.props
    dispatch({
      type: `${namespace}/getHiveDataSource`,
      payload: { projectId },
      callback: info => this.setState({ dataDbs: info })
    })

    if (taskId) {
      dispatch({
        type: `${namespace}/getTaskNodeInfo`,
        payload: { taskId, jobName: _.last(_.split(id, '_')) },
        callback: obj => {
          if (!obj.newjob) {
            try {
              const hiveDbName = _.get(obj, ['generalParams', 'hiveDbName'], '')
              const hiveTableName = _.get(obj, ['generalParams', 'hiveTableName'], '')
              const hasScript = !_.isEmpty(obj.scriptContent)
              let scriptContent = JSON.parse(obj.scriptContent || defaultScript)
              let formatType = _.get(scriptContent, contentPath.format, '')
              this.setState({ showEditor: hasScript, info: { ...obj }, scriptContent, hiveDbName, hiveTableName, showCustomTimeType: !['auto', 'iso', 'posix', 'millis'].includes(formatType)  })
              if (hiveTableName && hiveDbName) {
                this.getFieldsInfo(hiveTableName, hiveDbName, scriptContent)
              }
              this.setDefaultParams({ ...obj })
            } catch (error) {
              message.error('获取脚步成功，但初始化脚步失败')
            }
          } else {
            try {
              let scriptContent = JSON.parse(defaultScript)
              this.setState({ scriptContent, info: obj })
            } catch (error) {
              message.error('初始化脚步失败')
            }
          }
        }
      })
    } else {
      this.setState({ info: { scriptContent: [{ id: 1 }] } })
    }
  }

  changeStatus = () => {
    const { changeEditStatus, id } = this.props
    changeEditStatus(id, true)
  }

  // 保存前先调表单同步
  saveScript = (content) => {
    const { dispatch, taskId, id, nodeType, changeEditStatus } = this.props
    const { jobParams, scriptContent, info, hiveDbName, hiveTableName } = this.state
    let code = content === null ? '' : (content || scriptContent)

    const flowNode = FLOW_NODE_INFOS.find(p => p.nodeType === nodeType)
    const paramResult = jobParams.reduce((result, param) => {
      result[`jobOverride[${param.name}]`] = param.value
      return result
    }, {})
    dispatch({
      type: `${namespace}/saveTaskNodeInfo`,
      payload: {
        projectId: taskId,
        jobName: _.last(_.split(id, '_')),
        ...paramResult,
        'jobOverride[hiveDbName]': code ? hiveDbName : '',
        'jobOverride[hiveTableName]': code ? hiveTableName : '',
        'jobOverride[name]': _.get(info, ['generalParams', 'name'], flowNode.name),
        'jobOverride[showName]': _.get(info, ['generalParams', 'showName'], flowNode.showName),
        'jobOverride[type]': _.get(info, ['generalParams', 'type'], nodeType),
        paramJson: {},
        scriptContent: code ? JSON.stringify(code, null, 4) : ''
      },
      callback: () => {
        changeEditStatus(id, false)
      }
    })
  }

  getFieldsInfo = async (value, dbNmme, scriptContent) => {
    const { form: { getFieldValue } } = this.props
    let newScriptContent = scriptContent
    if (_.isEmpty(scriptContent)) {
      newScriptContent = this.state.scriptContent
    }
    let name = value
    const dbId = getFieldValue('hiveDbName') || dbNmme
    if (!name) {
      message.error('请选择数据源表名！')
      return
    }
    let res = await Fetch.get(`/app/hive/${dbId}/${name}/schema`)
    if (res && res.result) {
      const fields = res.result.schema.map((item, i) => ({ ...item, id: i }))
      const names = fields.map(p => p.name)
      newScriptContent = immutateUpdates(newScriptContent,
        'dataSchema.parser.parseSpec.columns',
        () => names
      )
      this.setState({ scriptContent: newScriptContent, dataFields: [...fields], disabled: false })
    } else {
      message.error('获取数据库表信息失败!')
    }
  }

  resetFields = () => {
    const { form: { setFieldsValue } } = this.props
    this.setState({ dataFields: [], disabled: true })
    setFieldsValue({
      filterColumns: undefined,
      actionColumn: undefined,
      baseDir: '',
      timestampSpec: ''
    })
  }

  syncFormValue = async (obj = {}) => {
    let { scriptContent } = this.state
    const values = await this.validateFieldsAndScroll()
    if (!values) return
    scriptContent = _.cloneDeep(scriptContent)
    _.each(_.keys(contentPath), p => {
      const value = _.get(values, contentPath[p], '')
      if (p === 'formatType') {
        _.set(scriptContent, contentPath.format, value === 'custom' ? _.get(values, contentPath.format, '') : value)
      } else if (p === 'dimensions') {
        const dimensions = _.get(values, contentPath[p], [])
        let columns = _.get(scriptContent, 'dataSchema.parser.parseSpec.columns', '')
        let newDim = []
        let sourceColumns = _.get(scriptContent, 'dataSchema.parser.parseSpec.sourceColumns', {})
        _.forEach(dimensions, p => {
          newDim.push({ name: p['_name'] || p.name, type: p['_type'] || p.type, format: p['_format'] || p.format })
          if (p['_name'] && p.name !== p['_name']) {
            const index = columns.findIndex(c => c === p.name)
            _.set(columns, index, p['_name'])
            _.set(sourceColumns, p.name, p['_name'])
          }
        })
        _.set(scriptContent, contentPath.dimensions, newDim)
        _.set(scriptContent, 'dataSchema.parser.parseSpec.columns', columns)
        _.set(scriptContent, 'dataSchema.parser.parseSpec.sourceColumns', sourceColumns)
      } else if (p === 'storageType') {
        const type = value === 'parquet' ? value : 'hdfs'
        _.set(scriptContent, contentPath[p], value)
        _.set(scriptContent, 'dataSchema.parser.parseSpec.format', type)
        _.set(scriptContent, 'ioConfig.firehose.type', type)
      } else if (p === 'filterColumns') {
        _.set(scriptContent, contentPath.filterColumns, [value])
      } else if (p !== 'format') {
        _.set(scriptContent, contentPath[p], value)
      }
    })
    return scriptContent
  }

  setDefaultParams = (data) => {
    const info = data || this.state.info
    if (info.generalParams) {
      const exclude = ['top', 'left', 'width', 'height', 'command', 'showName', 'tindex.script', 'name', 'type', 'hiveDbName', 'hiveTableName', 'ports']
      const params = []
      _.keys(info.generalParams).reduce((params, key) => {
        if (!exclude.includes(key)) {
          params.push({ name: key, value: info.generalParams[key] })
        }
        return params
      }, params)
      this.setState({
        jobParams: [...params]
      })
    }
  }

  render() {
    const { changeEditStatus, id, form: { getFieldDecorator, setFieldsValue } } = this.props
    const { disabled, showEditor, dataDbs = [], dataFields = [], showCustomTimeType, jobParams, scriptContent, hiveDbName, hiveTableName } = this.state
    let formatType = _.get(scriptContent, contentPath.format, '')
    formatType = ['auto', 'iso', 'posix', 'millis'].includes(formatType) ? formatType : 'custom'
    const format = formatType === 'custom' ? _.get(scriptContent, contentPath.format, '') : ''
    return (
      <div className="pd1l relative" style={{ height: 'calc( 100vh - 146px )', overflow: 'hidden' }}>
        <ToolBar
          showEditor={showEditor}
          jobParams={jobParams}
          changeEditStatus={() => {
            changeEditStatus(id, true)
          }}
          setParams={p => {
            this.setState({ jobParams: p })
            changeEditStatus(id, true)
          }}
          reduction={this.setDefaultParams}
          save={async() => {
            if (showEditor) {
              const script = this.editor.getValue()
              // const script = await this.syncFormValue()
              try {
                const scriptContent = script === '' ? null : JSON.parse(script)
                this.saveScript(scriptContent)
              } catch (error) {
                message.error('脚本有误')
              }
            } else {
              const script = await this.syncFormValue()
              this.saveScript(script)
            }
          }}
          editor={async () => {
            const scriptContent = await this.syncFormValue()
            if(!scriptContent) {
              return 
            }
            this.setState({ scriptContent, showEditor: true })
          }}
          goBack={() => {
            const script = this.editor.getValue()
            try {
              const scriptContent = JSON.parse(script)
              this.setState({ showEditor: false, scriptContent })
              this.props.form.resetFields()
            } catch (error) {
              message.error('脚本有误')
            }
          }}
        />
        <div>
          <div className="pd2r" style={{ overflowY: 'auto', height: 'calc(100vh - 196px)' }}>
            <Form>
              <Row type="flex" justify="space-between" align="middle"
                style={{ backgroundColor: '#ccc', marginBottom: '30px' }}
              >
                <Col
                  span={6}
                  style={{ paddingLeft: '25px', fontSize: '16px' }}
                >输入</Col>
              </Row>
              <Row>
                <Col span={8}>
                  <FItem {...formItemLayout} label="数据源名称">
                    {getFieldDecorator(contentPath.datasource, {
                      initialValue: _.get(scriptContent, contentPath.datasource),
                      rules: [
                        { required: true, message: '数据源名称不能为空' },
                        {
                          pattern: /^[\u4e00-\u9fa5_a-zA-Z0-9]+$/g,
                          message: '只能是数字、字母和中文组成!'
                        }
                      ]
                    })(<Input onChange={this.changeStatus} placeholder="数据源id名称"/>)}
                  </FItem>
                </Col>
                <Col span={8}>
                  <FItem {...formItemLayout} label="Task类型">
                    {getFieldDecorator(contentPath.disableUpSet, {
                      initialValue: _.get(scriptContent, contentPath.disableUpSet, '')
                    })(
                      <Select onChange={this.changeStatus} >
                        <Option value>增量插入</Option>
                        <Option value={false}>更新插入</Option>
                      </Select>)}
                  </FItem>
                </Col>
                <Col span={8}>
                  <FItem {...formItemLayout} label="Hive表库">
                    {getFieldDecorator('hiveDbName', {
                      initialValue: hiveDbName || '',
                      rules: [{ required: true, message: 'Hive表库不能为空' }]
                    })(
                      <Select
                        onChange={(dbName) => {
                          this.resetFields()
                          this.setState({ hiveDbName: dbName })
                          setFieldsValue({ hiveTableName: '' })
                          this.changeStatus()
                        }}
                      >
                        {dataDbs.map(
                          p => <Option key={`db-${p}`} value={p}>{p}</Option>
                        )}
                      </Select>)}
                  </FItem>
                </Col>
              </Row>
              <Row>
                <Col span={8}>
                  <FItem {...formItemLayout} label="表名">
                    {getFieldDecorator('hiveTableName', {
                      initialValue: hiveTableName,
                      rules: [{
                        required: true, message: '目标表名必填!'
                      }, {
                        max: 50, message: '1~50个字符!'
                      }].filter(_.identity)
                    })(
                      <Input.Search
                        className="width200"
                        onSearch={this.getFieldsInfo}
                        onChange={(e) => {
                          const tableName = e.target.value
                          this.setState({ hiveTableName: tableName })
                          this.resetFields()
                          this.changeStatus()
                        }}
                      />
                    )}
                  </FItem>
                </Col>
                <Col span={8}>
                  <FItem {...formItemLayout} label="主键列">
                    {getFieldDecorator(contentPath.filterColumns, {
                      initialValue: _.get(scriptContent, `${contentPath.filterColumns}.0`)
                    })(
                      <Select disabled={disabled} placeholder="事件表唯一主键列">
                        {
                          dataFields.map(field => <Option key={field.name} value={field.name}>{field.name}</Option>)
                        }
                      </Select>)}
                  </FItem>
                </Col>
                <Col span={8}>
                  <FItem {...formItemLayout} label="操作列">
                    {getFieldDecorator(contentPath.actionColumn, {
                      initialValue: _.get(scriptContent, contentPath.actionColumn) || undefined
                    })(
                      <Select placeholder="操作列，如action(a:新增,u:更新,d:删除)" disabled={disabled} onChange={this.changeStatus} >
                        {
                          dataFields.map(field => <Option key={field.name} value={field.name}>{field.name}</Option>)
                        }
                      </Select>)}
                  </FItem>
                </Col>
              </Row>
              <Row>
                <Col span={8}>
                  <FItem {...formItemLayout} label="存储类型" >
                    {getFieldDecorator(contentPath.storageType, {
                      initialValue: _.get(scriptContent, contentPath.storageType, 'parquet')
                    })(
                      <Select
                        style={{ width: '200px' }}
                        onChange={(key) => {
                          this.changeStatus()
                          this.setState({ storageType: key })
                        }}
                      >
                        <Option value="parquet">parquet</Option>
                        <Option value="tsv">csv</Option>
                      </Select>
                    )}
                  </FItem>
                </Col>
                <Col span={8}>
                  <FItem {...formItemLayout} label="Hiver路径" >
                    {getFieldDecorator(contentPath.baseDir, {
                      initialValue: _.get(scriptContent, contentPath.baseDir, '')
                    })(<Input disabled={disabled} />)}
                  </FItem>
                </Col>
              </Row>
              <Row type="flex" justify="space-between" align="middle"
                style={{ backgroundColor: '#ccc', marginBottom: '30px' }}
              >
                <Col
                  span={6}
                  style={{ paddingLeft: '25px', fontSize: '16px' }}
                >映射TIndex</Col>
              </Row>
              <Row>
                <Col span={8}>
                  <FItem {...formItemLayout} label="分区存储粒度">
                    {getFieldDecorator(contentPath.segmentGranularity, {
                      initialValue: _.get(scriptContent, contentPath.segmentGranularity, '')
                    })(
                      <Select onChange={this.changeStatus} >
                        <Option value="YEAR">YEAR</Option>
                        <Option value="MONTH">MONTH</Option>
                        <Option value="DAY">DAY</Option>
                        <Option value="HOUR">HOUR</Option>
                      </Select>)}
                  </FItem>
                </Col>
                <Col span={8}>
                  <FItem {...formItemLayout} label="是否覆盖分区">
                    {getFieldDecorator(contentPath.overwrite, {
                      initialValue: _.get(scriptContent, contentPath.overwrite, '')
                    })(
                      <Select onChange={this.changeStatus} >
                        <Option value>是</Option>
                        <Option value={false}>否</Option>
                      </Select>)}
                  </FItem>
                </Col>
                <Col span={8}>
                  <FItem {...formItemLayout} label="主时间列">
                    {getFieldDecorator(contentPath.timestampSpec, {
                      initialValue: _.get(scriptContent, contentPath.timestampSpec, '')
                    })(
                      <Select disabled={disabled}>
                        {
                          dataFields.map(field => <Option key={field.name} value={field.name}>{field.name}</Option>)
                        }
                      </Select>)}
                  </FItem>
                </Col>

              </Row>
              <Row>
                <Col span={8}>
                  <FItem {...formItemLayout} label="时间格式">
                    {getFieldDecorator(contentPath.formatType, {
                      initialValue: formatType
                    })(
                      <Select
                        onChange={
                          (key) => {
                            this.setState({ showCustomTimeType: (key === 'custom') })
                            this.changeStatus()
                          }
                        }
                      >
                        <Option value="auto">auto</Option>
                        <Option value="iso">iso</Option>
                        <Option value="posix">posix</Option>
                        <Option value="millis">millis</Option>
                        <Option value="custom">自定义</Option>
                      </Select>)}
                  </FItem>
                </Col>
                {
                  showCustomTimeType ?
                    <Col span={8}>
                      <FItem {...formItemLayout} label="自定义格式">
                        {getFieldDecorator(contentPath.format, {
                          initialValue: format,
                          rules: [{ required: true, message: '该字段不能为空' }]
                        })(
                          <Input
                            onChange={this.changeStatus}
                            placeholder="yy-MM-dd HH:mm:ss.SSS"
                          />)}
                      </FItem>
                    </Col> : null
                }
              </Row>
              <FItem label="字段映射关系">
                {getFieldDecorator(contentPath.dimensions, {
                  initialValue: _.get(scriptContent, contentPath.dimensions, [])
                })(
                  <FieldTable
                    onChange={this.changeStatus}
                    dataFields={dataFields}
                    mapping={_.get(scriptContent, 'dataSchema.parser.parseSpec.sourceColumns', {})}
                  />)}
              </FItem>
            </Form>
          </div>
          <div
            style={{
              width: '100%',
              height: 'calc(100% - 38px)',
              transition: 'left .5s cubic-bezier(0.9, 0, 0.3, 0.7)',
              position: 'absolute',
              top: '38px',
              left: `${showEditor ? '0' : '100%'}`,
              backgroundColor: 'white',
              zIndex: 9
            }}
          >
            {
              showEditor ? (<Eidtor
                language="json"
                didMount={(_, editor) => {
                  this.editor = editor
                  const { scriptContent } = this.state
                  editor.setValue(JSON.stringify(scriptContent, null, 4))
                }}
                            />)
                : null
            }
          </div>
        </div>
      </div>
    );
  }
}

Tindex.propTypes = {
  form: PropTypes.any
}
