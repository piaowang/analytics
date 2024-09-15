/* eslint-disable react/prefer-stateless-function */
import React from 'react'
import '@ant-design/compatible/assets/index.css'
import {Spin} from 'antd'
import ListRender from './table-list'
import CheckListRender from './draft/check-table-list'
import Bread from '../Common/bread'
import './list.styl'

export default class RoleList extends React.Component {
  render() {
    const {enableDataChecking} = window.sugo
    return (
      <div className="height-100">
        <Bread  path={[{ name: '角色列表' }]} />
        <div className="scroll-content always-display-scrollbar width-100">
          <Spin spinning={this.props.loading}>
            <div className="ug-wrapper relative pd2y pd3x" style={{ minHeight: 114 ,paddingTop:'0px'}}>
              {
                enableDataChecking ? (
                  <CheckListRender {...this.props} />
                ) : (
                  <ListRender {...this.props} />
                )
              }
            </div>
          </Spin>
        </div>
      </div>
    )
  }
}
