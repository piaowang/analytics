import React from 'react'
import { Tree } from 'antd'
import _ from 'lodash'

const TreeNode = Tree.TreeNode

export function format(permissions = []) {
  let obj = _.groupBy(permissions, p => p.group)
  return _.keys(obj).map(title => {
    return {
      title,
      children: obj[title]
    }
  })
}

export default class PTree extends React.Component {

  shouldComponentUpdate(nextProps) {
    return !_.isEqual(this.props, nextProps)
  }

  render () {
    let {role, permissions} = this.props
    if (role.type === 'built-in' && role.name === 'admin') role.permissions = permissions
    let formattedTree = format(role.permissions)
    return (
      <Tree
        showLine
        checkable={false}
        defaultExpandedKeys={[]}
      >
        {
          <TreeNode title="权限">
            {
              formattedTree.map(tr => {
                let {title} = tr
                return (
                  <TreeNode title={title} key={title}>
                    {
                      tr.children.map(trr => {
                        return <TreeNode title={trr.title} key={trr.id} />
                      })
                    }
                  </TreeNode>
                )
              })
            }
          </TreeNode>
        }
      </Tree>
    )
  }
}
