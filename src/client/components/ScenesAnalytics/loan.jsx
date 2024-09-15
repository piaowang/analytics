import React, { Component } from 'react'
import { Tabs, Spin, Card } from 'antd'
import Bread from '../Common/bread'
import FunnelFacade from './funnel-facade'
import TimePicker from '../Common/time-picker'
import { convertDateType, isRelative } from '../../../common/param-transform'
import LineChartBox from './linechart-box'
import DeviceCount from './device-count'
import LifeCycleBox from './lifecycle-box'
import moment from 'moment'
import _ from 'lodash'
import BarChart from './barChart'
import './scenes-analytics.styl'
import BoundaryTimeFetcher from '../Fetcher/boundary-time-fetcher'
import { generateMobileBankAppLifeCycleUserGroup } from './usergroup-define'
import { generateDeviceCountSlices } from './toptable-defined'
import { withDbDims } from '../Fetcher/data-source-dimensions-fetcher'

const TabPane = Tabs.TabPane
const getPopupContainer = () => document.querySelector('.scenes-analytice-loan-topbar')
@withDbDims(props => {
  let dsId = _.get(props, 'datasourceCurrent.id') || ''
  return {
    dataSourceId: dsId,
    doFetch: !!dsId,
    exportNameDict: true
  }
})
export default class Loan extends Component {

  state = {
    loading: false,
    timeRange: '-7 day',
    userGroups: []
  }

  constructor(props) {
    super(props)
  }

  renderDeviceCount() {
    let { mainTimeDimName, datasourceCurrent } = this.props
    let { timeRange } = this.state

    let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
    let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(relativeTime)
    let titleDom = (
      <div className="scenes-analytice-loan-topbar">
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
        <BoundaryTimeFetcher
          timeDimName={mainTimeDimName}
          dataSourceId={datasourceCurrent && datasourceCurrent.id || ''}
          doQueryMinTime={false}
          doFetch={!_.isEmpty(datasourceCurrent)}
          onTimeLoaded={data => {
            let { maxTime } = data || {}
            if (!maxTime) {
              return
            }
            this.setState({
              timeRange: [
                moment(maxTime).add(-7, 'day').startOf('second').toISOString(),
                moment(maxTime).add(1, 's').startOf('second').toISOString() // 上边界为开区间，需要加 1 s
              ]
            })
          }}
        />
      </div>
    )
    return (
      <Card title={titleDom} className="bg-white mg1t lean-title-card">
        <DeviceCount slice={generateDeviceCountSlices(datasourceCurrent, 'loanBrowse', [since, until])} />
      </Card>
    )
  }

  renderActionChart(businessDim) {
    return (<Card className="bg-white mg1t">
      <Tabs type="card" className="bg-white scenes-analytics-middlebox">
        <TabPane tab="通过APP申请贷款" key="tab1">
          <LineChartBox type="loanBrowse" />
        </TabPane>
        <TabPane tab="贷款相关页面的浏览情况" key="tab2">
          <BarChart type="loanBrowse" businessDim={businessDim}/>
        </TabPane>
      </Tabs>
    </Card>)
  }

  renderPurchaseProcess(businessDim) {
    let { location } = this.props
    return (
      <Card className="bg-white mg1t" title="贷款申请流程漏斗">
        <FunnelFacade
          location={location}
          dataSourceDimensions={businessDim}
          funnelLayers2d={[
            [ '遂心贷', null, '浏览' ],
            [ '遂心贷', '我要预约', '点击' ],
            [ '遂心贷', '立即预约', '点击' ],
            [ '遂心贷', '预约成功', '浏览' ]
          ]}
        />
      </Card>
    )
  }

  renderCustomRule() {
    let { datasourceCurrent } = this.props
    let targetSlice = generateMobileBankAppLifeCycleUserGroup(datasourceCurrent, 'loanBrowse')
    return (
      <Card className="bg-white mg1t" title="潜在资金需求客户">
        <div className="appuser-lifecycle">
          {targetSlice.map(sl => (
            <LifeCycleBox sl={sl} />
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
          {this.renderPurchaseProcess(businessDim)}
          {this.renderCustomRule()}
        </div>
      </div>
    )
  }
}
