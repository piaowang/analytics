import React from 'react'
import Bread from '../Common/bread'
import SegmentExpandForm from './segment-expand-form'
import BackToListBtn from '../Common/back-to-list-btn'

export default class SegmentExpandNew extends React.Component {
  render () {
    return (
      <div className="height-100">
        <Bread
          path={[
            { name: '用户扩群列表', link: '/console/segment-expand' },
            { name: '新建用户扩群', link: '/console/segment-expand/new' }
          ]}
        >
          <BackToListBtn
            to="/console/segment-expand"
            title="返回列表"
          />
        </Bread>
        <div className="scroll-content always-display-scrollbar">
          <SegmentExpandForm {...this.props} />
        </div>
      </div>
    )
  }
}
