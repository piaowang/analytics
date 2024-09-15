import React from 'react'
import Bread from '../Common/bread'
import RoleForm from './form'
import RoleFormCheck from './draft/check-form'
import BackToListBtn from '../Common/back-to-list-btn'

export default class RoleNew extends React.Component {
  render() {
    const { enableDataChecking } = window.sugo
    return (
      <div className="height-100">
        <Bread
          path={[
            { name: '角色列表', link: '/console/security/role' },
            { name: '新建角色', link: '/console/security/role/new' }
          ]}
        >
          <BackToListBtn to="/console/security/role" title="返回列表" />
        </Bread>
        <div className="scroll-content always-display-scrollbar width-100">
          {enableDataChecking ? (
            <RoleFormCheck {...this.props} />
          ) : (
            <RoleForm {...this.props} />
          )}
        </div>
      </div>
    )
  }
}
