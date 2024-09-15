import React from 'react'
import {connect} from 'react-redux'
import PropTypes from 'prop-types'

@connect((state, ownProps) => {
  return ownProps.selector ? ownProps.selector(state) : state
})
export default class ReduxSelector extends React.Component {
  static propTypes = {
    children: PropTypes.func.isRequired,
    selector: PropTypes.func
  }
  
  render() {
    let {children, ...rest} = this.props
  
    return children(rest)
  }
}
