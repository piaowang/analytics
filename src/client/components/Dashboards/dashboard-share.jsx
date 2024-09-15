import React from 'react'
import AuthorizationSettingModal from '../authorization/authorization-setting'
import { AUTHORIZATION_TYPE } from '~/src/common/constants'

export default class SliceShare extends React.Component {

  state = {
    openShare: false,
    dashboardToshare: {},
    shareToRoles: [],
    onShare: false
  }

  closeShare = () => {
    this.setState({
      openShare: false
    })
  }

  render() {
    let { dashboardToshare, openShare } = this.state
    let { roles, institutions, institutionsTree } = this.props
    if (!openShare) {
      return null
    }

    return (
      <AuthorizationSettingModal
        title={`看板[${dashboardToshare.dashboard_title}]授权`}
        visible={openShare}
        modelType={AUTHORIZATION_TYPE.dashboard}
        modelId={dashboardToshare.id}
        hide={this.closeShare}
        roleList={roles}
        institutionsList={institutions}
        institutionsTree={institutionsTree}
      />
    )
  }
}
