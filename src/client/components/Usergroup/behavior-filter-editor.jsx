import React from 'react'
import {formItemLayout as defaultFormItemLayout} from './constants'
import DateRangePicker from '../Common/time-picker'
import MeasureFilters from './measure-filters'
import Measure2Filters from './measure3-filters'
import DimensionFilters from './dimension-filters'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Radio, Select } from 'antd';
import {withDbDims} from '../Fetcher/data-source-dimensions-fetcher'
import _ from 'lodash'
import {DimDatasourceType} from '../../../common/constants'
import {ContextNameEnum, withContextConsumer} from '../../common/context-helper'
import {withDbMetrics} from '../Fetcher/data-source-measures-fetcher'
import {immutateUpdate} from '../../../common/sugo-utils'
import MaxTimeFetcher from '../Fetcher/max-time-fetcher'
import moment from 'moment'

const FormItem = Form.Item

const defaultTimeFormat = 'YYYY-MM-DD HH:mm:ss'

@withContextConsumer(ContextNameEnum.ProjectInfo)
@withDbDims(({behaviorProject}) => {
  let dsId = _.get(behaviorProject, 'datasource_id') || ''
  return {
    dataSourceId: dsId,
    doFetch: !!dsId,
    exportNameDict: true,
    datasourceType: DimDatasourceType.default
  }
})
@withDbMetrics(({behaviorProject})=>{
  let dsId = _.get(behaviorProject, 'datasource_id') || ''
  return {
    dataSourceId: dsId,
    doFetch: !!dsId,
    exportNameDict: true
  }
})
export default class BehaviorFilterEditor extends React.Component {

  onChangeDate = ({dateType, dateRange: [since, until]}) => {
    let {onUsergroupChange, usergroup} = this.props
    onUsergroupChange(immutateUpdate(usergroup, 'params', prev => ({...prev, since, until, relativeTime: dateType})))
  }

  modifier = (...args) => {
    let {onUsergroupChange} = this.props
    const nextUg = _.get(args, '[0].usergroup')
    if (nextUg) {
      onUsergroupChange(nextUg)
    }
  }

  renderMaxTimeLoader = () => {
    let { behaviorProject, usergroup }  = this.props
    if (!behaviorProject) {
      return null
    }
    let dataSourceId = _.get(behaviorProject, 'datasource_id')
    return (
      <MaxTimeFetcher
        dataSourceId={dataSourceId || ''}
        doFetch={!!(dataSourceId && _.get(usergroup, 'params.relativeTime') === '-7 days')}
        onMaxTimeLoaded={this.onMaxTimeLoaded}
      />
    )
  }

  onMaxTimeLoaded = maxTime => {
    let { usergroup, onUsergroupChange }  = this.props
    if (moment(maxTime).isBefore(moment().subtract(7, 'days'))) {
      let finalUntil = moment(maxTime).endOf('day').format(defaultTimeFormat)
      let finalSince = moment(maxTime).startOf('day').add(-2, 'day').format(defaultTimeFormat)
      let immutateUserGroup = immutateUpdate(usergroup, 'params', prevParams => {
        return {
          ...prevParams,
          since: finalSince,
          until: finalUntil,
          relativeTime: 'custom'
        }
      })
      onUsergroupChange(immutateUserGroup)
    }
  }

  render() {
    const {
      isFetchingDataSourceDimensions: loadingDimension,
      dataSourceDimensions: dimensions,
      dataSourceMeasures: measures,
      behaviorProject: projectCurrent,
      datasourceList,
      usergroup,
      dimNameDict: dimensionsTree,
      getPopupContainer,
      formItemLayout = defaultFormItemLayout
    } = this.props

    let datasourceCurrent = _.find(datasourceList, ds => ds.id === projectCurrent.datasource_id)
    const {params} = usergroup
    
    let baseProps = {
      usergroup,
      dimensions, measures, projectCurrent,
      loading: loadingDimension, datasourceCurrent, loadingDimension,
      disabled: false,
      commonDimensionsTree: dimensionsTree,
      modifier: this.modifier,
      formItemLayout,
      getPopupContainer
    }

    let dateType = params.relativeTime
      ? params.relativeTime
      : 'custom'

    return (
      <div className="ug-form-options">
        {this.renderMaxTimeLoader()}
        <FormItem {...formItemLayout} label="时间范围">
          <DateRangePicker
            dateType={dateType}
            dateRange={[params.since, params.until]}
            onChange={this.onChangeDate}
            className="width260"
            getPopupContainer={getPopupContainer}
          />
        </FormItem>
        <MeasureFilters {...baseProps} />
        <Measure2Filters {...baseProps} />
        <DimensionFilters {...baseProps} />
      </div>
    )
  }
}
