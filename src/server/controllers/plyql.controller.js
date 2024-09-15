import { Expression, ply, $ } from 'sugo-plywood'
import * as plyqlExecutor from '../utils/plyql-executor'
import druidContext, {requesterWithToArray} from '../utils/druid-middleware'
import moment from 'moment'
import _ from 'lodash'
import FetchKit from '../utils/fetch-kit'
import * as TimeKit from '../utils/time-kit'
import {decompressUrlQuery} from '../../common/sugo-utils'
import {returnResult, returnError, setCacheControlByTimeRange} from '../utils/helper'
import cache from '../services/cache'
import DruidQueryService from '../services/druid-query.service'
// import plywoodDruidRequester from 'plywood-druid-requester'
import {translateFormula} from '../utils/relative-time-tranform'
import config from '../config'
import { QUERY_ENGINE } from '../../common/constants'
import db from '../models'
import { DimensionParamsTypes } from '../../common/dimension-params-type'
import {getDatasourcesById} from '../services/sugo-datasource.service'

const {relativeTimeType = 'tool'} = config.site || {}

const plyql = {

  health: async(ctx) => {
    ctx.body = 'I am healthy @' + moment().format('YYYY-MM-DD HH:mm:ss')
  },
  nativeQueryForTindex: async (ctx) => {
    const query = ctx.q
    if (!query) {
      throw new Error('query is empty')
    }
    const host = config.druid.host.split(',')[0]
    const res = await FetchKit.post(`http://${host}/druid/v2`, query)
    ctx.body = res
  },
  /**
   * sql查询druid数据源
   */
  queryBySQL: async (ctx) => {
    let q = !_.isEmpty(ctx.q) ? ctx.q : ctx.request.body
    let query = q.query
    let queryEngine = _.get(q, 'queryEngine')
    let childProjectId = _.get(q, 'childProjectId')
    if (!queryEngine) {
      queryEngine = QUERY_ENGINE.TINDEX
    }
    if (typeof query !== 'string') {
      return returnError(ctx, '\'sql\' must be a string.')
    }
    console.log('Got SQL: ' + query)
    try {
      const sqlObj = Expression.parseSQL(query)
      const project = await db.SugoProjects.findOne({
        where: {
          datasource_name: sqlObj.table
        },
        raw: true,
        attributes: ['datasource_id']
      }) || {}
      let encodeFields = await db.SugoDimensions.findAll({
        where: {
          parentId: project.datasource_id,
          tag_extra: {
            is_Desensitiz: true
          }
        },
        raw: true,
        attributes: ['name']
      }).map(p=> p.name) || []   

      let newQuery = query
      if (encodeFields.length > 0) {
        const fromIndex = _.get(newQuery.match(/ from /i), 'index')
        const groupIndex = _.get(newQuery.match(/ group /i), 'index')
        let select = fromIndex ? newQuery.substr(0, fromIndex) : newQuery
        const other = fromIndex ? newQuery.substring(fromIndex, groupIndex) : ''
        let group = groupIndex ? newQuery.substr(groupIndex) : ''
        const reg = new RegExp(encodeFields.join('|'), 'g')
        let sqlfields = query.match(reg)
        _.uniq(sqlfields).forEach(p => {
          select = select.replace(p, p + '__encode')
          group = group.replace(p, p + '__encode')
        })
        newQuery = select + other + group
      }

      let result = await DruidQueryService.queryBySQL(newQuery, queryEngine, childProjectId)

      if (result.length > 0) {
        encodeFields = encodeFields.map(p => {
          return { key: p, value: p + '__encode' }
        })
        const codeFields = encodeFields.map(p => p.value)
        result = result.map(p => {
          const encode = _.reduce(encodeFields, (r, v) => {
            const val = _.get(p, v.value)
            if (typeof val === 'undefined') {
              return r
            }
            r[v.key] = val
            return r
          }, {})
          return {
            ..._.omit(p, codeFields),
            ...encode
          }
        })
      }
      
      ctx.body = {
        result,
        version: ctx.local.version
      }
    } catch (e) {
      console.error(e)
      ctx.body = {
        result: [],
        version: ctx.local.version
      }
    }
  },
  /**
   * 支持界面expression表达式查询
   */
  queryByExpression: async (ctx) => {
    let {
      expression
    } = ctx.request.body
    if (typeof expression === 'undefined') {
      ctx.throw(400, '\'expression\' must be defined')
    }
    console.log('Got expression')
    try {
      let ex = Expression.fromJSLoose(expression)
      let druidProps = await druidContext(ctx)
      let result = await plyqlExecutor.executePlywood(ex, druidProps.context, druidProps.timezone)
      returnResult(ctx, result)
    } catch (e) {
      console.error(e)
      returnResult(ctx, [])
    }
    //plyql.queryProcessor(result);
  },

  queryByFormula: async (ctx) => {
    let { formulas, dataSourceName } = ctx.request.body

    if (!formulas || !dataSourceName) {
      returnError(ctx, 'missing args')
    }
    try {
      let query = ply()
      let expMain = query.apply('main', $(dataSourceName))

      formulas.forEach(({name, formula}) => {
        expMain = expMain.apply(name, Expression.parse(translateFormula(formula)))
      })

      let ex = Expression.fromJSLoose(expMain)
      let druidProps = await druidContext(ctx, dataSourceName)
      let result = await plyqlExecutor.executePlywood(ex, druidProps.context, druidProps.timezone)
      returnResult(ctx, result)
    } catch (e) {
      console.error(e)
      returnResult(ctx, [])
    }
  },

  /** druid 原生query查询 */
  queryByLucene: async(ctx) => {
    let isRequestByGet = ctx.request.method.toUpperCase() === 'GET'
    
    let query
    if (isRequestByGet && ctx.query.query) {
      query = JSON.parse(decompressUrlQuery(ctx.query.query))
    } else if (isRequestByGet && ctx.query.q) {
      query = JSON.parse(decompressUrlQuery(ctx.query.q))
    } else {
      query = ctx.request.body
    }
  
    // 自动根据数据源 id 查询数据源名称
    if (!query.dataSource && query.dataSourceId) {
      let ds = await getDatasourcesById(query.dataSourceId)
      if (!ds) {
        throw new Error(`不存在 id 为 ${query.dataSourceId} 的数据源`)
      }
      query.dataSource = ds.name
    }
    if (query.queryType === 'funnel' && query.dataSourceId && query.filter && query.filter.dimension) {
      const dim = await db.SugoDimensions.findOne({
        where: {
          name: query.filter.dimension,
          parentId: query.dataSourceId
        }
      })
      if (dim && _.get(dim, 'params.type') === DimensionParamsTypes.business) {
        query.filter.dimension = _.get(dim, 'params.dimension', '')
        query.filter.extractionFn = {
          type: 'registeredLookup',
          lookup: dim.id,
          retainMissingValue: false,
          replaceMissingValueWith: _.get(dim, 'params.table_field_miss_value', ''),
          optimize: true
        }
      }
    }

    if(_.isString(query.intervals)) {
      query.intervals = [query.intervals]
    }
    if (query.intervals && query.intervals[0] && _.isString(query.intervals[0])) {
      let [since, until] = query.intervals[0].split('/')

      // 限制不能查超过当前时刻的数据
      let mNow = moment()
      if (relativeTimeType === 'business' && moment(since || 0).isBefore(mNow)) {
        if (!until || moment(until).isAfter(mNow)) {
          until = mNow.toISOString()
          query.intervals[0] = `${since}/${until}`
        }
      }
      if (moment(until).isBefore(moment(since))) {
        return returnError(ctx, `结束时间不能早于开始时间: ${since} - ${until}`)
      }
      if (isRequestByGet) {
        setCacheControlByTimeRange(ctx, since, until)
      }
    } else {
      return returnError(ctx, '不正确的时间范围')
    }
    // 统一处理查询druid的时间问题 转换为ISO带时区格式查询
    query.intervals = TimeKit.luceneIntervalFormatToUtc(query.intervals)

    // console.log('query=>', JSON.stringify(query, null, 2))

    try {
      let res = await requesterWithToArray({
        query
      })

      ctx.body = res
    } catch (e) {
      console.error(e)
      ctx.body = []
    }
  },

  //单图参数转换为druid查询
  //post ctx.body.qs = JSON.stringify(queryParamsObj)
  getDruidQuery: async ctx => {
    let {q: queryParams} = ctx
    ctx.body = await DruidQueryService.createQuery(queryParams)
  }
}

export default plyql
