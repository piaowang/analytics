import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'

export default class Timer extends React.Component {
  static propTypes = {
    interval: PropTypes.number.isRequired,
    onTick: PropTypes.func,
    children: PropTypes.func
  }

  static defaultProps = {
    onTick: timer => timer.forceUpdate()
  }

  state = {

  }

  // 避免判断 onTick prop 变更
  _onTick = () => {
    this.props.onTick(this)
  }

  componentDidMount() {
    this.timerId = setInterval(this._onTick, this.props.interval)
  }
  
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.props.interval !== prevProps.interval) {
      clearInterval(this.timerId)
      this.timerId = setInterval(this._onTick, this.props.interval)
    }
  }

  componentWillUnmount() {
    clearInterval(this.timerId)
  }

  render() {
    let {children} = this.props
    if (!_.isFunction(children)) {
      return null
    }
    return children(this.state, this)
  }
}
