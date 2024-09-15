import React from 'react'
import { Input, TreeSelect } from 'antd';
import _ from 'lodash'

const TreeNode = TreeSelect.TreeNode

export default class SelectTaskCol extends React.Component {

  state = {
    expandedKeys: []
  }

  renderTree(treeData) {
    return treeData.map(p => {
      if (p.children) {
        return (<TreeNode key={p.key} value={p.key.toString()} title={p.title} disabled={p.key.indexOf('type') === 0}>
          {this.renderTree(p.children)}
        </TreeNode>)
      } else {
        return <TreeNode key={p.key} value={p.key.toString()} title={p.title} disabled={p.key.indexOf('type') === 0} />
      }
    })
  }
  
  render() {
    const { value, className, onChangeTask, treeData } = this.props
    return (<TreeSelect
      value={_.isEmpty(treeData)? '' : value}
      placeholder="请选择任务"
      allowClear
      onChange={onChangeTask}
      className={className}
    >
      {this.renderTree(treeData)}
    </TreeSelect>)
  }
}

