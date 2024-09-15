import React from 'react'
import Bread from '../Common/bread'
import Steps from '../Common/access-steps'
import Papa from 'papaparse'
import { InboxOutlined } from '@ant-design/icons';
import { Button, Table, Upload, message, notification } from 'antd';
import {dictBy, exportFile, mapAwaitAll} from '../../../common/sugo-utils'
import {connect} from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import Fetch from '../../common/fetch-final'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import XLSX from 'xlsx'
import _ from 'lodash'
import * as d3 from 'd3'
import {
  editDimension,
  editUserTag
} from '../../databus/datasource'
import { DimDatasourceType } from '../../../common/constants'

let mapStateToProps = (state, ownProps) => {
  return {
  }
}


@connect(mapStateToProps)
@withRuntimeSagaModel([])
export default class ImportDimensionsByFile extends React.Component {

  state = {
    stepCurrent: 0,
    uploading: false,
    uploadResults: [],
    datasource_type: DimDatasourceType.default,
    result: [],
    dimensions: []
  }
  
  componentDidMount() {
    this.getDimensions()
  }

  async init() {
    this.setState({
      uploading: false,
      datasource_type: DimDatasourceType.default,
      result: [],
      dimensions: [],
      uploadResults: []
    })
    await this.getDimensions()
    this.setState({
      stepCurrent: 0
    })
  }

  getDimensions = async () => {
    let {id, datasource_type} = _.get(this.props,'location.query', {})
    if (!id) return
    let res = await Fetch.get(`/app/dimension/get/${id}`, {
      includeNotUsing: true,
      datasource_type
    })
    this.setState({
      dimensions: _.get(res, 'data', [])
    })
  }

  readFile = (file) => {
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
            let key = ''
            if (order[jdx] === '维度名') key = 'name'
            if (order[jdx] === '维度别名') key = 'title'
            if (!key) return
            res[key] = val
          })
          data.push(res)
        })
        this.setState({
          uploadResults: data,
          stepCurrent: 1
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
    if (!/(\.csv)$/.test(file.name)) {
      return notification.error({
        message: '提示',
        description: '仅支持上传.csv结尾的文件'
      })
    }
    this.readFile(file)
    return false
  }

  handleDownLoad = () => {
    const { dimensions } = this.state
    let columns = [{
      title: '维度名',
      dataIndex: 'name'
    },{
      title: '维度别名',
      dataIndex: 'title'
    }]
    let sortedKeys = columns.map(tCol => tCol.title)
    let sortedRows = dimensions.map(d => columns.map(tCol => {
      let val = d[tCol.dataIndex]
      return val
    }))

    let content = d3.csvFormatRows([sortedKeys, ...sortedRows])
    exportFile(`维度数据_${moment().format('YYYY-MM-DD')}.csv`, content)
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
        <a className="mg2l" onClick={() => this.handleDownLoad()}>下载维度csv文件</a> 
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
    const { uploadResults = [], dimensions = [], uploading } = this.state
    let dict = _.keyBy(dimensions,'name')
    let ds = uploadResults
    ds = ds.filter( i => {
      if (!dict[i.name]) return false
      i.id = dict[i.name].id
      return dict[i.name].title !== i.title
    })
    let columns = [{
      title: '维度名',
      dataIndex: 'name',
      key: 'name'
    },{
      title: '维度别名（修改前)',
      dataIndex: 'name',
      key: 'title',
      render: (val, record) => {
        return dict[val].title
      }
    }, {
      title: '维度别名(修改后)',
      dataIndex: 'title',
      key: 'title1'
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
          dataSource={ds}
          columns={columns}
          pagination={{
            pageSizeOptions: ['10', '20', '50', '100'],
            showQuickJumper: true,
            showSizeChanger: true,
            defaultPageSize: 20
          }}
        />
        <Button
          className="mg2t"
          type="primary"
          loading={uploading}
          onClick={() => this.submit(ds)}
        >上传修改</Button>
      </div>
    )
  }

  async submit(ds) {
    const { datasource_type } = this.state
    if (_.isEmpty(ds)) return message.error('没有需要上传的数据')
    const isTagManage = datasource_type === DimDatasourceType.tag
    this.setState({ uploading: true })
    let res = []
    for (let dim of ds) {
      let {id} = dim
      let update = {
        title: dim.title
      }
      
      try {
        if (isTagManage) {
          let { code } = await editUserTag(id, update)
          if (code === 0) res.push({...dim, status:'更新成功'})
          else res.push({...dim, status: '更新失败'})
        } else {
          let { code } = await editDimension(id, update)
          if (code === 0) res.push({...dim, status:'更新成功'})
          else res.push({...dim, status: '更新失败'})
        }
      } catch(e) {
        res.push({...dim, status: '更新失败'})
      }
    }
    this.setState({ 
      uploading: false,
      stepCurrent: 2,
      result: res
    })
  }

  renderResult() {
    const { result } = this.state
    let columns = [{
      title: '维度名',
      dataIndex: 'name',
      key: 'name'
    },{
      title: '维度别名',
      dataIndex: 'title',
      key: 'title'
    },{
      title: '状态',
      dataIndex: 'status',
      key: 'status'
    }]
    return (
      <div
        className="pd3x pd2y mg1y bg-white corner"
      >
        <Button className="mg2b" onClick={() => this.init()}>返回</Button>
        <Table 
          rowKey="id"
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
            { name: '文件修改维度别名' }
          ]}
        />
        { this.renderSteps() }
        <HorizontalSplitHelper
          style={{height: 'calc(100% - 80px)'}}
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
