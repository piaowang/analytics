import React from 'react'
import Bread from '../Common/bread'
import RoleForm from './form'
import CheckForm from './draft/check-form'
import AddBtn from './add-btn'
import _ from 'lodash'
import BackToListBtn from '../Common/back-to-list-btn'

export default class RoleSingle extends React.Component {
  render() {
    let id = this.props.params.roleId
    let {roles} = this.props
    let role = _.find(roles, {id}) || {}
    //是否需要审核
    const {enableDataChecking} = window.sugo
    return (
      <div className="height-100">
        <Bread
          path={[
            { name: '角色列表', link: '/console/security/role' },
            { name: role.name }
          ]}
        >
          <BackToListBtn
            to="/console/security/role"
            title="返回列表"
            className="mg1r"
          />
          <AddBtn {...this.props} />
        </Bread>
        <div className="overscroll-y always-display-scrollbar width-100" style={{height: 'calc(100% - 44px)'}}>
          {enableDataChecking ? (
            <CheckForm {...this.props} />
          ) : (
            <RoleForm {...this.props} />
          )}
        </div>
      </div>
    )
  }
}
