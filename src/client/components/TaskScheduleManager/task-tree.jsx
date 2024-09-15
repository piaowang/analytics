import React from 'react'

import { CheckCircleOutlined, CloseCircleOutlined, FolderOpenOutlined, FolderOutlined, ScheduleOutlined, SettingOutlined } from '@ant-design/icons'

import { Tree, Tooltip, message } from 'antd'
import { synchronizer } from '../Fetcher/synchronizer'
import _ from 'lodash'
import PubSub from 'pubsub-js'
import { RELOAD_TREE } from './constants'
import { dictBy, groupBy, isDiffByPath, toQueryParams, tryJsonParse } from '../../../common/sugo-utils'
import Fetch from '../../common/fetch-final'
import { sendURLEncoded } from '../../common/fetch-utils'
import { withCommonFilter } from '../Common/common-filter'
import smartSearch from '../../../common/smart-search'
import { makeTreeNode, treeFilter } from './task-tree-helper'

const typeIcon = <FolderOutlined className='font16' />
const typeExpandedIcon = <FolderOpenOutlined className='font16' />
const taskIcon = <ScheduleOutlined className='font14' />

function recurFindPathNodeKeys(treeData, targetNodeKey) {
  if (_.isEmpty(treeData)) {
    return []
  }
  let [headNode, ...rest] = treeData
  if (headNode.key === targetNodeKey) {
    return [targetNodeKey]
  }
  let childIds = recurFindPathNodeKeys(headNode.children, targetNodeKey)
  if (!_.isEmpty(childIds)) {
    return [headNode.key, ...childIds]
  }
  return recurFindPathNodeKeys(rest, targetNodeKey)
}

function recurFlatten(tree) {
  if (_.isEmpty(tree)) {
    return []
  }
  return _.flatMap(tree, n => [n, ...recurFlatten(n.children)])
}

function treeNode2KeyStr(n) {
  return _.startsWith(n.key, 'type-') ? n.key.substr(5) : n.key
}

@withCommonFilter
export default class TaskTree extends React.Component {
  state = {
    treeData: [],
    editingOrder: false,
    expandedKeys: []
  }

  componentWillMount() {
    const { treeInfos } = this.props
    if (treeInfos && treeInfos.length) {
      let treeInfo = _.get(treeInfos, [0]) || {}
      let treeData = makeTreeNode(treeInfo)
      this.setState({ treeData })
    }
  }

  componentDidMount() {
    let { innerRef } = this.props
    if (_.isFunction(innerRef)) {
      innerRef(this)
    }
    // this.props.
  }

  componentDidUpdate(prevPorps) {
    if (isDiffByPath(this.props, prevPorps, 'treeInfos')) {
      let treeInfo = _.get(this.props.treeInfos, [0]) || {}
      let treeData = makeTreeNode(treeInfo)

      this.setState({ treeData: treeData, editingOrder: false }, () => {
        if (!_.isEmpty(this.props.selectedKeys)) {
          this.expandToSeeNode(this.props.selectedKeys[0])
        }
        if (!this.props.nodeKey) {
          //   this.isfirstload = false
          //   console.log('go default......')
          this.props.goToDefaultTask()
        }
      })
    }
    if (isDiffByPath(this.props, prevPorps, 'selectedKeys')) {
      // 选择变更时，自动展开父节点
      this.expandToSeeNode(this.props.selectedKeys[0])
    }
  }

  isfirstload = true

  expandToSeeNode = selectedKey => {
    let { expandedKeys, treeData } = this.state
    let allParentIds = recurFindPathNodeKeys(treeData, selectedKey).filter(k => k !== selectedKey)
    this.setState({ expandedKeys: _.uniq([...expandedKeys, ...allParentIds]) })
  }

  // 代码来源 antd Tree 拖动示例 https://ant.design/components/tree-cn/
  onDrop = info => {
    const dropKey = info.node.props.eventKey
    const dragKey = info.dragNode.props.eventKey
    const dropPos = info.node.props.pos.split('-')
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1])
    // diff: only allow drag to type
    if (!info.dropToGap && !_.startsWith(dropKey, 'type-')) {
      return
    }

    const loop = (data, key, callback) => {
      data.forEach((item, index, arr) => {
        if (item.key === key) {
          return callback(item, index, arr)
        }
        if (item.children) {
          return loop(item.children, key, callback)
        }
      })
    }
    const data = [...this.state.treeData]
    let dragObj
    loop(data, dragKey, (item, index, arr) => {
      arr.splice(index, 1)
      dragObj = item
    })
    if (info.dropToGap) {
      let ar = []
      let i = 0
      loop(data, dropKey, (item, index, arr) => {
        ar = arr
        i = index
        dragObj.parentKey = item.parentKey // diff: reset parent
      })
      if (dropPosition === -1) {
        ar.splice(i, 0, dragObj)
      } else {
        ar.splice(i + 1, 0, dragObj)
      }
    } else {
      loop(data, dropKey, item => {
        item.children = item.children || []
        // where to insert 示例添加到尾部，可以是随意位置
        item.children.push(dragObj)
        dragObj.parentKey = item.key // diff: set parent
      })
    }
    this.setState({ treeData: data })
  }

  renderTreeNodes = treeData => {
    let { expandedKeys } = this.state
    return treeData.map(node => {
      if (node.children) {
        return (
          <Tree.TreeNode icon={_.includes(expandedKeys, node.key) ? typeExpandedIcon : typeIcon} {...node} dataRef={node}>
            {this.renderTreeNodes(node.children)}
          </Tree.TreeNode>
        )
      }
      return <Tree.TreeNode icon={taskIcon} {...node} dataRef={node} />
    })
  }

  cancelEditOrder = () => {
    let treeInfo = _.get(this.props.treeInfos, [0]) || {}
    let treeData = makeTreeNode(treeInfo)
    this.setState({ treeData: treeData, editingOrder: false })
  }

  genSortInfo = treeData => {
    let flattedTree = recurFlatten(treeData)
    let taskNameIdDict = dictBy(
      _.get(this.props, 'treeInfos[0].tasks'),
      t => t.id,
      t => t.name
    )
    let sortInfo = {
      order: groupBy(
        flattedTree,
        n => (n.parentKey && n.parentKey) || -1,
        arr => arr.map(n => n.key)
      ),
      type: groupBy(
        flattedTree.filter(n => !_.startsWith(n.key, 'type-')),
        n => (n.parentKey && n.parentKey.substr(5)) || 0,
        arr => arr.map(n => ({ projectId: n.key, projectName: taskNameIdDict[n.key] }))
      ),
      tree: groupBy(
        flattedTree.filter(n => _.startsWith(n.key, 'type-')),
        n => (n.parentKey && n.parentKey.substr(5)) || 0,
        arr => arr.map(treeNode2KeyStr)
      )
    }
    // console.log(flattedTree, sortInfo)
    return sortInfo
  }

  saveOrder = async () => {
    let { projectId } = this.props
    let { treeData } = this.state

    this.setState({ editingOrder: false })
    let sortInfo = this.genSortInfo(treeData)
    let res = await Fetch.post('/app/task-schedule/manager', null, {
      headers: sendURLEncoded.headers,
      body: toQueryParams({
        treeOperation: 'update',
        content: JSON.stringify(sortInfo),
        refProjectId: projectId
      })
    })

    message.success('保存排序成功')
    PubSub.publish(RELOAD_TREE)
  }

  onExpand = (expandedKeys, { expanded, node }) => {
    this.setState({ expandedKeys })
  }

  renderEmptyHint = () => {
    return (
      <div key='noData' className='aligncenter pd3y'>
        暂无内容，请先创建
      </div>
    )
  }

  render() {
    let { treeInfos, onLoaded, keywordInput, searching, setCurrentSearching, ...rest } = this.props
    let { treeData, editingOrder, expandedKeys } = this.state
    let Search = keywordInput

    let filteredTreeData = treeFilter(treeData, n => smartSearch(searching, n.title))
    return [
      <div className='line-height44 pd2x alignright' key='title'>
        <span className='fleft'>任务分类</span>
        {editingOrder ? (
          [
            <Tooltip title='取消设置排序' key='cancel'>
              <CloseCircleOutlined className='font16 pointer mg2r' onClick={this.cancelEditOrder} />
            </Tooltip>,
            <Tooltip key='save' visible placement='rightTop' title='可拖拽节点进行排序，点击保存操作'>
              <CheckCircleOutlined className='font16 pointer' onClick={this.saveOrder} />
            </Tooltip>
          ]
        ) : (
          <Tooltip title='设置任务排序'>
            <SettingOutlined
              className='pointer font16'
              onClick={() => {
                setCurrentSearching('')
                this.setState({ editingOrder: true })
              }}
            />
          </Tooltip>
        )}
      </div>,
      <Search className='tree-search-box' placeholder='搜索...' key='search' disabled={editingOrder} />,
      _.isEmpty(filteredTreeData) ? (
        this.renderEmptyHint()
      ) : (
        <Tree
          title='treeData'
          key='tree'
          showIcon
          // autoExpandParent={autoExpandParent}
          expandedKeys={expandedKeys}
          // selectedKeys={selectedKeys}
          // defaultExpandedKeys={defaultExpandedKeys}
          // defaultSelectedKeys={defaultSelectedKeys}
          // loadData={this.onLoadData}
          onExpand={this.onExpand}
          draggable={editingOrder}
          onDrop={this.onDrop}
          {...rest}
        >
          {this.renderTreeNodes(filteredTreeData)}
        </Tree>
      )
    ]
  }
}
