import React from 'react'
import {withCommonFilter} from '../../Common/common-filter'
import _ from 'lodash'
import classNames from 'classnames'
import Icon, { CheckCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Radio, Upload, Button, Table, Select, Tooltip, message } from 'antd';
import {readLinesWithPapa} from '../../../common/read-csv-from-local'
import * as d3 from 'd3'
import HoverHelp from '../../Common/hover-help'
import {immutateUpdate, guessStrArrayType} from '../../../../common/sugo-utils'
import {withSizeProvider} from '../../Common/size-provider'
import Timer from '../../Common/timer'
import FetchFinal from '../../../common/fetch-final'
import moment from 'moment'
import {withUploadedFiles} from '../../Fetcher/uploaded-files-fetcher'
import {loadLinesOfCSVFromURL} from '../../../common/read-csv-from-url'
import smartSearch from '../../../../common/smart-search'
import {UploadedFileType} from '../../../../common/constants'

const {Group: RadioGroup} = Radio
const {Option} = Select

const percentFormatter = d3.format('.0%')

const TypeSortOrder = {
  LossPredictField: 0,
  UserId: 1,
  Integer: 2,
  Long: 3,
  Float: 4,
  Char: 5,
  DateTime: 6
}

const SubStepEnum = {
  PickAFile: 0,
  SettingColumns: 1,
  Uploading: 2,
  UploadCompleted: 3
}

let fieldHoverHint = (
  <HoverHelp
    placement="bottom"
    addonAfter="字段类型说明"
    content={(
      <div>
        Int：数据类型可以存储从 -2^31（-2,147,483,648）到 2^31（2,147,483,647）之间的整数。存储到数据库的几乎所有数值型的数据都可以用这种数据类型。
        <br/><br/>
        Long：变量以带符号的 64 位（8 字节）整数形式存储，取值范围为 -9,223,372,036,854,775,808 到 9,223,372,036,854,775,807。
        <br/><br/>
        Float：数据类型是一种近似数值类型，供浮点数使用。说浮点数是近似的，是因为在其范围内不是所有的数都能精确表示。
        <br/><br/>
        Char：数据类型用来存储指定长度的定长非统一编码型的数据。
        <br/><br/>
        Datetime：数据类型用来表示日期和时间。这种数据类型存储从 1753 年 1 月 1 日到 9999 年 12 月 31 日间所有的日期和时间数据.
      </div>
    )}
  />
)

async function loadCSVFromLocal(file) {
  try {
    let lines = await readLinesWithPapa(file, {limit: 100})
    let [header, ...data] = lines
    let result = data.map(arr => _.zipObject(header, arr))
    result.columns = header
    return result
  } catch (e) {
    message.error('无法读取此文件，请确保文件是 UTF-8 编码')
  }
}

async function loadCSVByFileId(fileId) {
  let dataWithHeader = await loadLinesOfCSVFromURL(`/app/uploaded-files/download/${fileId}`, {limit: 100})

  let header = dataWithHeader.columns
  let result = dataWithHeader.map(arr => _.zipObject(header, arr))
  result.columns = header
  return result
}

let labelTypesSet = new Set(['Long', 'Integer', 'Char'])
let posValuesSet = new Set(['是', 'Y', '1', 'y', 'true', 'TRUE', 't', 'T'])
let negValuesSet = new Set(['否', 'N', '0', 'n', 'false', 'FALSE', 'f', 'F'])
let idRegExp = /id/i

class CSVDataImporter extends React.Component {
  state = {
    subStep: SubStepEnum.PickAFile,
    isLoadingFileContent: false,
    preUploadFile: null,
    selectedTrainingFileId: null,
    csvData: [],
    columnsTypeDict: {},
    pageNum: 1,
    pageSize: 10,
    uploadProgress: 0
  }

  componentWillMount() {
    let {lossPredictModel} = this.props
    let {training_file_id} = lossPredictModel || {}
    if (training_file_id) {
      this.state.selectedTrainingFileId = training_file_id
      this.state.preUploadFile = null
      this.onNextStep()
    }
  }

  onPrevStep = () => {
    let {updateHashStateByPath} = this.props
    let {subStep} = this.state
    if (!subStep) {
      throw new Error('No prev step')
    } else if (subStep === SubStepEnum.SettingColumns) {
      this.setState({subStep: SubStepEnum.PickAFile})
    } else if (subStep === SubStepEnum.UploadCompleted || subStep === SubStepEnum.Uploading) {
      this.setState({subStep: SubStepEnum.SettingColumns})
    }
  }

  guessTypes(csvData, nativeTypeOnly = false) {
    let samples = _.sampleSize(csvData, 20)

    let guessedTypes = csvData.columns.map(colName => {
      let valSamples = samples.map(d => d[colName]).filter(_.identity)

      let guessedType = guessStrArrayType(valSamples, 'Char')
      if (!nativeTypeOnly && labelTypesSet.has(guessedType)) {
        // 自动选择 UserId 字段
        if (idRegExp.test(colName) && _.uniq(valSamples).length === valSamples.length) {
          return 'UserId'
        }
        // 自动选择流失预警字段
        if (_.some(valSamples, v => posValuesSet.has(v) || negValuesSet.has(v)) && _.uniq(valSamples).length <= 2) {
          return 'LossPredictField'
        }
      }
      return guessedType
    })
    return _.zipObject(csvData.columns, guessedTypes)
  }

  onNextStep = async () => {
    let {step, updateHashStateByPath, updateLossPredictModel, lossPredictModel, reloadLossPredictModels} = this.props
    let {subStep, columnsTypeDict, preUploadFile, selectedTrainingFileId, csvData} = this.state

    if (subStep === SubStepEnum.PickAFile) {
      this.setState({isLoadingFileContent: true})
      let csvData
      try {
        csvData = preUploadFile ? await loadCSVFromLocal(preUploadFile) : await loadCSVByFileId(selectedTrainingFileId)
        if (!csvData || !csvData[0]) {
          message.error('读取数据失败，请确认文件是 UTF-8 格式')
          return
        }
      } catch (e) {
        if (/not\s+found/i.test(e)) {
          message.warn('文件不存在，无法读取')
          return
        }
      }
      // 如果之前已经设置过，则保留设置
      let initGuessTypes = this.guessTypes(csvData)
      let nextColumnsTypeDict
      if (selectedTrainingFileId && lossPredictModel.training_file_id === selectedTrainingFileId) {
        nextColumnsTypeDict = _.get(lossPredictModel, 'training_settings.columnsTypeDict')
      } else {
        nextColumnsTypeDict = initGuessTypes
      }
      this.setState({
        subStep: SubStepEnum.SettingColumns,
        isLoadingFileContent: false,
        csvData: csvData,
        columnsTypeDict: nextColumnsTypeDict,
        pageSize: 10,
        pageNum: 1
      })
    } else if (subStep === SubStepEnum.SettingColumns) {
      // 判断有无选择 用户ID字段 和 流失预警字段

      let allTypes = _.values(columnsTypeDict)
      let lossPredictFields = allTypes.filter(val => val === 'LossPredictField')
      if (lossPredictFields.length < 1) {
        message.error('请先设置一个 流失预警字段')
        return
      } else if (1 < lossPredictFields.length) {
        message.error('至多设置一个 流失预警字段')
        return
      }
      let userIdFields = allTypes.filter(val => val === 'UserId')
      if (userIdFields.length < 1) {
        message.error('请先设置一个 用户ID 字段')
        return
      } else if (1 < userIdFields.length) {
        message.error('至多设置一个 用户ID 字段')
        return
      }

      if (preUploadFile) {
        this.setState({
          subStep: SubStepEnum.Uploading,
          uploadProgress: 0
        })
      } else {
        let res = await updateLossPredictModel({
          id: lossPredictModel.id,
          training_file_id: selectedTrainingFileId,
          training_settings: {
            columnsTypeDict,
            trainingFields: _.orderBy(_.keys(columnsTypeDict), colName => TypeSortOrder[columnsTypeDict[colName]]),
            csvColumns: csvData.columns
          }
        })
        if (res) {
          await reloadLossPredictModels()
          updateHashStateByPath('step', step => step + 1)
        }
      }
    } else if (subStep === SubStepEnum.UploadCompleted) {
      updateHashStateByPath('step', step => step + 1)
    }
  }

  canGoNextStep() {
    let {step, updateHashStateByPath} = this.props
    let {subStep, preUploadFile, columnsTypeDict, csvData, selectedTrainingFileId} = this.state
    if (subStep === SubStepEnum.PickAFile) {
      return !!(preUploadFile || selectedTrainingFileId)
    } else if (subStep === SubStepEnum.SettingColumns) {
      // 全部字段都选择了之后就能继续
      let keysHasType = _.keys(columnsTypeDict)
      let allColumns = csvData.columns
      return _.difference(allColumns, keysHasType).length === 0
    } else if (subStep === SubStepEnum.Uploading) {
      return false
    } else if (subStep === SubStepEnum.UploadCompleted) {
      return true
    }
    return false
  }

  renderNextStepPart() {
    let {updateHashStateByPath} = this.props
    let {subStep, isLoadingFileContent} = this.state

    return (
      <div className="height100 relative bordert dashed">
        {subStep === SubStepEnum.PickAFile
          ? null
          : (
            <Button
              className="vertical-center-of-relative mg3l width150"
              onClick={this.onPrevStep}
            >上一步</Button>
          )
        }
        <Button
          className="center-of-relative width150"
          type="primary"
          loading={isLoadingFileContent}
          disabled={!this.canGoNextStep()}
          onClick={this.onNextStep}
        >下一步</Button>
      </div>
    )
  }

  beforeUpload = (file) => {
    const isSmallEnough = file.size / 1024 / 1024 <= 5
    if (!isSmallEnough) {
      message.error('CSV must smaller than 5MB!')
    } else {
      this.setState({preUploadFile: file, selectedTrainingFileId: null})
    }
    return false
  }

  renderPickFileStep = withCommonFilter((commonFilterProps) => {
    let {keywordInput: KeywordInput, searching} = commonFilterProps
    let {files} = this.props
    let {preUploadFile, selectedTrainingFileId, isLoadingFileContent} = this.state

    let uploadFileSpec = (
      <HoverHelp
        placement="bottom"
        addonAfter="上传文件说明"
        content={(
          <div>
            1. 上传的文件格式为 CSV 文件，并确保你的文件编码方式为 UTF-8
            <br/>
            2. 上传的数据中，用户数记录要大于 3000条，同时保证采集的训练样本数据为随机分布的用户数，确保生成模型的准确率
          </div>
        )}
      />
    )

    let filteredFiles = searching
      ? files.filter(f => {
        let date = moment(f.created_at).format('YYYY-MM-DD HH:MM')
        let str = `流失预警训练数据 ${date}（${f.name}）`
        return smartSearch(searching, str)
      })
      : files

    return (
      <div
        className={classNames('bordert dashed', {hidden: isLoadingFileContent})}
        style={{height: 'calc(100% - 100px)'}}
      >
        <div className="height80 line-height80 bordert dashed pd3l relative">
          温馨提示：请导入用于训练模型的数据，格式为 CSV 文件，并确保你的文件编码方式为 UTF-8 <span className="color-red">（{uploadFileSpec}）</span>
          <a href="/_bc/sugo-analytics-static/assets/files/loss-predict-training-data-spec-and-samples.zip">
            <Button
              className="vertical-center-of-relative right0 mg3r width150"
              type="success"
            >下载导入模版</Button>
          </a>
        </div>

        <div className="itblock relative bordert dashed" style={{width: '56%', height: 'calc(100% - 80px)'}}>
          <div className="center-of-relative aligncenter">
            <Upload
              showUploadList={false}
              accept="text/csv, text/comma-separated-values, application/csv"
              beforeUpload={this.beforeUpload}
            >
              <div
                className="itblock width100 height100 relative mg3b pointer"
                style={{border: '1px solid #999999'}}
              >
                <PlusOutlined className="center-of-relative color-purple" style={{fontSize: '100px'}} />
              </div>

              <p>
                {preUploadFile
                  ? `点击下一步上传：${preUploadFile.name}`
                  : files.length === 0 ? '当前还没任何数据，请点此导入文件' : '点此导入文件'}
              </p>
            </Upload>
          </div>
        </div>

        <div className="borderl itblock bordert dashed" style={{width: '44%', height: 'calc(100% - 80px)'}}>
          <p className="pd3x pd2t">
            已上传的数据文件列表
          </p>
          <KeywordInput
            className="pd3x pd2y input-corner14"
            placeholder="输入要查找的文件名称"
          />

          <RadioGroup
            onChange={ev => {
              let val = ev.target.value
              this.setState({preUploadFile: null, selectedTrainingFileId: val})
            }}
            value={selectedTrainingFileId}
            className="overscroll-y block bordert relative"
            style={{height: `calc(100% - ${35 + 60}px)`}}
          >
            {files.length === 0
              ? (
                <div className="center-of-relative elli">目前还未上传任何训练数据，请导入文件上传数据</div>
              )
              : filteredFiles.length === 0
                ? (
                  <div className="center-of-relative elli">没有符合条件的文件</div>
                )
                : null}
            {filteredFiles.map((file, idx) => {
              return (
                <Radio
                  className={classNames('block font14 pd3x height40 line-height40', {bordert: idx !== 0})}
                  key={file.id}
                  value={file.id}
                >
                  流失预警训练数据 {moment(file.created_at).format('YYYY-MM-DD HH:MM')}
                  <span className="color-999">（{file.name}）</span>
                </Radio>
              )
            })}
          </RadioGroup>
        </div>
      </div>
    );
  })

  // onRowDelete = ev => {
  //   let recordIdx = +ev.target.getAttribute('data-index')
  //   this.setState(prevState => {
  //     return immutateUpdate(prevState, 'csvData', csvData => {
  //       let rows = csvData.filter((d, i) => i !== recordIdx)
  //       rows.columns = csvData.columns
  //       return rows
  //     })
  //   })
  // }

  renderSettingColumnStep = withSizeProvider(({spWidth, spHeight}) => {
    let {csvData, columnsTypeDict, pageNum, pageSize} = this.state
    const pagination = {
      total: csvData.length,
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: total => `加载了前 ${total} 条数据`,
      current: pageNum,
      onChange: pageNum => this.setState({pageNum}),
      onShowSizeChange: (curr, pageSize) => this.setState({pageSize}),
      pageSize
    }

    let contentWidth = csvData.columns.length * 150

    let samples = _.sampleSize(csvData, 25)
    let initGuess = this.guessTypes(csvData, true)

    let columns = csvData.columns.map((colName, idx) => {
      let type = columnsTypeDict[colName]

      // 如果有重复的值，则不允许选择为用户id
      // 如果值有多于两种情况，则不允许选择流失预警字段
      let allowSelectUserId = false, allowSelectLossPredictField = false
      if (labelTypesSet.has(initGuess[colName])) {
        let valSamples = samples.map(d => d[colName]).filter(_.identity)

        if (_.uniq(valSamples).length === valSamples.length) {
          allowSelectUserId = true
        }
        if (_.some(valSamples, v => posValuesSet.has(v) || negValuesSet.has(v)) && _.uniq(valSamples).length <= 2) {
          allowSelectLossPredictField = true
        }
      }

      let headerCol = (
        <Select
          size="small"
          className="width120"
          placeholder="选择列类型"
          dropdownMatchSelectWidth={false}
          value={type}
          onChange={val => {
            this.setState(prevState => immutateUpdate(prevState, `columnsTypeDict.${colName}`, () => val))
          }}
        >
          <Option value={'Integer'}>Int</Option>
          <Option value={'Long'}>Long</Option>
          <Option value={'Float'}>Float</Option>
          <Option value={'Char'}>Char</Option>
          <Option value={'DateTime'}>DateTime</Option>
          <Option
            disabled={!allowSelectLossPredictField}
            value={'LossPredictField'}
          >
            <Tooltip
              title="流失预警字段的值必须为布尔值（是/否，Y/N，1/0，T/F 等）"
              placement="right"
            >
              流失预警字段
            </Tooltip>
          </Option>
          <Option
            disabled={!allowSelectUserId}
            value={'UserId'}
          >
            <Tooltip
              title="用户ID的值必须“唯一”，即不能出现重复的用户ID"
              placement="right"
            >
              用户ID
            </Tooltip>
          </Option>
        </Select>
      )
      return {
        title: colName,
        width: 150,
        props: {className: 'alignleft'},
        className: idx === 0 ? 'table-col-pd3l' : undefined,
        children: [{
          title: headerCol,
          dataIndex: colName,
          key: colName,
          width: 150,
          className: idx === 0 ? 'table-col-pd3l' : undefined
        }]
      }
    })/*.concat([{
      title: '操作',
      key: 'operator',
      width: 150,
      fixed: spWidth < contentWidth ? 'right' : undefined,
      children: [{
        title: ' ',
        key: 'operator',
        width: 150,
        render: (val, record, i) => {
          return (
            <a
              className="color-light-red pointer"
              data-index={i + (pageNum - 1) * pageSize}
              onClick={this.onRowDelete}
            >删除</a>
          )
        }
      }]
    }])*/

    return (
      <div
        className="bordert dashed"
        style={{height: 'calc(100% - 100px)'}}
      >
        <div className="height80 line-height80 bordert dashed pd3l relative">
          温馨提示：请导入用于训练模型的数据，格式为 CSV 文件，并确保你的文件编码方式为 UTF-8 <span className="color-red">（{fieldHoverHint}）</span>
          <Button
            className="vertical-center-of-relative right0 mg3r width150"
            type="success"
            onClick={this.onPrevStep}
          >重新导入文件</Button>
        </div>

        <Table
          className="always-display-scrollbar-horizontal-all wider-bar"
          size="small"
          scroll={{x: spWidth < contentWidth ? contentWidth : '100%', y: spHeight - 100 - 80 - 88 - 54}}
          columns={columns}
          dataSource={csvData}
          pagination={pagination}
        />
      </div>
    )
  })

  renderUploadingStep() {
    let {updateLossPredictModel, reloadLossPredictModels, updateHashStateByPath, lossPredictModel, reloadFiles} = this.props
    let {uploadProgress, preUploadFile, columnsTypeDict, csvData} = this.state

    return (
      <div className="height-100">
        <div className="height80 line-height80 bordert dashed pd3l relative">
          温馨提示：请导入用于训练模型的数据，格式为 CSV 文件，并确保你的文件编码方式为 UTF-8 <span className="color-red">（{fieldHoverHint}）</span>
        </div>

        <Upload
          ref={ref => this._uploader = ref}
          showUploadList={false}
          accept="text/csv, text/comma-separated-values, application/csv"
          action="/app/uploaded-files/upload"
          headers={{
            'Access-Control-Allow-Origin': '*',
            token: window.sugo.file_server_token
          }}
          onProgress={(ev) => {
            this.setState({uploadProgress: ev.percent / 100})
          }}
          onChange={async ({file, fileList, event}) => {
            let {status} = file // uploading done error removed

            if (status === 'error') {
              message.error('文件上传失败，请重试')
            } else if (status === 'done') {
              // 将文件从状态移除，再加入服务器，创建模型，准备训练
              let { filename, originalFilename } = _.get(file, 'response.result') || {}
              if (!filename) {
                message.error('文件上传失败，请重试')
                this.setState({subStep: SubStepEnum.SettingColumns})
                return
              }
              try {
                let {result: newFile} = await FetchFinal.post('/app/uploaded-files/create', {
                  name: originalFilename,
                  type: UploadedFileType.LossPredictTrainingData,
                  path: `/f/${filename}`
                })
                await updateLossPredictModel({
                  id: lossPredictModel.id,
                  training_file_id: newFile.id,
                  training_settings: {
                    columnsTypeDict,
                    trainingFields: _.orderBy(_.keys(columnsTypeDict), colName => TypeSortOrder[columnsTypeDict[colName]]),
                    csvColumns: csvData.columns
                  }
                })

                message.success('文件上传成功')

                await reloadLossPredictModels()
                await reloadFiles()
                this.setState({subStep: SubStepEnum.UploadCompleted, selectedTrainingFileId: newFile.id, preUploadFile: null})
              } catch (err) {
                message.error('文件上传失败: ' + err.message)
                this.setState({subStep: SubStepEnum.SettingColumns})
              }
            }
          }}
        />

        <Timer
          interval={1000}
          onTick={() => {
            if (preUploadFile && this._uploader) {
              let inner = _.get(this._uploader, 'refs.upload.refs.inner')
              inner.uploadFiles([preUploadFile])
              this._uploader = null
            }
          }}
        />

        <div className="bordert dashed relative" style={{height: 'calc(100% - 80px)'}}>
          <div className="aligncenter center-of-relative">
            <Icon className="font100 color-light-green relative" type="loading">
              {0 < uploadProgress
                ? (
                  <span className="center-of-relative font14 color-black">{percentFormatter(uploadProgress)}</span>
                )
                : null}
            </Icon>
            <br/>
            <br/>
            正在上传数据，请耐心等待
          </div>
        </div>
      </div>
    )
  }

  renderUploadCompletedStep() {
    return (
      <div className="" style={{height: 'calc(100% - 100px)'}}>
        <div className="bordert dashed relative height-100">
          <div className="aligncenter center-of-relative">
            <CheckCircleOutlined className="font100 color-light-green relative" />
            <br/>
            <br/>
            数据上传成功，请点击“下一步”继续操作
          </div>
        </div>
      </div>
    );
  }

  renderSubStepContent() {
    let {subStep} = this.state
    switch (subStep) {
      case SubStepEnum.PickAFile:
        return this.renderPickFileStep()
      case SubStepEnum.SettingColumns: {
        return this.renderSettingColumnStep()
      }
      case SubStepEnum.Uploading:
        return this.renderUploadingStep()
      case SubStepEnum.UploadCompleted:
        return this.renderUploadCompletedStep()
      default:
        return <div>Unknown SubStep: {subStep}</div>
    }
  }

  render() {
    let {style} = this.props

    return (
      <div style={style}>
        {this.renderSubStepContent()}
        {this.renderNextStepPart()}
      </div>
    )
  }
}

export default (() => {
  return withUploadedFiles(CSVDataImporter, () => ({type: UploadedFileType.LossPredictTrainingData}))
})()
