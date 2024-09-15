import React, { Component } from 'react'
import { Tabs, Spin, Card } from 'antd'
import Bread from '../Common/bread'
import BarChart from './barChart'
import DeviceCount from './device-count'
import LineChartBox from './linechart-box'
import LifeCycleBox from './lifecycle-box'
import moment from 'moment'
import _ from 'lodash'
import TimePicker from '../Common/time-picker'
import { convertDateType, isRelative } from '../../../common/param-transform'
import './scenes-analytics.styl'
import { generateMobileBankAppLifeCycleUserGroup } from './usergroup-define'
import { generateDeviceCountSlices } from './toptable-defined'
import AsyncTaskRunner from '../Common/async-task-runner'
import { withDbDims } from '../Fetcher/data-source-dimensions-fetcher'

const TabPane = Tabs.TabPane
const getPopupContainer = () => document.querySelector('.scenes-analytice-topbar')

@withDbDims(({ datasourceCurrent }) => {
  let dsId = _.get(datasourceCurrent, 'id') || ''
  return ({
    dataSourceId: dsId,
    doFetch: !!dsId,
    exportNameDict: true,
    disabledCache: true,
    resultFilter: dim => dim.parentId === dsId
  })
})
export default class ScenesAnalytics extends Component {

  state = {
    loading: false,
    timeRange: '-7 day'
  }

  constructor(props) {
    super(props)
  }

  renderDeviceCount() {
    let { timeRange } = this.state
    let { datasourceCurrent } = this.props
    let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
    let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(relativeTime)
    let titleDom = (
      <div className="scenes-analytice-topbar">
        筛选时间：
        <TimePicker
          className="width280"
          dateType={relativeTime}
          dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
          getPopupContainer={getPopupContainer}
          onChange={({ dateType: relativeTime, dateRange: [since, until] }) => {
            this.setState({
              timeRange: relativeTime === 'custom' ? [since, until] : relativeTime
            })
          }}
        />
      </div>
    )
    return (
      <Card title={titleDom} className="bg-white mg1t lean-title-card">
        <DeviceCount type="ScenesBrowse" slice={generateDeviceCountSlices(datasourceCurrent, 'ScenesBrowse', [since, until])} />
      </Card>
    )
  }

  renderActionChart(businessDim) {
    return (<Card className="bg-white mg1t">
      <Tabs type="card" className="bg-white scenes-analytics-middlebox" >
        <TabPane tab="用户增长情况" key="tab1">
          <LineChartBox type="ScenesBrowse" businessDims={businessDim} />
        </TabPane>
        <TabPane tab="使用频率" key="tab2">
          <BarChart businessDim={businessDim} />
        </TabPane>
        <TabPane tab="产品关注情况" key="tab3">
          <BarChart type="prodAttention" businessDim={businessDim} />
        </TabPane>
        <TabPane tab="功能使用情况" key="tab4">
          <BarChart type="featuresUse" businessDim={businessDim} />
        </TabPane>
      </Tabs>
    </Card>)
  }

  renderCustomRule() {
    let { datasourceCurrent } = this.props
    let targetSlice = generateMobileBankAppLifeCycleUserGroup(datasourceCurrent, 'ScenesBrowse')
    return (
      <Card className="bg-white mg1t" title="手机银行APP用户生命周期管理">
        <div className="appuser-lifecycle">
          {targetSlice.map((sl, sIdx) => (
            <LifeCycleBox sl={sl} key={sIdx} />
          ))}
        </div>
      </Card>
    )
  }

  render() {
    const { dataSourceDimensions = [] } = this.props
    const businessDim = dataSourceDimensions.filter(p => _.get(p, 'params.type', '') === 'business')
    const { loading = false } = this.state
    return (
      <div className="height-100 contain-docs-analytic scenes-analytics">
        <Bread
          path={[{ name: '场景分析', link: '/console/overview' }]}
        />
        <div className="scroll-content always-display-scrollbar pd2x">
          <Spin spinning={loading} />
          {this.renderDeviceCount()}
          {this.renderActionChart(businessDim)}
          {this.renderCustomRule()}
        </div>
      </div>
    )
  }
}
