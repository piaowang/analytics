/*
 * 用户扩群
 */
import React from 'react'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import * as actions from '../../actions'
import _ from 'lodash'

let mapStateToProps = state => state.common
let mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)

@connect(mapStateToProps, mapDispatchToProps)
export default class SegmentExpandIndex extends React.Component {

  componentWillMount() {
    this.getData()
  }

  getData = async () => {
    await this.props.getSegmentExpand()
    await this.props.getUsergroups()
  }

  render() {
    const props = _.omit(this.props, 'children')
    const childrenWithProps = React.Children.map(this.props.children,
      child => React.cloneElement(child, {...props})
    )

    return (
      <div className="height-100">
        {childrenWithProps}
      </div>
    )
  }
}

