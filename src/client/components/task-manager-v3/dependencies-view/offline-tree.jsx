import React from 'react'
import { SearchOutlined, DownOutlined } from '@ant-design/icons'
import { DISPLAY_TASK_MODEL, DISPLAY_TASK_MODEL_TRANSLATE } from '../constants'
import '@ant-design/compatible/assets/index.css'
import { Tree, Input, Menu } from 'antd'
import _ from 'lodash'
import { connect } from 'react-redux'

import SugoIcon from '../../Common/sugo-icon'
import smartSearch from '../../../../common/smart-search'
import { treeFilter } from '../constants'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import taskV3CategoryTreeModel, { namespace } from './offline-model'
import { FLOW_INCON_MAP } from '../constants'

const { SubMenu } = Menu

@withRuntimeSagaModel(taskV3CategoryTreeModel)
@connect(props => {
  return {
    ...props[namespace]
  }
})
export default class TaskCategoryTree extends React.Component {
  state = {
    categoryKeyWord: '', //工作流搜索的关键字
    categoryGroupKeyWord: '', //工作流组搜索的关键字
    selectType: DISPLAY_TASK_MODEL.offLineTask,
    selectKey: '' // 高亮显示当前选中工作流
  }

  componentDidUpdate(prevProps) {
    const { taskProjectId, taskGroupList, taskList, onLoaded } = this.props
    if (taskProjectId && taskProjectId !== prevProps.taskProjectId) {
      this.props.dispatch({
        type: `${namespace}/getCategory`,
        payload: { taskProjectId, offLineTaskList: taskList, projectType: DISPLAY_TASK_MODEL.offLineTask },
        callback: onLoaded()
      })
      this.props.dispatch({
        type: `${namespace}/getGroupCategory`,
        payload: { taskProjectId, offLineTaskGroupList: taskGroupList }
      })
      this.setState({ selectKey: '' })
    }
  }

  changeState = obj => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload: obj
    })
  }

  renderEmptyHint = () => {
    return (
      <div key='noData' className='aligncenter pd3y'>
        暂无内容，请先创建
      </div>
    )
  }

  /**
   * 搜索功能
   */
  changeSearchKey = _.debounce((val, type) => {
    if (type === DISPLAY_TASK_MODEL.offLineTask) {
      this.setState({ categoryKeyWord: val })
      return
    }
    this.setState({ categoryGroupKeyWord: val })
  }, 300)

  // 树状结构的节点的渲染
  renderTreeNodes = (treeData, type) => {
    const { isFlowDes = false, disabled } = this.props
    return treeData.map(node => {
      // 分类的
      if (_.startsWith(node.key, 'type-')) {
        const title =
          isFlowDes || disabled ? (
            <div className='edit-tree-icon width-100 itblock'>
              <div className='elli itblock task-tree-title'>{node.title}</div>
            </div>
          ) : (
            <div className='edit-tree-icon width-100 itblock'>
              <div className='elli itblock task-tree-title'>{node.title}</div>
            </div>
          )
        return (
          <Tree.TreeNode {...node} isLeaf={false} dataRef={node} title={title}>
            {this.renderTreeNodes(node.children, type)}
          </Tree.TreeNode>
        )
      }
      return (
        <Tree.TreeNode
          key={node.id}
          icon={<SugoIcon type={FLOW_INCON_MAP[type]} />}
          {...node}
          dataRef={node}
          title={
            <div className='edit-tree-icon'>
              <div className='elli itblock task-tree-title'>{node.title} </div>
            </div>
          }
        />
      )
    })
  }

  // 渲染树状结构体，type为传入的类型，代表工作流还是工作流组，
  //将数据转化为tree数据的操作在model中
  renderTree = type => {
    const { offLineTask } = DISPLAY_TASK_MODEL
    const { categoryKeyWord, categoryGroupKeyWord, selectKey } = this.state
    let { groupCategoryData, categoryData, expandedKeys, groupExpandedKeys } = this.props
    let treeData = type === offLineTask ? categoryData : groupCategoryData
    const searchingcate = type === offLineTask ? categoryKeyWord : categoryGroupKeyWord
    // 如果是当前操作的类型，则进行筛选
    treeData = treeFilter(treeData, n => smartSearch(searchingcate, n.title))
    return _.isEmpty(treeData) ? (
      this.renderEmptyHint()
    ) : (
      <Tree
        selectedKeys={[selectKey]}
        title='treeData'
        key={`tree-key-${type}`}
        switcherIcon={<DownOutlined />}
        showIcon
        expandedKeys={type === DISPLAY_TASK_MODEL.offLineTaskGroup ? groupExpandedKeys : expandedKeys}
        onExpand={(expandedKeys, { node }) => this.handlerExpanded(type, node)}
        onSelect={(...val) => this.onSelectTask(type, ...val)}
      >
        {this.renderTreeNodes(treeData, type)}
      </Tree>
    )
  }

  // 节点展开方法
  handlerExpanded = (type, node) => {
    const { expandedKeys, groupExpandedKeys } = this.props
    const select = _.get(node, 'key', '')
    if (type === DISPLAY_TASK_MODEL.offLineTaskGroup) {
      const hasKey = _.includes(groupExpandedKeys, select)
      const val = hasKey ? groupExpandedKeys.filter(p => p !== select) : [...groupExpandedKeys, select]
      this.changeState({ groupExpandedKeys: val })
      return
    }
    const hasKey = _.includes(expandedKeys, select)
    const val = hasKey ? expandedKeys.filter(p => p !== select) : [...expandedKeys, select]
    this.changeState({ expandedKeys: val })
  }

  // 用户点击哪一个工作流
  onSelectTask = (type, taskId, node) => {
    const { onSelectTask, expandedKeys, groupExpandedKeys } = this.props
    const select = _.get(node, 'node.props.dataRef.key', '')
    // 保存选中的key
    if (!_.startsWith(select, 'type-')) {
      this.setState({ selectKey: select })
      onSelectTask(select, type === DISPLAY_TASK_MODEL.offLineTaskGroup)
      return
    }

    if (type === DISPLAY_TASK_MODEL.offLineTaskGroup) {
      const hasKey = _.includes(groupExpandedKeys, select)
      const val = hasKey ? groupExpandedKeys.filter(p => p !== select) : [...groupExpandedKeys, select]
      this.changeState({ groupExpandedKeys: val })
      return
    }
    const hasKey = _.includes(expandedKeys, select)
    const val = hasKey ? expandedKeys.filter(p => p !== select) : [...expandedKeys, select]
    this.changeState({ expandedKeys: val })
  }

  renderContent = (className, type) => {
    const { isPreview } = this.props
    const title = (
      <div className='pd1x' key='title'>
        {DISPLAY_TASK_MODEL_TRANSLATE[type]}分类{isPreview ? null : this.renderTopButton(type)}
      </div>
    )
    return (
      <SubMenu key={type} className='submenupanel' title={title}>
        <div className={`task-schedule-tree overscroll-y always-display-scrollbar height-100 ${className} task-v3-category-tree `} onClick={this.onClickWhite}>
          <div className='pd1 width-100'>
            <Input
              placeholder='搜索...'
              maxLength={20}
              onChange={e => this.changeSearchKey(e.target.value, type)}
              className='pd1x mg1b'
              allowClear
              key='searchCategory'
              suffix={<SearchOutlined style={{ color: 'rgba(0,0,0,.45)' }} />}
            />
          </div>
          {this.renderTree(type)}
        </div>
      </SubMenu>
    )
  }

  render() {
    const { className } = this.props
    return (
      <div>
        <Menu mode='inline' defaultOpenKeys={[DISPLAY_TASK_MODEL.offLineTask]}>
          {/* 工作流分类 */}
          {this.renderContent(className, DISPLAY_TASK_MODEL.offLineTask)}
          {/*工作流组分类 */}
          {this.renderContent(className, DISPLAY_TASK_MODEL.offLineTaskGroup)}
        </Menu>
      </div>
    )
  }
}
