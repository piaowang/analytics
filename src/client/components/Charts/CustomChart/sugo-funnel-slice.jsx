/**
 * 漏斗保存成单图后的展示图表，单图格式
 * slice: {
 *   druid_datasource_id: '...'
 *   params: {
 *     vizType: 'sugo_funnel',
 *     chartExtraSettings: {
 *       relatedFunnelId: '...'
 *     }
 *   }
 * }
 */
import React from 'react'
import AsyncTaskRunner from '../../Common/async-task-runner'
import Fetch from '../../../common/fetch-final'
import _ from 'lodash'
import FunnelFacade from '../../ScenesAnalytics/funnel-facade'
import {immutateUpdate, immutateUpdates} from '../../../../common/sugo-utils'
import {convertDateType, isRelative} from '../../../../common/param-transform'

export default class SugoFunnelSlice extends React.PureComponent {
  patchGlobalFilters = (funnel, globalFilters) => {
    if (!_.isEmpty(globalFilters)) {
      let mainTimeFlt = _.find(globalFilters, f => f.col === '__time')
      if (mainTimeFlt) {
        let {eq: fltEq} = mainTimeFlt
      
        let relativeTime = isRelative(fltEq) ? fltEq : 'custom'
        let [since, until] = relativeTime === 'custom' ? fltEq : convertDateType(relativeTime)
        funnel = immutateUpdate(funnel, 'params', p => ({...p, since, until, relativeTime}))
      }
      const globalFiltersWithoutMainTimeFilter = (globalFilters || []).filter(f => f.col !== '__time')
      funnel = _.isEmpty(globalFiltersWithoutMainTimeFilter)
        ? funnel
        : immutateUpdate(funnel, 'params.extraFilters', flts => {
          return _.uniqBy([...globalFiltersWithoutMainTimeFilter, ...(flts || [])], f => f.col)
        })
    }
    return funnel
  }
  
  render() {
    let {settings, style, className, dataSourceDimensions, isThumbnail} = this.props
    let relatedFunnelId = _.get(settings, 'relatedFunnelId')
    let globalFilters = _.get(settings, 'globalFilters', [])
    return (
      <AsyncTaskRunner
        args={[relatedFunnelId]}
        task={async funnelId => {
          const res = await Fetch.get(`/app/funnel/get/${funnelId}`)
          return _.get(res, 'result[0]')
        }}
      >
        {({result: funnel, isRunning}) => {
          if (isRunning) {
            return (
              <p className="pd2" style={style}>加载中...</p>
            )
          }
          if (_.isEmpty(funnel)) {
            return (
              <div className="common-alert" style={style} >此漏斗已被删除</div>
            )
          }
          // 支持被全局筛选覆盖
          funnel = this.patchGlobalFilters(funnel, globalFilters)
          return (
            <div className={`${className} hide-scrollbar-y`} style={{overflow: 'hidden scroll', ...style}}>
              <FunnelFacade
                initFunnel={funnel}
                dataSourceDimensions={dataSourceDimensions}
                showSettingControl={false}
                useMaxTimeLoader={false}
                disabledComparing={isThumbnail}
                saveUserGroupWhenInspect={false}
                dimNameDict={_.keyBy(dataSourceDimensions, 'name')}
              />
            </div>
          )
        }}
      </AsyncTaskRunner>
    )
  }
}
