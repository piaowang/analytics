
import React from 'react'
import _ from 'lodash'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import * as actions from '../../actions'

let mapStateToProps = state => state.common
let mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)

/**
 * 营销智能中台模型设置入口
 */
@connect(mapStateToProps, mapDispatchToProps)
class MarketingModelSettingsIndex extends React.Component {

  constructor(props) {
    super(props)
    this.state = {}
  }

  render() {
    const props = {
      ..._.omit(this.props, 'children')
    }
    const childrenWithProps = React.Children.map(
      this.props.children,
      child => React.cloneElement(child, {...props})
    )

    return (
      <div className="height-100">
          分群模型设置
        {childrenWithProps}
      </div>
    )
  }
}

export default MarketingModelSettingsIndex
