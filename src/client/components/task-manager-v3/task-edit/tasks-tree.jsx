import React from 'react'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  EditOutlined,
  FileAddOutlined,
  FolderAddOutlined,
  DownOutlined
} from '@ant-design/icons'



import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'

import { Tree, Tooltip, message, Input, Modal, Popconfirm, Button } from 'antd';
import _ from 'lodash'
import { groupBy } from '../../../../common/sugo-utils'
import SugoIcon from '../../Common/sugo-icon'
import smartSearch from '../../../../common/smart-search'
import {
  treeFilter,
  TASK_EDIT_TABS_TYPE,
  recurFlatten,
  treeNode2KeyStr
} from '../constants'
import { makeTreeNode } from '../constants'
import { withCommonFilter } from '../../Common/common-filter'


const FormItem = Form.Item

@withCommonFilter
@Form.create()
export default class TaskCategoryTree extends React.Component {

  oriTreeData = []
  cancelEditOrder = () => {
    // let treeData = makeTreeNode(this.props.taskTreeInfo)
    this.props.changeState({ editingOrder: false, categoryData: this.oriTreeData })
  }

  cancelEditOrder = () => {
    const { groupTreeInfo, treeInfo } = this.props
    let categoryData = makeTreeNode(treeInfo)
    let groupCategoryData = makeTreeNode(groupTreeInfo)
    this.props.changeState({ editingOrder: false, categoryData, groupCategoryData })
  }

  saveOrder = () => {
    const { treeData } = this.props
    let sortInfo = this.genSortInfo(treeData)
    this.props.saveOrder(sortInfo)
    this.props.changeState({ editingOrder: false })
  }

  genSortInfo = (treeData) => {
    let flattedTree = recurFlatten(treeData)
    let sortInfo = {
      order: groupBy(flattedTree, n => n.parentKey && n.parentKey || -1, arr => arr.map(n => n.key)),
      type: groupBy(flattedTree.filter(n => !_.startsWith(n.key, 'type-')),
        n => n.parentKey && n.parentKey.substr(5) || 0,
        arr => arr.map(n => n.key)),
      tree: groupBy(flattedTree.filter(n => _.startsWith(n.key, 'type-')),
        n => n.parentKey && n.parentKey.substr(5) || 0,
        arr => arr.map(treeNode2KeyStr))
    }
    return sortInfo
  }

  renderTopButton = () => {
    let { editingOrder, onAdd, isFlowDes = false, isTaskGroup, disabled = true } = this.props
    if (isFlowDes || disabled) {
      return null
    }
    if (editingOrder) {
      return [
        <Tooltip title="取消设置排序" key="cancel">
          <CloseCircleOutlined className="font16 pointer mg2r" onClick={this.cancelEditOrder} />
        </Tooltip>,
        <Tooltip
          key="save"
          visible
          placement="rightTop"
          title={`可拖拽${isTaskGroup ? '工作流组' : '工作流'}进行排序，点击保存操作`}
        >
          <CheckCircleOutlined className="font16 pointer" onClick={this.saveOrder} />
        </Tooltip>
      ]
    }
    return [
      <Tooltip title={isTaskGroup ? '新增工作流组分类' : '新增工作流分类'} key="add_group">
        <FolderAddOutlined
          className="pointer font16 mg2r"
          onClick={() => {
            this.props.changeState({ isShowCategoryModal: true, editCategoryId: '', editCategoryTitle: '' })
          }} />
      </Tooltip>,
      <Tooltip title={isTaskGroup ? '新增工作流组' : '新增工作流'} key="add">
        <FileAddOutlined className="pointer font16 mg2r" onClick={() => { onAdd() }} />
      </Tooltip>,
      <Tooltip title="设置排序" key="order">
        <SugoIcon
          type="sugo-task-category-sort"
          className="pointer font16"
          onClick={() => {
            this.oriTreeData = _.cloneDeep(this.props.treeData)
            this.props.changeState({ editingOrder: true })
          }}
        />
      </Tooltip>
    ]
  }

  editTaskCategory = () => {
    const { form: { validateFields }, editCategoryId, treeData } = this.props
    validateFields((err, value) => {
      if (err) {
        return
      }
      const { title } = value
      if ((treeData.filter(o => o.title === title && _.startsWith(o.key, 'type-'))).length) return message.warn('分类名重复')
      const params = { id: editCategoryId, ...value }
      this.props.editTaskCategory(params)
      this.props.changeState({ editCategoryTitle: '' })
    })
  }

  renderEditTypeModal = () => {
    const { editCategoryId, form: { getFieldDecorator }, isShowCategoryModal, editCategoryTitle, isTaskGroup } = this.props
    return (
      isShowCategoryModal && (
        <Modal
          maskClosable={false}
          title={editCategoryId ? (isTaskGroup ? '编辑工作流组分类' : '编辑工作流分类名称') : (isTaskGroup ? '新增工作流组分类' : '新增工作流分类')}
          wrapClassName="vertical-center-modal"
          visible={isShowCategoryModal}
          onOk={this.editTaskCategory}
          onCancel={() => { this.props.changeState({ isShowCategoryModal: false, editCategoryTitle: '', editCategoryId: '' }) }}
        >
          <Form onSubmit={this.handleSubmit} >
            <FormItem
              label="分类名称"
              hasFeedback
              labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}
            >
              {getFieldDecorator('title', {
                rules: [{
                  required: true, message: '分类名称必填!'
                }, {
                  pattern: /^[\u4e00-\u9fa5_a-zA-Z0-9]+$/g,
                  message: '只能是数字、字母和中文组成!'
                }, {
                  max: 60,
                  message: '不应超过60个字符'
                }],
                initialValue: editCategoryId ? editCategoryTitle : ''
              })(
                <Input placeholder="请输入分类名称" />
              )}
            </FormItem>
          </Form>
        </Modal>
      )
    )
  }

  renderEmptyHint = () => {
    return <div key="noData" className="aligncenter pd3y">暂无内容，请先创建</div>
  }

  renderTree = () => {
    let { searching, treeData, editingOrder, selectCategory } = this.props
    let filteredTreeData = treeFilter(treeData, n => smartSearch(searching, n.title))
    return _.isEmpty(filteredTreeData)
      ? this.renderEmptyHint()
      : (
        <Tree
          title="treeData"
          key="tree"
          showIcon
          switcherIcon={<DownOutlined />}
          defaultExpandedKeys={[`type-${selectCategory}`]}
          defaultSelectedKeys={[`type-${selectCategory}`]}
          // onExpand={this.onExpand}
          draggable={editingOrder}
          onDrop={this.onDrop}
          onSelect={this.onSelectTask}
        >
          {this.renderTreeNodes(filteredTreeData)}
        </Tree>
      )
  }

  onSelectTask = (taskId, k) => {
    if (this.props.isFlowDes) return
    const select = _.get(k, 'node.props.dataRef.key', '')
    if (_.startsWith(select, 'type-')) {
      this.props.changeState({ selectCategory: select.substr(5) })
      return
    }
    const selectParent = _.get(k, 'node.props.dataRef.parentKey', '')
    this.props.changeState({ selectCategory: selectParent ? selectParent.substr(5) : '' })
    const { taskList } = this.props
    const selectTask = taskList.find(item => item.id === taskId[0]) || {}
    const { id, showName, type } = selectTask
    this.props.onSelect(id, showName, TASK_EDIT_TABS_TYPE.task)
  }

  renderTreeNodes = (treeData) => {
    const { deleteCategory, isFlowDes = false, editTaskInfo = {}, taskList = [], graphInfo, disabled } = this.props
    return treeData.map(node => {
      const params = {}
      if (isFlowDes && !_.startsWith(node.key, 'type-')) {
        const taskInfo = taskList.find(p => p.id === node.id)
        const taskGroupId = _.get(taskInfo, 'task_group_id', '') || ''
        const canAdd = isFlowDes
          && (!editTaskInfo.status || editTaskInfo.status === '0')
          && (!taskGroupId || taskGroupId === editTaskInfo.id)
          && !_.some(graphInfo.graph, p => p['proxy.job.id'] === node.id)
          && _.get(node, 'status', '0') === '0'
        if (canAdd) {
          params.draggable = true
          params.onDragStart = ev => {
            ev.dataTransfer.setData('text', `computationNode-${node.key}`)
          }
        } else {
          params.disabled = true
        }
      }
      if (_.startsWith(node.key, 'type-')) {
        const title = isFlowDes || disabled
          ? (<div className="edit-tree-icon width-100 itblock"><div className="elli itblock task-tree-title ">{node.title}</div></div>)
          : (
            <div className="edit-tree-icon width-100 itblock">
              <div className="elli itblock task-tree-title ">{node.title}</div>
              <EditOutlined
                key="editIcon"
                className="pointer font14 iblock color-blue"
                style={{ marginLeft: '10px' }}
                onClick={() => {
                  this.props.changeState({ editCategoryId: node.id, editCategoryTitle: node.title, isShowCategoryModal: true })
                }} />
              <Popconfirm
                title={'确定删除该分类？'}
                onConfirm={() => deleteCategory(node.id, node.children.length)}
                okText="确定"
                cancelText="取消"
              >
                <CloseOutlined
                  key="closeIcon"
                  className="pointer font14 iblock color-disable"
                  style={{ marginLeft: '10px' }} />
              </Popconfirm>
            </div>
          )

        return (
          <Tree.TreeNode
            // icon={node.children.length === 0 ? typeExpandedIcon : typeIcon}
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
          icon={<SugoIcon type="sugo-workflow" />}
          {...node}
          dataRef={node}
          disabled={params.disabled || (isFlowDes && disabled) || false}
          title={<div className="elli itblock task-tree-title" {...params}>{node.title}</div>}
        />)
    })
  }

  onDrop = (info) => {
    const { isTaskGroup } = this.props
    const dropKey = info.node.props.eventKey
    const dragKey = info.dragNode.props.eventKey
    const dropPos = info.node.props.pos.split('-')
    const olDdropPos = info.dragNode.props.pos.split('-')
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1])

    // diff: only allow drag to type
    if (!_.startsWith(dropKey, 'type-') && !info.dropToGap) {
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
    if (isTaskGroup) {
      this.props.changeState({ groupCategoryData: data })
    } else {
      this.props.changeState({ categoryData: data })
    }
  }

  onClickWhite = (e) => {
    if (this.props.isFlowDes) return
    if (_.startsWith(e.target.innerHTML, '<div class=')) {
      return this.props.changeState({ selectCategory: '' })
    }
    return
  }

  render() {
    const { isTaskGroup, className, editingOrder, keywordInput, isFlowDes } = this.props
    const Search = keywordInput
    return (
      <div className="tasks-tree">
        <div className={`task-schedule-tree corner overscroll-y always-display-scrollbar height-100 ${className} task-v3-category-tree `} onClick={this.onClickWhite} >
          <div className="line-height44 pd2x alignright" key="title">
            <span className="fleft">{isTaskGroup ? (isFlowDes ? '' : '工作流组分类') : '工作流分类'}</span>
            {this.renderTopButton()}
          </div>
          <Search className="tree-search-box pd1x mg1b"  placeholder="搜索..." disabled={editingOrder} key="search" />
          {this.renderTree()}
          {this.renderEditTypeModal()}
        </div>
      </div>
    )
  }
}
