import React from 'react'
import Bread from '../Common/bread'
import Steps from '../Common/access-steps'
import Papa from 'papaparse'
import {
  dataSourceListSagaModelGenerator,
  indicesSagaModelGenerator,
  tagSagaModelGenerator
} from './saga-model-generators'
import { TagTypeEnum } from '../../../common/constants'
import { InboxOutlined } from '@ant-design/icons';
import { Button, Table, Upload, message, notification } from 'antd';
import {dictBy, forAwaitAll, isDiffByPath} from '../../../common/sugo-utils'
import {connect} from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {parse} from './formula-parser'
import { TextDimFilterOpNameMap } from './filters-editor-for-offline-calc'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import Fetch from '../../common/fetch-final'
import XLSX from 'xlsx'
import _ from 'lodash'
import './hideHeadButton.styl'
import {genIndicesId} from '../../common/offline-calc-helper'

const namespace = 'offline-calc-manager-indices'

let mapStateToProps = (state, ownProps) => {
  const indicesListState = state['offline-calc-indices-list-for-manager-indices'] || {}
  const dsListState = state['offline-calc-data-sources-list-for-manager-indices'] || {}
  const tagsListState = state[`${namespace}_${TagTypeEnum.offline_calc_index}`] || {}

  const isFetching = dsListState.isFetchingOfflineCalcDataSources 
  || indicesListState.isFetchingOfflineCalcIndices
  || tagsListState.isFetchingTags
  return {
    ...indicesListState,
    isFetching,
    offlineCalcDataSources: dsListState.offlineCalcDataSources,
    offlineCalcIndices: indicesListState.offlineCalcIndices,
    dimNameIdDict: [],
    tags: tagsListState.tags
  }
}


@connect(mapStateToProps)
@withRuntimeSagaModel([
  indicesSagaModelGenerator('offline-calc-indices-list-for-manager-indices'),
  dataSourceListSagaModelGenerator('offline-calc-data-sources-list-for-manager-indices'),
  tagSagaModelGenerator(namespace, TagTypeEnum.offline_calc_index)
])
export default class OfflineCalcManagerByHand extends React.Component {

  state = {
    stepCurrent: 0,
    uploadResults: [],
    selectedRowKeys: [],
    selectedRows: [],
    result: [],
    uploading: false
  }
  
  componentDidMount() {
  }

  init() {
    this.setState({
      stepCurrent: 0,
      uploadResults: [],
      selectedRowKeys: [],
      selectedRows: [],
      result: [],
      uploading: false
    })
  }

  parseFormula(text) {
    let ast, status = true, formula_info = {}
    try {
      ast = parse(text)
    } catch (e) {
      status = false
    }
    
    return {
      ast,
      status
    }
  }

  transformFormula(formula = '') {
    let { offlineCalcIndices, offlineCalcDataSources, dimNameIdDict, tags } = this.props
    let indicesNameDict = dictBy(offlineCalcIndices, o => o.name)
    let status = true
    let idxDeps = []
    let dimDeps = []
    formula = _.isNil(formula) ? '' : `${formula}` // toString
    let uiText = formula

    let dsId = ''
    let datasourceName = ''

    let dsNameDict = dictBy(offlineCalcDataSources, o => o.name, o => o.id)
    let opNameDict = {}

    for (let k in TextDimFilterOpNameMap) {
      opNameDict[TextDimFilterOpNameMap[k]] = k
    }
    
    let reg = /\[(.+?)\]/g
    let params = `${_.isNil(formula) ? '' : formula}`.match(reg)
    if (!_.isEmpty(params)) {
      params.map( i => {
        let param = i.replace(/\[|]/g,'')

        if (param.includes(' 的 ')) {
          //维度
          let tempItem1 = param.split(' 的 ')
          param = tempItem1[0]
          let aggregator = tempItem1[1]

          if (param.includes('/')) {
            //从数据源选择
            let tempItem2 = param.split('/')
            datasourceName = tempItem2[0]
            let tableName = tempItem2[1]
            let fieldName = tempItem2[2]

            dsId = _.get(dsNameDict, datasourceName, '')
            if (!dsId) status = false

            param = `createIdx({\"dim\":{\"func\":\"importDim\",\"args\":[{\"dsId\":\"${dsId}\",\"tableName\":\"${tableName}\",\"dataType\":0,\"fieldName\":\"${fieldName}\"}]},\"aggregator\":\"${_.get(opNameDict, aggregator, 'count')}\",\"filters\":[]})`
            dimDeps.push(`${dsId}|${tableName}|${fieldName}`)

          }
        } else if (param.includes('已删除')) {
          status = false
          //直接报错
        } else {
          //指标

          if (param.includes('|')) {
            let tempIndicesName = []
            tempIndicesName = param.split('|')
            param = tempIndicesName[1]
            datasourceName = tempIndicesName[0]
            dsId = _.get(dsNameDict, datasourceName, null)
            if (!dsId) status = false
          }
          const indicesId = _.get(indicesNameDict, `${param}.id`)

          if (!indicesId) status = false

          dsId = dsId ? `\"${dsId}\"` : null
          param = `useIdx({\"dsId\":${dsId},\"idxId\":\"${indicesId}\"})`
          idxDeps.push(indicesId)
        }

        formula = formula.replace(i, param)
      })
    }

    console.log(status,'status-finally===')

    formula = formula.replace(/\×/g, '*')
    formula = formula.replace(/\÷/g, '/')

    return {
      uiText,
      text: formula,
      idxDeps,
      dimDeps,
      status
    }
  }

  
  transformtags(tags) {
    const { tags: originTags } = this.props
    let tagNameDict = _.keyBy(originTags, 'name')
    if (!tags) return {
      tags: [],
      status: true
    }
    tags = tags.split(',')
    if (!_.isArray(tags) || _.isEmpty(tags)) return {
      tags: [],
      status: false,
      error: '非法分组'
    }
    tags = tags.map( i => {
      let id = _.get(tagNameDict[i], 'id')
      if (id) return id
      return ''
    }).filter(_.identity)

    if (_.isEmpty(tags)) return {
      tags: [],
      status: false,
      error: '不存在的分组名称'
    }

    return {
      tags,
      status: true
    }
  }

  transformDatasource(datasource) {
    if (!datasource) return null
    let { offlineCalcDataSources } = this.props
    let dsNameDict = dictBy(offlineCalcDataSources, o => o.name, o => o.id)
    const dsId = _.get(dsNameDict, datasource, '不存在的数据源')
    return dsId
  }

  readFile = (file) => {
    var fileReader = new FileReader()
    fileReader.onload = (e) => {
      let uploadResults = []
      var data = new Uint8Array(e.target.result)
      var workbook = XLSX.read(data, {type: 'array'})
      for (let sheet in workbook.Sheets) {
        if (sheet.includes('indices')) {
          let array = XLSX.utils.sheet_to_json(workbook.Sheets[sheet])
          uploadResults.push(...array)
        }
      }
      uploadResults = uploadResults.map( i => ({ ..._.omit(i, 'no'), id: i.no}))
      this.setState({
        uploadResults,
        stepCurrent: 1
      })
    }
    fileReader.readAsArrayBuffer(file)
    return

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
        let { offlineCalcIndices, offlineCalcDataSources, dimNameIdDict, tags } = this.props
        let indicesNameDict = dictBy(offlineCalcIndices, o => o.name)
        let order = uploadResults[0]

        // order = ["id", "name", "title", "description", "data_source_name", "formula_info", "tags"] 

        uploadResults.shift()

        let data = [] 
        uploadResults.map( (i,idx) => {
          let res = {}
          if (i.length !== order.length) return ''
          i.map( (val, jdx) => {

            res[order[jdx]] = val
          })
          data.push(res)
        })
        this.setState({
          uploadResults: data,
          stepCurrent: 1
          // fileSize: file.size
        })
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
    if (!/(\.xlsx)$/.test(file.name)) {
      return notification.error({
        message: '提示',
        description: '仅支持上传.xlsx结尾的文件'
      })
    }
    this.readFile(file)
    return false
  }

  renderSteps() {
    let { stepCurrent } = this.state
    let steps = [
      {
        title: '导入文件'
      },
      {
        title: '预览结果'
      },
      {
        title: '完成导入'
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
      action: '/app/offline-calc/indices-import',
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

  genPreviewDs() {
    const { offlineCalcDataSources, offlineCalcIndices, dimNameIdDict } = this.props
    let indicesNameDict = dictBy(offlineCalcIndices, o => o.name)
    const { uploadResults: pendingData } = this.state

    let fetchedDataDict = _.keyBy(offlineCalcIndices, d => d.id)

    //不是新建的　全部视为修改　无论有没有改
    let preUpdateModels = []
    let preCreateModels = []
    pendingData.map((pd, idx) => {
      let idReg = /^[a-z_-][\w-]+$/i
      let isLegalId = true
      if (pd.id)  isLegalId = pd.id.length <= 32 && idReg.test(pd.id || '')

      //公有版本的在此处也视为修改　后端判断是否公有版本　并选择新建　修改
      let tags = pd.tags
      let data_source_name = pd.data_source_name
      pd = _.omit(pd, 'data_source_name')
      data_source_name = this.transformDatasource(data_source_name)

      pd.data_source = {
        state: true,
        id: data_source_name
      }

      if (data_source_name === '不存在的数据源') {
        pd.data_source = {
          state: false,
          error: '不存在的数据源'
        }
      }

      let tagsRes = this.transformtags(tags)

      pd.tags = {
        state: tagsRes.status,
        tags: tagsRes.tags
      }

      if (!tagsRes.status) {
        pd.tags = {
          error: tagsRes.error,
          state: tagsRes.status
        }
      }

      let isUpdate = pd.id　&& pd.id in fetchedDataDict 
      let isCreate = !isUpdate

      if (isUpdate) {
        //修改的判断formula_info和uitext是否相同　相同的去掉不修改　否则要生成ast 
        let preFormula = _.get(fetchedDataDict[pd.id], 'formula_info.uiText')
        preFormula = preFormula.replace(/÷/g, '/')
        preFormula = preFormula.replace(/×/g, '*')
        let nextFormula = pd.formula_info

        if (pd.formula_info) {
          if (preFormula !== nextFormula) {
            let transFormulaRes = this.transformFormula(pd.formula_info)
            let astRes = {}
            if (transFormulaRes.status) astRes = this.parseFormula(transFormulaRes.text)
            
            pd.formula_info_state = {
              error: '非法公式',
              state: false
            }
  
            if (astRes.status) {
              pd.formula_info_state = {
                state: true
              }
              pd.formula_info = {
                info: {
                  ..._.omit(transFormulaRes, 'status'),
                  ast: astRes.ast
                }
              }
            }
          } else {
            pd = _.omit(pd, 'formula_info')
            pd.formula_info_state = {
              state: true
            }
          }
        }
        preUpdateModels.push({ ...pd, isLegalId})
      } else {
        pd.formula_info_state = {
          state: false,
          error: '非法公式'
        }
      }
      
      if (isCreate) {
        let transFormulaRes = this.transformFormula(pd.formula_info)
        let astRes = {}
        if (transFormulaRes.status) astRes = this.parseFormula(transFormulaRes.text)

        pd.formula_info_state = {
          error: '非法公式',
          state: false
        }

        if (astRes.status) {
          pd.formula_info_state = {
            state: true
          }
          pd.formula_info = {
            info: {
              ..._.omit(transFormulaRes, 'status'),
              ast: astRes.ast
            }
          }
        }

        preUpdateModels.push({ id: pd.id || '', ..._.omit(pd, 'id'), isLegalId })
      }
    })

    return [...preCreateModels, ...preUpdateModels]

  }

  renderPreview() {
    const { selectedRowKeys, selectedRows, uploading } = this.state
    let ds = this.genPreviewDs()
    
    let columns = [{
      title: '编号',
      dataIndex: 'id',
      key: 'id',
      render: (val, record) => record.id || val
    },{
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (val, record) => record.title || val 
    }, {
      title: '是否修改',
      key: 'isUpdate',
      render: (val, record) => record.id ? '修改' : '新建'
    }, {
      title: '编号是否合法',
      dataIndex: 'isLegalId',
      key: 'isLegalId',
      render: (val) => {
        if (val) return '是'
        return '否'
      }
    },{
      title: '数据源名称是否合法',
      dataIndex: 'data_source',
      key: 'data_source',
      render: (val) => {
        if (val.state) return '是'
        return val.error
      }
    }, {
      title: '分组名称是否合法',
      dataIndex: 'tags',
      key: 'tags',
      render: (val) => {
        if (val.state) return '是'
        return val.error
      }
    }, {
      title: '计算公式是否合法',
      dataIndex: 'formula_info_state',
      key: 'formula_info',
      render: (val) => {
        if (val.state) return '是'
        return val.error
      }
    }]


    return (
      <div
        className="pd3x pd2y mg1y bg-white corner"
      >
        <Button className="mg2b" onClick={() => {
          if (uploading) return 
          this.init()
        }}
        >返回上一步</Button>
        <Table 
          rowKey="id"
          id="offline-calc-previewTable"
          bordered
          dataSource={ds}
          columns={columns}
          rowSelection={{
            //没生效 1.升级 2.自定义表头 隐藏默认表头
            hideDefaultSelections: true,
            selectedRowKeys,
            onChange: (keys, rows) => {
              let nextRows = _.cloneDeep(selectedRows)
              let key = keys[keys.length - 1]
              if (keys.length < selectedRowKeys.length) {
                nextRows.splice(key, 1)
                return this.setState({
                  selectedRowKeys: keys,
                  selectedRows: nextRows
                })
              }
              let record = rows.pop()
              let name = record.name
              let isLegalId = record.isLegalId
              let data_source = record.data_source
              let tags = record.tags
              let formula_info = record.formula_info_state
              let canImport = data_source.state && tags.state && formula_info.state && Boolean(name) && isLegalId
              if (!canImport) return message.error('校验不通过')

              let dsNameDict = dictBy(ds, o => o.id)
              nextRows.push(dsNameDict[key])
              this.setState({
                selectedRowKeys: keys,
                selectedRows: nextRows
              })
            }
          }}
        />
        <Button
          type="primary"
          loading={uploading}
          onClick={() => this.submit(selectedRows)}
        >导入选中的指标</Button>
        <Button
          type="primary"
          className="mg2l"
          loading={uploading}
          onClick={() => {
            let passDs = ds.filter( record => {
              let name = record.name
              let data_source = record.data_source
              let tags = record.tags
              let formula_info_state = record.formula_info_state
              let canImport = data_source.state && tags.state && formula_info_state.state && Boolean(name)
              return canImport
            })
            this.submit(passDs)
          }}
        >导入全部通过校验的指标</Button>
      </div>
    )
  }

  async submit(ds) {
    if (_.isEmpty(ds)) return message.error('没有选中指标')
    this.setState({ uploading: true })
    const { offlineCalcIndices } = this.props
    let indicesIdDict = dictBy(offlineCalcIndices, o => o.id)

    let reg = /^[a-z_]\w+$/i
    let res = []
    try {
      res = await forAwaitAll(ds, async record => {
        let params = {
          ..._.pick(record, [
            'title',
            'name',
            'description'
          ]),
          data_source_id: record.data_source.id || null,
          tags: record.tags.tags,
          formula_info: _.get(record.formula_info, 'info')
        }
        
        if (!record.name || !reg.test(record.name) || record.name === ' ' || _.get(record,'name').length > 32) {
          return { 
            id,
            name: record.title || record.name,
            state: '英文名称错误'
          }
        }
  
        if (record.title === ' ' || _.get(record, 'title', '').length > 32) {
          return { 
            id,
            name: record.title || record.name,
            state: '别名错误'
          }
        }
  
        let id = _.get(record, 'id')
        if (id) {
          //先看先是否存在 不存在就新建
          if (!(id in indicesIdDict)) {
            params.params = {
              composeType: 'ImportedIndicator'
            }
            let { result } = await Fetch.post('/app/offline-calc/indices', params)
            if (!result || _.isEmpty(result)) {
              return { 
                id,
                name: record.title || record.name,
                state: '失败'
              }
            }
          } else {
            //校验formula_info是否改变(用uiText对比) 没改变不带
            let nextFormulaInfo = _.get(record, 'formula_info.info')
            let pre = _.get(indicesIdDict, id, {})
            let preFormulaInfo = _.get(pre, 'formula_info', {})
            if (!isDiffByPath(preFormulaInfo, nextFormulaInfo, 'uiText')) {
              params = _.omit(params, 'formula_info')
            }
            //修改
            let { result } = await Fetch.put(`/app/offline-calc/indices/${id}`, params)
            if (!result || _.isEmpty(result)) {
              return { 
                id,
                name: record.title || record.name,
                state: '失败'
              }
            }
          }
        } else {
          //新建
          params.id = genIndicesId()
          params.params = {
            composeType: 'ImportedIndicator'
          }
          let { result } = await Fetch.post('/app/offline-calc/indices', params)
          if (!result || _.isEmpty(result)) {
            return { 
              id,
              name: record.title || record.name,
              state: '失败'
            }
          }
        }
        return { 
          id,
          name: record.title || record.name,
          state: '成功'
        }
      })

      this.setState({
        stepCurrent: 2,
        uploading: false,
        result: res
      })
    } catch (e) {
      message.error('出错了')
      this.setState({ uploading: false })
    }

  }

  renderResult() {
    const { result } = this.state
    let columns = [{
      title: '名称',
      dataIndex: 'name',
      key: 'name'
    },{
      title: '状态',
      dataIndex: 'state',
      key: 'state'
    }]
    return (
      <div
        className="pd3x pd2y mg1y bg-white corner"
      >
        <Button className="mg2b" onClick={() => this.init()}>返回</Button>
        <Table 
          rowKey="id"
          bordered
          dataSource={result}
          columns={columns}
        />
      </div>
    )
  }
  
  render() {
    let { stepCurrent } = this.state

    let steps = [ 
      this.renderImport(),
      this.renderPreview(),
      this.renderResult()
    ]

    return (
      <div className="height-100 bg-white">
        <Bread
          path={[
            { name: '手工指标管理' }
          ]}
        />
        { this.renderSteps() }
        <HorizontalSplitHelper
          style={{height: 'calc(100% - 44px)'}}
          className="contain-docs-analytic"
        >
          <div 
            className="itblock height-100 overscroll-y"
            style={{padding: '10px 10px 10px 5px'}}
            defaultWeight={5}
          >
            { steps[stepCurrent] }
          </div>
        </HorizontalSplitHelper>
      </div>
    )
  }
}
