/**
 * 路径分析保存成单图后的展示图表，单图格式
 * slice: {
 *   druid_datasource_id: '...'
 *   params: {
 *     vizType: 'sugo_path_analysis',
 *     chartExtraSettings: {
 *       relatedPathAnalysisId: '...'
 *     }
 *   }
 * }
 */
import React from 'react'
import AsyncTaskRunner from '../../Common/async-task-runner'
import Fetch from '../../../common/fetch-final'
import _ from 'lodash'
import PathTree from '../../PathAnalysis/chart'
import {createPathAnalysisQuery} from '../../PathAnalysis/pa-helper'
import {ContextNameEnum, withContextConsumer} from '../../../common/context-helper'
import {queryPathAnalysis} from '../../../actions'
import {convertDateType, isRelative} from '../../../../common/param-transform'
import {immutateUpdate} from '../../../../common/sugo-utils'

@withContextConsumer(ContextNameEnum.ProjectInfo)
export default class SugoPathAnalysisSlice extends React.PureComponent {
  
  patchGlobalFilters = (pathAnalysis, globalFilters) => {
    if (!_.isEmpty(globalFilters)) {
      let mainTimeFlt = _.find(globalFilters, f => f.col === '__time')
      if (mainTimeFlt) {
        let {eq: fltEq} = mainTimeFlt
      
        let relativeTime = isRelative(fltEq) ? fltEq : 'custom'
        let [since, until] = relativeTime === 'custom' ? fltEq : convertDateType(relativeTime)
        pathAnalysis = immutateUpdate(pathAnalysis, 'params', p => ({...p, since, until, relativeTime}))
      }
      const globalFiltersWithoutMainTimeFilter = (globalFilters || []).filter(f => f.col !== '__time')
      pathAnalysis = _.isEmpty(globalFiltersWithoutMainTimeFilter)
        ? pathAnalysis
        : immutateUpdate(pathAnalysis, 'params.filters', flts => {
          return _.uniqBy([...globalFiltersWithoutMainTimeFilter, ...(flts || [])], f => f.col)
        })
    }
    return pathAnalysis
  }
  
  render() {
    let {settings, style, className, dataSourceDimensions, datasourceCurrent} = this.props
    let relatedPathAnalysisId = _.get(settings, 'relatedPathAnalysisId')
    let globalFilters = _.get(settings, 'globalFilters', [])
    return (
      <AsyncTaskRunner
        args={[relatedPathAnalysisId, globalFilters]}
        task={async (pathAnalysisId, globalFilters) => {
          const res = await Fetch.get('/app/path-analysis/get', {
            where: {id: pathAnalysisId}
          })
          let pathAnalysis = _.get(res, 'result[0]')
          if (_.isEmpty(pathAnalysis)) {
            return null
          }
          // 支持被全局筛选覆盖
          pathAnalysis = this.patchGlobalFilters(pathAnalysis, globalFilters)
          
          let queryArgs = createPathAnalysisQuery(pathAnalysis, {
            datasourceCurrent,
            usergroups: [],
            location: {
              query: {usergroup_id: null}
            }
          })
          let queryChartData = await queryPathAnalysis(...queryArgs)()
          return {
            pathAnalysis,
            chartData: _.get(queryChartData, 'result')
          }
        }}
      >
        {({result, isRunning}) => {
          if (isRunning) {
            return (
              <p className="pd2" style={style}>加载中...</p>
            )
          }
          if (_.isEmpty(result)) {
            return (
              <div className="common-alert" style={style} >此路径分析已被删除</div>
            )
          }
          let {pathAnalysis, chartData} = result
          let { direction, page } = pathAnalysis.params || {}
          return (
            <div className={`${className} hide-scrollbar-y`} style={{overflow: 'hidden scroll', ...style}}>
              <PathTree
                data={chartData || 'init'}
                page={page}
                shouldChange={0}
                inst={pathAnalysis}
                direction={direction}
                datasourceCurrent={datasourceCurrent}
              />
            </div>
          )
        }}
      </AsyncTaskRunner>
    )
  }
}
