/**
 * Created by heganjie on 2017/1/2.
 */
import _ from 'lodash'
import * as d3 from 'd3'
import moment from 'moment'
import {escape, immutateUpdate, immutateUpdates, insert} from '../../../common/sugo-utils'
import {
  genFinalLuceneFilter,
  sliceFilterToLuceneFilterStr,
  transformBuiltinUserGroups
} from '../../../common/druid-query-utils'
import {isBuiltinUsergroupId} from '../Common/usergroup-selector'
import {BuiltinUserGroup, GetBuildInUgs} from '../../../common/constants'
import {isRelative} from '../../../common/param-transform'
import LuceneFetcher from '../Fetcher/lucene-fetcher'
import React from 'react'
import {
  funnelLayerToUserGroup,
  funnelToUsergroup
} from '../../common/usergroup-helper'
import {CompareTypeEnum} from './index'

export const extractTotalData = (funnelTotalData, stepCount, eventGroupName, eventGroupVal) => {
  if (!funnelTotalData) {
    return []
  }

  let windowTyped = funnelTotalData.filter(row => row.type === 'total')

  if (eventGroupVal) {
    windowTyped = windowTyped.filter(row => eventGroupVal === row.event[eventGroupName])
  }

  if (windowTyped.length === 0) {
    return _.range(stepCount).map(() => 0)
    // return Promise.reject(new Error('查无数据'))
  }
  // 修正 druid 小数问题
  let res = _.mapValues(windowTyped[0].event, (val) => _.isNumber(val) ? Math.round(val) : val)

  return _.range(stepCount).map((l, i) => res[`第 ${i + 1} 步`])
}

let dateFormatter = val => {
  let m = moment(val)
  if (!m.isValid()) {
    return val
  }
  return m.format('YYYY-MM-DD')
}

export const extractWindowData = (funnelQueryResult, layerCount, eventGroupName, eventGroupVal) => {
  let dateFormatterMem = _.memoize(dateFormatter)

  let windowTypeEvs = funnelQueryResult.filter(d => d.type === 'window')
  if (eventGroupName) {
    windowTypeEvs = windowTypeEvs.filter(row => row.event[eventGroupName] === eventGroupVal)
  }

  let sorted = _.sortBy(windowTypeEvs, r => r.timestamp)
  let layerPairs = [[0, layerCount - 1]].concat(d3.pairs(_.range(layerCount)))

  let d3v3Format = layerPairs.map(([l0, l1], i) => {
    let l0Name = `第 ${l0 + 1} 步`, l1Name = `第 ${l1 + 1} 步`

    let key = i === 0 ? '总体' : `第 ${i} 步转化率`
    return {
      key,
      values: sorted.map(d => {
        let y = 100 * d.event[l1Name] / d.event[l0Name]
        return {
          timestamp: dateFormatterMem(d.timestamp),
          [key]: isNaN(y) ? 0 : !isFinite(y) ? 100 : _.round(y, 2)
        }
      })
    }
  })

  // 将 d3v3 格式的数据转换为 echarts 的格式
  return d3v3Format.map(d => d.values).reduce((prev, curr) => {
    return curr.map((timeAndY, i) => _.assign(prev[i], timeAndY))
  }, d3v3Format[0].values.map(() => ({})))
}

export function genFunnelFetchingStep(currFunnel, datasourceCurrent) {
  let {
    params: {
      commonDimensions,
      funnelLayers2d = [],
      extraLayerFilters
    }
  } = currFunnel
  
  // 按产品要求，始终使用最新的数据源环境配置
  commonDimensions = _.get(datasourceCurrent, 'params.commonDimensions') || commonDimensions
  
  return funnelLayers2d.map(layer0Vals => _.isArray(layer0Vals) ? layer0Vals : [layer0Vals])
    .map((layer0Vals, i) => {
      // 复合条件
      let relation = _.get(layer0Vals, '[0][0]')
      if (/^and$|^or$/.test(relation)) {
        const filter = layer0Vals.slice(1).filter(layerArr => _.some(layerArr)).map(subLayer => {
          return _.zip(commonDimensions, subLayer).filter(([dim, selected]) => dim && selected)
            .map(([dim, selected]) => `(${dim}:${ escape(selected) })`).join(' AND ')
        }).map(exp => `(${exp})`).join(` ${relation.toUpperCase()} `)
        // console.log('复合 filter:', filter)
        return {
          name: `第 ${i + 1} 步`,
          filter: filter || '*:*'
        }
      }
      // 普通单条件
      return {
        name: `第 ${i + 1} 步`,
        filter: _.zip(commonDimensions, layer0Vals).filter(([dim, selected]) => dim && selected)
          .map(([dim, selected]) => `(${dim}:${ escape(selected) })`).join(' AND ') || '*:*'
      }
    })
    // 加入额外条件，与原条件为 AND 关系
    .map((layerCond, idx) => {
      let extraFilters = _.get(extraLayerFilters, [idx])
      if (!extraFilters) {
        return layerCond
      }
      let extraFilterStr = extraFilters.map(sf => sliceFilterToLuceneFilterStr(sf)).filter(_.identity)
        .join(' AND ') || '*:*'
      return immutateUpdate(layerCond, 'filter', filter => {
        return filter === '*:*'
          ? extraFilterStr
          : extraFilterStr === '*:*'
            ? filter
            : `(${filter}) AND (${extraFilterStr})`
      })
    })
}

export function genLuceneFetcherDom(args) {
  let {currFunnel, extraFetcherProps = {}, dataSourceDimensions, globalUserGroupId, datasourceCurrent, dataSourceCompareUserGroups} = args
  let {
    params: {
      granularity,
      relativeTime,
      since,
      until,
      funnelMetric,
      extraFilters
    }
  } = currFunnel
  funnelMetric = funnelMetric || _.get(datasourceCurrent, 'params.commonMetric[0]')

  if (_.some(extraFilters, flt => flt.op === 'lookupin')) {
    // 如果选择了某个用户群进行筛选，则使用该群的统计字段
    funnelMetric = _.chain(extraFilters)
      .find(flt => flt.op === 'lookupin')
      .get('col')
      .value() || funnelMetric
  } else if (globalUserGroupId && globalUserGroupId !== 'all' && globalUserGroupId !== 'undefined') {
    // 应用全局的分群，不会覆盖已经带有分群条件的查询
    let funnelMetricOverwrite = isBuiltinUsergroupId(globalUserGroupId)
      ? _.get(_.find(GetBuildInUgs(datasourceCurrent), ug => ug.id === globalUserGroupId), 'params.groupby')
      : _.get(_.find(dataSourceCompareUserGroups, u => u.id === globalUserGroupId), 'params.groupby')
    funnelMetric = funnelMetricOverwrite || funnelMetric
    let globalUgFlt = {
      op: 'lookupin',
      col: funnelMetric,
      eq: globalUserGroupId
    }
    extraFilters = insert(extraFilters, 0, globalUgFlt)
  }
  // 转换内置用户群至查询条件
  extraFilters = (extraFilters || []).map(flt => {
    if (flt.op !== 'lookupin') {
      return flt
    }
    let ugId = _.isArray(flt.eq) ? flt.eq[0] : flt.eq
    if (isBuiltinUsergroupId(ugId)) {
      let timeRangeFlt = {col: '__time', op: 'in', eq: isRelative(relativeTime) ? relativeTime : [since, until]}
      return transformBuiltinUserGroups([flt], timeRangeFlt, datasourceCurrent)[0]
    }
    return flt
  })

  return (
    <LuceneFetcher
      queryType="funnel"
      dataSourceName={datasourceCurrent.name}
      dataSourceId={datasourceCurrent.id}
      field={funnelMetric}
      granularity={granularity || 'P1D'}
      steps={genFunnelFetchingStep(currFunnel, datasourceCurrent)}
      relativeTime={relativeTime}
      since={since}
      until={until}
      filter={genFinalLuceneFilter(extraFilters, dataSourceDimensions)}
      {...extraFetcherProps}
    />
  )
}

export function createTempUserGroupByFunnel(args) {
  let {
    datasourceCurrent, dataSourceCompareUserGroups, currFunnel, funnelCompareGroupName, relativeTime, since, until,
    lossBeforeStepIdx, globalUserGroupId
  } = args

  dataSourceCompareUserGroups = [...GetBuildInUgs(datasourceCurrent), ...dataSourceCompareUserGroups]

  let {
    params: {
      compareType,
      compareByDimension,
      commonDimensions = [],
      funnelLayers2d
    } = {}
  } = currFunnel

  // 按产品要求，始终使用最新的数据源环境配置
  commonDimensions = _.get(datasourceCurrent, 'params.commonDimensions') || commonDimensions
  if (!_.isEqual(commonDimensions, currFunnel.params.commonDimensions)) {
    currFunnel = immutateUpdate(currFunnel, 'params.commonDimensions', () => commonDimensions)
  }

  // 加入维度对比与分群对比的条件
  if (funnelCompareGroupName === '总体') {
    // 应用全局的分群
    if (globalUserGroupId) {
      let ug = _.find(dataSourceCompareUserGroups, {id: globalUserGroupId})
      currFunnel = immutateUpdate(currFunnel, 'params.extraFilters', extFlts => {
        return insert(extFlts, 0, { col: ug.params.groupby, op: 'lookupin', eq: ug.id })
      })
    }
  } else {
    // 插入对比的条件
    if (!compareType || compareType === CompareTypeEnum.dimensions) {
      currFunnel = immutateUpdate(currFunnel, 'params.extraFilters', extFlts => {
        return insert(extFlts, 0, {col: compareByDimension, op: 'in', eq: [funnelCompareGroupName]})
      })
    } else {
      let ug = _.find(dataSourceCompareUserGroups, {title: funnelCompareGroupName})
      currFunnel = immutateUpdate(currFunnel, 'params.extraFilters', extFlts => {
        return insert(extFlts, 0, { col: ug.params.groupby, op: 'lookupin', eq: ug.id })
      })
    }
  }

  // 使用分群的统计字段
  let extraFilters = _.get(currFunnel, 'params.extraFilters')
  if (_.some(extraFilters, flt => flt.op === 'lookupin')) {
    currFunnel = immutateUpdate(currFunnel, 'params.funnelMetric', omf => {
      return _.chain(extraFilters)
        .find(flt => flt.op === 'lookupin')
        .get('col')
        .value() || omf
    })
  }

  // 转换内置分群至普通分群
  let builtInUgFlt = _.find(extraFilters, flt => _.includes(flt.eq + '', 'builtin'))
  if (builtInUgFlt) {
    currFunnel = immutateUpdates(currFunnel,
      'params.extraFilters', exf => {
        let {relativeTime, since, until} = currFunnel.params
        let timeRangeFlt = {col: '__time', op: 'in', eq: isRelative(relativeTime) ? relativeTime : [since, until]}
        return transformBuiltinUserGroups(exf, timeRangeFlt, datasourceCurrent)
      })
    if (!_.includes(builtInUgFlt.eq + '', BuiltinUserGroup.allLoginUsers)) {
      // 不扩大 __time 会影响内置分群的判断
      currFunnel = immutateUpdates(currFunnel,
        'params.relativeTime', () => 'custom',
        'params.since', () => '1000',
        'params.until', () => '3000')
    }
  }

  let idxFormatter = d3.format('02d')
  let pathInTitle = _.take(funnelLayers2d, +lossBeforeStepIdx + 1).map((layer, idx) => {
    let tr = _.truncate(_.isArray(layer[0]) ? _.compact(_.drop(layer, 1)) + '' : _.compact(layer) + '', {length: 11})
    return `${idxFormatter(idx + 1)}：${tr}`
  }).join(' > ')
  return funnelToUsergroup(currFunnel, lossBeforeStepIdx, relativeTime, since, until, `通过 漏斗流失分析 ${pathInTitle} 创建的分群`)
}

export const onShowLostUser = (data, envs) => {
  let {currFunnel, location, datasourceCurrent, dataSourceCompareUserGroups} = envs
  let {
    lossBeforeStepIdx,
    relativeTime = _.get(currFunnel, 'params.relativeTime'),
    since = _.get(currFunnel, 'params.since'),
    until = _.get(currFunnel, 'params.until'),
    tabActiveKey = '总体'
  } = data
  
  let userGroup = createTempUserGroupByFunnel({
    datasourceCurrent,
    dataSourceCompareUserGroups,
    currFunnel,
    funnelCompareGroupName: tabActiveKey,
    globalUserGroupId: _.get(location, 'query.usergroup_id'),
    relativeTime,
    since,
    until,
    lossBeforeStepIdx
  })
  
  return userGroup
  // let userGroupWithTotal = await findOrCreateTempUsergroup(userGroup)
  // saveAndBrowserInInsight(userGroupWithTotal)
}

export const inspectFunnelLayerUsers = ({layerIdx, funnelCompareGroupName}, args) => {
  let {
    currFunnel: {
      params: {
        funnelLayers2d = [],
        compareType,
        compareByDimension,
        commonDimensions = []
      }
    },
    datasourceCurrent,
    currFunnel,
    dataSourceCompareUserGroups,
    location
  } = args
  
  // 按产品要求，始终使用最新的数据源环境配置
  commonDimensions = _.get(datasourceCurrent, 'params.commonDimensions') || commonDimensions
  if (!_.isEqual(commonDimensions, currFunnel.params.commonDimensions)) {
    currFunnel = immutateUpdate(currFunnel, 'params.commonDimensions', () => commonDimensions)
  }
  
  // 加入维度对比与分群对比的条件
  if (funnelCompareGroupName === '总体') {
    // 应用全局的分群
    let globalUserGroupId = _.get(location, 'query.usergroup_id')
    if (globalUserGroupId) {
      let ug = _.find(dataSourceCompareUserGroups, {id: globalUserGroupId})
      currFunnel = immutateUpdate(currFunnel, 'params.extraFilters', extFlts => {
        return insert(extFlts, 0, { col: ug.params.groupby, op: 'lookupin', eq: ug.id })
      })
    }
  } else {
    // 插入对比的条件
    if (!compareType || compareType === CompareTypeEnum.dimensions) {
      currFunnel = immutateUpdate(currFunnel, 'params.extraFilters', extFlts => {
        return insert(extFlts, 0, {col: compareByDimension, op: 'in', eq: [funnelCompareGroupName]})
      })
    } else {
      let ug = _.find(dataSourceCompareUserGroups, {title: funnelCompareGroupName})
      currFunnel = immutateUpdate(currFunnel, 'params.extraFilters', extFlts => {
        return insert(extFlts, 0, { col: ug.params.groupby, op: 'lookupin', eq: ug.id })
      })
    }
  }
  
  // 使用分群的统计字段
  let extraFilters = _.get(currFunnel, 'params.extraFilters')
  if (_.some(extraFilters, flt => flt.op === 'lookupin')) {
    currFunnel = immutateUpdate(currFunnel, 'params.funnelMetric', omf => {
      return _.chain(extraFilters)
        .find(flt => flt.op === 'lookupin')
        .get('col')
        .value() || omf
    })
  }
  
  // 转换内置分群至普通分群
  let builtInUgFlt = _.find(extraFilters, flt => _.includes(flt.eq + '', 'builtin'))
  if (builtInUgFlt) {
    currFunnel = immutateUpdates(currFunnel,
      'params.extraFilters', exf => {
        let {relativeTime, since, until} = currFunnel.params
        let timeRangeFlt = {col: '__time', op: 'in', eq: isRelative(relativeTime) ? relativeTime : [since, until]}
        return transformBuiltinUserGroups(exf, timeRangeFlt, datasourceCurrent)
      })
    if (!_.includes(builtInUgFlt.eq + '', BuiltinUserGroup.allLoginUsers)) {
      // 不扩大 __time 会影响内置分群的判断
      currFunnel = immutateUpdates(currFunnel,
        'params.relativeTime', () => 'custom',
        'params.since', () => '1000',
        'params.until', () => '3000')
    }
  }
  
  let idxFormatter = d3.format('02d')
  let pathInTitle = _.take(funnelLayers2d, +layerIdx + 1).map((layer, idx) => {
    let tr = _.truncate(_.isArray(layer[0]) ? _.compact(_.drop(layer, 1)) + '' : _.compact(layer) + '', {length: 11})
    return `${idxFormatter(idx + 1)}：${tr}`
  }).join(' > ')
  let ug = funnelLayerToUserGroup(currFunnel, +layerIdx, `通过 漏斗分析 ${pathInTitle}  创建的分群`)
  // let ug = funnelLayerToUserGroup(currFunnel, +layerIdx)
  return ug
  // let userGroupWithTotal = await findOrCreateTempUsergroup(ug)
  // saveAndBrowserInInsight(userGroupWithTotal)
}
