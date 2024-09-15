/**
 * 批量采集配置
 */
import React, { Component } from 'react'
import { UploadOutlined, VerticalAlignBottomOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import Fetch from 'client/common/fetch-final'
import { Button, Card, Input, Select, Row, Col, Switch, Modal, Upload, message, notification } from 'antd'
import _ from 'lodash'
import XLSX from 'xlsx'

import { namespace } from '../../../saga-models/task-project'
import BatchFieldSetList from './batch-field-set-list'
import { resolve } from 'core-js/fn/promise'
import { parseString } from 'xml2js'

const FormItem = Form.Item
const { Dragger } = Upload

const Option = Select.Option
const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 18 }
}
const formItemLayout2 = {
  labelCol: { span: 6 },
  wrapperCol: { span: 2 }
}
const formItemLayout3 = {
  labelCol: { span: 6 },
  wrapperCol: { span: 18 }
}
const initColumn = [
  {
    title: '源表名',
    key: 'datasource'
  },
  {
    title: '目标表名',
    key: 'toDataSource'
  },
  {
    title: 'sql条件查询过滤语句',
    key: 'filterSql'
  },
  {
    title: '采集方式(full:全量采集、incremental:增量采集)',
    key: 'collectType'
  },
  {
    title: '增量字段',
    key: 'offsetSpec'
  },
  {
    title: '主键字段，格式（字段以逗号,隔开，如：name,id）',
    key: 'primaryKeys'
  }
]

@Form.create()
// @connect(props => props[namespace])
export default class BatchSetForm extends Component {
  state = {
    dataSource: [],
    count: 0,
    showImportVisiable: false,
    dataTables: [],
    dataFields: [],
    loadDataField: false,
    uploadFileList: [],
    showHiveVisible: false,
    showMysqlVisible: false,
    errorCount: 0,
    correctCount: 0,
    isExport: false
  }

  componentDidMount() {
    const { content = {}, dataDbs = [] } = this.props

    let showHiveVisible = false, showMysqlVisible = false, dataObj = {}

    dataDbs.map(item => {
      if (item.id == _.get(content, 'global.targetDbId', '')) {
        dataObj = item
      }
    })
    const dataSource = _.get(content, 'tableMappingInfo', []).map((item, i) => {
      return {
        id: i + 1,
        datasource: _.get(item, 'reader.datasource', ''),
        toDataSource: _.get(item, 'writer.toDataSource', ''),
        filterSql: _.get(item, 'reader.filterSql', ''),
        collectType: _.get(item, 'reader.collectType', ''),
        offsetSpec: _.get(item, 'reader.offsetSpec.column', ''),
        primaryKeys: _.get(item, 'writer.primaryKeys', ''),
        columnList: _.get(item, 'cleaner.converterList', [])
      }
    })
    // 根据目标数据源类型控制“高级配置”字段显示
    if (dataObj.dbType === 'hive') {
      showHiveVisible = true
    }
    if (dataObj.dbType === 'mysql') {
      showMysqlVisible = true
    }
    this.setState({
      dataSource,
      showHiveVisible,
      showMysqlVisible
    })
  }

  // 手动添加一行
  handleAdd = () => {
    const { dataSource, count } = this.state

    const newData = {
      id: dataSource.length != 0 ? _.maxBy(dataSource, p => p.id).id + 1 : 1,
      datasource: '',
      toDataSource: '',
      filterSql: '',
      collectType: 'full'
    }
    this.setState({
      dataSource: [...dataSource, newData],
      count: count + 1
    })
  }

  // 点击导入配置
  handleImport = () => {
    let dbId = this.props.form.getFieldValue('dbId')
    if (!dbId) {
      message.warn('请先选择源数据源！')
      return
    }
    this.setState({
      uploadFileList: [],
      showImportVisiable: true
    })
  }

  setDataSource = dataSource => {
    this.setState({ dataSource })
  }

  setChild = ref => {
    this.child = ref
  }

  // 根据数据源 ID 获取数据库列表
  getDataSourcesInfo = async dbId => {
    let res = await Fetch.get(`/app/new-task-schedule/dataBase?dataType=tableInfo&dbId=${dbId}&update=true`)
    if (res && res.status && res.status === 'success') {
      this.setState({
        dataTables: _.get(res, 'tableList', []) || []
      })
    } else {
      message.error('获取数据库表信息失败！')
    }
  }

  // 控制高级配置
  changeData = dbId => {
    const { dataDbs } = this.props
    let dataObj = {}
    dataDbs.map(item => {
      if (item.id === dbId) {
        dataObj = item
      }
    })
    let showHiveVisible = false
    let showMysqlVisible = false
    if (dataObj.dbType === 'hive') {
      showHiveVisible = true
    }
    if (dataObj.dbType == 'mysql') {
      showMysqlVisible = true
    }
    this.setState({
      showHiveVisible,
      showMysqlVisible
    })
  }

  // 上传文件前对文件做处理
  handleBeforeUpload = file => {
    const { name } = file
    const fileSuffix = _.last(_.split(name, '.'))
    if (!_.isEqual(fileSuffix, 'xlsx') && !_.isEqual(fileSuffix, 'xls')) {
      message.error('只支持上传 .xlsx,.xls 后缀的文件')
      return false
    }
    this.setState({ uploadFileList: [file] })
    return false
  }

  // 提交 Excel
  handleExcel = async () => {
    const { uploadFileList, dataSource } = this.state

    let maxId = dataSource.length != 0 ? _.maxBy(dataSource, p => p.id).id + 1 : 1
    let repeatData = [] // 重复数据记录
    let uploadResults = []
    let data = await new Promise(resolve => {
      let fileReader = new FileReader()
      fileReader.onload = e => {
        let data = new Uint8Array(e.target.result)
        let workbook = XLSX.read(data, { type: 'array' })
        // 循环 sheet
        for (let sheet in workbook.Sheets) {
          let s = workbook.Sheets[sheet]
          // !ref: A2:F8
          let split = s['!ref'].split(':')
          let minRow = parseInt(split[0].substring(1, split[0].length))
          let maxRow = parseInt(split[1].substring(1, split[1].length))
          let minCol = split[0].substring(0, 1)
          let maxCol = split[1].substring(0, 1)

          // 循环行
          for (let row = minRow + 1; row <= maxRow; row++) {
            let rowData = { id: maxId++ }
            for (let i = 0; i < 26; i++) {
              let char = String.fromCharCode(65 + i)
              if (char >= minCol && char <= maxCol) {
                let value = s[char + row]?.v || ''
                let key
                switch (i) {
                  case 0:
                    key = 'datasource'
                    value = value + ''
                    break
                  case 1:
                    key = 'toDataSource'
                    break
                  case 2:
                    key = 'filterSql'
                    break
                  case 3:
                    key = 'collectType'
                    break
                  case 4:
                    key = 'offsetSpec'
                    break
                  case 5:
                    key = 'primaryKeys'
                    value = value ? value.split(',') : []
                    break
                  default:
                    key = 'other'
                }
                // 判断是否是重复数据
                if (key === 'datasource' && (_.some(dataSource, ['datasource', value]) || _.some(uploadResults, ['datasource', value]))) {
                  rowData = {
                    ...rowData,
                    flag: true
                  }
                }
                rowData = {
                  ...rowData,
                  [key]: value
                }
              }
              // 跳过后面的列
              if (char > maxCol) break
            }
            // 重复数据记录
            if (rowData.flag) {
              repeatData.push(rowData)
              continue
            }
            this.child.handleSearchChange(rowData.datasource, rowData.id)
            uploadResults.push(rowData)
          }
        }
        resolve(uploadResults)
      }
      fileReader.readAsArrayBuffer(uploadFileList[0])
    })
    const tableNames = _.map(uploadResults, 'datasource')
    
    if (!_.isEmpty(tableNames)) {
      const dbId = this.props.form.getFieldValue('dbId')
      let params = {
        dbId: dbId,
        tableNameList: tableNames
      }
      let res = await Fetch.post(`/app/task-schedule-v3/dataBase?action=batchColumnInfo`,null, {body: JSON.stringify(params)})
      if (res && res.status && res.status === 'success') {
        const data = _.get(res, 'data')
        Object.keys(data).map(key => {
          this.child.setState({
            columnMap: {
              ...this.child.state.columnMap,
              [key]: data[key].columnList || []
            }
          })
        })
      } else {
        message.error('查询表字段失败!')
      }
    }
    this.setState({
      showImportVisiable: false,
      uploadFileList: [],
      correctCount: uploadResults.length,
      errorCount: repeatData.length,
      isExport: true,
      dataSource: [...dataSource, ...data]
    })
  }

  // 导出 Excel 模板
  exportExcel = () => {
    const _headers = initColumn
      .map((item, i) => Object.assign({}, { key: item.key, title: item.title, position: String.fromCharCode(65 + i) + 1 }))
      .reduce((prev, next) => Object.assign({}, prev, { [next.position]: { key: next.key, v: next.title } }), {})

    const output = Object.assign({}, _headers, [])
    const outputPos = Object.keys(output)
    // 计算出范围 ,["A1",..., "H2"]
    const ref = `${outputPos[0]}:${outputPos[outputPos.length - 1]}`
    const wb = {
      SheetNames: ['mySheet'],
      Sheets: {
        mySheet: Object.assign({}, output, {
          '!ref': ref,
          '!cols': [{ wpx: 45 }, { wpx: 100 }, { wpx: 200 }, { wpx: 80 }, { wpx: 100 }, { wpx: 150 }]
        })
      }
    }
    XLSX.writeFile(wb, '批量导入配置模板.xlsx')
  }

  render() {
    const { form, dataDbs, content, disabled } = this.props
    const { getFieldDecorator } = form
    const { dataSource, count, dataTables, dataFields, isExport, errorCount, correctCount, uploadFileList, showImportVisiable, showHiveVisible, showMysqlVisible } = this.state
    const hasDbData = !!_.get(content, 'global.dbId', '')

    // 文件存储格式
    const storage = [
      {
        key: 'TEXTFILE',
        value: 'TEXTFILE（默认）'
      },
      {
        key: 'SEQUENCEFILE',
        value: 'SEQUENCEFILE'
      },
      {
        key: 'RCFILE',
        value: 'RCFILE'
      },
      {
        key: 'ORCFILE',
        value: 'ORCFILE'
      },
      {
        key: 'PAROUET',
        value: 'PAROUET'
      }
    ]
    // 存储引擎下拉数据
    const engine = [
      {
        key: 'MyISAM',
        value: 'MyISAM'
      },
      {
        key: 'InnoDB',
        value: 'InnoDB'
      }
    ]

    return (
      <div>
        <Form>
          <Row span={24}>
            <Col span={10}>
              <FormItem label='源数据源' className='mg1b' hasFeedback {...formItemLayout3}>
                {getFieldDecorator('dbId', {
                  rules: [
                    {
                      required: true,
                      message: '源数据源必填'
                    }
                  ],
                  initialValue: _.get(content, 'global.dbId', '')
                })(
                  <Select className='width200' disabled={hasDbData || disabled} onChange={this.getDataSourcesInfo}>
                    {dataDbs.map(p => (
                      <Option key={`db-option-${p.id}`} value={p.id}>
                        {p.dbAlais}
                      </Option>
                    ))}
                  </Select>
                )}
              </FormItem>
            </Col>
            <Col span={10}>
              <FormItem label='目标数据源' className='mg1b' hasFeedback {...formItemLayout3}>
                {getFieldDecorator('targetDbId', {
                  rules: [
                    {
                      required: true,
                      message: '目标数据源必填'
                    }
                  ],
                  initialValue: _.get(content, 'global.targetDbId', '')
                })(
                  <Select className='width200' disabled={hasDbData || disabled} onChange={this.changeData}>
                    {dataDbs.map(p => (
                      <Option key={`db-option-${p.id}`} value={p.id}>
                        {p.dbAlais}
                      </Option>
                    ))}
                  </Select>
                )}
              </FormItem>
            </Col>
            <Col span={2}>
              <Button disabled={hasDbData || disabled} onClick={this.handleImport}>
                导入配置
              </Button>
            </Col>
            <Col span={2}>
              <Button disabled={hasDbData || disabled} onClick={this.handleAdd}>
                手动添加
              </Button>
            </Col>
          </Row>
          <Row>
            <Col span={24}>
              <FormItem>
                {getFieldDecorator('dataSource', {
                  initialValue: dataSource || []
                })(
                  <BatchFieldSetList
                    setChild={this.setChild}
                    dbId={this.props.form.getFieldValue('dbId')}
                    isHive={showHiveVisible}
                    dataTables={dataTables}
                    setDataSource={this.setDataSource}
                    dataSource={dataSource}
                    total={count}
                    disabled={hasDbData || disabled}
                  />
                )}
              </FormItem>
            </Col>
          </Row>
          {
            isExport && (
              <Row>
                <Col className='mg4l'>
                  {
                    <span>
                      总共导入<span className='color-blue fw900'>{errorCount + correctCount}</span>条数据,
                      成功<span className='color-green fw900'>{correctCount}</span>条,
                      错误<span className='color-red fw900'>{errorCount}</span>条
                    </span>
                  }
                </Col>
              </Row>
            )
          }
          <Card
            title='高级配置'
            style={{
              width: '93%',
              margin: 'auto',
              textAlign: 'center',
              marginTop: '20px',
              marginBottom: '80px'
            }}
          >
            <Row>
              <Col span={12}>
                <FormItem label='需要替换的字符' hasFeedback {...formItemLayout}>
                  {getFieldDecorator('dirtyChart', {
                    initialValue: _.get(content, 'global.dirtyChart', '')
                  })(<Input disabled={hasDbData || disabled} />)}
                </FormItem>
              </Col>
              <Col span={12}>
                <FormItem label='替换后的字符' hasFeedback {...formItemLayout}>
                  {getFieldDecorator('replaceChart', {
                    initialValue: _.get(content, 'global.replaceChart', '')
                  })(<Input disabled={hasDbData || disabled} />)}
                </FormItem>
              </Col>
            </Row>
            {showHiveVisible && (
              <>
                <Row span={24}>
                  <Col span={12}>
                    <FormItem label='额外建表信息' {...formItemLayout}>
                      {getFieldDecorator('extraInfo', {
                        initialValue: _.get(content, 'global.extraInfo', '')
                      })(
                        <Input disabled={hasDbData || disabled}/>
                      )}
                    </FormItem>
                  </Col>
                </Row>
                <Row>
                  <Col span={12}>
                    <FormItem label='分区字段' {...formItemLayout}>
                      {getFieldDecorator('partitionColumn', {
                        initialValue: _.get(content, 'global.partitionColumn', 'dt')
                      })(
                        <Input disabled={hasDbData || disabled}/>
                      )}
                    </FormItem>
                  </Col>
                  <Col span={12}>
                    <FormItem label='类型' {...formItemLayout}>
                      {getFieldDecorator('partitionType', {
                        initialValue: _.get(content, 'global.partitionType', 'string')
                      })(
                        <Input disabled={hasDbData || disabled}/>
                      )}
                    </FormItem>
                  </Col>
                </Row>
              </>
            )}
            {showMysqlVisible && (
              <Row span={24}>
                <Col span={12}>
                  <FormItem label='存储引擎' hasFeedback {...formItemLayout}>
                    {getFieldDecorator('engine', {
                      initialValue: _.get(content, 'global.engine', '')
                    })(
                      <Select disabled={hasDbData || disabled}>
                        {engine.map(item => (
                          <Option key={item.key}>{item.value}</Option>
                        ))}
                      </Select>
                    )}
                  </FormItem>
                </Col>
              </Row>
            )}
          </Card>
        </Form>

        <Modal title='导入配置' width={600} visible={showImportVisiable} onCancel={() => this.setState({ showImportVisiable: false })} onOk={this.handleExcel}>
          <Button className='mg4l' size='large' icon={<VerticalAlignBottomOutlined />} onClick={this.exportExcel}>
            导出模板
          </Button>
          <Upload className='mg4l' accept='.xlsx,.xls' fileList={uploadFileList} multiple={false} beforeUpload={file => this.handleBeforeUpload(file)}>
            <Button size='large' type='primary' icon={<UploadOutlined />}>
              选择上传文件
            </Button>
          </Upload>
        </Modal>
      </div>
    )
  }

  getFieldsInfo = async tableName => {
    const { fileContent, form, changeParentStatus } = this.props
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
      let fields =  _.concat(columnInfo, columnList).map(p => {
        const index = fields.findIndex(d => d.finalCol === p.finalCol)
        if (index < 0) {
          const status = _.includes(oldNames, p.finalCol) && _.includes(newNames, p.finalCol) ? 0 : _.includes(oldNames, p.finalCol) ? -1 : 1
          return { ...p, status }
        }
      })
      this.setState({ dataFields: fields })
      changeParentStatus && changeParentStatus()
      return
    } 
    message.error('获取数据库表信息失败!')
  }
}
