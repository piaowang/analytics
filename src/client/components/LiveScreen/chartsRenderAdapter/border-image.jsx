import {frameStyles} from '../constants'
import React from 'react'



export const BorderImage = props => {
  const { className, params, styleConfig } = props
  let {type, customBorderImg, borderImageSlice, borderImageWidth, borderImageOutset, borderImageRepeat} = styleConfig || {}
  type = type || 'style1'
  return (
    <div
      className={`${className || ''} height-100`}
      style={_.startsWith(type, 'custom')
        ? {
          borderImageSlice: borderImageSlice,
          borderImageWidth: borderImageWidth,
          borderImageOutset: borderImageOutset,
          borderImageRepeat: borderImageRepeat,
          borderImageSource: `url("${customBorderImg}")`
        }
        : frameStyles[type]}
    >
      <div style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
