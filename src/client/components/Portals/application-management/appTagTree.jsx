import { Input, Tooltip, Tree } from 'antd'
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { appTagOrderSagaSyncModelGen, appTagSagaSyncModelGen, makeTagTree, TAG_APP_ORDER_SAGA_MODEL_NS, TAG_ORDER_SAGA_MODEL_NS, TAGS_SAGA_MODEL_NS } from './store'
import './index.styl'
import _ from 'lodash'
import { connect } from 'react-redux'
import { getSagaState, useRuntimeSagaModels } from '../../Common/runtime-saga-helper'
import { APP_MGR_SAGA_MODEL_NS } from './models'

const { TreeNode } = Tree
const { Search } = Input

const getParentKey = (key, tree) => {
  let parentKey
  for (let i = 0; i < tree.length; i++) {
    const node = tree[i]
    if (node.children) {
      if (node.children.some(item => item.name === key)) {
        parentKey = node.id
      } else if (getParentKey(key, node.children)) {
        parentKey = getParentKey(key, node.children)
      }
    }
  }
  return parentKey
}

//标签管理
function AppTagTree(props, ref) {
  const { dispatch } = window.store

  const { rightContentView, selectedTag, tagList, tagOrders } = props

  useRuntimeSagaModels(props, [appTagSagaSyncModelGen(TAGS_SAGA_MODEL_NS), appTagOrderSagaSyncModelGen(TAG_APP_ORDER_SAGA_MODEL_NS)])

  const tagListMap = _.keyBy(tagList, 'id')

  const tree = makeTagTree(tagList, tagOrders)

  let [treeData, setTreeData] = useState(() => _.cloneDeep(tree))
  useEffect(() => {
    setTreeData(_.cloneDeep(tree))
  }, [JSON.stringify(tree)])

  //是否展开所有标签
  // useEffect(() => {
  //   const defaultExpandedKeys = []
  //   function recur(arr) {
  //     arr.map( i => {
  //       if (!_.isEmpty(i.children)) {
  //         defaultExpandedKeys.push(i.id)
  //         recur(i.children)
  //       }
  //     })
  //   }
  //   tree.map( i => {
  //     if (!_.isEmpty(i.children)) {
  //       defaultExpandedKeys.push(i.id)
  //       recur(i.children)
  //     }
  //   })
  //   props.setexpandedTag(defaultExpandedKeys)
  // }, [JSON.stringify(tree)])

  function recurTreeNode(item) {
    const tagSearchVal = props.tagSearchVal
    const index = item.name.indexOf(tagSearchVal)
    const beforeStr = item.name.substr(0, index)
    const afterStr = item.name.substr(index + tagSearchVal.length)
    let mouseEnterDelay = props.changeTagOrder ? 3 : 0.1
    const title =
      index > -1 ? (
        <Tooltip title={afterStr} mouseEnterDelay={mouseEnterDelay}>
          <span>
            {beforeStr}
            <span style={{ color: '#f50' }}>{tagSearchVal}</span>
            {afterStr}
          </span>
        </Tooltip>
      ) : (
        <Tooltip title={item.name} mouseEnterDelay={mouseEnterDelay}>
          <span>{item.name}</span>
        </Tooltip>
      )

    return (
      <TreeNode title={title} key={item.id} mouseEnterDelay={mouseEnterDelay}>
        {(item?.children || []).map(recurTreeNode)}
      </TreeNode>
    )
  }

  useImperativeHandle(ref, () => ({
    getNextTagAndOrders: () => {
      let { tagOrders } = getSagaState(TAG_ORDER_SAGA_MODEL_NS)
      let { applicationTags } = getSagaState(TAGS_SAGA_MODEL_NS)

      function flattenTree(tree) {
        return _.flatMap(tree, n => [n, ...flattenTree(n.children)])
      }
      let flatted = flattenTree(treeData)
      let treeNodeIdDict = _.keyBy(flatted, 'id')
      let childParentIdDict = _.groupBy(flatted, 'parentId')

      // 生成当前树的标签顺序
      // 1. 将树打平，形成 id 字典
      // 2. 遍历原顺序数组，更新 order 数据并返回
      let nextTagOrders = _.map(tagOrders, o => {
        let childs = childParentIdDict[o.appTagId]
        if (o.appTagId && !treeNodeIdDict[o.appTagId]) {
          return null
        }
        return {
          ...o,
          order: _.map(childs, n => n.id)
        }
      }).filter(_.identity)

      // 按需修改 parentId
      // 1. 将树打平，形成 id 字典
      // 2. 遍历原数组，修改 parentId
      let nextTags = _.map(applicationTags, tag => ({ ...tag, parentId: treeNodeIdDict[tag.id]?.parentId }))
      return {
        nextTags,
        nextTagOrders
      }
    },
    restoreTagOrders: () => {
      setTreeData(_.cloneDeep(tree))
    }
  }))

  // 主要参考 antd tree 控件拖拽示例： https://ant.design/components/tree-cn/#header
  function onDrop(info) {
    const dropKey = info.node.props.eventKey
    const dragKey = info.dragNode.props.eventKey
    const dropPos = info.node.props.pos.split('-')
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1])

    const loop = (data, key, callback) => {
      data.forEach((item, index, arr) => {
        if (item.id === key) {
          return callback(item, index, arr)
        }
        if (item.children) {
          return loop(item.children, key, callback)
        }
      })
    }
    const data = [...treeData]

    // Find dragObject
    let dragObj
    loop(data, dragKey, (item, index, arr) => {
      arr.splice(index, 1)
      dragObj = item
    })

    if (!info.dropToGap) {
      // Drop on the content
      loop(data, dropKey, item => {
        item.children = item.children || []
        // where to insert 示例添加到尾部，可以是随意位置
        item.children.push(dragObj)
        dragObj.parentId = item.id
      })
    } else if (
      (info.node.props.children || []).length > 0 && // Has children
      info.node.props.expanded && // Is expanded
      dropPosition === 1 // On the bottom gap
    ) {
      loop(data, dropKey, item => {
        item.children = item.children || []
        // where to insert 示例添加到头部，可以是随意位置
        item.children.unshift(dragObj)
        dragObj.parentId = item.id
      })
    } else {
      let ar
      let i
      loop(data, dropKey, (item, index, arr) => {
        ar = arr
        i = index
        dragObj.parentId = item.parentId
      })
      if (dropPosition === -1) {
        ar.splice(i, 0, dragObj)
      } else {
        ar.splice(i + 1, 0, dragObj)
      }
    }

    setTreeData(data)
  }

  return (
    <div id='app-tag-tree'>
      <div className='pd1 mg2b'>
        <Search
          className='my-search'
          style={{ minWidth: '200px', height: '32px', boxSizing: 'border-box' }}
          allowClear
          placeholder='输入标签名称'
          onSearch={value => {
            let selected = ''
            const expandedKeys = tagList
              .map(item => {
                if (item.name.indexOf(value) > -1) {
                  selected = item.id
                  return getParentKey(item.name, tree)
                }
                return null
              })
              .filter((item, i, self) => item && self.indexOf(item) === i)

            let temp = []

            function findParent(i) {
              if (tagListMap[i]?.parentId) {
                temp.push(tagListMap[i]?.parentId)
                findParent(tagListMap[i]?.parentId)
              }
            }
            expandedKeys.map(i => {
              temp.push(i)
              findParent(i)
            })
            temp = _.union(temp)
            props.setexpandedTag(temp)
            props.setTagSearchVal(value)
          }}
        />
      </div>
      <Tree
        checkable={!rightContentView}
        draggable={props.changeTagOrder}
        onDragEnter={info => props.setexpandedTag(info.expandedKeys)}
        onDrop={onDrop}
        expandedKeys={props.expandedTag}
        expandedKeys={props.expandedTag}
        checkStrictly
        checkedKeys={props.checkedTag}
        selectedKeys={[selectedTag]}
        onSelect={e => {
          if (!rightContentView) return
          if (!e[0]) return
          dispatch({
            type: 'application-management/change',
            payload: {
              selectedTag: e[0]
            }
          })
          return
        }}
        onCheck={e => {
          return props.setCheckedTag(e)
        }}
        onExpand={(e, { node }) => {
          let target = node.props.eventKey
          let next = []
          if (props.expandedTag.includes(target)) {
            next = props.expandedTag.filter(i => i !== target)
            return props.setexpandedTag(next)
          }
          return props.setexpandedTag(_.concat(props.expandedTag, target))
        }}
      >
        {treeData.map(recurTreeNode)}
      </Tree>
    </div>
  )
}

// hack: connect with forwardRef
// https://github.com/reduxjs/react-redux/issues/914

const AppTagTree0 = forwardRef(AppTagTree)

const MyConnectedComponent = _.flow(
  connect(state => {
    return {
      selectedTag: state[APP_MGR_SAGA_MODEL_NS]?.selectedTag,
      tagList: _.get(state, [TAGS_SAGA_MODEL_NS, 'applicationTags']) || [],
      tagOrders: _.get(state, [TAG_ORDER_SAGA_MODEL_NS, 'tagOrders']) || []
    }
  })
)(({ myForwardedRef, ...props }) => <AppTagTree0 ref={myForwardedRef} {...props} />)

export default forwardRef((props, ref) => <MyConnectedComponent {...props} myForwardedRef={ref} />)
