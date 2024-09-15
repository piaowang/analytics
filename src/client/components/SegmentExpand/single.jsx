import React from 'react'
import Bread from '../Common/bread'
import SegmentExpandForm from './segment-expand-form'
import AddBtn from './add-btn'
import _ from 'lodash'
import BackToListBtn from '../Common/back-to-list-btn'
import * as ls from '../../common/localstorage'
import {browserHistory} from 'react-router'

const seLSId = 'segment-expand_change_project'

export default class SegmentExpandSingle extends React.Component {

  componentWillReceiveProps(nextProps) {
    if (this.onUnload) return
    let nid = nextProps.datasourceCurrent.id
    let tid = this.props.datasourceCurrent.id
    if (
      tid &&
      nid !== tid
    ) {
      if (ls.get(seLSId)) {
        ls.set(seLSId, '')
      }
      else {
        this.onUnload = true
        browserHistory.push('/console/segment-expand')
      }
      return
    }
    let {segmentExpandId} = nextProps.params
    let {segmentExpands, changeProject, projectList} = this.props
    let nDatasourceId = _.get(
      _.find(segmentExpands, {id: segmentExpandId}),
      'druid_datasource_id'
    )
    let proj = _.find(projectList, {
      datasource_id: nDatasourceId
    })
    if (proj && nid !== nDatasourceId) {
      changeProject(proj.id)
      return ls.set(seLSId, true)
    }
  }

  render () {
    let id = this.props.params.segmentExpandId
    let {segmentExpands} = this.props
    let segmentExpand = _.find(segmentExpands, {id}) || {}
    return (
      <div className="height-100">
        <Bread
          path={[
            { name: '用户扩群列表', link: '/console/segment-expand' },
            { name: segmentExpand.title }
          ]}
        >
          <BackToListBtn
            to="/console/segment-expand"
            title="返回列表"
            className="mg1r"
          />
          <AddBtn {...this.props} />
        </Bread>
        <div className="scroll-content always-display-scrollbar">
          <SegmentExpandForm {...this.props} />
        </div>
      </div>
    )
  }
}
