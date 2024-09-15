/**
 * 流失预测智能分析端接口：

 1、训练接口
 URL: http://ip:port/pio/process/drain/train/{tenantId}   tenantId为公司ID，用于区分SAAS下的不同租户
 请求方式: POST
 请求提交内容: key-value的字符串数组
 [{"key":"data_set_meta_data_information", "value":"0:NO.true.integer.id;1:category.true.polynominal.label;2:attribute_1.true.real.attribute;3:attribute_2.true.real.attribute;4:attribute_3.true.real.attribute;5:attribute_4.true.real.attribute;6:attribute_5.true.real.attribute;7:attribute_6.true.real.attribute;8:attribute_7.true.real.attribute;9:attribute_8.true.real.attribute;10:attribute_9.true.real.attribute;11:attribute_10.true.real.attribute"}]
 其中：
 key的值为固定的："data_set_meta_data_information"。
 value的格式为：以分号';'分隔的【index:attributeName.isSelected.valueType.role】串
 1)index: 列索引（从0开始）
 2)attributeName：列名
 3)isSelected：是否选中（true：选中；false：未选中）
 4)valueType：列的值类型（attribute_value, nominal, numeric, integer, real, text, binominal, polynominal, file_path, date_time, date, time）
 5)role：列的角色（attribute, id, label, prediction, cluster, weight, batch, cost）

 2、预测接口
 URL: http://ip:port/pio/process/drain/predict/{tenantId}  tenantId为公司ID，用于区分SAAS下的不同租户
 请求方式: POST
 请求提交内容: 参考训练接口
 * */

import db from '../models'
import FetchKit from '../utils/fetch-kit'
import conf from '../config'
import {delayPromised} from '../../common/sugo-utils'
import UploadedFilesSvc from '../services/uploaded-files.service'
import _ from 'lodash'

const {pioUrl, site} = conf

export const ValueTypeDict = {
  Integer: 'integer',
  Long: 'integer',
  Char: 'attribute_value',
  Float: 'real',
  DateTime: 'date_time',
  UserId: 'attribute_value',
  LossPredictField: 'attribute_value'
}

export const RoleDict = {
  UserId: 'id',
  LossPredictField: 'label'
}

async function genModelTrainingParams(modelWillTrain) {
  let {trainingFields, columnsTypeDict, csvColumns} = modelWillTrain.training_settings

  let selectedColsSet = new Set(trainingFields)

  let valStr = csvColumns.map((col, idx) => {
    let colType = columnsTypeDict[col] || 'Char'
    return `${idx}:${col}.${selectedColsSet.has(col)}.${ValueTypeDict[colType] || 'attribute_value'}.${RoleDict[colType] || 'attribute'}`
  }).join(';')

  return [
    {key: 'data_set_meta_data_information', value: valStr},
    {key: 'csv_file', value: `${site.file_server_url}${modelWillTrain.UploadedFile.path}`}
  ]
}

function extractTreeModel(obj) {
  return _.omit(obj, 'description')
}

function extractPerformanceVector(obj) {
  return _.omit(obj, 'description')
}

function extractCondExampleSet(obj) {
  return {...obj, exampleTable: {
    attributes: (_.get(obj, 'exampleTable.attributes') || []).filter(mapping => {
      return 'mapping' in mapping
    })
  }}
}

function extractUsefulData(modelInfo) {
  let {ioObjects} = modelInfo

  return {
    ioObjects: (ioObjects || []).map(obj => {
      if (!obj) {
        return null
      }
      switch(obj.dataType) {
        case 'tree_model':
          return extractTreeModel(obj)
        case 'performance_vector':
          return extractPerformanceVector(obj)
        case 'mapped_example_set':
          return extractCondExampleSet(obj)
        default:
          return null
      }
    }).filter(_.identity)
  }
}

async function trainModelById(modelId) {
  let modelWillTrain = await queryOneWithFile({id: modelId})

  let trainingFileSettings = await genModelTrainingParams(modelWillTrain)

  let res = await FetchKit.post(`${pioUrl}/pio/process/drain/train/${modelWillTrain.company_id}`, trainingFileSettings)
  // 提取有用的数据
  let usefulData = extractUsefulData(res)
  if (!usefulData.ioObjects.length) {
    throw new Error('训练失败，请设置合适的参数再试')
  }
  return usefulData
}

async function queryOneWithFile(where) {
  return await db.SugoLossPredictModels.findOne({
    where,
    include: [{
      model: db.UploadedFiles,
      attributes: ['name', 'path']
    }]
  })
}

async function queryManyWithFile(where) {
  return await db.SugoLossPredictModels.findAll({
    where,
    order: [
      ['updated_at', 'DESC']
    ],
    attributes: ['id', 'name', 'training_file_id', 'created_at', 'updated_at'],
    include: [{
      model: db.UploadedFiles,
      attributes: ['name', 'path']
    }]
  })
}

async function create(modelObj) {
  let name = (modelObj.name || '').trim()
  if (!name) {
    throw new Error('名称不能为空')
  }
  return await db.SugoLossPredictModels.create({...modelObj, name})
}

async function updateById(modelId, company_id, modelObj) {
  if ('name' in modelObj) {
    let name = (modelObj.name || '').trim()
    if (!name) {
      throw new Error('名称不能为空')
    }
    let existedSameNameModel = await db.SugoLossPredictModels.findOne({
      where: {
        name,
        company_id
      }
    })
    if (existedSameNameModel) {
      throw new Error(`存在同名的模型：${name}，请尝试别的名称`)
    }
  }

  return await db.SugoLossPredictModels.update(modelObj, {
    where: {
      id: modelId,
      company_id
    }
  })
}

async function deleteById(modelId, company_id) {
  return await db.SugoLossPredictModels.destroy({
    where: {
      id: modelId,
      company_id
    }
  })
}

export default {
  queryOneWithFile,
  queryManyWithFile,
  create,
  updateById,
  deleteById,
  trainModelById,
  genModelTrainingParams
}
