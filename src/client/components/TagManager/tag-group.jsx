/**
 * 标签组合
 */

import React from 'react'
import Bread from '../Common/bread'
import { PlusOutlined, RollbackOutlined } from '@ant-design/icons';
import {
  Spin, Button
} from 'antd'
import _ from 'lodash'
import TagGroupForm from './tag-group-form'
import {withHashStateDec} from '../Common/hash-connector'
import TagGroupList from './tag-group-list'
import Link from '../Common/link-nojam'
import {compressUrlQuery, isDiffByPath} from '../../../common/sugo-utils'
import {checkPermission} from '../../common/permission-control'
import {browserHistory} from 'react-router'
import {isSuperUser} from '../../common/user-utils'

const canCreateGroupTag = checkPermission('post:/app/tag-group/create')

function initTagGroup(datasourceCurrent) {
  return {
    datasource_id: datasourceCurrent.id,
    params: {
      filters: [],
      relation: 'and'
    }
  }
}

@withHashStateDec(
  s => {
    return { tagGroup: s.tagGroup }
  },
  {tagGroup: {}}
)
export default class TagGroup extends React.Component {
  
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (isDiffByPath(this.props, prevProps, 'location.query.id')) {
      this.init()
    } else if (isDiffByPath(this.props, prevProps, 'projectCurrent')) {
      browserHistory.push('/console/tag-group')
    }
  }
  
  componentWillUnmount() {
    clearTimeout(this.timer)
  }

  init(props = this.props) {
    let id = _.get(this.props, 'location.query.id')
    let { tagGroups, datasourceCurrent } = this.props

    let tagGroup = id
      ? _.find(tagGroups, t => t.id === id) || {}
      : initTagGroup(datasourceCurrent)

    this.timer = setTimeout(() => {
      props.updateHashState({ tagGroup }, true)
    }, 10)
  }

  //构建详情页面url
  buildUrl = (filters, relation) => {
    let tagGroupTitle = this.props.tagGroup.title
    let hash = compressUrlQuery([{col: tagGroupTitle, op: relation || 'and', eq: filters}])
    return `/console/tag-users?relation=${relation}&tags=${hash}`
  }

  renderForm(tagGroups) {
    const params = {
      ...this.props,
      tagGroups
    } 
    return (
      <TagGroupForm
        buildUrl={this.buildUrl}
        {...params}
      />
    )
  }

  controlHeight = () => {
    return {minHeight: window.innerHeight - 48 - 44}
  }

  renderNewBtn = id => {
    let back = (
      <Link to="/console/tag-dict">
        <Button
          type="primary"
          icon={<RollbackOutlined />}
        >
          返回标签体系
        </Button>
      </Link>
    )
    if (!id) return back
    return (
      <span>
        {back}
        {!canCreateGroupTag ? null : (
          <Link to="/console/tag-group">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="mg1l"
            >
              新建组合标签
            </Button>
          </Link>
        )}
      </span>
    );
  }

  renderBread() {
    let id = _.get(this.props, 'location.query.id')
    return (
      <Bread
        path={[
          {name: '体系管理'},
          {name: '组合标签管理'}
        ]}
      >
        {this.renderNewBtn(id)}
      </Bread>
    )
  }

  render () {
    let {
      loading: propLoading,
      tagGroups,
      datasourceCurrent,
      loadingProject,
      tagGroup
    } = this.props
    let loading = propLoading || loadingProject
    
    let {id: currUserId, SugoRoles} = window.sugo.user
    let currUserRoleIdsSet = new Set(SugoRoles.map(r => r.id))
    const mineTagGroups = isSuperUser()
      ? tagGroups
      : tagGroups.filter(p => p.created_by === currUserId || _.some(p.role_ids, r => currUserRoleIdsSet.has(r)))
    return (
      <div className="height-100">
        {this.renderBread()}
        <div className="scroll-content-100 always-display-scrollbar contain-docs-analytic">
          <Spin spinning={loading}>
            <div className="ug-wrapper relative bg-white" style={this.controlHeight()}>
              <TagGroupList
                tagGroups={mineTagGroups}
                tagGroup={tagGroup}
                datasourceCurrent={datasourceCurrent}
              />
              <div className="ug-info">
                {this.renderForm(mineTagGroups)}
              </div>
            </div>
          </Spin>
        </div>
      </div>
    )
  }

}
