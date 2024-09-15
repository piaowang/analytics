import {frameStyles} from '../constants'
import React from 'react'

export const Frame = props => {
  const { className, styleConfig } = props
  const type = styleConfig && styleConfig.type || 'style1'
  return (
    <div className={className} style={frameStyles[type]}><div style={{ width: '100%', height: '100%' }} /></div>
  )
}
