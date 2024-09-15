/**
 * Created on 17/03/2017.
 */

import React from 'react'

import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import * as actions from '../../actions'
import { ProjectStatus } from '../../../common/constants'

import RFMController from './rfm-controller'

class CreateRFM extends React.Component {
  render () {
    return <RFMController {...this.props} model="new" />
  }
}

const mapStateToProps = (state) => Object.assign({}, state.common, {projects: state.common.projects.filter(p => p.status === ProjectStatus.Show)})
const mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)
export default connect(mapStateToProps, mapDispatchToProps)(CreateRFM)

