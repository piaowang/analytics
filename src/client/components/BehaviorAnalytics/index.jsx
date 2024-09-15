/**
 * 行为事件分析
 */
import React from 'react'
import _ from 'lodash'
import Bread from '../Common/bread'
import DataSourceDimensionsFetcher from '../Fetcher/data-source-dimensions-fetcher'
import {immutateUpdate} from '../../../common/sugo-utils'
import SettingPanel, {createEmptyModel} from './setting-panel'
import StatisticalPanel from './statistical-panel'
import ChartPanel from './chart-panel'
import DataTable, {getTypeFilter} from './data-table'
import getMetrics from './metrics-definition'
import {withCommonModels} from '../Fetcher/common-models-fetcher'
import {Auth} from '../../common/permission-control'
import {Link} from 'react-router'
import {withApps} from '../Fetcher/app-fetcher'
import {AccessDataOriginalType} from '../../../common/constants'

const sdkAccessTypeSet = new Set([AccessDataOriginalType.Android, AccessDataOriginalType.Ios, AccessDataOriginalType.Web])

let getMetricsMemo = _.memoize((metricalField, event) => getMetrics(metricalField || 'distinct_id', event), (a, b) => _.compact([a, b]).join())

@withApps(props => {
  let {projectCurrent} = props
  let currProjId = projectCurrent && projectCurrent.id || ''
  return {
    projectId: currProjId,
    doFetch: !!currProjId
  }
})
class BehaviorAnalytics extends React.Component {
  state = {
    model: createEmptyModel(_.get(this.props, 'datasourceCurrent.id'))
  }

  componentWillReceiveProps(nextProps) {
    let {datasourceCurrent, models} = this.props

    if (!_.isEqual(models, nextProps.models) && datasourceCurrent) {
      // 删除模型后，或者是初次进入
      let modelsOfThisDs = (nextProps.models || []).filter(m => m.druid_datasource_id === datasourceCurrent.id)
      if (modelsOfThisDs[0]) {
        this.onUpdateModel('', modelsOfThisDs[0])
      } else {
        let currDsMetricalFields = _.get(nextProps.datasourceCurrent, 'params.commonMetric') || []
        this.onUpdateModel('', createEmptyModel(datasourceCurrent.id, currDsMetricalFields[0]))
      }
    } else if (!_.isEqual(datasourceCurrent, nextProps.datasourceCurrent)) {
      // 切换项目后需要切换模型，如果没有模型，则创建一个默认模版
      this.onUpdateModel('', prev => {
        let nextDsId = nextProps.datasourceCurrent.id
        let firstModel = _.find(models, m => m.druid_datasource_id === nextDsId)
        if (firstModel) {
          return firstModel
        }
        let currDsMetricalFields = _.get(nextProps.datasourceCurrent, 'params.commonMetric') || []
        return createEmptyModel(nextDsId, currDsMetricalFields[0])
      })
    }
  }

  onUpdateModel = (path, valOrUpdater) => {
    let {model} = this.state
    let newModel = immutateUpdate(model, path, _.isFunction(valOrUpdater) ? valOrUpdater : () => valOrUpdater)
    let name = _.get(model, 'params.eventName')
    let newName = _.get(newModel, 'params.eventName')
    if(name !== newName && [name, newName].includes('浏览')) {
      newModel = immutateUpdate(newModel, 'params.filterDict._pageName', () => [])
    }
    if(path === 'params.eventName') {//更改了事件类型，同步更改filterDict
      newModel = immutateUpdate(newModel, 'params.filterDict.event_type', () => getTypeFilter(newModel))
    }
    if(path === 'params.timeFilter') {
      newModel = immutateUpdate(newModel, 'params.chartBoxSetting.selectTime', () => false)
      newModel = immutateUpdate(newModel, 'params.chartBoxSetting.timeFilter', _.isFunction(valOrUpdater) ? valOrUpdater : () => valOrUpdater)
    }
    this.setState({
      model: newModel
    })
  }

  renderMainContent() {
    let {params, loadingProject, datasourceList, models, isFetchingModels, reloadModels, addModel, updateModel, deleteModel} = this.props
    let {model} = this.state

    let dsId = model.druid_datasource_id || ''

    let metricObjs = getMetricsMemo(_.get(model, 'params.metricalField'), _.get(model, 'params.eventName'))
    return (
      <DataSourceDimensionsFetcher
        dataSourceId={dsId}
        doFetch={!!dsId}
      >
        {({isFetching, data}) => {

          const childProps = {
            dataSourceDimensions: data || [],
            isFetchingDataSourceDimensions: isFetching,
            model
          }
          return (
            <div className="overhide">
              <SettingPanel
                {...{
                  models: (models || []).filter(m => m.druid_datasource_id === dsId),
                  isFetchingModels, reloadModels, addModel, updateModel, deleteModel}
                }
                {...childProps}
                isFetchingDataSources={loadingProject}
                onChange={this.onUpdateModel}
                dataSources={datasourceList}
                modelId={params.modelId}
                fetchingChange={isFetchingModels => this.setState({isFetchingModels})}
              />
              <StatisticalPanel
                {...childProps}
                isFetchingModels={isFetchingModels}
                metricObjs={metricObjs}
              />
              <ChartPanel
                {...childProps}
                metricObjs={metricObjs}
                onChange={this.onUpdateModel}
                isFetchingModels={isFetchingModels}
              />
              <DataTable
                {...childProps}
                dataSource={datasourceList.find(ds => ds.id === model.druid_datasource_id) || {}}
                onChange={this.onUpdateModel}
                isFetchingModels={isFetchingModels}
              />
            </div>
          )
        }}
      </DataSourceDimensionsFetcher>
    )
  }

  renderSettingGuide() {
    let { projectCurrent } = this.props
    return (
      <div className="pd2t aligncenter">
        要使用行为事件分析, 请到
        <Auth
          auth="/console/project/datasource-settings"
          alt={<b className="mg1x">场景数据设置</b>}
        >
          <Link
            className="pointer bold mg1x"
            to={`/console/project/datasource-settings?id=${projectCurrent && projectCurrent.id}`}
          >场景数据设置</Link>
        </Auth>
        设定
        <b className="color-red mg1x" >用户ID</b>
        为 用户唯一ID 或 设备ID
        <p>
          <b className="color-red mg1x" >注意：目前行为事件分析只支持 SDK 项目</b>
        </p>
      </div>
    )
  }

  render() {
    let {datasourceCurrent, apps, isFetchingApps} = this.props

    //let validUserIdSet = new Set(['distinct_id', 'device_id'])

    if (!datasourceCurrent || !datasourceCurrent.id || isFetchingApps) {
      return (
        <div className="pd3 aligncenter font20 color-grey">
          加载中...
        </div>
      )
    }

    let isSdkProject = _.some(apps, app => sdkAccessTypeSet.has(app.access_type))
      || _.get(datasourceCurrent, 'params.isSDKProject')

    return (
      <div className="behavior-analytics-theme height-100 overscroll-y relative">
        <Bread path={[ {name: '行为事件分析'} ]} />
        {
          !isSdkProject || !_.get(datasourceCurrent, 'params.commonMetric[0]')
            ? this.renderSettingGuide()
            : this.renderMainContent()
        }
      </div>
    )
  }
}

function ExcludeStoppedProject(props) {
  let {datasourceList, models} = props
  let activeDataSourcesIdSet = new Set(datasourceList.map(ds => ds.id))
  let modelFilter = sl => activeDataSourcesIdSet.has(sl.druid_datasource_id)
  return (
    <BehaviorAnalytics {...{...props, models: models.filter(modelFilter)}} />
  )
}
export default withCommonModels(ExcludeStoppedProject, ({datasourceList}) => {
  return {
    doFetch: !!(datasourceList && datasourceList.length),
    url: '/app/behavior-analytics/models'
  }
})
