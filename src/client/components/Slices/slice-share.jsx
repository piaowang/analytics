import React from 'react'
import AuthorizationSettingModal from '../authorization/authorization-setting'
import { AUTHORIZATION_TYPE } from '~/src/common/constants'

export default class SliceShare extends React.Component {

  state = {
    openShare: false,
    sliceToshare: {},
    shareToRoles: [],
    onShare: false
  }

  closeShare = () => {
    this.setState({
      openShare: false
    })
  }

  render() {
    let { sliceToshare, openShare } = this.state
    let { roles, institutions, institutionsTree } = this.props
    if (!openShare) {
      return null
    }
    return (
      <AuthorizationSettingModal
        title={`单图[${sliceToshare.slice_name}]授权`}
        visible={openShare}
        modelType={AUTHORIZATION_TYPE.slice}
        modelId={sliceToshare.id}
        hide={this.closeShare}
        roleList={roles}
        institutionsList={institutions}
        institutionsTree={institutionsTree}
      />
    )
  }
}
