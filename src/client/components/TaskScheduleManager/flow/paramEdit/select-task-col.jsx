import React from 'react'
import { Input, TreeSelect } from 'antd';
import _ from 'lodash'
import { synchronizer } from '../../../Fetcher/synchronizer'
import { makeTreeNode } from '../../task-tree-helper'
import { isDiffByPath, tryJsonParse } from '../../../../../common/sugo-utils'

const TreeNode = TreeSelect.TreeNode

@synchronizer(props => ({
  onLoaded: props.onLoaded,
  url: `/app/task-schedule/manager?treeOperation=getTreeInfo&refProjectId=${props.projectId}`,
  modelName: 'treeInfos',
  doFetch: !!props.projectId,
  resultExtractor: data => {
    if (!data) return []
    return [{
      types: data.projectTypes,
      tasks: data.projects.map(p => ({ ...p, cronInfo: tryJsonParse(p.cronInfo) })),
      order: data.projectTypeSort
    }]
  }
}))
export default class SelectTaskCol extends React.Component {

  state = {
    treeData: [],
    expandedKeys: []
  }

  componentWillReceiveProps(nextProps) {
    if (isDiffByPath(this.props, nextProps, 'treeInfos')) {
      let treeInfo = _.get(nextProps.treeInfos, [0]) || {}
      let treeData = makeTreeNode(treeInfo)
      this.setState({ treeData: treeData })
    }
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
    const { treeData } = this.state
    const { value, className, onChangeTask } = this.props
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

