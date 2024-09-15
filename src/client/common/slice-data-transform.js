import _ from 'lodash'
import moment from 'moment'
import {compressUrlQuery, dictBy, hashCode, toQueryParams} from '../../common/sugo-utils'
import Fetch from './fetch-final'
import {DefaultDruidQueryCacheOpts, withExtraQuery} from './fetch-utils'
import {dbMetricAdapter} from '../../common/temp-metric'
import * as LocalMetric from '../../common/local-metric'
import {
  customMetricProperties,
  ExcludeFromMetricsReg,
  handlePreMetrics,
  resolveLocalMetric
} from '../../common/druid-query-utils'

//convert '6 days' => [6, 'days']
function convert(dateType) {
  if (_.isArray(dateType)) return dateType
  let arr = dateType.split(' ')
  return [Number(arr[0]), arr[1]]
}

const units = {
  years: 'y',
  months: 'M',
  weeks: 'w',
  days: 'd',
  hours: 'h',
  minutes: 'm',
  seconds: 's'
}

const timeReg = new RegExp(`^([\\+-]\\d+)\\s+(${Object.keys(units).join('|')})$`)

export function parseFriendlyTime(str, defaultVal = null) {
  let m = null
  switch (str) {
    case 'now':
      m = moment()
      break
    case '100 years ago':
      m = moment().add(-100, 'year')
      break
    default:
    {
      let ma = (str || '').match(timeReg)
      if (ma) {
        m = moment().add(...convert(str))
      }
      break
    }
  }
  return m || defaultVal
}

export async function doQuerySliceData(slice, opts = DefaultDruidQueryCacheOpts) {
  if (!slice.druid_datasource_id) {
    return Promise.reject(new Error('未选择项目'))
  }
  let res = await doQueryDruidData(slice, opts)
  if (!_.isEmpty(slice.params.localMetricDict)
    && _.some(slice.params.metrics, m => _.startsWith(m, '_localMetric_'))) {
    /*  let optsSample = {
      dataSourceId: '',
      dbDimensions: [], // 需要传递时间维，计算同比时用到
      childProjectId: '',
      
      // in params
      dimensions: [],
      metrics: [],
      filters: [],
      localMetricDict: {},
      tempMetricDict: {},
      customMetrics: [],
      vizType: '',
      dimensionExtraSettingDict: {},
      autoReloadInterval: 0,
      chartExtraSettings: {},
      timezone: '',
      customDimensions: []
    } */
    let dbDims = await Fetch.get(`/app/dimension/get/${slice.druid_datasource_id}?cCache=60`)
    res = await resolveLocalMetric(res || [], doQueryDruidData, {
      ...slice.params,
      dataSourceId: slice.druid_datasource_id,
      childProjectId: slice.child_project_id,
      dbDimensions: _.get(dbDims, 'data') || []
    })
  }
  return res
}

export function getQueryDruidDataUrl(slice, opts = DefaultDruidQueryCacheOpts) {
  let {
    druid_datasource_id,
    child_project_id,
    datasource_name,
    params
  } = slice
  
  let body = genQueryBody({
    dataSourceId: druid_datasource_id,
    childProjectId: child_project_id,
    datasource_name,
    splitType: params.vizType === 'table_flat' ? 'groupBy' : 'tree',
    ...params
  })
  let url = `/app/slices/query-druid?${toQueryParams(_.pick(opts, ['sCache', 'cCache']))}`
  if (2000 <= url.length) {
    debug('url 太长，建议使用 post')
  }
  return withExtraQuery(url, { q: compressUrlQuery(JSON.stringify(body) )})
}

export function doQueryDruidData(slice, opts = DefaultDruidQueryCacheOpts) {
  let {
    druid_datasource_id,
    child_project_id,
    datasource_name,
    params
  } = slice

  let body = genQueryBody({
    dataSourceId: druid_datasource_id,
    childProjectId: child_project_id,
    datasource_name,
    splitType: params.vizType === 'table_flat' ? 'groupBy' : 'tree',
    ...params
  })

  let url = `/app/slices/query-druid?${toQueryParams(_.pick(opts, ['sCache', 'cCache']))}`
  return Fetch.get(url, body, {_autoSwitchToPostWhenUrlTooLong: true})
}

export const genQueryBody = (props) => {
  let {
    dataSourceId, filters, metrics, timezone, dimensions, dimensionExtraSettingDict, customMetrics,
    select, selectOffset, selectLimit, selectOrderDirection, tempMetricDict, groupByAlgorithm, customDimensions,
    selectOrderBy, splitType, withGlobalMetrics, queryEngine, childProjectId, localMetricDict, accessDataType, offline_calc_table_id
  } = props
  
  let granularity = _.get(dimensionExtraSettingDict, ['__time', 'granularity']) || 'P1D'
  
  // {name: '', fomular: '', dimName: '', dimParams: {}}
  let finalCustomMetrics = handlePreMetrics(customMetrics || []).concat(
    dbMetricAdapter(tempMetricDict).map(obj => _.pick(obj, customMetricProperties))
  )
  
  let body = {
    druid_datasource_id: dataSourceId,
    child_project_id: childProjectId,
    timezone,
    dimensions,
    metrics: _.filter(metrics, m => !ExcludeFromMetricsReg.test(m)),
    granularity: _.startsWith(granularity, 'P') ? granularity : 'P1D',
    filters: _.map(filters, flt => _.omit(flt, 'isLegendFilter')),
    dimensionExtraSettings: _.map(dimensions, dim => _.get(dimensionExtraSettingDict, [dim])).filter(_.identity),
    customMetrics: finalCustomMetrics,
    customDimensions,
    select,
    selectOffset,
    selectLimit,
    selectOrderDirection,
    selectOrderBy,
    groupByAlgorithm,
    splitType,
    withGlobalMetrics,
    queryEngine,
    // 仅仅为了在加入高级计算指标时，触发查询单图，以便触发高级指标计算逻辑
    _localMetricHash: _.isEmpty(localMetricDict) ? null : hashCode(JSON.stringify(localMetricDict))
  }
  if(accessDataType === 'external') {
    body.offline_calc_table_id = offline_calc_table_id
    body.tempMetricDict = tempMetricDict
  }
  return _.pickBy(body, (val) => {
    if (val === undefined || val === null) {
      return false
    }
    return !((_.isObject(val) || _.isArray(val)) && _.isEmpty(val))
  })
}

export function translateKey(data, dict) {
  if (!data || !data.length) {
    return data
  }

  return data.map(d => _.mapKeys(d, (val, key) => dict[key] || key))
    .map(d => _.mapValues(d, val => {
      return _.isArray(val) ? translateKey(val, dict) : val
    }))
}

export function genTranslationDict(
  slice,
  dbDims = _.get(window.store.getState(), `dbDims_${slice.druid_datasource_id}.dataSourceDimensions`),
  dbMetrics = _.get(window.store.getState(), `dbMetrics_${slice.druid_datasource_id}.dataSourceMeasures`)
) {
  let sliceParams = slice.params
  let tempMetrics = dbMetricAdapter(sliceParams.tempMetricDict)
  let localMetrics = _.keys(sliceParams.localMetricDict)
    .map(m => LocalMetric.dbMetricAdapter(m, sliceParams.localMetricDict[m], dbMetrics, sliceParams.tempMetricDict))
  
  let dimNameSet = new Set(sliceParams.dimensions)
  let metricNameSet = new Set(sliceParams.metrics)
  let dbMetricsInUse = _.filter(dbMetrics, dbM => metricNameSet.has(dbM.name))
  let translationDict = dictBy([
    ..._.filter(dbDims, dbD => dimNameSet.has(dbD.name)),
    ...dbMetricsInUse,
    ...tempMetrics,
    ...(sliceParams.customMetrics || []),
    ...localMetrics
  ].filter(dimOrMea => dimOrMea.title), o => o.name, o => o.title)
  
  // 可重写translationDict参数
  translationDict = _.assign(translationDict, _.get(sliceParams, 'translationDict', {}))
  return translationDict
}
