import React from 'react'
import Bread from '../Common/bread'
import UsergroupForm from './usergroup-form'
import AddBtn from './add-btn'
import _ from 'lodash'
import { browserHistory } from 'react-router'
import { RollbackOutlined } from '@ant-design/icons';
import { Button } from 'antd'
import * as ls from '../../common/localstorage'

const ugLSId = 'usergroup_change_project'

export default class UsergroupSingle extends React.Component {
  
  componentWillReceiveProps(nextProps) {
    if (this.onUnload) return
    let nid = nextProps.datasourceCurrent.id
    let tid = this.props.datasourceCurrent.id
    if (
      tid &&
      nid !== tid
    ) {
      if (ls.get(ugLSId)) {
        ls.set(ugLSId, '')
      }
      else {
        this.onUnload = true
        browserHistory.push('/console/usergroup')
      }
      return
    }
    let {usergroupId} = nextProps.params
    let {usergroups, changeProject, projectList} = this.props
    let nDatasourceId = _.get(
      _.find(usergroups, {id: usergroupId}),
      'druid_datasource_id'
    )
    let proj = _.find(projectList, {
      datasource_id: nDatasourceId
    })
    if (proj && nid !== nDatasourceId) {
      changeProject(proj.id)
      return ls.set(ugLSId, true)
    }
  }

  componentWillUnmount() {
    this.onUnload = false
  }

  render () {
    let id = this.props.params.usergroupId
    let {usergroups} = this.props
    let usergroup = _.find(usergroups, {id}) || {}
    return (
      <div className="height-100">
        <Bread
          path={[
            { name: '用户分群列表', link: '/console/usergroup' },
            { name: usergroup.title }
          ]}
        >
          <Button
            icon={<RollbackOutlined />}
            className="mg1r"
            onClick={() => browserHistory.push('/console/usergroup')}
          >
            返回
          </Button>
          <AddBtn {...this.props} />
        </Bread>
        <div className="scroll-content-100 always-display-scrollbar">
          <UsergroupForm {...this.props} />
        </div>
      </div>
    );
  }
}
