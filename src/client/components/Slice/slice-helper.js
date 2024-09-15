import _ from 'lodash'
import {checkPermission} from '../../common/permission-control'

const hasUserActionAnalyticsPermission = checkPermission(/\/console\/user-action-analytics/)
const hasAnalyticPermission = checkPermission('get:/console/analytic')
const hasSugoFunnelPermission = checkPermission('get:/console/funnel')
const hasSugoRetentionPermission = checkPermission('get:/console/retention')
const hasSugoPathAnalysisPermission = checkPermission('get:/console/path-analysis')

export function getOpenSliceUrl(slice) {
  let openWith = _.get(slice, 'params.openWith')
  let vizType = _.get(slice, 'params.vizType')
  if (vizType === 'sdk_heat_map') {
    return hasSugoPathAnalysisPermission ? `/console/heat-map/slice?sliceid=${_.get(slice, 'id', '')}` : null
  }
  switch (openWith) {
    case 'UserActionAnalytics':
      return hasUserActionAnalyticsPermission ? `/console/user-action-analytics/${slice.id}` : null
    case 'SugoFunnel':
      return hasSugoFunnelPermission ? `/console/funnel/${_.get(slice, 'params.chartExtraSettings.relatedFunnelId', '')}` : null
    case 'SugoRetention':
      return hasSugoRetentionPermission ? `/console/retention/${_.get(slice, 'params.chartExtraSettings.relatedRetentionId', '')}` : null
    case 'SugoPathAnalysis':
      return hasSugoPathAnalysisPermission ? `/console/path-analysis?id=${_.get(slice, 'params.chartExtraSettings.relatedPathAnalysisId', '')}` : null
    default:
      return hasAnalyticPermission ? `/console/analytic?sliceId=${slice.id}` : null
  }
}
