import React from 'react'
import PropTypes from 'prop-types'

export default class Tooltip extends React.Component {

  static propTypes = {
    content: PropTypes.oneOfType([PropTypes.element, PropTypes.string]).isRequired,
    visible: PropTypes.bool,
    position: PropTypes.object,
    className: PropTypes.string
  }

  static defaultProps = {
    content: '',
    visible: false,
    pos: {
      left: 0,
      top: 0
    },
    className: 'pio-context-menu'
  }

  render () {
    let {visible, pos, content, className} = this.props
    let cls = `${className} ${visible ? 'show' : 'hide'}`

    return (
      <div
        className={cls}
        style={pos}
      >
        {content}
      </div>
    )
  }

}
