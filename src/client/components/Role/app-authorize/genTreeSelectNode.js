
import React from 'react'
import { Tooltip, Tree } from 'antd'

const { TreeNode } = Tree

export function recurTreeNode(item, tagSearchVal = '') {
  const index = item.name.indexOf(tagSearchVal)
  const beforeStr = item.name.substr(0, index)
  const afterStr = item.name.substr(index + tagSearchVal.length)
  const title =
  index > -1 ? (
    <Tooltip title={afterStr}>
      <span>
        {beforeStr}
        <span style={{ color: '#f50' }}>{tagSearchVal}</span>
        {afterStr}
      </span>
    </Tooltip>
  ) : (
    <Tooltip title={item.name}>
      <span>{item.name}</span>
    </Tooltip>
  )

  return (
    <TreeNode title={title} filterProp={item.name} value={item.id} key={item.id}>
      {
        (item.children || []).map( i => recurTreeNode(i, tagSearchVal))
      }
    </TreeNode>
  )
}
