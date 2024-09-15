/**
 * Created on 17/03/2017.
 */

import React from 'react'

import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import * as actions from '../../actions'

import RFMController from './rfm-controller'

class RFMInfo extends React.Component {
  render () {
    return <RFMController {...this.props} model="info"/>
  }
}

const mapStateToProps = (state) => state.common
const mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)
export default connect(mapStateToProps, mapDispatchToProps)(RFMInfo)

