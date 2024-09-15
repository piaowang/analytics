import { returnError, returnResult } from '../utils/helper'
import { SugoDataApiService } from '../services/sugo-data-apis.service'
import { SugoDataApiClientService } from '../services/sugo-data-api-clients.service'
import moment from 'moment'
import _ from 'lodash'
import DruidQueryService, { queryDbMetricsMemoized, transformToOldQueryFormat } from '../services/druid-query.service'
import { dictBy, immutateUpdate, immutateUpdates, recurMap } from '../../common/sugo-utils'
import { Seq } from '../models/_db'
import {
  DataApiClientStatusEnum,
  DataApiStatusEnum,
  DataApiTypeEnum,
  EMPTY_VALUE_OR_NULL,
  UsergroupRecomputeStrategyEnum,
  UsergroupRecomputeStrategyTranslation
} from '../../common/constants'
import UserGroupService from '../services/usergroup-redis.service'
import { Readable } from 'stream'
import AsyncStream from 'async-streamjs'

import db from '../models'
import { isTimeDimension } from '../../common/druid-column-type'
import conf from '../config'
import { NoMetricBecomeQuerySourceData, resolveLocalMetric } from '../../common/druid-query-utils'
import { addFiltersByRole } from './slices.controller'
import { getDimensionsByNames } from '../services/sugo-dimensions.service'
import { dbMetricAdapter } from '../../common/temp-metric'
import * as LocalMetric from '../../common/local-metric'

const { Transform } = require('stream')

const { dataApiTimePattern, dataApiTimeShouldFormat = false, site } = conf
const maxDownloadLimit = _.last(site.batchDownloadLimit.split(',')) || 10000

moment.locale('zh-cn')

const dateFormatterGenerator = targetFormat => dateVal => {
  if (!dateVal) {
    return dateVal
  }
  let m = moment(dateVal)
  if (m.isValid()) {
    return m.format(targetFormat)
  }
  return dateVal
}

const granularityToFormatByConfig = (granularity = 'P1D') => {
  const { patternY, patternYM, patternYMd, patternYMdH, patternYMdHm, patternFull } = dataApiTimePattern
  if (/P\d+Y/gi.test(granularity)) {
    return patternY
  } else if (/P\d+M/gi.test(granularity)) {
    return patternYM
  } else if (/(P\d+W|P\d+D)/gi.test(granularity)) {
    return patternYMd
  } else if (/PT\d+H/gi.test(granularity)) {
    return patternYMdH
  } else if (/PT\d+M/gi.test(granularity)) {
    return patternYMdHm
  }
  return patternFull
}

/**
 * 查询多个数据 API
 * q: { id, type, ... }
 * @param ctx
 * @returns {Promise<void>}
 */
async function query(ctx) {
  let where = ctx.q

  let res = await SugoDataApiService.getInstance().findAll(where, { order: [['updated_at', 'desc']] })
  returnResult(ctx, res)
}

/**
 * 创建数据 API
 * @param ctx
 * @returns {Promise<void>}
 */
async function create(ctx) {
  let data = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
  let { user } = ctx.session
  let { company_id, id } = user

  if (!data.name) {
    returnError(ctx, '数据 API 名称不能为空')
    return
  }
  if (!data.call_path) {
    returnError(ctx, '数据 API 调用路径称不能为空')
    return
  }
  const serv = SugoDataApiService.getInstance()
  let existedSameName = await serv.findOne({ $or: [{ name: data.name }, { call_path: data.call_path }] }, { raw: true })
  if (existedSameName) {
    returnError(ctx, '存在同名或同路径的 API')
    return
  }

  let res = await serv.create({ ...data, created_by: id, company_id })
  returnResult(ctx, res)
}

/**
 * 修改数据 API
 * q: {title, ...}
 * @param ctx
 * @returns {Promise<void>}
 */
async function update(ctx) {
  let rowId = ctx.params.id
  let patch = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
  let { user } = ctx.session
  let { company_id, id } = user

  const serv = SugoDataApiService.getInstance()
  let existed = await serv.__model.findByPk(rowId)
  if (!existed) {
    returnError(ctx, '该客户端不存在', 404)
    return
  }
  let existedSameName = await serv.findOne(
    {
      id: { $ne: rowId },
      $or: [{ name: patch.name }, { call_path: patch.call_path }]
    },
    { raw: true }
  )
  if (existedSameName) {
    returnError(ctx, '存在同名或同路径的 API')
    return
  }

  let res = await serv.update({ ...patch, updated_by: id }, { id: rowId, company_id })
  returnResult(ctx, res)
}

/**
 * 删除数据 API
 * @param ctx
 * @returns {Promise<void>}
 */
async function remove(ctx) {
  let delId = ctx.params.id

  const serv = SugoDataApiService.getInstance()
  let preDel = await serv.__model.findByPk(delId)
  if (!preDel) {
    returnError(ctx, '该客户端不存在', 404)
    return
  }

  let res = await serv.remove({ id: delId })
  returnResult(ctx, res)
}

async function callDataAPI(ctx) {
  const isGET = ctx.method === 'get' || ctx.method === 'GET'
  // 左临的文档上叫 jwt，但实际上不是 jwt
  let { jwt, access_token = jwt, ...extraArgs } = isGET ? ctx.query : ctx.request.body
  if (!access_token) {
    ctx.status = 401
    ctx.body = { code: 401, description: '非法请求，客户端不存在' }
    return
  }
  const clientServ = SugoDataApiClientService.getInstance()
  let client = await clientServ.findOne({ access_token }, { raw: true })
  if (!client) {
    ctx.status = 401
    ctx.body = { code: 401, description: '客户端不存在' }
    return
  }
  if (client.status !== DataApiClientStatusEnum.Enabled) {
    ctx.status = 401
    ctx.body = { code: 401, description: '客户端已被禁用' }
    return
  }
  if (moment().isAfter(client.access_token_expire_at)) {
    ctx.status = 401
    ctx.body = { code: 401, description: '访问标识码已过期' }
    return
  }

  let apiPath = ctx.path.replace('/data-api/', '')

  let api = await SugoDataApiService.getInstance().findOne({ call_path: apiPath.replace(/\/meta$/i, '') }, { raw: true })
  if (!api) {
    ctx.status = 404
    ctx.body = { code: 404, description: 'API 不存在' }
    return
  }
  if (api.status !== DataApiStatusEnum.Enabled) {
    ctx.status = 401
    ctx.body = { code: 401, description: '此 API 已被禁用' }
    return
  }
  if (!_.includes(api.accessible_clients, '*') && !_.includes(api.accessible_clients, client.id)) {
    ctx.status = 401
    ctx.body = { code: 401, description: '此客户端无权限访问此 API' }
    return
  }
  let { type, params } = api
  if (type === DataApiTypeEnum.Slice) {
    let { slice } = params || {}
    if (!slice) {
      ctx.status = 401
      ctx.body = { code: 401, description: '查询单图出错' }
      return
    }

    // insert extra filter
    let extraFiltersConfig = _.get(api, 'params.extraFilters') || []
    let validQuery = _.pick(
      extraArgs,
      extraFiltersConfig.map(f => f.queryKey)
    )
    let extraSliceFilters = _(validQuery)
      .mapValues((v, k) => {
        let extraFilterConf = _.find(extraFiltersConfig, f => f.queryKey === k)
        let eq = isGET ? v.split(',') : v
        return {
          ...extraFilterConf,
          eq,
          containsNull: eq?.[0] === EMPTY_VALUE_OR_NULL || _.toLower(eq?.[0]) === 'null'
        }
      })
      .values()
      .value()
    let slicePreQuery = immutateUpdates(
      slice,
      'params.filters',
      flts => [...(flts || []), ...extraSliceFilters],
      'params',
      prevParams => NoMetricBecomeQuerySourceData(prevParams)
    )

    const metrics = slicePreQuery.params.metrics
    const vizType = slicePreQuery.params.vizType

    // select 查询
    if (!metrics.length && vizType === 'table_flat') {
      // 用户传 queryTotal 时返回总计
      if (extraArgs.queryTotal && +extraArgs.queryTotal) {
        slicePreQuery = immutateUpdates(
          slicePreQuery,
          'params.customMetrics',
          flts => [...(flts || []), { name: '_tempMetric_total', formula: '$main.count()' }],
          'params.metrics',
          metrics => [...(metrics || []), '_tempMetric_total'],
          'params.select',
          () => undefined,
          'params.withGlobalMetrics',
          () => true,
          'params.dimensions',
          () => []
        )
        await accessSliceGroupByQueryAPI(ctx, api, slicePreQuery, extraArgs)

        ctx.body = immutateUpdate(ctx.body, 'response', resp => _.map(resp, item => ({ total: item['_tempMetric_total'] })))
        return
      }
      return accessSliceSelectQueryAPI(ctx, slicePreQuery, extraArgs)
    }
    return accessSliceGroupByQueryAPI(ctx, api, slicePreQuery, extraArgs)
  } else if (type === DataApiTypeEnum.UserGroup) {
    return accessUserGroupAPI(ctx, api, extraArgs)
  }
}

async function accessSliceSelectQueryAPI(ctx, slicePreQuery, extraArgs) {
  let { pageIndex = 0, pageSize } = extraArgs

  if (!_.isNil(pageSize) && isFinite(+pageSize)) {
    if (maxDownloadLimit < pageSize) {
      ctx.body = { code: 400, description: 'Error', response: `参数错误: pageSize 不能超过 ${maxDownloadLimit}` }
      return
    }
    slicePreQuery.params.selectLimit = +pageSize
  }
  slicePreQuery.params.selectOffset = pageIndex * slicePreQuery.params.selectLimit

  let oldQueryArgs = transformToOldQueryFormat(slicePreQuery)

  // 流式查询 "queryType": "lucene_scan",
  if (slicePreQuery.params.scanQuery) {
    const data = await DruidQueryService.queryByExpressionStream(oldQueryArgs, { ctx })
    let struct = {
      code: 200,
      description: 'OK',
      response: ['content']
    }
    let [head, tail] = JSON.stringify(struct).split('"content"')

    const myTransform = new Transform({
      flush(callback) {
        callback(null, tail)
      },
      transform(chunk, encoding, callback) {
        // console.log(chunk.toString('utf8'))
        callback(null, chunk.toString('utf8'))
      }
    })

    myTransform.write(head)
    ctx.status = 200
    ctx.set('Content-type', 'application/json')
    ctx.body = data.pipe(myTransform)
  } else {
    if (2000 < pageSize) {
      ctx.body = {
        code: 400,
        description: '参数错误'
      }
      return
    }

    oldQueryArgs = await addFiltersByRole(ctx, oldQueryArgs)
    const data = await DruidQueryService.queryByExpression(oldQueryArgs, { ctx })
    ctx.body = {
      code: 200,
      description: 'OK',
      response: data
    }
  }
}

async function getMetricInfos(slice) {
  let params = slice?.params
  let metrics = params?.metrics
  let dbMetrics = await queryDbMetricsMemoized({
    parentId: slice.druid_datasource_id,
    name: { $in: _.uniq(metrics) }
  })
  let keys = ['id', 'name', 'title', 'formula', 'pattern']

  let tempMetrics = dbMetricAdapter(params?.tempMetricDict)
  let localMetrics = _.keys(params?.localMetricDict).map(m => LocalMetric.dbMetricAdapter(m, params?.localMetricDict[m], dbMetrics, params?.tempMetricDict))

  return [..._.map(dbMetrics, m => _.pick(m, keys)), ...(params?.customMetrics || []), ..._.map(tempMetrics, m => _.pick(m, keys)), ...localMetrics]
}

async function formatTimeCol(oldQueryArgs, withGlobalMetrics, data) {
  let dimensionResp = await db.SugoDimensions.findAll({
    where: {
      $and: {
        parentId: oldQueryArgs.druid_datasource_id,
        name: { $in: oldQueryArgs.dimensions }
      }
    },
    raw: true
  })
  let temp = withGlobalMetrics ? data : _.get(data, [0, 'resultSet'], data)
  let dimensionExtraSettingDict = _.keyBy(oldQueryArgs.dimensionExtraSettings, 'sortCol')

  const formatResultsTimeDim = array => {
    let tempArr = array.map(i => {
      dimensionResp.forEach(dbDim => {
        if (_.isArray(i[dbDim.name + '_GROUP'])) {
          i[dbDim.name + '_GROUP'] = formatResultsTimeDim(i[dbDim.name + '_GROUP'])
        }

        if (withGlobalMetrics && _.isArray(i.resultSet)) {
          i.resultSet = formatResultsTimeDim(i.resultSet)
        }

        if (isTimeDimension(dbDim)) {
          let granularity = _.get(dimensionExtraSettingDict, `${dbDim.name}.granularity`) || 'P1D'
          i[dbDim.name] = dateFormatterGenerator(granularityToFormatByConfig(granularity))(i[dbDim.name])
        }
      })
      return i
    })
    return tempArr
  }
  formatResultsTimeDim(temp)
}

async function accessSliceGroupByQueryAPI(ctx, api, slicePreQuery, extraArgs) {
  let { pageSize, withMetricInfos, meta, extraOnly = 0 } = extraArgs

  const dim0 = slicePreQuery.params.dimensions[0]
  if (!_.isNil(pageSize) && dim0) {
    if (maxDownloadLimit < pageSize) {
      ctx.body = { code: 400, description: 'Error', response: `参数错误: pageSize 不能超过 ${maxDownloadLimit}` }
      return
    }
    slicePreQuery = immutateUpdate(slicePreQuery, `params.dimensionExtraSettingDict[${dim0}].limit`, () => pageSize)
  }

  const extraResponse = api?.params?.extraResponse
  if (+extraOnly) {
    ctx.status = 200
    ctx.body = {
      code: 200,
      description: 'OK',
      response: null,
      // 支持查询指标信息，主要用于格式化
      ...(withMetricInfos ? { metricInfos: await getMetricInfos(slicePreQuery) } : {}),
      ...(meta ? { slice: slicePreQuery } : {}),
      ...(extraResponse ? { extra: extraResponse } : {})
    }
    return
  }

  // "queryType": "lucene_select"
  let oldQueryArgs = transformToOldQueryFormat(slicePreQuery)
  const alias = _.get(api, 'params.indicesName', [])

  oldQueryArgs = await addFiltersByRole(ctx, oldQueryArgs)
  let data = await DruidQueryService.queryByExpression(oldQueryArgs, { ctx })
  data = await handleLocalMetrics(
    immutateUpdates(slicePreQuery, 'params.filters', () => oldQueryArgs.filters),
    data
  )

  let withGlobalMetrics = _.get(slicePreQuery, 'params.withGlobalMetrics', false)
  if (dataApiTimeShouldFormat && !_.isEmpty(_.compact(oldQueryArgs.dimensions))) {
    await formatTimeCol(oldQueryArgs, withGlobalMetrics, data)
  }

  let renameDict = dictBy(
    alias,
    d => d.indexTitle,
    d => d.indexName
  )
  if (!_.isEmpty(renameDict)) {
    data = recurMap(
      data,
      t => _.findKey(t, _.isArray),
      d => {
        return _.mapKeys(d, (v, k) => (k in renameDict ? renameDict[k] : k))
      }
    )
  }

  // 返回格式按照左临的文档来
  ctx.status = 200
  ctx.body = {
    code: 200,
    description: 'OK',
    response: withGlobalMetrics ? data : _.get(data, [0, 'resultSet'], data),
    // 支持查询指标信息，主要用于格式化
    ...(withMetricInfos ? { metricInfos: await getMetricInfos(slicePreQuery) } : {}),
    ...(meta ? { slice: slicePreQuery } : {}),
    ...(extraResponse ? { extra: extraResponse } : {})
  }
}

async function handleLocalMetrics(slice, data) {
  if (!_.isEmpty(slice.params.localMetricDict) && _.some(slice.params.metrics, m => _.startsWith(m, '_localMetric_'))) {
    let dbDims = await getDimensionsByNames(slice.druid_datasource_id)
    let doQueryDruidData = slice0 => {
      let oldQueryArgs = transformToOldQueryFormat(slice0)
      return DruidQueryService.queryByExpression(oldQueryArgs)
    }
    data = await resolveLocalMetric(data || [], doQueryDruidData, {
      ...slice.params,
      dataSourceId: slice.druid_datasource_id,
      childProjectId: slice.child_project_id,
      dbDimensions: dbDims || []
    })
  }
  return data
}

async function accessUserGroupAPI(ctx, api, extraArgs) {
  let { pageIndex = 0, pageSize = 1000, meta } = extraArgs
  let forMeta = meta && +meta // 用户需要取得用户群定义
  ctx.status = 200
  const ugId = _.get(api, 'params.userGroupId')

  let dbUg = await db.Segment.findByPk(ugId)
  const totalUserCount = (dbUg && _.get(dbUg, 'params.total')) || 0
  if (forMeta) {
    if (!dbUg) {
      ctx.status = 404
      ctx.body = { code: 404, description: '用户群不存在' }
      return
    }
    ctx.body = {
      code: 200,
      description: 'OK',
      response: {
        apiInfo: _(api)
          .chain()
          .pick(['name', 'description', 'call_path'])
          .mapKeys((v, k) => _.camelCase(k))
          .value(),
        userGroupInfo: {
          id: ugId,
          name: dbUg.title,
          description: dbUg.description,
          totalUserCount: totalUserCount,
          userIdCol: _.get(dbUg, 'params.groupby') || 'distinct_id',
          recomputeStrategy: UsergroupRecomputeStrategyTranslation[_.get(dbUg, 'params.recomputeStrategy') || UsergroupRecomputeStrategyEnum.byHand]
          // filters: _.pick(dbUg.params, ['since', 'until', 'relativeTime', 'measure', 'measure3', 'dimension', 'tagFilters'])
        }
      }
    }
    return
  }

  ctx.set('Content-type', 'application/json')

  // TODO 优化用户群数据读取：因为现在读用户群数据是整个读入内存的，所以不分页性能反而更高，但是大数据量的话估计会报错
  const offset = pageIndex * pageSize
  let respStream = readUserIdInUserGroup(`usergroup_${ugId}`, offset, pageSize, pageSize)
  ctx.body = respStream
}

/**
 * 分批查询，由于全部查询出来可能会造成内存问题，所以需要分批进行查询
 *
 * @param {Function} batchQueryFunc ({dbOffset, dbLimit}) => []
 * @param {number} resultOffset
 * @param {number} resultLimit
 * @param {number} batchSize
 */
function batchQuery(batchQueryFunc, resultOffset = 0, resultLimit = Infinity, batchSize = 500) {
  if (resultLimit === null || resultLimit === undefined) {
    resultLimit = Infinity
  }
  const startPageIndex = Math.floor(resultOffset / batchSize)
  const skipCount = resultOffset - startPageIndex * batchSize

  let done = false
  return AsyncStream.range(startPageIndex)
    .map(batchIndex => {
      if (done) {
        return []
      }
      return batchQueryFunc({ pageIndex: batchIndex, pageSize: batchSize }).then(arr => {
        if (_.size(arr) < batchSize) {
          done = true
        }
        return arr
      })
    })
    .takeWhile(arr => 0 < arr.length)
    .flatMap(x => x)
    .drop(skipCount)
    .take(resultLimit)
  // .toArray()
}

function readUserIdInUserGroup(groupId, offset = 0, limit = 1000, queryPageSize = 1000) {
  let idIdx = 0
  let struct = {
    code: 200,
    description: 'OK',
    response: ['content']
  }

  let [head, tail] = JSON.stringify(struct).split('"content"')
  const batchQueryFunc = async ({ pageIndex, pageSize }) => {
    let q = {
      groupReadConfig: { pageIndex, pageSize },
      dataConfig: { ...conf.dataConfig, groupId }
    }
    // console.log(`query ug ${groupId} pageIndex: ${pageIndex}, pageSize: ${pageSize}`)
    let res = await UserGroupService.read(q)
    return _.get(res, 'result.ids') || []
  }
  const contentStream = batchQuery(batchQueryFunc, offset, limit, queryPageSize).map(id => (idIdx++ === 0 ? `"${id}"` : `,"${id}"`))

  let strAsyncStream = AsyncStream.fromIterable([head])
    .concat(contentStream)
    .concat(AsyncStream.fromIterable([tail]))

  const myReadable = new Readable({
    encoding: 'utf8',
    async read(size) {
      let read = 0
      try {
        let arr = []
        do {
          let str = await strAsyncStream.first()
          if (str === undefined) {
            break
          }
          arr.push(str)
          strAsyncStream = await strAsyncStream.rest()
          read += str.length
        } while (read < size)
        let bigStr = arr.join('')
        myReadable.push(bigStr || null)
      } catch (e) {
        console.error(e)
        myReadable.push(null)
      }
    }
  })

  return myReadable
}

const ApiCallsOverviewConfig = [
  {
    name: '有效API接口数',
    vizType: 'number',
    query: {
      where: { status: { $between: [200, 400] } },
      opts: {
        attributes: [[{ val: 'count(distinct path)' }, '有效API接口数']]
      }
    }
  },
  {
    name: '累计调用次数',
    vizType: 'number',
    query: {
      where: { status: { $between: [200, 400] } },
      opts: {
        attributes: [[{ val: 'sum(count)' }, '累计调用次数']]
      }
    }
  },
  {
    name: '失败次数',
    vizType: 'number',
    query: {
      where: { status: { $gte: 400 } },
      opts: {
        attributes: [[{ val: 'sum(count)' }, '失败次数']]
      }
    }
  },
  {
    name: '每天调用趋势',
    vizType: 'line',
    query: {
      where: {},
      opts: {
        attributes: [
          conf.db.dialect === 'mysql'
            ? [{ fn: 'DATE_FORMAT', args: [{ col: 'created_at' }, '%Y-%m-%d 00:00:00'] }, 'date']
            : [{ fn: 'date_trunc', args: ['day', { col: 'created_at' }] }, 'date'],
          [{ fn: 'SUM', args: [{ col: 'count' }] }, '调用量']
        ],
        group: ['date'],
        order: { val: '1 desc' },
        limit: 7
      }
    }
  },
  {
    name: '每小时调用趋势',
    vizType: 'line',
    query: {
      where: {},
      opts: {
        attributes: [
          conf.db.dialect === 'mysql'
            ? [{ fn: 'DATE_FORMAT', args: [{ col: 'created_at' }, '%Y-%m-%d %H:00:00'] }, 'time']
            : [{ fn: 'date_trunc', args: ['hour', { col: 'created_at' }] }, 'time'],
          [{ fn: 'SUM', args: [{ col: 'count' }] }, '调用量']
        ],
        group: ['time'],
        order: { val: '1 desc' },
        limit: 24
      }
    }
  },
  {
    name: '调用量 top10',
    vizType: 'horizontal_bar',
    query: {
      where: {},
      opts: {
        attributes: ['path', [{ fn: 'SUM', args: [{ col: 'count' }] }, '调用量']],
        group: ['path'],
        order: { val: '2 desc' },
        limit: 10
      }
    }
  },
  {
    name: '失败率 top10',
    vizType: 'horizontal_bar',
    query: {
      where: {},
      opts: {
        attributes: ['path', [{ val: '(sum(case when status >= 400 then count else 0 end )) / sum(count)' }, '失败率']],
        group: ['path'],
        order: { val: '2 desc' },
        limit: 10
      }
    }
  }
]

/**
 * 之前考虑将 ApiCallsOverviewConfig 放到前端，所以有这一步转换
 * 但是出于安全考虑，还是放到后端查数据库
 * @param obj
 * @returns {Sequelize.fn|Sequelize.col|*|Sequelize.literal|*}
 */
function translateAttr(obj) {
  if (!_.isObject(obj)) {
    return obj
  }
  let { col, val, fn, args } = obj
  if (col) {
    return Seq.col(col)
  }
  if (val) {
    return Seq.literal(val)
  }
  if (fn) {
    return Seq.fn(fn, ...args.map(translateAttr))
  }
  return obj
}

let validApiPathsCache = null
async function queryAPILog(ctx) {
  let { user } = ctx.session
  let { company_id, id } = user

  let { configName } = _.isEmpty(ctx.q) ? ctx.query : ctx.q
  const queryConfig = _.find(ApiCallsOverviewConfig, c => c.name === configName)
  let { where, opts } = queryConfig.query
  // 只能查询日志访问的 log
  if (!validApiPathsCache) {
    let validApis = await SugoDataApiService.getInstance().findAll({ company_id }, { raw: true, attributes: ['id', 'call_path'] })
    validApiPathsCache = (validApis || []).map(a => `/data-api/${a.call_path}`)
    setTimeout(() => (validApiPathsCache = null), 5000)
  }
  let cond = {
    $and: [{ path: { $in: validApiPathsCache } }, where]
  }
  if (opts.attributes) {
    opts = immutateUpdate(opts, 'attributes', attrs => {
      return attrs.map(attr => {
        if (_.isArray(attr)) {
          let [expObj, ...rest] = attr
          return [translateAttr(expObj), ...rest]
        }
        return attr
      })
    })
  }
  if (_.isObject(opts && opts.order)) {
    opts = immutateUpdate(opts, 'order', translateAttr)
  }
  let data = await db.ApiResultLog.findAll({
    raw: true,
    ...opts,
    where: cond
  })
  const resCols = (_.get(opts, 'attributes') || []).map(attr => (_.isArray(attr) ? attr[1] : attr))
  const dimensions = _.get(opts, 'group') || []
  returnResult(ctx, {
    vizType: queryConfig.vizType,
    data,
    dimensions: dimensions,
    metrics: resCols.filter(c => !_.includes(dimensions, c))
  })
}

export default {
  query,
  create,
  update,
  remove,
  callDataAPI,
  queryAPILog
}
