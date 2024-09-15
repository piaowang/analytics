import React, { Component } from 'react'
import { connect } from 'react-redux'
import { namespace } from './store/life-cycle'
import { Tabs, Divider } from 'antd'
import { LifeCycleState } from 'common/constants'
import LCBaseData from './life-cycle-basedata'
import LCIntellAnalytics from './life-cycle-intellanalytics'
import LCMarketingModule from './life-cycle-marketingmodule'
import _ from 'lodash'

const TabPane = Tabs.TabPane

@connect(state => ({ ...state[namespace], ...state.sagaCommon }))
class LifeCycleMain extends Component {

  changeProps(payload) {
    this.props.dispatch({
      type: `${namespace}/setState`,
      payload
    })
  }

  dispatch(func, payload) {
    this.props.dispatch({
      type: `${namespace}/${func}`,
      payload
    })
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(this.props.projectCurrent, nextProps.projectCurrent)) {
      this.dispatch('init', { project_id: nextProps.projectCurrent.id})
    }
  }

  render() {
    const { lcMainActiveKey, lifeCycle } = this.props

    let status = lifeCycle.status

    return (
      <div className="life-cycle-form bg-white height-100 pd3">
        {
          _.get(status, 'state') === LifeCycleState.nopass ?
            <span className="color-red">{status.error}</span> : null
        }
        <Tabs 
          defaultActiveKey="intellAnalytics" 
          activeKey={lcMainActiveKey}
          onChange={(activeKey) => this.changeProps({lcMainActiveKey: activeKey})}
        >
          <TabPane tab="基础数据" key="baseData">
            {
              lcMainActiveKey === 'baseData'
                ?  <LCBaseData />
                : null
            }
          </TabPane>
          <TabPane tab="智能分析" key="intellAnalytics">
            {
              lcMainActiveKey === 'intellAnalytics'
                ?  <LCIntellAnalytics />
                : null
            }
          </TabPane>
          <TabPane tab="营销模块" key="marketingModule">
            <LCMarketingModule />
          </TabPane>
        </Tabs>
      </div>
    )
  }
}

export default LifeCycleMain
