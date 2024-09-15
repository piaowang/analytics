import React from 'react'
import {Tabs} from 'antd'
import DataAPIClientsManager from './clients-manager'
import DataApisManager from './api-manager'
import {renderPageTitle} from '../Common/bread'
import _ from 'lodash'
import ApiCallsOverview from './api-calls-overview'
import './data-api.styl'

const TabPane = Tabs.TabPane

export default class DataAPI extends React.Component {
  render() {
    let defaultTab = _.get(this.props, 'location.query.tab', '1')
    return (
      <div id="data-api">
        {renderPageTitle('数据 API')}
        <Tabs defaultActiveKey={defaultTab} className="height-100">
          <TabPane tab="数据 API 概览" key="1">
            <ApiCallsOverview />
          </TabPane>
          
          <TabPane tab="数据 API 管理" key="2" style={{ height: 'calc(100% - 44px)'}}>
            <DataApisManager />
          </TabPane>

          <TabPane tab="数据 API 客户端管理" key="3" forceRender>
            <DataAPIClientsManager />
          </TabPane>
        </Tabs>
      </div>
    )
  }
}
