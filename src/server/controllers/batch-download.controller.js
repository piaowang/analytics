import DruidQueryService, {transformToOldQueryFormat} from '../services/druid-query.service'
import {executeSQLParseStream} from '../utils/plyql-executor'
import moment from 'moment'
import {Transform} from 'readable-stream'
import DruidColumnType from '../../common/druid-column-type'

import Config from '../config'
import PlywoodDatumToCsv from '../utils/plywood-datum-to-csv'
import db, { quoteIdentifiers } from '../models'
import _ from 'lodash'
import {DIMENSION_TYPES, QUERY_ENGINE} from '../../common/constants'
import {convertTagsValue} from '../../common/convertTagsValue'

const timeout = 10 * 60 * 1000

const BATCH_DOWNLOAD_LIMIT = _.last((Config.batchDownloadLimit || '')
  .split(',')
  .map(parseInt)
  .filter(_.identity))

const DRUID_COLUMN_TYPE_MAP = Object.keys(DruidColumnType)
  .reduce((p, c) => {
    p[DruidColumnType[c]] = c.toUpperCase()
    return p
  }, {})

/**
 * @typedef {Object} DruidScanQueryParams
 * @property {Boolean} scanQuery
 * @property {Number} scanBatchSize
 * @property {Number} selectLimit
 * @property {Array<String>} select
 */

/** 自助分析-批量下载 */
const batchDownload = async ctx => {
  // 批量下载采用scanQuery查询
  const queryParams = ctx.q
  /** @type {DruidScanQueryParams} */
  const params = queryParams.params
  const limit = params.selectLimit || (params.selectLimit = 1)
  const res = await db.SugoDimensions.findAll({
    where: {
      parentId: queryParams.druid_datasource_id
    }
  })
  const dimensions = res.map(r => r.get({ plain: true }))
  const selectDimensions = params.select.slice()

  // 只能将druid中包含的维度传入druid查询
  // 不然会报错
  let dbDimNameDict = _.keyBy(dimensions, 'name')
  const druid_dimensions = selectDimensions.filter(name => dbDimNameDict[name] && dbDimNameDict[name].is_druid_dimension)

  // 一定要带上__time列，不然druid报错...
  params.select = _.uniq(druid_dimensions.concat('__time'))
  params.selectLimit = limit > BATCH_DOWNLOAD_LIMIT ? BATCH_DOWNLOAD_LIMIT : limit
  params.scanBatchSize = Config.druid.scanBatchSize || 100
  const query = transformToOldQueryFormat(queryParams)
  // 10分钟
  query.timeout = timeout
  const { ex: expression, druidProps } = await DruidQueryService.createExpression(query)
  const stream = executeSQLParseStream({ expression }, druidProps.context, druidProps.timezone)
  
  let desensitizDimDict = _(dimensions).keyBy('name').pickBy(v => _.get(v, 'tag_extra.is_Desensitiz') === '1').value()
  let desensitizDims = _.keys(desensitizDimDict)
  
  const transformer = new PlywoodDatumToCsv({
    translateHeader: list => {
      // 将维度名转为用户设置的title
      return list.map(name => {
        const record = dimensions.find(d => d.name === name)
        return record ? (record.title || name) : name
      })
    }
  })

  // 按用户传入的列排序
  const getOutputTransform = (timezone) => {
    return transformValue((datum, attrs, index) => {
      // console.log('transformValue => %s', JSON.stringify(datum, null, 2))
      if (index === 1) {
        transformer.setTimezone(timezone.toString())
        transformer.initFormatter(
          selectDimensions.slice(),
          attrs.reduce((p, c) => {
            const dim = dimensions.find(d => d.name === c.name)
            // 如果没有找到类型记录，就使用STRING类型
            p[c.name] = DRUID_COLUMN_TYPE_MAP[dim ? dim.type : 2]
            return p
          }, {}))
      }
      // 多值列处理
      datum = _.mapValues(datum, (val) => _.isObject(val) && 'elements' in val ? val.elements : val)
      // 脱敏处理
      let datum0 = _.mapKeys(_.omit(datum, desensitizDims), (v, k) => _.endsWith(k, '__encode') ? k.substr(0, k.length - 8) : k)
      return transformer.translate(datum0)
    })
  }

  const filename = `源数据_${moment().format('YYYY-MM-DD')}.csv`
  const closeStream = () => stream.end()

  ctx.attachment(filename) // 设置下载文件名
  ctx.body = stream.pipe(getOutputTransform(druidProps.timezone))
  ctx.res.on('close', closeStream)
  ctx.res.on('end', closeStream)
}

function transformValue (onDone) {
  let attributes = [], index = 0
  return new Transform({
    objectMode: true,
    transform: function (chunk, encoding, callback) {
      if (chunk && chunk.type && chunk.type === 'init') {
        attributes = chunk.attributes
        callback(null)
        index++
      }
      if (chunk && chunk.type && chunk.type === 'datum') {
        callback(null, onDone(chunk.datum, attributes, index))
        index++
      }
    }
  })
}

//批量下载用户标签
const batchDownloadTags = async (ctx) => {
  let { tag_datasource_name } = ctx.q
  //获取标签显示值
  const sql = `SELECT name, title as tag_name, tag_value, concat(sub_type, '') as type FROM sugo_tag_dictionary WHERE tag_datasource_name =${quoteIdentifiers(`${tag_datasource_name}`)} AND tag_value IS NOT NULL AND tag_value <> '' AND title IS NOT NULL AND title <> ''`
  const resTag = await db.client.query(sql)
  //批量下载采用scanQuery查询
  const queryParams = ctx.q
  /** @type {DruidScanQueryParams} */
  const params = _.omit(queryParams.params, ['tag_datasource_name'])
  const limit = params.selectLimit || (params.selectLimit = 1)
  const res = await db.SugoDimensions.findAll({
    where: {
      parentId: queryParams.druid_datasource_id
    }
  })
  const dimensions = res.map(r => r.get({ plain: true }))
  const selectDimensions = params.select.slice()

  // 只能将druid中包含的维度传入druid查询
  // 不然会报错
  const druid_dimensions = selectDimensions.filter(name => _.find(dimensions, { name }).is_druid_dimension)
  // 一定要带上__time列，不然druid报错...
  params.select = _.uniq(druid_dimensions.concat('__time'))
  params.selectLimit = limit > BATCH_DOWNLOAD_LIMIT ? BATCH_DOWNLOAD_LIMIT : limit
  params.scanBatchSize = Config.druid.scanBatchSize || 100
  let query = transformToOldQueryFormat({...queryParams, params})
  query.queryEngine = QUERY_ENGINE.UINDEX
  //10分钟
  query.timeout = timeout
  const { ex: expression, druidProps } = await DruidQueryService.createExpression(query)
  const stream = executeSQLParseStream({ expression }, druidProps.context, druidProps.timezone)
  
  let desensitizDimDict = _(dimensions).keyBy('name').pickBy(v => _.get(v, 'tag_extra.is_Desensitiz') === '1').value()
  let desensitizDims = _.keys(desensitizDimDict)
  
  const transformer = new PlywoodDatumToCsv({
    translateHeader: list => {
      // 将维度名转为用户设置的title
      return list.map(name => {
        const record = dimensions.find(d => d.name === name)
        return record ? (record.title || name) : name
      })
    }
  })


  // 按用户传入的列排序
  const getOutputTransform = (timezone) => {
    return transformValue((datum, attrs, index) => {
      if (index === 1) {
        transformer.setTimezone(timezone.toString())
        transformer.initFormatter(
          selectDimensions.slice(),
          attrs.reduce((p, c) => {
            const dim = dimensions.find(d => d.name === c.name)
            // 如果没有找到类型记录，就使用STRING类型
            p[c.name] = DRUID_COLUMN_TYPE_MAP[dim && dim.type !== DIMENSION_TYPES.date ? dim.type : 2]
            return p
          }, {}))
      }
      // 多值列处理
      datum = _.mapValues(datum, (val) => _.isObject(val) && 'elements' in val ? val.elements : val)
      
      let res = convertTagsValue([datum], resTag[0], dimensions)
      let data = {}
      _.forIn(res[0], (v, k) => data[k] = v)
  
      // 脱敏处理
      let datum0 = _.mapKeys(_.omit(data, desensitizDims), (v, k) => _.endsWith(k, '__encode') ? k.substr(0, k.length - 8) : k)
      return transformer.translate(datum0)
    })
  }
  const filename = ctx.query.filename || `源数据_${moment().format('YYYY-MM-DD')}.csv`
  ctx.attachment(filename) // 设置下载文件名
  let result = stream.pipe(getOutputTransform(druidProps.timezone))
  ctx.body = result
  // ctx.res.on('close', closeStream)
  // ctx.res.on('end', closeStream)
}

export default {
  batchDownload,
  batchDownloadTags
}
