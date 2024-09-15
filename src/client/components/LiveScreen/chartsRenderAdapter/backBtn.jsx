import React from 'react'
import Icon2 from '../../Common/sugo-icon'
import {browserHistory} from 'react-router'


export const BackBtn = props => {
  const { params, styleConfig = {}, className } = props
  const {iconType = 'antd', iconSrc = 'skin', rotate, fontSize, textContent = '主题切换'} = styleConfig || {}
  
  return (
    <div
      className={`height-100 pointer ${className}`}
      onClick={() => {
        if (styleConfig.linkOverwrite) {
          window.location.href = styleConfig.linkOverwrite
        } else {
          browserHistory.goBack()
        }
      }}
    >
      <span
        className="center-of-relative"
        style={{
          transform: `translate(-50%, -50%) rotate(${rotate || 0}deg)`,
          ...(styleConfig || {})
        }}
      >
        {iconType === 'antd'
          ? (
            <Icon2
              type={iconSrc}
              className="pointer"
            />
          ) : (
            <img
              className="pointer"
              style={{
                width: fontSize,
                height: fontSize
              }}
              src={iconSrc}
              alt=""
            />
          )}
        {textContent}
      </span>
    </div>
  )
}
