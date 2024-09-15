import React from 'react'
import Bread from '../Common/bread'
import {Tabs} from 'antd'
import SetReviewer from './reviewer'
import IndicesUnitSetting from './indices-unit-setting'

const { TabPane } = Tabs

export default class OfflineCalcBasicSettings extends React.Component {
  render() {
    return (
      <React.Fragment>
        <Bread
          path={[
            { name: '基础设置' }
          ]}
        />
        <div className="pd2y pd3x">
          <Tabs
            onChange={() => {}}
            type="card"
          >
            <TabPane tab="审核者设置" key="reviewer">
              <SetReviewer />
            </TabPane>
            <TabPane tab="指标单位设置" key="indices-unit">
              <IndicesUnitSetting />
            </TabPane>
          </Tabs>
        </div>
      </React.Fragment>
    )
  }
}
