/**
 * Created by heganjie on 2017/3/31.
 * 实现对单图的维度和指标进行权限检测的逻辑
 */

import React from 'react'
import Alert from '../Common/alert'
import _ from 'lodash'
import {Spin} from 'antd'
import {recurGetFiltersCol} from '../../../common/druid-query-utils'

let myRoleIds = (_.get(window.sugo, 'user.SugoRoles') || []).map(r => r.id)
let myRoleIdsSet = new Set(myRoleIds)

export function withDimAndMetricsChecker(Component) {
  function DimsAndMetricsChecker(props) {
    if (props.publicAccess) {
      return (
        <Component {...props} />
      )
    }
    let {
      dataSourceDimensions: dbDims, dataSourceMeasures: dbMetrics, isFetchingDataSourceDimensions,
      isFetchingDataSourceMeasures, slice, wrapperClassName, wrapperStyle, style
    } = props
    let {druid_datasource_id, params} = slice || {}

    if (!druid_datasource_id || isFetchingDataSourceDimensions || isFetchingDataSourceMeasures) {
      return (
        <div className={wrapperClassName} style={wrapperStyle}>
          <div className="pd2 relative" style={style}>
            <Spin className="center-of-relative" />
          </div>
        </div>
      )
    }

    // 判断是否缺失维度、指标，并提示响应的信息
    let dbMetricsDict = _.keyBy(dbMetrics, dbM => dbM.name)
    let dbDimsDict = _.keyBy(dbDims, dbD => dbD.name)

    let metricsStatus = (params.metrics || []).map(metricName => {
      if (_.startsWith(metricName, '_tempMetric_') || _.startsWith(metricName, '_localMetric_')) {
        return 'can-access'
      }
      let dbM = dbMetricsDict[metricName]
      if (!dbM) {
        return 'missing'
      }
      return _.some(dbM.role_ids, r => myRoleIdsSet.has(r)) ? 'can-access' : 'no-permission'
    })
  
    const usingDims = _.uniq([...(params.dimensions || []), ...recurGetFiltersCol(params.filters)])
    let dimsStatus = usingDims.map(dimName => {
      let dbDim = dbDimsDict[dimName]
      if (!dbDim) {
        return 'missing'
      }
      return _.some(dbDim.role_ids, r => myRoleIdsSet.has(r)) ? 'can-access' : 'no-permission'
    })

    let missingMetrics = metricsStatus.map((st, i) => st === 'missing' ? params.metrics[i] : null).filter(_.identity)
    let missingDims = dimsStatus.map((st, i) => st === 'missing' ? usingDims[i] : null).filter(_.identity)

    let noPermMetrics = metricsStatus.map((st, i) => st === 'no-permission' ? params.metrics[i] : null).filter(_.identity)
    let noPermDims = dimsStatus.map((st, i) => st === 'no-permission' ? usingDims[i] : null).filter(_.identity)

    let msgs = []
    let missPermission = false //标识是否权限缺失
    if (missingMetrics.length) {
      msgs.push(`单图中统计条件在数据指标里该指标被删除，请联系管理员。被删除的指标有：${missingMetrics.join('、')}。`)
    }
    if (missingDims.length) {
      msgs.push(`单图中统计条件在数据维度里该维度被删除，请联系管理员。被删除的维度有：${missingDims.join('、')}。`)
    }
    if (noPermMetrics.length) {
      let s = noPermMetrics.map(mName => dbMetricsDict[mName].title || mName).join('、')
      msgs.push(`单图中统计条件在数据指标里未对你所在角色授权，请先到[数据管理-数据指标]给角色授权。没权限的的指标是：${s}。`)
      missPermission = true
    }
    if (noPermDims.length) {
      let s = noPermDims.map(dimName => dbDimsDict[dimName].title || dimName).join('、')
      msgs.push(`单图中统计条件在数据维度里未对你所在角色授权，请先到[数据管理-数据维度]给角色授权。没权限的的维度是：${s}。`)
      missPermission = true
    }

    props.missPermission ? props.missPermission(missPermission) : null

    if (msgs.length) {
      return (
        <div style={wrapperStyle} className={wrapperClassName}>
          {msgs.map((m, i) => {
            return (
              <Alert msg={m} key={i} style={style} />
            )
          })}
        </div>
      )
    }

    return (
      <Component {...props} />
    )
  }

  return DimsAndMetricsChecker
}


