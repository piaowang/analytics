/**
 * 流失预测智能分析端接口：
 * @see {@link ./loss-predict-model.service.js}
 */

import db from '../models'
import FetchKit from '../utils/fetch-kit'
import conf from '../config'
import {delayPromised} from '../../common/sugo-utils'
import UploadedFilesSvc from './uploaded-files.service'
import LossPredictModelSvc, {ValueTypeDict, RoleDict} from './loss-predict-model.service'
import _ from 'lodash'

const {pioUrl, site} = conf

export async function genPredictionTestingParams(predictionWillRun) {
  let {testingFields, columnsTypeDict, csvColumns} = predictionWillRun.test_settings

  let selectedColsSet = new Set(testingFields)

  let valStr = csvColumns.map((col, idx) => {
    let colType = columnsTypeDict[col] || 'Char'
    return `${idx}:${col}.${selectedColsSet.has(col)}.${ValueTypeDict[colType] || 'attribute_value'}.${RoleDict[colType] || 'attribute'}`
  }).join(';')

  let testFileUrl = site.file_server_url + (predictionWillRun.UploadedFile
    ? predictionWillRun.UploadedFile.path
    : (await UploadedFilesSvc.queryOne({id: predictionWillRun.test_file_id})).path)
  return [
    {key: 'data_set_meta_data_information', value: valStr},
    {key: 'csv_file', value: testFileUrl}
  ]
}

/**
 * 抽出有用的数据，由于返回的预测结果可能是稀疏的，所以只能根据用户ID来取回预测结果
 * 这里将用户id和预测结果依次放入 exampleTable.dataListFlat，客户端使用 _.chunk(dataListFlat, 2) 取回
 * @param userIdCol
 * @param obj
 * @returns {{exampleTable: {attributeNames, dataListFlat, attributes}}}
 */
function extractSimpleExampleSet(userIdCol, obj) {
  let {exampleTable, mapping, ...rest} = obj
  let userIdColIdx = _.findIndex(exampleTable.attributeNames, n => n === userIdCol)
  let predictionColIdx = _.findIndex(exampleTable.attributeNames, n => _.startsWith(n, 'prediction('))

  // mapping 为过滤剩下的索引
  let validRowIndexSet = new Set(mapping || [])
  return {
    ...rest,
    exampleTable: {
      attributeNames: exampleTable.attributeNames.filter((n, i) => i === predictionColIdx || i === userIdColIdx),
      dataListFlat: _.flatMap(exampleTable.dataList.filter((d, idx) => validRowIndexSet.has(idx)),
        dArr => [dArr[userIdColIdx], dArr[predictionColIdx]]),
      attributes: (exampleTable.attributes || []).filter(attr => {
        return ('mapping' in attr) && (_.startsWith(attr.name, 'prediction(') || attr.name === userIdCol)
      })
    }
  }
}

function extractUsefulData(userIdCol, predictionInfo) {
  let {ioObjects} = predictionInfo || {}
  return {
    ioObjects: (ioObjects || []).map(obj => {
      if (!obj) {
        return null
      }
      if ('exampleTable' in obj) {
        return extractSimpleExampleSet(userIdCol, obj)
      } else {
        return null
      }
    }).filter(_.identity)
  }
}

async function runPrediction(predictionWillRun) {
  let predictionTestingParams = await genPredictionTestingParams(predictionWillRun)
  let {columnsTypeDict} = predictionWillRun.test_settings || {}

  // console.log('Predicting: ', predictionWillRun.company_id, JSON.stringify(predictionTestingParams, null, 2))
  let res = await FetchKit.post(`${pioUrl}/pio/process/drain/predict/${predictionWillRun.company_id}`, predictionTestingParams)
  // console.log('Predict result: ', JSON.stringify(res))

  // 提取出有用的数据，减少数据库压力
  let usefulData = extractUsefulData(_.findKey(columnsTypeDict || {}, type => type === 'UserId'), res)
  if (!usefulData.ioObjects.length) {
    throw new Error('预测失败，请设置合适的参数再试')
  }
  return usefulData
}

async function queryOne(where) {
  return await db.SugoLossPredictPredictions.findOne({
    where
  })
}

async function queryMany(where) {
  return await db.SugoLossPredictPredictions.findAll({
    where,
    attributes: ['id', 'test_file_id', 'created_at', 'updated_at'],
    order: [
      ['updated_at', 'DESC']
    ]
  })
}

async function create(pObj) {
  return await db.SugoLossPredictPredictions.create(pObj)
}

async function updateById(pId, company_id, pObj) {
  return await db.SugoLossPredictPredictions.update(pObj, {
    where: {
      id: pId,
      company_id
    }
  })
}

async function deleteById(pId, company_id) {
  return await db.SugoLossPredictPredictions.destroy({
    where: {
      id: pId,
      company_id
    }
  })
}

export default {
  queryOne,
  queryMany,
  create,
  updateById,
  deleteById,
  runPrediction
}
