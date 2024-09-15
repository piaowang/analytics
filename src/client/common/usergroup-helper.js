/**
 * Created by heganjie on 2016/12/7.
 */
import Fetch from './fetch-final'
import CryptoJS from 'crypto-js'
import _ from 'lodash'
import * as ls from './localstorage'
import {
  browserHistory
} from 'react-router'
import {
  convertDateType,
  isRelative,
  tagFiltersAdaptToOldFormat
} from '../../common/param-transform'
import moment from 'moment'
import toUgFilters, {
  engOpMap
} from '../../common/slice-filter-to-ug-filter'
import {
  compressUrlQuery,
  escape,
  mapAwaitAll
} from '../../common/sugo-utils'
import {
  checkPermission
} from './permission-control'
import {
  message
} from 'antd'
import {
  immutateUpdate
} from 'common/sugo-utils'
import {
  sliceFilterToLuceneFilterStr
} from '../../common/druid-query-utils'
import {
  UsergroupFilterStrategyEnum,
  UserGroupBuildInTagEnum,
  UserGroupFilterTypeEnum,
  UserGroupSetOperationEnum
} from '../../common/constants'

const {
  dataConfig
} = window.sugo

export function createUsergroup({
  userGroupTitle,
  dataSourceId,
  dataSourceName,
  metricalField,
  relativeTime,
  since,
  until,
  dimensionFilters = [],
  measureFilters = [],
  usergroupIds,
  createMethod,
  relationDimension = 'and',
  tags = [],
  composeInstruction,
  ...rest
}) {
  let idsMd5 = usergroupIds ?
    CryptoJS.MD5(JSON.stringify(usergroupIds)).toString() :
    ''
  // 临时分群的 id 使用这个 md5 来区分
  let preMd5 = {
    datasource_name: dataSourceName,
    groupby: metricalField,
    // 用户群构造指令 [{op: UserGroupSetOperationEnum, type: UserGroupFilterTypeEnum}, ...]
    composeInstruction: !_.isEmpty(composeInstruction)
      ? composeInstruction
      : [{
        op: UserGroupSetOperationEnum.union,
        type: UserGroupFilterTypeEnum.behaviorFilter,
        config: {
          measure: {
            relation: 'and',
            filters: measureFilters
          },
          relativeTime,
          since,
          until,
          dimension: {
            relation: relationDimension,
            filters: dimensionFilters
          }
        }
      }],
    usergroupIds: idsMd5
  }
  let md5 = CryptoJS.MD5(JSON.stringify(preMd5)).toString()
  let params = {
    ..._.pick(preMd5, ['groupby', 'composeInstruction']),
    dataConfig,
    md5,
    //标签的穿个composeInstruction过来覆盖掉
    ...rest
  }

  return {
    title: userGroupTitle,
    params,
    usergroupIds,
    id: 'temp_usergroup_' + md5,
    description: '',
    datasource_name: dataSourceName,
    druid_datasource_id: dataSourceId,
    tags
  }
}

/**
 * select userId, count(*) from table where event_name = xxx group by userId having count(*) > 0
 * 此函数的作用在于构造 where 条件
 * @param dimNames 维度名称，例如：['sugo_lib']
 * @param dimVals  维度值，例如：['注册手机银行'] / [['or'], ['android'], ['IOS']]
 * @param action
 * @param val
 * @param extraHavingFilters
 * @returns {*}
 */
export function keyValsToMeasureCond(dimNames, dimVals, action, val = 0, extraHavingFilters = undefined) {
  if (!_.isArray(dimVals[0])) {
    // ['xxx', 'yyy']
    let flts = dimNames.map((dimension, idx) => ({
      dimension,
      value: dimVals[idx] || ''
    })).filter(c => c.value)
    let filters = _.isEmpty(extraHavingFilters) ? flts : [...extraHavingFilters, ...flts]

    let luceneFlts = filters.map(flt => {
      let {
        action,
        value,
        dimension
      } = flt
      if (action === 'lucene') {
        return flt
      }
      if (action === 'between') {
        return {
          action: 'lucene',
          dimension,
          value: `${dimension}:[${moment(value[0]).valueOf()} TO ${moment(value[1]).valueOf()}}`
        }
      }
      return {
        action: 'lucene',
        dimension,
        value: dimension + ':' + escape(value + '')
      }
    })

    let mergedFlt = {
      action: 'lucene',
      dimension: _.flatMap(luceneFlts, f => f.dimension),
      value: luceneFlts.map(f => `(${f.value})`).join(' AND ') || '*:*'
    }
    return {
      // measure: '',
      // actionType: 'num',
      // formulaType: 'str',
      action,
      value: val,
      formula: 'lucene_count',
      // 将多个筛选合并成一个 lucene filter
      filters: [mergedFlt].filter(f => f.value !== '*:*')
    }
  }

  // 如果第一个元素是数组，则里面的值是 or / and, 表达 dimVals 的组合关系
  // [['and'], ['xxx', 'yyy'], ['xxx', 'yyy']]
  let relation = action === '<=' ?
    'or' :
    dimVals[0][0]
  return {
    relation,
    filters: _.drop(dimVals, 1).map(a => keyValsToMeasureCond(dimNames, a, action, val, extraHavingFilters))
  }
}

export async function sliceToUsergroup(slice, metricalField, dbMetricNameDict = {}, extraProps = {}) {
  let {
    druid_datasource_id,
    datasource_name,
    params
  } = slice

  let timeFlt = _.find(params.filters, flt => flt.col === '__time') || {
    col: '__time',
    op: 'in',
    eq: ['1000', '3000']
  }

  let relativeTime = isRelative(timeFlt.eq) ? timeFlt.eq : 'custom'
  let [since, until] = relativeTime === 'custom' ? timeFlt.eq : convertDateType(relativeTime)

  let sliceFilters = params.filters.filter(flt => !flt.isLegendFilter && flt.col !== '__time')
  let [havingFilters, dimFilters] = _.partition(sliceFilters,
    flt => _.includes(params.metrics, flt.col) || _.some(params.customMetrics, m => m.name === flt.col))

  // havingFilters to measureFilters
  let {
    customMetrics
  } = params
  let measureFilters = await mapAwaitAll(havingFilters, async hf => {
    const formula = hf.col in dbMetricNameDict ?
      _.get(dbMetricNameDict, [hf.col, 'formula']) :
      _(customMetrics).chain().find(m => m.name === hf.col).get('formula').value()
    let res = await Fetch.get('/app/measure/convert-formula-to-filters', {
      formula
    })

    return {
      action: engOpMap[hf.op],
      value: hf.eq,
      formula: 'lucene_count',
      // 将多个筛选合并成一个 lucene filter
      filters: [{
        action: 'lucene',
        dimension: _.uniq(res.result.map(f => f.col)),
        value: res.result.map(sf => sliceFilterToLuceneFilterStr(sf)).filter(_.identity).join(' AND ') || '*:*'
      }].filter(f => f.value !== '*:*')
    }
  })

  return createUsergroup({
    userGroupTitle: slice.slice_name || '未命名单图',
    dataSourceId: druid_datasource_id,
    dataSourceName: datasource_name,
    metricalField,
    relativeTime,
    since: moment(since).format(),
    until: moment(until).format(),
    dimensionFilters: toUgFilters(dimFilters),
    measureFilters: measureFilters,
    tags: [UserGroupBuildInTagEnum.UserActionInspectResultAsUserGroup],
    ...extraProps
  })
}

/**
 * 漏斗流失分析，具体算法参考 genFunnelLayerLostUserMeasureFilter
 * @param sugoFunnel
 * @param lossBeforeStepIdx
 * @param relativeTime
 * @param since
 * @param until
 * @param titleOverwrite
 * @returns {{title, params, usergroupIds, id, description, datasource_name, druid_datasource_id}}
 */
export function funnelToUsergroup(sugoFunnel, lossBeforeStepIdx, relativeTime, since, until, titleOverwrite = null) {
  let {
    id,
    datasource_name,
    druid_datasource_id,
    params: {
      funnelMetric,
      commonDimensions,
      funnelLayers2d,
      extraFilters,
      granularity = 'P1D',
      extraLayerFilters
    }
  } = sugoFunnel

  return createUsergroup({
    userGroupTitle: titleOverwrite || `流失分析${since} ~ ${until}`,
    filtersPreviewOverwrite: titleOverwrite,
    dataSourceId: druid_datasource_id,
    dataSourceName: datasource_name,
    metricalField: funnelMetric,
    dimensionFilters: toUgFilters(extraFilters),
    relativeTime,
    since,
    until,
    // 生成 md5 后，如果 measureFilters 太长的话会丢掉，实际查询时是根据 md5 去查的，去掉这部分不影响。
    // 如果需要重新计算，可以根据 measureFiltersBuilder 再生成
    measureFilters: genFunnelLayerLostUserMeasureFilter({
      commonDimensions,
      funnelLayers2d,
      since,
      until,
      granularity,
      targetLayerIdx: lossBeforeStepIdx,
      extraLayerFilters
    }),
    measureFiltersBuilder: {
      buildFunction: 'genFunnelLayerLostUserMeasureFilter',
      params: {
        commonDimensions,
        funnelLayers2d,
        since,
        until,
        granularity,
        targetLayerIdx: lossBeforeStepIdx,
        extraLayerFilters
      }
    },
    funnelId: id,
    tags: [UserGroupBuildInTagEnum.UserActionInspectResultAsUserGroup]
  })
}

function simplifyFilter(ugFilter) {
  if (_.isArray(ugFilter)) {
    return ugFilter.map(uf => simplifyFilter(uf))
  }
  if ('relation' in ugFilter) {
    if (ugFilter.filters.length === 1) {
      return simplifyFilter(ugFilter.filters[0])
    }
    return { ...ugFilter,
      filters: simplifyFilter(ugFilter.filters)
    }
  }
  return ugFilter
}

/**
 * 生成某一层漏斗下钻分群筛选 filter
 * @param args
 * @returns {*}
 */
function genFunnelLayerUserMeasureFilter(args) {
  let {
    commonDimensions,
    funnelLayers2d,
    since,
    until,
    granularity, // 转化周期
    targetLayerIdx, // 计算某层的用户
    extraLayerFilters // 每层额外筛选
  } = args

  // 漏斗用户下钻算法：
  // 第 1 步：第 1 步 > 0
  // 第 2 步：第 1 步 > 0，第 2 步 > 0
  // 在此基础上加上转化周期的逻辑
  // 转化周期： 比如，转化周期设置为7天，是指用户完成漏斗第一步之后，需要在后续的7天内完成漏斗的最后一步才计为转化，否则会记为流失
  //
  // 第 1 步：每 n 天 epoch； e0 第 1 步 > 0 || e1 第 1 步 > 0  || ...
  // 第 2 步：每 n 天 epoch； (e0 第 1 步 > 0 且 第 2 步 > 0) || (e1 第 1 步 > 0 且 第 2 步 > 0) || ...
  // 第 3 步：每 n 天 epoch； (e0 第 1 步 > 0、第 2 步 > 0 且 第 3 步 > 0) || (e1 第 1 步 > 0、第 2 步 > 0 且 第 3 步 > 0) || ...
  //

  let mSince = moment(since).startOf('day')
  let mUntil = moment(until).add(-1, 'ms').endOf('day').add(1, 'ms') // ceiling
  let n = +granularity[1]

  let filters = _.range(Math.ceil(mUntil.diff(mSince, 'day') / n)).map(offset => {
    let sincePointer = mSince.clone().add(offset * n, 'day')
    let timeRangeFilter = {
      col: '__time',
      op: 'in',
      eq: [sincePointer.valueOf(), sincePointer.clone().add(n, 'day').valueOf()],
      type: 'number'
    }
    return {
      relation: 'and',
      filters: _.range(targetLayerIdx + 1).map(layerIdx => {
        let extraLayerFiltersForCurrLayer = [...(_.get(extraLayerFilters, [layerIdx]) || []), timeRangeFilter]
        let currLayerExtraHavings = [{
          action: 'lucene',
          dimension: _.uniq(extraLayerFiltersForCurrLayer.map(f => f.col)),
          value: extraLayerFiltersForCurrLayer.map(sf => sliceFilterToLuceneFilterStr(sf)).filter(_.identity).join(' AND ') || '*:*'
        }]

        return keyValsToMeasureCond(commonDimensions, funnelLayers2d[layerIdx], '>', 0, currLayerExtraHavings)
      })
    }
  })
  return simplifyFilter([{
    relation: 'or',
    filters
  }])
}

/**
 * 生成漏斗流失下钻分群筛选 filter
 * 目的是筛选出 targetLayerIdx - 1 至 targetLayerIdx 层的流失用户
 * @param args
 * @param layerIdx 用于递归，调用时不需要传
 * @returns {*}
 */
function genFunnelLayerLostUserMeasureFilter(args) {
  let {
    commonDimensions,
    funnelLayers2d,
    since,
    until,
    granularity, // 转化周期
    targetLayerIdx, // countLostUser 为 true 则计算 targetLayerIdx - 1 至 targetLayerIdx
    extraLayerFilters // 每层额外筛选
  } = args

  return generateMeasureFilters(commonDimensions, funnelLayers2d, targetLayerIdx - 1, targetLayerIdx,
    (extraLayerFilters || []).map(singleLayerFilters => {
      if (_.isEmpty(singleLayerFilters)) {
        return []
      }
      return [{
        action: 'lucene',
        dimension: _.uniq(singleLayerFilters.map(f => f.col)),
        value: singleLayerFilters.map(sf => sliceFilterToLuceneFilterStr(sf)).filter(_.identity).join(' AND ') || '*:*'
      }]
    }))

  // 流失用户下钻算法：
  // 从第 1 步到第 2 步，取前两层，第 1 步 > 0，第 2 步 <= 0
  // 从第 2 步到第 3 步，取前三层，第 1 步 > 0，第 2 步 > 0，第 3 步 <= 0
  // 从第 1 步到第 3 步，取前三层，第 1 步 > 0，第 2 步 <= 0，第 3 步 <= 0 （界面未体现）
  // 在此基础上加上转化周期的逻辑
  // 转化周期： 比如，转化周期设置为7天，是指用户完成漏斗第一步之后，需要在后续的7天内完成漏斗的最后一步才计为转化，否则会记为流失
  // 对比上一层，是否存在转化关系（无序漏斗）
  //
  // 第 1 ~ 2 步：每 n 天 epoch； (e0 第 1 步 > 0 且 第 2 步 <= 0) || (e1 第 1 步 > 0 且 第 2 步 <= 0) || ...
  // 第 2 ~ 3 步：每 n 天 epoch； (e0 第 1 步 > 0、第 2 步 > 0 且 第 3 步 <= 0) || (e1 第 1 步 > 0、第 2 步 > 0 且 第 3 步 <= 0) || ...

  /*let mSince = moment(since).startOf('day')
  let mUntil = moment(until).add(-1, 'ms').endOf('day').add(1, 'ms') // ceiling
  let n = +granularity[1]

  let filters = _.range(Math.ceil(mUntil.diff(mSince, 'day') / n)).map(offset => {
    let sincePointer = mSince.clone().add(offset * n, 'day')
    let timeRangeFilter = {
      col: '__time',
      op: 'in',
      eq: [sincePointer.valueOf(), sincePointer.clone().add(n, 'day').valueOf()],
      type: 'number'
    }
    return {
      relation: 'and',
      filters: _.range(targetLayerIdx + 1).map((layerIdx, idx, arr) => {
        let isLastOne = idx === arr.length - 1
        let extraLayerFiltersForCurrLayer = [...(_.get(extraLayerFilters, [layerIdx]) || []), timeRangeFilter]
        let currLayerExtraHavings = [{
          action: 'lucene',
          dimension: _.uniq(extraLayerFiltersForCurrLayer.map(f => f.col)),
          value: extraLayerFiltersForCurrLayer.map(sf => sliceFilterToLuceneFilterStr(sf)).filter(_.identity).join(' AND ') || '*:*'
        }]

        return keyValsToMeasureCond(commonDimensions, funnelLayers2d[layerIdx], isLastOne ? '<=' : '>', 0, currLayerExtraHavings)
      })
    }
  })
  return simplifyFilter([{ relation: 'or', filters }])*/
}

function generateMeasureFilters(commonDimensions, funnelLayers2d, stepFrom, stepTo, extraHavingFilters) {
  // 流失用户算法：
  // 从第 1 步到第 2 步，取前两层，第 1 步 > 0，第 2 步 <= 0
  // 从第 2 步到第 3 步，取前三层，第 1 步 > 0，第 2 步 > 0，第 3 步 <= 0
  // 从第 1 步到第 3 步，取前三层，第 1 步 > 0，第 2 步 <= 0，第 3 步 <= 0
  let finalCond, actions
  if (stepFrom === 0 && stepTo === funnelLayers2d.length - 1) {
    finalCond = funnelLayers2d
    actions = ['>', ..._.times(finalCond.length - 1, () => '<=')]
  } else {
    let gt0Cond2d = _.take(funnelLayers2d, stepFrom + 1)
    finalCond = [...gt0Cond2d, funnelLayers2d[stepTo]]
    actions = [..._.times(finalCond.length - 1, () => '>'), '<=']
  }
  return finalCond.map((cond, i) => {
    let action = actions[i]
    return keyValsToMeasureCond(commonDimensions, cond, action, 0, extraHavingFilters[i])
  })
}

/**
 * 漏斗每层用户下钻
 * @param sugoFunnel
 * @param layerIdx
 * @param titleOverwrite
 */
export function funnelLayerToUserGroup(sugoFunnel, layerIdx, titleOverwrite = null) {
  let {
    id,
    datasource_name,
    druid_datasource_id,
    params: {
      funnelMetric,
      commonDimensions,
      funnelLayers2d,
      extraFilters,
      granularity = 'P1D',
      relativeTime,
      since,
      until,
      extraLayerFilters
    }
  } = sugoFunnel


  return createUsergroup({
    userGroupTitle: titleOverwrite || `漏斗分析第 ${layerIdx + 1} 用户分群`,
    filtersPreviewOverwrite: titleOverwrite,
    dataSourceId: druid_datasource_id,
    dataSourceName: datasource_name,
    metricalField: funnelMetric,
    dimensionFilters: toUgFilters(extraFilters),
    relativeTime,
    since,
    until,
    // 生成 md5 后，如果 measureFilters 太长的话会丢掉，实际查询时是根据 md5 去查的，去掉这部分不影响。
    // 如果需要重新计算，可以根据 measureFiltersBuilder 再生成
    measureFilters: genFunnelLayerUserMeasureFilter({
      commonDimensions,
      funnelLayers2d,
      extraLayerFilters,
      since,
      until,
      granularity,
      targetLayerIdx: layerIdx
    }),
    measureFiltersBuilder: {
      buildFunction: 'genFunnelLayerUserMeasureFilter',
      params: {
        commonDimensions,
        funnelLayers2d,
        extraLayerFilters,
        since,
        until,
        granularity,
        targetLayerIdx: layerIdx
      }
    },
    funnelId: id,
    tags: [UserGroupBuildInTagEnum.UserActionInspectResultAsUserGroup]
  })
}

/**
 * 留存当天人数统计转换为分群
 * 直接查询当天，起始行为xxx 计数 > 0，结束行为xxx计数 > 0，的用户数
 * 如果不限则不增加筛选条件
 * @param retention 留存
 * @param rangePairs 格式：[{firstVisitRange: [since, until], returnVisitRange: [since, until]}, ...]
 * @param titleOverwrite
 * @returns {{title, params, usergroupIds, id, description, datasource_name, druid_datasource_id}}
 */
export function retentionToUsergroup(retention, rangePairs, titleOverwrite = null) {
  let {
    datasource_name,
    druid_datasource_id,
    params: {
      relativeTime,
      since,
      until,
      retentionMetricalField,
      retentionDimension,
      extraFilters,
      startStep,
      endStep
    }
  } = retention

  let startStepFlt = keyValsToMeasureCond(retentionDimension, startStep, '>')
  let endStepFlt = keyValsToMeasureCond(retentionDimension, endStep, '>')
  return createUsergroup({
    userGroupTitle: titleOverwrite || rangePairs.map(pairObj => {
      let {
        firstVisitRange,
        returnVisitRange
      } = pairObj
      let firstVisitDate = firstVisitRange[0].substr(0, 10),
        returnVisitDate = returnVisitRange[0].substr(0, 10)
      return firstVisitDate === returnVisitDate ?
        `${firstVisitDate} 当天访问后的回访人群` :
        `${firstVisitDate} 访问后 ${returnVisitDate} 回访的留存人群`
    }).join(' 与 ') + (1 < rangePairs.length ? '的合并人群' : ''),
    filtersPreviewOverwrite: titleOverwrite,
    dataSourceId: druid_datasource_id,
    dataSourceName: datasource_name,
    metricalField: retentionMetricalField,
    dimensionFilters: toUgFilters(extraFilters),
    relativeTime,
    since,
    until,
    tags: [UserGroupBuildInTagEnum.UserActionInspectResultAsUserGroup],
    measureFilters: [{
      relation: 'or',
      filters: rangePairs.map(pairObj => {
        let {
          firstVisitRange,
          returnVisitRange
        } = pairObj
        let limitInFirstVisitRange = {
          dimension: '__time',
          action: 'between',
          value: firstVisitRange
        }
        let limitInReturnVisitRange = {
          dimension: '__time',
          action: 'between',
          value: returnVisitRange
        }
        return {
          relation: 'and',
          filters: [
            immutateUpdate(startStepFlt, 'filters', flts => [limitInFirstVisitRange, ...flts]),
            immutateUpdate(endStepFlt, 'filters', flts => [limitInReturnVisitRange, ...flts])
          ]
        }
      })
    }]
  })
}

function hasTimeRangeInMeasure(flt = {}) {
  let {
    relation,
    filters
  } = flt
  if (relation) {
    return _.some(filters, hasTimeRangeInMeasure)
  } else {
    return _.some(filters, mFlt => ('dimension' in mFlt) && _.includes(mFlt.dimension, '__time'))
  }
}
export function isUserGroupCanNotEdit(ug) {
  // 暂不支持编辑 measure 里面包含 __time between 的分群
  if (!ug) return true
  for (let i = 0; i < _.get(ug, 'params.composeInstruction.length', 0); i ++) {
    if (_.get(ug.params.composeInstruction[i], 'config.measure')) {
      let res = hasTimeRangeInMeasure(ug.params.composeInstruction[i].config.measure)
      if (res) return res
    }
  }
  return !ug || hasTimeRangeInMeasure(ug.params.measure || {})
}


export function pathAnalysisToUsergroup({
  usergroupIds,
  relativeTime,
  since,
  until,
  title,
  dataSourceId,
  metricalField,
  dataSourceName,
  refererLink,
  backToRefererTitle,
  pathInfo
}) {
  return createUsergroup({
    userGroupTitle: title,
    dataSourceId,
    dataSourceName,
    metricalField,
    relativeTime,
    createMethod: 'by-upload',
    since,
    until,
    backToRefererTitle: backToRefererTitle || '查看关联路径分析',
    refererLink,
    backToRefererHint: '这个分群由路径分析创建，点击查看关联的路径分析',
    pathInfo,
    tags: [UserGroupBuildInTagEnum.UserActionInspectResultAsUserGroup],
    composeInstruction: [{
      op: UserGroupSetOperationEnum.union,
      type: UserGroupFilterTypeEnum.userGroupFilter,
      config: {
        usergroupIds
      }
    }],
    usergroupFilterStrategy: UsergroupFilterStrategyEnum.byUpload
  })
}

export function rebuildUserGroupMeasureIfNeeded(ug) {
  if ((!ug.params.measure || _.isEmpty(ug.params.measure.filters)) && ug.params.measureFiltersBuilder) {
    let {
      buildFunction,
      params
    } = ug.params.measureFiltersBuilder
    return immutateUpdate(ug, 'params.composeInstruction[0].config.measure', () => {
      if (buildFunction === 'genFunnelLayerUserMeasureFilter') {
        return {
          relation: 'and',
          filters: genFunnelLayerUserMeasureFilter(params)
        }
      }
      if (buildFunction === 'genFunnelLayerLostUserMeasureFilter') {
        return {
          relation: 'and',
          filters: genFunnelLayerLostUserMeasureFilter(params)
        }
      }
      throw new Error('Unknown buildFunction: ' + buildFunction)
    })
  }
  return ug
}

export async function findOrCreateTempUsergroup(usergroup) {
  // 创建临时分群：将分群保存到 redis
  let res = await Fetch.post('/app/usergroup/query', {
    usergroup
  })

  if (res) {
    if (JSON.stringify(usergroup).length > ls.maxLSLength) {
      usergroup = immutateUpdate(usergroup, 'params.measure', () => ({
        relation: 'and',
        filters: []
      }))
    }
    if (JSON.stringify(usergroup).length > ls.maxLSLength) {
      usergroup = { ...usergroup,
        usergroupIds: []
      }
    }
    if (JSON.stringify(usergroup).length > ls.maxLSLength) {
      console.error('用户分群数据仍然太大，可能无法正常查看用户列表')
    }
    usergroup.params.total = _.get(res, 'addToDruidResult[0].event.RowCount') || 0
    return usergroup
  }

  throw new Error('查询分群出错')
}

/*
查询临时分群方法：
发生下面结构到 /app/usergroup/info

{
  "query": {
    "groupReadConfig": {
      "pageIndex": 0,
      "pageSize": 100
    },
    "dataConfig": {
      "hostAndPorts": "192.168.0.220:6379",
      "clusterMode": false,
      "password": null,
      "type": "redis",
      "groupId": "cf7d7b4d6cf18be484c1c4d089609a5f"
    }
  }
}
 */

export function saveAndBrowserInInsight(userGroupWithTotal) {
  // 仅保存到浏览器，到目标页面再根据 id 加载
  ls.setWithExpire(userGroupWithTotal.id, userGroupWithTotal, 'P3D')
  let url = getInsightUrlByUserGroup(userGroupWithTotal)
  browserHistory.push(url)
}

/**
 * 生成查看用户列表详情的url
 * @param {*} ug 用户分群配置信息
 * @param {*} isModel 判断营销模型分群
 * @param {*} type 营销模型分群类型
 */
export function getInsightUrlByUserGroup(ug, isModel = false, type) {
  const openWith = _.get(ug, 'params.openWith')
  let isOpenWithTagManager = openWith === 'tag-dict' || openWith === 'tag-manager'
  if(isModel === true) {
    let id = ug.groupId || ''
    if(id.includes('%')) {
      id = encodeURIComponent(id)
    }
    return `/console/tag-users?ugId=${id}&type=${type}&isModel=${isModel?isModel: ''}`
  }
  if (isOpenWithTagManager) {
    //去往标签体系页面的分群 只允许有一个标签筛选条件
    let ugTagFilters = _.get(ug, 'params.composeInstruction[0].config.tagFilters') || []
    let {
      relation
    } = tagFiltersAdaptToOldFormat(ugTagFilters)
    return (!ug || ug.id === 'all') ? `/console/tag-users?tags=${compressUrlQuery([])}` : `/console/tag-users?ugId=${ug.id}&relation=${relation}`
  }
  let isOpenWithTagEnhance = openWith === 'tag-enhance'
  if (isOpenWithTagEnhance) {
    return `/console/tag-users?ugId=${ug.id}`
  }
  return `/console/usergroup/${ug.id}/users`
}

const canInspectDetails = checkPermission('get:/console/inspect-user/:id')

export function insightUserById(userId, metricalField) {
  if (canInspectDetails) {
    browserHistory.push(metricalField ?
      `/console/inspect-user/${userId}?userDimName=${metricalField}` :
      `/console/inspect-user/${userId}`)
  } else {
    message.warn('你没有查看用户详情的权限')
  }
}

export function getUserGroupReadyRemainTimeInSeconds(ug) {
  let {
    updated_at,
    created_at
  } = ug || {}
  let mNow = moment()
  let secondsNeedToWaitAfterCreate = 30 - mNow.diff(created_at, 'seconds')
  let secondsNeedToWaitAfterUpdate = 30 - mNow.diff(updated_at, 'seconds')

  return _.max([secondsNeedToWaitAfterCreate, secondsNeedToWaitAfterUpdate].filter(n => n >= 0))
}

export function isUindexUg(ug) {
  const openWith = _.get(ug, 'params.openWith')
  return openWith === 'tag-dict' || openWith === 'tag-enhance'
}
