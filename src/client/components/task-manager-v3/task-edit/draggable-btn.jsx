import { Button } from 'antd'
import React, { useState } from 'react'
import SugoIcon from '../../Common/sugo-icon'
import { FLOW_INCON_MAP } from '../constants'

export default function DraggableBtn(props) {
  let { nodeType, className, style, options } = props
  let [hover, setIsHover] = useState(false)
  return (
    <Button
      {...options}
      className={`width-90 ${className}`}
      style={{ ...(style || {}), cursor: 'move' }}
      draggable
      onDragStart={ev => {
        ev.dataTransfer.setData('text', `computationNode-${nodeType}`)
      }}
      type={hover ? 'dashed' : 'default'}
      onMouseEnter={() => setIsHover(true)}
      onMouseOut={() => setIsHover(false)}
    ><SugoIcon type={FLOW_INCON_MAP[nodeType]}/>{props.children}</Button>
  )
}
