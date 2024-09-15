import React from 'react'
import {Spin} from 'antd'
import ListRender from './table-list'
import Bread from '../Common/bread'
import AddBtn from './add-btn'

export default class CompanyList extends React.Component {
  render() {
    return (
      <div className="height-100">
        <Bread  path={[{ name: '企业列表' }]}>
          <AddBtn {...this.props} />
        </Bread>
        <div className="scroll-content always-display-scrollbar">
          <Spin spinning={this.props.loading}>
            <div className="ug-wrapper relative pd2y pd3x" style={{ minHeight: 114 }}>
              <ListRender {...this.props} />
            </div>
          </Spin>
        </div>
      </div>
    )
  }
}
