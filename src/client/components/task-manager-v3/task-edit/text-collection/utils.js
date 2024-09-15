import { useState, useEffect } from 'react'
import _ from 'lodash'
import { 
  TEXT_COLLECTION_SELECT_ITENS, 
  SELECTED_FILES_TABLE_COLUMNS, 
  TXT_OUTPUT_TABLE_COLUMNS,
  XML_OUTPUT_TABLE_COLUMNS,
  READER_TYPES
} from './const'

/**
 * txt, xml 通用hook, 用于解析出对应table所需数据  
 * @param {object} info info form server
 */
export const useList = (info) => {
  const [lists, setLists] = useState({ selected: [], output: [] })
  useEffect(() => {
    setLists({
      selected: _.get(info, 'scriptContent[0].reader.selectedFile', []),
      output: _.get(info, 'scriptContent[0].cleaner.converterList', [])
    })
  }, [info])
  return lists
}

/**
 * 提交表单时，根据文本类型(txt, xml), 拼接出server所需的body
 * @param {object} arguments 
 */
export const getSaveBody = ({ projectId, type, form, tableSelected, tableOutput, info }) => {
  const selectedTableKeys = _.map(SELECTED_FILES_TABLE_COLUMNS, item => item.dataIndex)
  const txtOutputKeys = _.map(TXT_OUTPUT_TABLE_COLUMNS, item => item.dataIndex)
  const xmlOutputKeys = _.map(XML_OUTPUT_TABLE_COLUMNS, item => item.dataIndex)

  // 此对象需要单独解析为JSON
  const scriptContent = {
    type: 'collectV2',
    reader: {
      type: type === TEXT_COLLECTION_SELECT_ITENS[0] ? READER_TYPES[0] : READER_TYPES[1],
      batchSize: 1000,
      offsetCollect: true,
      headLine: form.headLine,
      tailLine: form.tailLine,
      selectedFile: _.map(tableSelected, record => _.pick(record, selectedTableKeys)),
      xPathExpression: form.xPathExpression,
      xmlPath: (type === TEXT_COLLECTION_SELECT_ITENS[1]) && _.map(tableOutput, record => record.xmlPath),
      xType: (type === TEXT_COLLECTION_SELECT_ITENS[1]) && _.map(tableOutput, record => record.xType)
    },
    cleaner: {
      parser: {
        type: type === TEXT_COLLECTION_SELECT_ITENS[0] ? (
          form.haveSeparator ? 'csv' : 'txt'
        ) : 'csv',
        separator: form.separator,
        columnNames: _.map(tableOutput, record => record.finalCol).join(','),
        columnIndex: _.map(tableOutput, record => record.columnIndex).join(','),
        columnLength: _.map(tableOutput, record => record.columnLength).join(',')
      },
      assembler: {
        type: 'csv',
        separator: '\u0001',
        columns: _.map(tableOutput, record => record.finalCol)
      },
      converterList: type === TEXT_COLLECTION_SELECT_ITENS[0] ? (
        _.map(tableOutput, record => {
          return {
            ..._.pick(record, form.haveSeparator ? txtOutputKeys.slice(2) : txtOutputKeys),
            type: 'dummy'
          }
        })  
      ) : (
        _.map(tableOutput, record => {
          return {
            ..._.pick(record, xmlOutputKeys),
            type: 'dummy'
          }
        })
      )
    },
    writer: {
      type: 'hiveJdbc',
      toDataSource: form.toDataSource,
      toDataBase: form.toDataBase
    }
  }
  const body ={
    projectId,
    jobName: info.jobName,
    'jobOverride[dataCollect]': info.jobName + '.sh',
    'jobOverride[name]': '文本采集',
    'jobOverride[showName]': '文本采集',
    'jobOverride[type]': 'textCollect',
    scriptContent: JSON.stringify([scriptContent])
  }
  return body 
}

/**
 * 得到文本类型为xml时, 获取 '循环读取路径' 的选项时, 所需的body
 * @param {object[]} data 来自选中文件的第一条记录的采集路径
 */
export const getPathOptionsBody = (data) => {
  return _.map(data, item => {
    return _.pick(item, _.map(SELECTED_FILES_TABLE_COLUMNS, item => item.dataIndex))
  })[0]
}

export const getContentStyle = () => {
  return {
    maxHeight: `${document.body.clientHeight - 212}px`,
    overflowY: 'auto'
  }
}

/**
 * 加工 sourceList, 使没有唯一ID的记录获得ID(当前时间戳 + index)
 * @param {object[]} list table中的list数据
 */
export const getIdBuff = (list = []) => {
  return _.map(list, (rec, index) => ({
    ...rec,
    id: rec.id || (new Date().valueOf() + index),
    origin: true
  }))
}

/**
 * 解析 scriptContent 字段
 * @param {json} data from server
 */
export const getParsedData = (data) => {
  return { 
    ...data, 
    scriptContent: data.scriptContent && JSON.parse(data.scriptContent) 
  }
}

/**
 * 编辑模式下, 解析server返回值, 根据文本类型, 为表单内容进行初始化值操作
 * @param {object} paresdObj 已解析为对象的JSON, form server
 */
export const getEditModeInitData = (paresdObj) => {
  if(!paresdObj.scriptContent) {
    return [TEXT_COLLECTION_SELECT_ITENS[0], {}]
  }
  const type = _.get(paresdObj, 'scriptContent[0].reader.type') === READER_TYPES[0] ? 
    TEXT_COLLECTION_SELECT_ITENS[0] : TEXT_COLLECTION_SELECT_ITENS[1]
  const { cleaner = {}, reader = {}, writer = {} } = paresdObj.scriptContent[0]
  return [
    type,
    type === TEXT_COLLECTION_SELECT_ITENS[0] ? {
      haveSeparator: !!_.get(cleaner, 'parser.separator'),
      separator: _.get(cleaner, 'parser.separator'),
      headLine: reader.headLine,
      tailLine: reader.tailLine,
      toDataSource: writer.toDataSource,
      toDataBase: writer.toDataBase
    } : {
      xPathExpression: reader.xPathExpression,
      toDataSource: writer.toDataSource,
      toDataBase: writer.toDataBase
    }
  ]
}

export const getColumnsKeys = (columnsConfig) => _.map(columnsConfig, column => column.dataIndex)
