/**
 * 留存保存成单图后的展示图表，单图格式
 * slice: {
 *   druid_datasource_id: '...'
 *   params: {
 *     vizType: 'sugo_retention',
 *     chartExtraSettings: {
 *       relatedRetentionId: '...'
 *     }
 *   }
 * }
 */
import React from 'react'
import AsyncTaskRunner from '../../Common/async-task-runner'
import Fetch from '../../../common/fetch-final'
import _ from 'lodash'
import RetentionDisplayPanels from '../../Retention/retention-panels'
import {convertDateType, isRelative} from '../../../../common/param-transform'
import {immutateUpdate} from '../../../../common/sugo-utils'

export default class SugoRetentionSlice extends React.PureComponent {
  patchGlobalFilters = (retention, globalFilters) => {
    if (!_.isEmpty(globalFilters)) {
      let mainTimeFlt = _.find(globalFilters, f => f.col === '__time')
      if (mainTimeFlt) {
        let {eq: fltEq} = mainTimeFlt
      
        let relativeTime = isRelative(fltEq) ? fltEq : 'custom'
        let [since, until] = relativeTime === 'custom' ? fltEq : convertDateType(relativeTime)
        retention = immutateUpdate(retention, 'params', p => ({...p, since, until, relativeTime}))
      }
      const globalFiltersWithoutMainTimeFilter = (globalFilters || []).filter(f => f.col !== '__time')
      retention = _.isEmpty(globalFiltersWithoutMainTimeFilter)
        ? retention
        : immutateUpdate(retention, 'params.extraFilters', flts => {
          return _.uniqBy([...globalFiltersWithoutMainTimeFilter, ...(flts || [])], f => f.col)
        })
    }
    return retention
  }
  
  render() {
    let {settings, style, className, dataSourceDimensions, isThumbnail} = this.props
    let relatedRetentionId = _.get(settings, 'relatedRetentionId')
    let globalFilters = _.get(settings, 'globalFilters', [])
    return (
      <AsyncTaskRunner
        args={[relatedRetentionId]}
        task={async retentionId => {
          const res = await Fetch.get(`/app/retention/get?id=${retentionId}`)
          return _.get(res, '[0]')
        }}
      >
        {({result: retention, isRunning}) => {
          if (isRunning) {
            return (
              <p className="pd2" style={style}>加载中...</p>
            )
          }
          if (_.isEmpty(retention)) {
            return (
              <div className="common-alert" style={style} >此留存已被删除</div>
            )
          }
          retention = this.patchGlobalFilters(retention, globalFilters)
          return (
            <div className={`retention-main ${className} hide-scrollbar-y`} style={{overflow: 'hidden scroll', ...style}}>
              <RetentionDisplayPanels
                hideSettingControl
                {...{
                  retentionSelected: retention,
                  tempRetention: retention,
                  location: {},
                  retentionIdInUrl: relatedRetentionId,
                  isFetchingDataSourceDimensions: _.isEmpty(dataSourceDimensions),
                  dataSourceDimensions,
                  allowFetch: true
                }}
              />
            </div>
          )
        }}
      </AsyncTaskRunner>
    )
  }
}
