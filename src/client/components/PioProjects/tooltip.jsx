import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'

function computeStyle({
  left,
  top,
  bottom,
  right
}) {
  let left0 = right - left > 30 ? left : (left + right) / 2 - 8
  return {
    left: left0,
    top: bottom - 42
  }
}

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
    rect: {
      left: 0,
      top: 0,
      bottom: 0,
      right: 0
    },
    className: 'pio-tooltip'
  }

  render () {
    let {visible, rect, content, onTooltipMouseOver, onMouseOut, className} = this.props
    let cls = classNames(
      className,
      {hide: !visible}
    )
    let style = computeStyle(rect)

    return (
      <div
        className={cls}
        style={style}
        onMouseOver={onTooltipMouseOver}
        onMouseOut={onMouseOut}
      >
        {content}
      </div>
    )
  }

}
