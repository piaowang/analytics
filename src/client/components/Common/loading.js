/**
 * Created by heganjie on 16/9/28.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { LoadingOutlined } from '@ant-design/icons';
import _ from 'lodash'

export default class Loading extends React.Component {
  static propTypes = {
    indicatePosition: PropTypes.oneOf(['center', 'right']),
    children: PropTypes.any,
    isLoading: PropTypes.bool,
    style: PropTypes.object,
    indicatorWrapperStyle: PropTypes.object,
    className: PropTypes.string
  }

  static defaultProps = {indicatePosition: 'center', isLoading: false, style: {}, indicatorWrapperStyle: {}}

  render() {
    let {isLoading, indicatePosition, children, className, style, indicatorWrapperStyle} = this.props

    indicatorWrapperStyle = indicatePosition === 'right'
      ? {right: 0, ...indicatorWrapperStyle}
      : {left: '50%', ...indicatorWrapperStyle}
    return (
      <div
        className={className}
        style={{position: 'relative', ...style}}
      >
        <div
          style={{
            display: isLoading ? 'inline-block' : 'none',
            pointerEvents: 'none',
            position: 'absolute',
            zIndex: 4,
            top: '50%',
            transform: 'translate(-50%,-50%)',
            ...indicatorWrapperStyle
          }}
        >
          <LoadingOutlined />
        </div>
        {children}
      </div>
    );
  }
}
