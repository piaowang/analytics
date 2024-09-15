import React from 'react'
import { Tree } from 'antd'
import {isDiffByPath, isEqualWithFunc, isEqualWithReactObj} from '../../../common/sugo-utils'
import _ from 'lodash'

const { TreeNode } = Tree

export default class DraggableTree extends React.Component {
  state = {
    expandedKeys: [],
    autoExpandParent: true,
    selectedKeys: []
  };
  
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (isDiffByPath(prevProps, this.props, 'treeInfo', isEqualWithReactObj)) {
      let allParentNodes = _.flatMapDeep(this.props.treeInfo, n => {
        return [n, ...(n.children || [])].filter(n => !_.isEmpty(n.children))
      })
      this.setState({
        expandedKeys: allParentNodes.map(n => n.key)
      })
    }
  }
  
  onExpand = expandedKeys => {
    // if not set autoExpandParent to false, if children expanded, parent can not collapse.
    // or, you can remove all expanded children keys.
    this.setState({
      expandedKeys,
      autoExpandParent: false
    })
  };
  
  onCheck = checkedKeys => {
    this.setState({ checkedKeys })
  };
  
  onSelect = (selectedKeys, info) => {
    let {onSelect} = this.props
    if (_.isFunction(onSelect)) {
      onSelect(selectedKeys, info)
    }
    this.setState({ selectedKeys })
  };
  
  renderTreeNodes = data => {
    return data.map(item => {
      let {key, title, hoverTitle, children, ...rest} = item
      if (!_.isEmpty(children)) {
        return (
          <TreeNode title={title} key={key} dataRef={item} {...rest}>
            {this.renderTreeNodes(children)}
          </TreeNode>
        )
      }
      return (
        <TreeNode
          key={key}
          title={(
            <span
              draggable
              onDragStart={ev => {
                ev.dataTransfer.setData('text', key)
              }}
              style={{cursor: 'grab'}}
              title={hoverTitle}
            >{title}</span>
          )}
          {...rest}
        />
      )
    })
  };
  
  render() {
    let {treeInfo, onSelect, ...rest} = this.props
    if (_.isEmpty(treeInfo)) {
      return (
        <div className="pd3y aligncenter font18 color-999">暂无内容</div>
      )
    }
    return (
      <Tree
        onExpand={this.onExpand}
        expandedKeys={this.state.expandedKeys}
        autoExpandParent={this.state.autoExpandParent}
        onSelect={this.onSelect}
        selectedKeys={this.state.selectedKeys}
        {...rest}
      >
        {this.renderTreeNodes(treeInfo)}
      </Tree>
    )
  }
}
