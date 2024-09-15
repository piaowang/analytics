import React from 'react'
import { Popconfirm, message, Tooltip } from 'antd';

export default function deleteBtn(props) {
  const {onClick, title = '确定清除吗？', style, text = '清除', icon= 'close-circle' } = props

  return (
    <Popconfirm
      title={title}
      onConfirm={onClick}
    >
      <Tooltip title={text} >
        <a>
          {text}
        </a>
      </Tooltip>
    </Popconfirm>
  )
}