import React from 'react'
import PropTypes from 'prop-types'

import {
  AppstoreOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SettingOutlined,
  TagOutlined,
  TagsOutlined,
} from '@ant-design/icons';

import { Affix, Input, Tooltip, Tree, Divider } from 'antd';
import _ from 'lodash'
import { findTreeNode } from './store/utils'
import { KEY_NONE_TYPE } from 'common/constants'
import { Auth } from 'client/common/permission-control'
import classnames from 'classnames'

const typeIcon = <AppstoreOutlined className="font12" />

/**
 * @description 标签体系分类树组件
 * @export
 * @class TagTypeTree
 * @extends {React.Component}
 */
export default class TagTypeTree extends React.Component {

  static propTypes = {
    treeData: PropTypes.array.isRequired,
    onSelect: PropTypes.func,
    onExpand: PropTypes.func
  }

  static defaultProps = {
    onSelect: _.noop
  }

  constructor(props) {
    super(props)
    this.state = {
      expandedKeys: [],
      searchValue: '',
      // autoExpandParent: true,
      draggable: false
    }
  }

  // onSearch = (e) => {
  //   const value = e.target.value
  //   const { treeList } = this.state
  //   const expandedKeys = treeList.map(item => {
  //     if (item.name.indexOf(value) > -1) {
  //       return getParentKey(value, treeList)
  //     }
  //     return null
  //   }).filter((item, i, self) => item && self.indexOf(item) === i)
  //   this.setState({
  //     expandedKeys,
  //     searchValue: value,
  //     autoExpandParent: true
  //   })
  // }

  onSelect = (selectedKeys, e) => {
    if (_.isFunction(this.props.onSelect)) {
      //e:{selected: bool, selectedNodes, node, event}
      this.props.onSelect(selectedKeys, e)
    }
  }

  onExpand = (expandedKeys, e) => {
    this.props.setState({
      expandedKeys
      // autoExpandParent: false
    })
    if (_.isFunction(this.props.onExpand)) {
      // e: { expanded, node }
      this.props.onExpand(expandedKeys, e)
    }
  }

  // 进入调整模式，可拖拽分类节点
  setOrder = () => {
    this.setState({
      oldTreeData: _.defaultsDeep(this.props.treeData),
      draggable: true
    })
  }

  // 取消分类排序调整
  cancelOrder = () => {
    this.setState({
      draggable: false
    })
    this.props.setState({
      treeData: [...this.state.oldTreeData]
    })
  }

  saveOrder = async () => {
    const { project: { datasource_id }, saveOrder } = this.props
    const { modifyData } = this.state
    this.setState({
      draggable: false
    })
    await saveOrder(datasource_id, modifyData)
  }

  // info => {event, node, dragNode, dragNodesKeys}
  onDrop = (eventInfo) => {
    const { node, dragNode } = eventInfo
    const { props: { eventKey: dropKey, pos, isTagDimension, dataRef } } = node
    const isDimensionDragToRoot = dragNode.props.isTagDimension && !node.props.dragOver && /^0-[0-9]$/.test(pos)
    const isDragToDimension = isTagDimension && node.props.dragOver
    const isDragToUnTyped = isTagDimension ? !dragNode.props.isTagDimension && dataRef.treeId === KEY_NONE_TYPE : !dragNode.props.isTagDimension && dropKey === KEY_NONE_TYPE
    // 1. isDragToDimension: 标签维度节点不能有子子节点
    // 2. isDimensionDragToRoot: 标签维度节点不能拖拽到第一级节点
    // 3. isDragToUnTyped: 标签分类拖动到未分类节点下
    if (isDragToDimension || isDimensionDragToRoot || isDragToUnTyped) {
      return
    }
    // console.log(eventInfo)
    const { props: { eventKey: dragKey } } = dragNode
    const dropPos = pos.split('-')
    const dropPosition = eventInfo.dropPosition - Number(dropPos[dropPos.length - 1])
    const treeData = _.cloneDeep(this.props.treeData)
    let dragObj
    findTreeNode(treeData, dragKey, (item, index, arr) => {
      arr.splice(index, 1)
      dragObj = item
    })
    if (eventInfo.dropToGap) {
      let resArr
      let idx
      findTreeNode(treeData, dropKey, (item, index, arr) => {
        resArr = arr
        idx = index
      })
      if (dropPosition === -1) {
        resArr.splice(idx, 0, dragObj)
      } else {
        resArr.splice(idx + 1, 0, dragObj)
      }
    } else {
      findTreeNode(treeData, dropKey, (item) => {
        item.children = item.children || []
        // where to insert 示例添加到尾部，可以是随意位置
        item.children.push(dragObj)
      })
    }
    const diffTreeData = _.differenceWith(treeData, this.state.oldTreeData, _.isEqual)
    const loop = (list, callbak) => {
      _.each(list, (item, idx) => {
        if (item.children && item.children.length > 0) {
          loop(item.children, callbak)
        }
        callbak(item, idx, list)
      })
    }
    let tagsOrder = {}    // 调整后的顺序数据结构
    let tagTypes = {}      // 调整了分类的标签维度
    let tagTypeTrees = {}  // 调整了分类的标签分类
    // 构建根节点顺序
    tagsOrder['-1'] = treeData.map(t => t.treeId)
    // 调整前的根节点id集合
    const oldRootParentIds = this.state.oldTreeData.map(o => o.treeId)
    _.each(diffTreeData, item => {
      if (!_.includes(oldRootParentIds, item.treeId) && item.id) {
        tagTypeTrees['-1'] = tagTypeTrees['-1'] || []
        tagTypeTrees['-1'].push(item.id)
      }
    })
    loop(diffTreeData, item => {
      const isTagDimension = _.has(item, 'is_druid_dimension')
      // 1.构建排序数据结构
      if (!isTagDimension && item.children && item.children.length > 1) {
        const key = item.treeId
        tagsOrder[key] = item.children.map(o => _.has(o, 'is_druid_dimension') || _.get(o, 'nodeType') === 'tagGroup' ? o.id : o.treeId)
      }
      // 2.构建修改了分类的标签维度数据结构
      if (item.children) {
        const parentId = item.treeId
        _.each(item.children, child => {
          const isDim = _.has(child, 'is_druid_dimension')
          const isTagGroup = _.get(child, 'nodeType', '') === 'tagGroup'
          if (isDim) { // 标签维度节点
            const oldParentId = child.treeId
            if (oldParentId && parentId !== oldParentId) { // 标签维度调整了分类
              tagTypes[parentId] = tagTypes[parentId] || []
              tagTypes[parentId].push({
                dimension_id: child.id,
                type: (child.title || child.name)
              })
            }
          } else if(isTagGroup) {
            tagTypes[parentId] = tagTypes[parentId] || []
            tagTypes[parentId].push({
              dimension_id: child.id,
              type: (child.title || child.name)
            })
          } else {   // 标签分类节点
            const curIdx = _.findIndex(child.treeIds, id => id === child.treeId)
            const pIdx = child.treeIds.length === 1 ? 0 : curIdx - 1
            const oldParentId = child.treeIds[pIdx]
            if (oldParentId && parentId !== oldParentId) {
              tagTypeTrees[parentId] = tagTypeTrees[parentId] || []
              tagTypeTrees[parentId].push(child.id)
            }
          }
        }) // end each children
      } // end if
    })
    this.setState({
      modifyData: {
        tagsOrder,
        tagTypes,
        tagTypeTrees
      }
    })
    this.props.setState({
      treeData
    })
  }

  renderTreeNodes = (treeData) => {
    // const { searchValue } = this.state
    return (treeData || []).map(item => {
      // const index = item.name.indexOf(searchValue)
      // const beforeStr = item.name.substr(0, index)
      // const afterStr = item.name.substr(index + searchValue.length)
      // const title = index > -1 ? (
      //   <span>
      //     {beforeStr}
      //     <span style={{ color: '#f50' }}>{searchValue}</span>
      //     {afterStr}
      //   </span>
      // ) : <span>{item.name}</span>
      const isTagDimension = _.has(item, 'is_druid_dimension')
      const isTagGroup = _.get(item, 'nodeType', '') === 'tagGroup'
      const isLeaf = isTagDimension || isTagGroup
      const isUsingTag = isTagGroup ?  _.get(item,'status') : _.get(item,'params.isUsingTag')
      const tagIcon =  (
        isTagGroup ?
          <TagsOutlined className={classnames('font16 mg1t', {'color-bf': isUsingTag === 0})} />
          :
          <TagOutlined className={classnames('font14', {'color-bf': isUsingTag === false})} />
      )
      let icon = !isLeaf ? typeIcon : tagIcon
      const id = isLeaf ? item.id : item.treeId
      const title = isLeaf ? (
        <span className={classnames({'color-bf': isUsingTag === 0 || isUsingTag === false})}>
          {(item.title || item.name)}
        </span>
      ) : item.type
      item = {
        id,
        name: title,
        isTagDimension,
        ...item
      }
      const props = {
        key: item.id,
        title,
        icon,
        isTagDimension,
        isLeaf
      }
      if (item.children) {
        return (
          <Tree.TreeNode
            {...props}
            title={
              <Tooltip
                title={props.title}
                placement="right"
              >{props.title}</Tooltip>
            }
            dataRef={item}
          >
            {this.renderTreeNodes(item.children)}
          </Tree.TreeNode>
        )
      }
      return (
        // eslint-disable-next-line react/jsx-key
        <Tree.TreeNode
          {...props}
          title={
            <Tooltip
              title={props.title}
              placement="right"
            >{props.title}</Tooltip>
          }
          dataRef={item}
        />)
    });
  }

  recurGetAllTypeId = (treeData) => {
    return _.flatMap(treeData, typeOrTag => {
      return ('children' in typeOrTag) ? [typeOrTag.treeId, ...this.recurGetAllTypeId(typeOrTag.children)] : []
    })
  }

  render() {
    const { treeContainer, treeData, defaultExpandedKeys, expandedKeys, defaultSelectedKeys, selectedKeys } = this.props
    const { draggable } = this.state
    const saveOrderButtons = (
      <div>
        <Tooltip title="点击取消操作">
          <CloseCircleOutlined className="font16 pointer mg2r" onClick={this.cancelOrder} />
        </Tooltip>
        <Tooltip
          visible
          placement="rightTop"
          title={[
            <div key="div-tp1">可拖拽节点进行排序或修改标签分类</div>,
            <div key="div-tp2">点击保存操作</div>
          ]}
        >
          <CheckCircleOutlined className="font16 pointer" onClick={this.saveOrder} />
        </Tooltip>
      </div>
    )
    const settingButtons = (
      <Tooltip title="设置标签分类顺序">
        <SettingOutlined onClick={this.setOrder} className="font16 pointer" />
      </Tooltip>
    )
    return (
      <div>
        <Affix target={() => treeContainer}>
          <div className="bg-white">
            <div className="tag-types-title pd2t pd1b pd2x">
              <div className="fix">
                <div className="fleft">标签分类</div>
                <div className="fright">
                  <Auth auth="app/tag-type-tree/save-order">
                    {draggable ? saveOrderButtons : settingButtons}
                  </Auth>
                </div>
              </div>
            </div>
            <Divider key="divider-b" className="mg1"/>
            {/*
            <Input.Search key="search-ipt" className="pd1" style={{ width: 225 }} onChange={this.onSearch} placeholder="搜索" />
            <Divider key="divider-md" dashed className="mg1" />
            */}
          </div>
        </Affix>
        <Tree
          showIcon
          // autoExpandParent={autoExpandParent}
          expandedKeys={expandedKeys}
          selectedKeys={selectedKeys}
          defaultExpandedKeys={defaultExpandedKeys}
          defaultSelectedKeys={defaultSelectedKeys}
          // loadData={this.onLoadData}
          loadedKeys={this.recurGetAllTypeId(treeData)} // hack rc-tree 死循环 bug
          onSelect={this.onSelect}
          onExpand={this.onExpand}
          draggable={draggable}
          onDrop={draggable ? this.onDrop : _.noop}
        >
          {this.renderTreeNodes(treeData)}
        </Tree>
      </div>
    )
  }
}
