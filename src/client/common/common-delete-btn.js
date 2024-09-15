import React from 'react'
import { Popconfirm, message, Tooltip, Button } from 'antd';

export default function deleteBtn(props) {
  const {onClick, title = '确定删除吗？', style, text = '删除', icon= 'delete' } = props

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
