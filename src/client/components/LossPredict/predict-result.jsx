import React from 'react'
import {Table, message} from 'antd'
import Bread from '../Common/bread'
import moment from 'moment'
import {withLossPredictPredictions} from '../Fetcher/loss-predict-predictions-fetcher'
import {withLossPredictModels} from '../Fetcher/loss-predict-models-fetcher'
import _ from 'lodash'
import {loadLinesOfCSVFromURL} from '../../common/read-csv-from-url'
import {withSizeProvider} from '../Common/size-provider'

async function loadCSVByFileId(fileId, option) {
  let dataWithHeader = await loadLinesOfCSVFromURL(`/app/uploaded-files/download/${fileId}`, option)

  let header = dataWithHeader.columns
  let result = dataWithHeader.map(arr => _.zipObject(header, arr))
  result.columns = header
  return result
}

const CACHE_PAGE_SIZE = 300
const COLUMN_WIDTH = 150

let posValuesSet = new Set(['是', 'Y', '1', 'y', 'true', 'TRUE', 't'])

class PredictResult extends React.Component {
  state = {
    tablePageNum: 1,
    tablePageSize: 10,
    cachePageIndex: 0,
    totalDataLength: 0,
    loadingData: false,
    predictionData: []
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(nextProps.lossPredictPredictions, this.props.lossPredictPredictions)) {
      let lossPredictPrediction = nextProps.lossPredictPredictions[0]
      if (lossPredictPrediction) {
        this.loadPredictResult(lossPredictPrediction)
      }
    }
  }

  createTableColumns(columns, isTooManyColumns) {
    return columns.map((col, cIdx) => {
      let isPredictResultCol = _.startsWith(col, 'prediction(')
      return {
        title: isPredictResultCol ? '是否流失' : col,
        key: col,
        dataIndex: col,
        className: cIdx === 0 ? 'table-col-pd3l' : undefined,
        width: COLUMN_WIDTH,
        fixed: isTooManyColumns && isPredictResultCol ? 'right' : undefined
      }
    })
  }


  async loadPredictResult(prediction, cachePageIndex = 0, cachePageSize = CACHE_PAGE_SIZE) {
    let {prediction_info: predictionInfo, test_file_id} = prediction
    if (!predictionInfo || !predictionInfo.ioObjects || !_.some(predictionInfo.ioObjects)) {
      return []
    }
    let simpleExampleSet = _.find(predictionInfo.ioObjects, obj => obj && ('exampleTable' in obj))
    if (!simpleExampleSet) {
      return []
    }

    // 加载原测试数据
    let skip = cachePageIndex * cachePageSize
    this.setState({loadingData: true})

    let originalTestData
    try {
      originalTestData = await loadCSVByFileId(test_file_id, {skip: skip, limit: cachePageSize})
    } catch (e) {
      if (/not\s+found/i.test(e)) {
        message.warn('文件不存在，无法读取')
        this.setState({loadingData: false})
        return []
      }
    }

    let exampleTable = simpleExampleSet.exampleTable
    let {dataListFlat, attributeNames: [userIdCol, predictionCol], attributes} = exampleTable

    let userIdColTranslationArr = _.get(attributes, '[0].mapping.values') || []
    let predictionColTranslationArr = _.get(attributes, '[1].mapping.values') || []

    // let predictValDict = _.mapKeys(_.fromPairs(_.chunk(dataListFlat, 2)), (val, key) => userIdColTranslationArr[key])
    // 减少 GC，优化成这个循环
    const AttributeNamesLength = exampleTable.attributeNames.length
    let predictValDict = {}
    for (let i = 0; i < dataListFlat.length; i += AttributeNamesLength) {
      let k = dataListFlat[i]
      let translatedKey = userIdColTranslationArr[k]
      predictValDict[translatedKey] = dataListFlat[i + 1]
    }

    // 合并原数据和预测流失字段的数据
    let resultMergedData = originalTestData.map((d, idx) => {
      let userId = d[userIdCol]
      let predictionMappingFlag = predictValDict[userId]
      if (undefined === predictionMappingFlag) {
        return {...d, [predictionCol]: '未知'}
      }
      let translated = predictionColTranslationArr[predictionMappingFlag] || predictionMappingFlag
      return {...d, [predictionCol]: posValuesSet.has(translated) ? '是' : '否'}
    })

    let predictionData = [...new Array(cachePageIndex * cachePageSize).fill({}), ...resultMergedData]
    predictionData.columns = [...originalTestData.columns, predictionCol]
    this.setState({
      predictionData: predictionData,
      cachePageIndex,
      loadingData: false,
      totalDataLength: dataListFlat.length / AttributeNamesLength
    })
  }

  render() {
    let {lossPredictModels, lossPredictPredictions, spWidth, spHeight} = this.props
    let lossPredictModel = lossPredictModels[0] || {}
    let lossPredictPrediction = lossPredictPredictions[0] || {}

    let {predictionData, cachePageIndex, loadingData, totalDataLength, tablePageNum, tablePageSize} = this.state

    let contentWidth = (predictionData.columns || []).length * COLUMN_WIDTH
    let isNotTooManyColumns = contentWidth < spWidth
    const tableColumns = this.createTableColumns(predictionData.columns || [], !isNotTooManyColumns)

    let predictTime = moment(lossPredictPrediction.created_at).format('YYYY-MM-DD HH:mm')
    return (
      <div className="height-100 bg-white loss-predict-theme">
        <Bread
          path={[
            {name: '流失预测', link: '/console/loss-predict'},
            {name: lossPredictModel.name, link: `/console/loss-predict/${lossPredictModel.id}`},
            {name: '历史预测记录', link: `/console/loss-predict/${lossPredictModel.id}/predictions`},
            {name: `${predictTime} 预测`}
          ]}
        />
        <div className="pd2y mg3x">
          预测结果说明：该训练模型是 {lossPredictModel.name}，预测时间为 {predictTime}
        </div>
        <Table
          loading={loadingData}
          className="pd3t bordert dashed"
          bordered
          size="small"
          rowKey="id"
          pagination={{
            total: totalDataLength,
            showQuickJumper: true,
            showSizeChanger: true,
            current: tablePageNum,
            pageSize: tablePageSize,
            pageSizeOptions: ['10', '20', '30', '50', '100'],
            onShowSizeChange: async (curr, pageSize) => {
              let targetCachePageIndex = Math.floor((curr - 1) * pageSize / CACHE_PAGE_SIZE)
              if (targetCachePageIndex !== cachePageIndex) {
                await this.loadPredictResult(lossPredictPrediction, targetCachePageIndex)
              }
              this.setState({tablePageSize: pageSize, tablePageNum: curr})
            },
            onChange: async (pageNum) => {
              let targetCachePageIndex = Math.floor((pageNum - 1) * tablePageSize / CACHE_PAGE_SIZE)
              if (targetCachePageIndex !== cachePageIndex) {
                await this.loadPredictResult(lossPredictPrediction, targetCachePageIndex)
              }
              this.setState({tablePageNum: pageNum})
            },
            showTotal: total => {
              let start = cachePageIndex * CACHE_PAGE_SIZE
              let end = (cachePageIndex + 1) * CACHE_PAGE_SIZE
              return `总记录数 ${total} 条，缓存了第 ${start + 1} ~ ${Math.min(end, total)} 条数据`
            }
          }}
          columns={tableColumns}
          dataSource={predictionData}
          scroll={{
            x: isNotTooManyColumns ? '100%' : contentWidth,
            y: spHeight - 100 - 70 - 54 /* 100 是表格上面元素的高度，70 是表头和表格 paddingTop 的高度，54 是翻页器的高度 */
          }}
        />
      </div>
    )
  }
}

export default (() => {
  let WithSizeProvider = withSizeProvider(PredictResult)
  let WithModel = withLossPredictModels(WithSizeProvider, props => ({modelId: props.params.modelId}))
  return withLossPredictPredictions(WithModel, props => ({
    modelId: props.params.modelId,
    predictionId: props.params.predictionId
  }))
})()
