import React from 'react'

import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';

import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';

import { Tree, Tooltip, message, Input, Modal } from 'antd';
import _ from 'lodash'
import { dictBy, groupBy } from '../../../common/sugo-utils'
import { withCommonFilter } from '../Common/common-filter'
import smartSearch from '../../../common/smart-search'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import taskTreeModel, { namespace } from './store/tree-model'
import { connect } from 'react-redux'
import './css.styl'
import { validateFields } from '../../common/decorators'
import {
  TASK_ACTION_TYPE,
  TASK_TREE_TYPE,
  treeFilter,
  getTypeKeysByKey,
  makeTreeNode,
  recurFindPathNodeKeys,
  recurFlatten,
  treeNode2KeyStr,
  treeNodeKeyStr,
  getTreeTypeId,
  getRootNodeActionTypeByKey,
  validInputName
} from './constants'
import SugoIcon from '../Common/sugo-icon'

const FormItem = Form.Item

const typeIcon = <SugoIcon className="font16" type="sugo-task-category" />
const typeExpandedIcon = <SugoIcon className="font16" type="sugo-task-category" />
const taskIcon = <SugoIcon className="font14" type="sugo-task-table" />

@withRuntimeSagaModel(taskTreeModel)
@connect(props => {
  if (props[`${namespace}_${TASK_TREE_TYPE.dataDevelop.name}`]) {
    return {
      ...props[`${namespace}_${TASK_TREE_TYPE.dataDevelop.name}`],
      treeNamespace: `${namespace}_${TASK_TREE_TYPE.dataDevelop.name}`
    }
  }
  if (props[`${namespace}_${TASK_TREE_TYPE.executionHandle.name}`]) {
    return {
      ...props[`${namespace}_${TASK_TREE_TYPE.executionHandle.name}`],
      treeNamespace: `${namespace}_${TASK_TREE_TYPE.executionHandle.name}`
    }
  }
  if (props[`${namespace}_${TASK_TREE_TYPE.scheduleHandle.name}`]) {
    return {
      ...props[`${namespace}_${TASK_TREE_TYPE.scheduleHandle.name}`],
      treeNamespace: `${namespace}_${TASK_TREE_TYPE.scheduleHandle.name}`
    }
  }
})
@withCommonFilter
@Form.create()
@validateFields
export default class TaskTree extends React.Component {

  componentDidMount () {
    let { innerRef } = this.props
    if (_.isFunction(innerRef)) {
      innerRef(this)
    }
  }

  changeState = payload => {
    const { treeNamespace } = this.props
    this.props.dispatch({
      type: `${treeNamespace}/changeState`,
      payload
    })
  }

  getSelectTypeChlidList = (selectedKeys) => {
    if (!selectedKeys.length) {
      return
    }
    let { taskTreeInfo } = this.props
    const selectKey = selectedKeys[0]
    let listData = []
    let actionType = ''
    if (!_.startsWith(selectKey, 'type-')) {
      listData = taskTreeInfo.tasks.filter(p => p.id.toString() === selectKey)
      actionType = getRootNodeActionTypeByKey(selectKey, taskTreeInfo.types, taskTreeInfo.tasks, false)
      this.changeState({ listData, selectedKeys, isDataCollect: actionType == TASK_ACTION_TYPE.dataCollection, taskActionType: actionType })
    } else {
      const keys = getTypeKeysByKey([treeNodeKeyStr(selectKey)], taskTreeInfo.types)
      listData = taskTreeInfo.tasks.filter(p => keys.includes(p.typeId.toString()))
      actionType = getRootNodeActionTypeByKey(treeNodeKeyStr(selectKey), taskTreeInfo.types, taskTreeInfo.tasks, true)
      this.changeState({ listData, selectedKeys, isDataCollect: actionType == TASK_ACTION_TYPE.dataCollection, taskActionType: actionType })
    }
  }

  expandToSeeNode = (selectedKey) => {
    let { expandedKeys, treeData } = this.props
    let allParentIds = recurFindPathNodeKeys(treeData, selectedKey).filter(k => k !== selectedKey)
    this.changeState({ expandedKeys: _.uniq([...expandedKeys, ...allParentIds]) })
  }

  // 代码来源 antd Tree 拖动示例 https://ant.design/components/tree-cn/
  onDrop = (info) => {
    const dropKey = info.node.props.eventKey
    const dragKey = info.dragNode.props.eventKey
    const dropPos = info.node.props.pos.split('-')
    const olDdropPos = info.dragNode.props.pos.split('-')
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1])
    // diff: only allow drag to type
    if (dropPos.length < 3 || olDdropPos[1] !== dropPos[1] || (!info.dropToGap && !_.startsWith(dropKey, 'type-'))) {
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
    const data = [...this.props.treeData]
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
      loop(data, dropKey, (item) => {
        item.children = item.children || []
        // where to insert 示例添加到尾部，可以是随意位置
        item.children.push(dragObj)
        dragObj.parentKey = item.key // diff: set parent
      })
    }
    this.changeState({ treeData: data })
  }

  renderTreeNodes = (treeData) => {
    let { expandedKeys, treeNamespace } = this.props
    return treeData.map(node => {
      if (_.startsWith(node.key, 'type-')) {
        const title = (<div className="edit-tree-icon width-100 itblock">
          <div className="elli itblock task-tree-title">{node.title}
          </div>
          {
            node.parentKey ? [<EditOutlined
              key='editIcon'
              className="pointer font14 iblock color-blue"
              style={{ marginLeft: '5px' }}
              onClick={() => {
                this.changeState({ selectTypeKey: node.key, showEditType: true })
              }} />,
            <CloseOutlined
              key='closeIcon'
              className="pointer font14 iblock color-disable"
              style={{ marginLeft: '20px' }}
              onClick={() => {
                this.props.dispatch({
                  type: `${treeNamespace}/deleteType`,
                  payload: { id: treeNodeKeyStr(node.key) }
                })
              }}
            />]
              : null
          }
        </div>)
        return (
          <Tree.TreeNode
            icon={_.includes(expandedKeys, node.key) ? typeExpandedIcon : typeIcon}
            {...node}
            dataRef={node}
            title={title}
          >
            {this.renderTreeNodes(node.children)}
          </Tree.TreeNode>
        )
      }
      return (
        <Tree.TreeNode
          key={node.id}
          icon={taskIcon}
          {...node}
          dataRef={node}
          title={<div className="elli itblock task-tree-title">{node.title}</div>}
        />
      )
    });
  }

  cancelEditOrder = () => {
    let treeData = makeTreeNode(this.props.taskTreeInfo)
    this.changeState({ treeData: treeData, editingOrder: false })
  }

  genSortInfo = (treeData) => {
    let flattedTree = recurFlatten(treeData)
    let taskNameIdDict = dictBy(_.get(this.props, 'treeInfo[0].tasks'), t => t.id, t => t.name)
    let sortInfo = {
      order: groupBy(flattedTree, n => n.parentKey && n.parentKey || -1, arr => arr.map(n => n.key)),
      type: groupBy(flattedTree.filter(n => !_.startsWith(n.key, 'type-')),
        n => n.parentKey && n.parentKey.substr(5) || 0,
        arr => arr.map(n => ({ projectId: n.key, projectName: taskNameIdDict[n.key] }))),
      tree: groupBy(flattedTree.filter(n => _.startsWith(n.key, 'type-')),
        n => n.parentKey && n.parentKey.substr(5) || 0,
        arr => arr.map(treeNode2KeyStr))
    }
    return sortInfo
  }

  onExpand = (expandedKeys, { expanded, node }) => {
    this.changeState({ expandedKeys })
  }

  saveOrder = async () => {
    const { treeNamespace, treeData } = this.props
    let sortInfo = this.genSortInfo(treeData)
    this.props.dispatch({
      type: `${treeNamespace}/saveOrder`,
      payload: { sortInfo }
    })
  }

  renderEmptyHint = () => {
    return <div key="noData" className="aligncenter pd3y">暂无内容，请先创建</div>
  }

  renderTopButton = () => {
    let { setCurrentSearching, editingOrder, selectedKeys, taskTreeType } = this.props
    if (editingOrder) {
      return [
        <Tooltip title="取消设置排序" key="cancel">
          <CloseCircleOutlined className="font16 pointer mg2r" onClick={this.cancelEditOrder} />
        </Tooltip>,
        <Tooltip
          key="save"
          visible
          placement="rightTop"
          title="可拖拽节点进行排序，点击保存操作"
        >
          <CheckCircleOutlined className="font16 pointer" onClick={this.saveOrder} />
        </Tooltip>
      ];
    }
    return taskTreeType === TASK_TREE_TYPE.dataDevelop.name ? [
      <Tooltip title="新增分类" key="add">
        <PlusOutlined
          className="pointer font16 mg1r"
          onClick={() => {
            if (!selectedKeys.length) {
              message.error('请先选择任务分类节点!')
              return
            }
            this.changeState({ selectTypeKey: '', showEditType: true })
          }} />
      </Tooltip>,
      <Tooltip title="设置任务排序" key="order">
        <SugoIcon
          type="sugo-task-category-sort"
          className="pointer font16"
          onClick={() => {
            setCurrentSearching('')
            this.changeState({ editingOrder: true })
          }}
        />
      </Tooltip>
    ] : null;
  }

  renderTree = () => {
    let { searching, treeData, editingOrder, expandedKeys, selectedKeys } = this.props
    let filteredTreeData = treeFilter(treeData, n => smartSearch(searching, n.title))
    return _.isEmpty(filteredTreeData)
      ? this.renderEmptyHint()
      : (
        <Tree
          title="treeData"
          key="tree"
          showIcon
          expandedKeys={expandedKeys}
          selectedKeys={selectedKeys}
          onExpand={this.onExpand}
          draggable={editingOrder}
          onDrop={this.onDrop}
          onSelect={this.getSelectTypeChlidList}
        >
          {this.renderTreeNodes(filteredTreeData)}
        </Tree>
      )
  }

  ok = async () => {
    const { selectedKeys, selectTypeKey, taskTreeInfo, treeNamespace } = this.props
    const values = await this.validateFields()
    if (!values) return
    const parentId = selectTypeKey ? taskTreeInfo.types.find(p => `type-${p.id}` === selectTypeKey).parentId : treeNodeKeyStr(_.get(selectedKeys, '0', ''))
    this.props.dispatch({
      type: `${treeNamespace}/editTypeName`,
      payload: { id: treeNodeKeyStr(selectTypeKey), name: values.name, parentId }
    })
    this.props.form.resetFields()
  }

  cancel = () => {
    this.changeState({ showEditType: false })
    this.props.form.resetFields()
  }

  renderEditTypeModal = () => {
    let { form: { getFieldDecorator }, showEditType, selectTypeKey, taskTreeInfo } = this.props
    return (<Modal
      maskClosable={false}
      title={selectTypeKey ? '编辑分类名称' : '新增分类'}
      wrapClassName="vertical-center-modal"
      visible={showEditType}
      onOk={this.ok}
      onCancel={this.cancel}
    >
      <Form onSubmit={this.handleSubmit}>
        <FormItem
          label="分类名称"
          hasFeedback
        >
          {getFieldDecorator('name', {
            rules: [{
              required: true, message: '分类名称必填!'
            },
            ...validInputName],
            initialValue: selectTypeKey ? taskTreeInfo.types.find(p => `type-${p.id}` === selectTypeKey).name : ''
          })(
            <Input />
          )}
        </FormItem>
      </Form>
    </Modal>)
  }

  render () {
    let { keywordInput, editingOrder } = this.props
    let Search = keywordInput
    return (<div className="task-schedule-tree corner overscroll-y always-display-scrollbar" >
      <div className="line-height44 pd2x alignright" key="title">
        <span className="fleft">任务分类</span>
        {this.renderTopButton()}
      </div>
      <Search className="tree-search-box pd1x" placeholder="搜索..." key="search" disabled={editingOrder} />
      {this.renderTree()}
      {this.renderEditTypeModal()}
    </div>)
  }
}
