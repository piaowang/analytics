import React from 'react'

import { CheckCircleOutlined, CloseCircleOutlined, CloseOutlined, EditOutlined, PlusSquareOutlined, SearchOutlined, FolderAddOutlined, DownOutlined } from '@ant-design/icons'
import { DISPLAY_TASK_MODEL, DISPLAY_TASK_EDITINGORDER, DISPLAY_TASK_MODEL_TRANSLATE } from '../constants'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import Fetch from 'client/common/fetch-final'
import { Tree, Tooltip, message, Input, Modal, Tabs, Menu } from 'antd'
import _ from 'lodash'
import { groupBy, recurFindDeep } from 'common/sugo-utils'
import SugoIcon from '../../Common/sugo-icon'
import smartSearch from 'common/smart-search'
import { treeFilter, FLOW_INCON_MAP, recurFlatten, treeNode2KeyStr } from '../constants'
import { makeTreeNode } from '../constants'
import { withCommonFilter } from '../../Common/common-filter'
import EditTaskBaseInfoModal from './edit-task-base-info-modal'
import EditCategoryModal from './edit-category-modal'
import { getDataGroupByType } from 'client/components/task-manager-v3/task-edit/model'

const { SubMenu } = Menu
const { TabPane } = Tabs
const { confirm } = Modal

const { showRealTimeTaskTabInDataDev = true } = window.sugo
const { showRealTimeCalculateTabInDataDev = false } = window.sugo

@withCommonFilter
@Form.create()
export default class TaskCategoryTree extends React.Component {
  rootSubmenuKeys = [DISPLAY_TASK_MODEL.offLineTask, DISPLAY_TASK_MODEL.offLineTaskGroup]
  state = {
    openKeys: [DISPLAY_TASK_MODEL.offLineTask], //menu展开的对象,
    categoryKeyWord: '', //工作流搜索的关键字
    categoryGroupKeyWord: '', //工作流组搜索的关键字
    realTimeKeyword: '', //关键字的搜索
    realTimeCalcKeyword: '', //实时计算分类关键字
    realtimeCollectKeyword: ''
  }
  oriTreeData = []
  latestModel = DISPLAY_TASK_MODEL.offLineTask

  getCategoryDataDataByDisplayModelType = type => {
    const { categoryData } = this.props
    return getDataGroupByType(this.props)[type || ''] || categoryData
  }

  updateCategoryDataDataByDisplayModelType = (type, data) => {
    const { offLineTask, offLineTaskGroup, realTimeTask, realTimeCalc, realtimeCollect } = DISPLAY_TASK_MODEL
    switch (type) {
      case offLineTask:
        this.props.changeState({ categoryData: data })
        break
      case offLineTaskGroup:
        this.props.changeState({ groupCategoryData: data })
        break
      case realTimeTask:
        this.props.changeState({ realTimeData: data })
        break
      case realTimeCalc:
        this.props.changeState({ realTimeCalcCategoryData: data })
        break
      case realtimeCollect:
        this.props.changeState({ realTimeCollectData: data })
        break
      default:
        throw new Error(`Unknown type: ${type}`)
    }
  }

  getCategorySearchKeywordByType = type => {
    const { offLineTask, offLineTaskGroup, realtimeCollect, realTimeTask, realTimeCalc } = DISPLAY_TASK_MODEL

    const { categoryKeyWord, categoryGroupKeyWord, realTimeKeyword, realTimeCalcKeyword, realTimeCollectKeyword } = this.state

    if (type === offLineTask) {
      return categoryKeyWord
    } else if (type === offLineTaskGroup) {
      return categoryGroupKeyWord
    } else if (type === realtimeCollect) {
      return realTimeCollectKeyword
    } else if (type === realTimeTask) {
      return realTimeKeyword
    } else if (type === realTimeCalc) {
      return realTimeCalcKeyword
    }

    return categoryKeyWord
  }

  genSortInfo = treeData => {
    let flattedTree = recurFlatten(treeData)
    let sortInfo = {
      order: groupBy(
        flattedTree,
        n => (n.parentKey && n.parentKey) || -1,
        arr => arr.map(n => n.key)
      ),
      type: groupBy(
        flattedTree.filter(n => !_.startsWith(n.key, 'type-')),
        n => (n.parentKey && n.parentKey.substr(5)) || 0,
        arr => arr.map(n => n.key)
      ),
      tree: groupBy(
        flattedTree.filter(n => _.startsWith(n.key, 'type-')),
        n => (n.parentKey && n.parentKey.substr(5)) || 0,
        arr => arr.map(treeNode2KeyStr)
      )
    }
    return sortInfo
  }
  // 渲染'增加分类、增加、排序'按钮
  renderTopButton = type => {
    const { offLineTask, offLineTaskGroup, realTimeTask, realtimeCollect } = DISPLAY_TASK_MODEL
    const name = DISPLAY_TASK_MODEL_TRANSLATE[type]

    let { editingOrder, isFlowDes = false, isTaskGroup, disabled = true } = this.props
    if (isFlowDes || disabled) {
      return null
    }
    if (editingOrder[type]) {
      return [
        <div key={type} className='floatright'>
          <Tooltip title='取消设置排序' key='cancel'>
            <CloseCircleOutlined
              style={{ fontSize: '16px' }}
              className='pointer mg1r'
              onClick={e => {
                this.cancelEditOrder(type)
                e.stopPropagation()
              }}
            />
          </Tooltip>
          <Tooltip key='save' visible placement='rightTop' title={`可拖拽'${name}'进行排序，点击保存操作`}>
            <CheckCircleOutlined
              style={{ fontSize: '16px' }}
              className='pointer'
              onClick={e => {
                this.saveOrder(type)
                e.stopPropagation()
              }}
            />
          </Tooltip>
        </div>
      ]
    }
    return [
      <div key={type} className='floatright'>
        <Tooltip title={`新增${name}`} key='add'>
          <PlusSquareOutlined
            className='pointer mg1r'
            style={{ fontSize: '15px', verticalAlign: 'middle' }}
            onClick={e => {
              //  需要先更新下状态为工作流/工作流组等的状态下再去弹窗
              this.props.changeState({ isShowTaskEditModal: true, editTaskId: '', editTaskTitle: '', displayModel: type })
              e.stopPropagation()
            }}
          />
        </Tooltip>
        <Tooltip title={`新增${name}分类`} key='add_group'>
          <FolderAddOutlined
            style={{ fontSize: '18px', verticalAlign: 'middle' }}
            className='pointer mg1r'
            onClick={e => {
              this.props.changeState({ isShowCategoryEditModal: true, editCategoryId: '', editCategoryTitle: '', displayModel: type })
              e.stopPropagation()
            }}
          />
        </Tooltip>
        {type === realTimeTask ? null : (
          <Tooltip title='设置排序' key='order'>
            <SugoIcon
              type='sugo-task-category-sort'
              className='pointer font14'
              style={{ verticalAlign: 'middle' }}
              onClick={e => {
                this.props.changeDisplayModel(type)
                const preClone = getDataGroupByType(this.props)[type]
                this.oriTreeData = _.cloneDeep(preClone)
                this.props.changeState({ editingOrder: { ...DISPLAY_TASK_EDITINGORDER, [type]: true } })
                e.stopPropagation()
              }}
            />
          </Tooltip>
        )}
      </div>
    ]
  }
  //编辑分类的保存
  editTaskCategory = (type, values) => {
    const categoryModalTitle = values.categoryModalTitle || values.title
    let treeData = this.getCategoryDataDataByDisplayModelType(type)
    if (values.parent_id) {
      treeData = recurFindDeep(
        treeData,
        p => p.children,
        p => p.id === values.parent_id
      )
      treeData = treeData.children || []
    }
    if (treeData.filter(o => o.title === categoryModalTitle && _.startsWith(o.key, 'type-')).length) {
      return message.warn('分类名重复')
    }
    const params = { ...values, type, projectType: type }
    // 调用props中的保存接口
    this.props.editTaskCategory(params)
  }
  //编辑工作流的保存
  editTask = (type, values) => {
    const { editTaskId, editTaskWork, onAdd } = this.props
    const { taskModalTitle, taskCategory } = values
    editTaskId ? editTaskWork({ editTaskId, taskCategory, taskModalTitle, type }) : onAdd(taskModalTitle, taskCategory, type)
    // // 调用props中的保存接口
  }
  //修改实时数据的输入框
  onChangeRealTime = event => {
    this.setState({ realTimeKeyword: event.target.value })
  }

  //修改实时采集的输入框
  onChangeRealtimeCollect = event => {
    this.setState({ realTimeCollectKeyword: event.target.value })
  }

  //修改工作流组的输入框
  onChangeCategotyGroup = event => {
    this.setState({ categoryGroupKeyWord: event.target.value })
  }
  //修改工作流的输入框
  onChangeCategoty = event => {
    this.setState({ categoryKeyWord: event.target.value })
  }

  // 编辑分类的模态窗
  renderEditTypeModal = () => {
    const { editCategoryId, isShowCategoryEditModal, editCategoryTitle, displayModel, saving, editCategoryParentId } = this.props
    let treeData = this.getCategoryDataDataByDisplayModelType(displayModel)

    return (
      <EditCategoryModal
        displayModel={displayModel}
        id={editCategoryId}
        visible={isShowCategoryEditModal}
        saving={saving}
        title={editCategoryTitle}
        treeData={treeData}
        parentId={editCategoryParentId}
        onOk={this.editTaskCategory}
        onCancel={() =>
          this.props.changeState({
            isShowCategoryEditModal: false,
            editCategoryTitle: '',
            editCategoryId: '',
            editCategoryParentId: ''
          })
        }
      />
    )
  }

  //编辑工作流的模态窗
  renderEditWorkModal = () => {
    const { editTaskId, isShowTaskEditModal, editTaskTitle, displayModel, saving, editTaskCategoryId } = this.props
    let treeData = this.getCategoryDataDataByDisplayModelType(displayModel)

    return (
      <EditTaskBaseInfoModal
        displayModel={displayModel}
        editTaskId={editTaskId}
        isShowTaskEditModal={isShowTaskEditModal}
        saving={saving}
        editTaskTitle={editTaskTitle}
        treeData={treeData}
        editTaskCategoryId={editTaskCategoryId}
        onOk={this.editTask}
        onCancel={() =>
          this.props.changeState({
            isShowTaskEditModal: false,
            editTaskId: '',
            editTaskTitle: '',
            editTaskCategoryId: ''
          })
        }
      />
    )
  }

  renderEmptyHint = () => {
    return (
      <div key='noData' className='aligncenter pd3y'>
        暂无内容，请先创建
      </div>
    )
  }
  //取消设置排序
  cancelEditOrder = type => {
    // PubSub.publish('Refresh-task-tree')
    const { groupTreeInfo, treeInfo } = this.props
    const categoryPropsMap = {
      [DISPLAY_TASK_MODEL.offLineTask]: 'categoryData',
      [DISPLAY_TASK_MODEL.offLineTaskGroup]: 'groupCategoryData',
      [DISPLAY_TASK_MODEL.realTimeTask]: 'realTimeData',
      [DISPLAY_TASK_MODEL.realTimeCalc]: 'realTimeCalcCategoryData',
      [DISPLAY_TASK_MODEL.realtimeCollect]: 'realTimeCollectData'
    }
    const categoryName = _.get(categoryPropsMap, type)
    this.props.changeState({ editingOrder: DISPLAY_TASK_EDITINGORDER, [categoryName]: this.oriTreeData })
  }
  //保存排序设置
  saveOrder = type => {
    const originData = this.getCategoryDataDataByDisplayModelType(type)
    const sortInfo = this.genSortInfo(originData)
    this.props.saveOrder(sortInfo, type)
    this.props.changeState({ editingOrder: DISPLAY_TASK_EDITINGORDER })
  }
  // 渲染树状结构体，type为传入的类型，代表工作流还是工作流组，
  //将数据转化为tree数据的操作在model中
  renderTree = type => {
    let { editingOrder, selectCategory } = this.props
    let treeData = this.getCategoryDataDataByDisplayModelType(type)
    let searchingcate = this.getCategorySearchKeywordByType(type)
    let filteredTreeData = searchingcate ? treeFilter(treeData, n => smartSearch(searchingcate, n.title)) : treeData
    return _.isEmpty(filteredTreeData) ? (
      this.renderEmptyHint()
    ) : (
      <Tree
        selectedKeys={[]}
        title='treeData'
        key={`tree-key-${type}`}
        switcherIcon={<DownOutlined />}
        showIcon
        defaultExpandedKeys={[`type-${selectCategory}`]}
        defaultSelectedKeys={[`type-${selectCategory}`]}
        draggable={editingOrder[type]}
        onSelect={(...val) => this.onSelectTask(type, ...val)}
        onDrop={this.onDrop}
        className='task-category-tree'
        blockNode
      >
        {this.renderTreeNodes(filteredTreeData, type)}
      </Tree>
    )
  }
  // 用户二次确认删除状态
  handleDeleteCategory = async (id, length, title, type) => {
    confirm({
      content: `确认删除分类"${title}"吗`,
      okType: 'danger',
      onOk: () => {
        this.props.deleteCategory(id, length, type)
      }
    })
  }
  loadRunningTaskExecutionId(id) {
    const url = `/app/task-schedule-v3/history?action=getRunningFlows`
    return Fetch.get(url)
      .then(res => {
        return res?.runningFlows?.[0]?.first?.projectId == id
      })
      .catch(err => console.error(err))
  }

  // 用户二次确认删除工作流/工作流组
  handleDeleteWork = async (id, title, type) => {
    const run = await this.loadRunningTaskExecutionId(id)
    if (run) {
      message.error('正在执行中，不可删除')
      return
    }
    const content = type === DISPLAY_TASK_MODEL.offLineTaskGroup ? `工作流组“${title}”` : `工作流“${title}”`
    confirm({
      content: `确定删除${content}吗？`,
      okType: 'danger',
      onOk: () => {
        this.props.deleteTask({ taskId: id, type, deleteType: 1 })
      }
    })
  }
  // 用户点击哪一个工作流
  onSelectTask = (type, taskId, node) => {
    const { isFlowDes, allTaskList, onSelect, changeState, selectedKey = '' } = this.props
    if (isFlowDes) return
    const select = _.get(node, 'node.props.dataRef.key', '')
    // 保存选中的key
    changeState({ selectedKeys: [select] })
    // 用户点击的是分类的时候
    if (_.startsWith(select, 'type-')) return changeState({ selectCategory: select.substr(5) })
    // 用户点击的是子节点的时候
    const selectParent = _.get(node, 'node.props.dataRef.parentKey', '')
    changeState({ selectCategory: selectParent ? selectParent.substr(5) : '' })
    const selectTask = allTaskList[type].find(item => item.id === taskId[0]) || {}
    const { id, showName, typeName } = selectTask
    onSelect(id, showName, typeName)
  }
  // 树状结构的节点的渲染
  renderTreeNodes = (treeData, type) => {
    const { isFlowDes = false, editTaskInfo = {}, allTaskList = [], graphInfo, disabled, activeTabsKey = '' } = this.props
    return treeData.map(node => {
      const params = {}
      // 不是分类的
      if (isFlowDes && !_.startsWith(node.key, 'type-')) {
        const taskInfo = allTaskList[type].find(p => p.id === node.id)
        const taskGroupId = _.get(taskInfo, 'task_group_id', '') || ''
        const canAdd =
          isFlowDes &&
          (!editTaskInfo.status || editTaskInfo.status === '0') &&
          (!taskGroupId || taskGroupId === editTaskInfo.id) &&
          !_.some(graphInfo.graph, p => p['proxy.job.id'] === node.id) &&
          _.get(node, 'status', '0') === '0'
        if (canAdd) {
          params.draggable = true
          params.onDragStart = ev => {
            ev.dataTransfer.setData('text', `computationNode-${node.key}`)
          }
        } else {
          params.disabled = true
        }
      }
      // 分类的
      if (_.startsWith(node.key, 'type-')) {
        const title =
          isFlowDes || disabled ? (
            <div className='edit-tree-icon width-100 itblock' title={node.title}>
              <div className='elli itblock task-tree-title'>{node.title}</div>
            </div>
          ) : (
            <div className='edit-tree-icon width-100 itblock' title={node.title}>
              <div className='elli itblock task-tree-title'>{node.title}</div>
              <EditOutlined
                key='editIcon'
                className='pointer font14 iblock color-blue'
                style={{ marginLeft: '10px' }}
                onClick={e => {
                  this.props.changeState({
                    editCategoryId: node.id,
                    editCategoryTitle: node.title,
                    editCategoryParentId: node.parentKey,
                    isShowCategoryEditModal: true,
                    displayModel: type
                  })
                  e.stopPropagation()
                }}
              />

              <CloseOutlined
                key='closeIcon'
                className='pointer font14 iblock color-disable'
                style={{ marginLeft: '10px' }}
                onClick={e => {
                  this.handleDeleteCategory(node.id, node.children.length, node.title, type)
                  e.stopPropagation()
                }}
              />
            </div>
          )
        return (
          <Tree.TreeNode {...node} isLeaf={false} dataRef={node} title={title}>
            {this.renderTreeNodes(node.children, type)}
          </Tree.TreeNode>
        )
      }

      // http://192.168.0.212:3000/project/21/interface/api/3641
      // RUNNING(#008000)，KILLING（正在停止），KILLED（#808080），FAILED（#FF0000）
      const statusExcColor = {
        QUEUED: '#808080',
        READY: '#808080',
        RUNNING: '#008000',
        KILLING: '#808080',
        KILLED: '#808080',
        FAILED: '#FF0000',
        CANCELLED: '#808080',
        SUCCEEDED: '#808080',
        UNEXECUTED: '#808080'
      }

      return (
        <Tree.TreeNode
          key={node.id}
          className={node.id === activeTabsKey?.split('_')?.[1] ? 'activeTreeNode TreeNodeTiem' : 'TreeNodeTiem'}
          icon={<SugoIcon type={FLOW_INCON_MAP[type]} />}
          {...node}
          dataRef={node}
          disabled={params.disabled || (isFlowDes && disabled) || false}
          title={
            <div className='edit-tree-icon' title={node.title}>
              {type === DISPLAY_TASK_MODEL.realtimeCollect ? (
                <div
                  style={{
                    display: 'inline-block',
                    backgroundColor: statusExcColor[node.status_exc],
                    borderRadius: '100%',
                    width: '10px',
                    height: '10px',
                    minWidth: '10px',
                    marginRight: '2px',
                    verticalAlign: 'middle'
                  }}
                ></div>
              ) : null}
              <div className='elli itblock task-tree-title' {...params}>
                {node.title}{' '}
              </div>
              <EditOutlined
                key='editIcon'
                className='pointer font14 iblock color-blue'
                style={{ marginLeft: '10px' }}
                onClick={e => {
                  this.props.changeState({
                    editTaskId: node.id,
                    editTaskTitle: node.title,
                    editTaskCategoryId: node.parentKey,
                    displayModel: type,
                    isShowTaskEditModal: true
                  })
                  e.stopPropagation()
                }}
              />
              <CloseOutlined
                key='closeIcon'
                className='pointer font14 iblock color-disable'
                style={{ marginLeft: '10px' }}
                onClick={e => {
                  this.handleDeleteWork(node.id, node.title, type)
                  e.stopPropagation()
                }}
              />
            </div>
          }
        />
      )
    })
  }

  // 拖动事件
  onDrop = info => {
    const { activeModeType: type } = this.props

    const { isTaskGroup } = this.props
    const dropKey = info.node.props.eventKey
    const dragKey = info.dragNode.props.eventKey
    const dropPos = info.node.props.pos.split('-')
    const olDdropPos = info.dragNode.props.pos.split('-')
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1])

    // 只允许拖拽到类型里面
    if (!_.startsWith(dropKey, 'type-') && !info.dropToGap) return

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
    let data = [...this.getCategoryDataDataByDisplayModelType(type)]
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

    this.updateCategoryDataDataByDisplayModelType(type, data)
  }

  onClickWhite = e => {
    if (this.props.isFlowDes) return
    if (_.startsWith(e.target.innerHTML, '<div class=')) {
      return this.props.changeState({ selectCategory: '' })
    }
    return
  }
  // 工作流/工作流组的切换显示
  onOpenChange = openKeys => {
    const latestOpenKey = openKeys.find(key => this.state.openKeys.indexOf(key) === -1)
    if (this.rootSubmenuKeys.indexOf(latestOpenKey) === -1) {
      this.setState({ openKeys })
    } else {
      this.setState({
        openKeys: latestOpenKey ? [latestOpenKey] : []
      })
    }
  }

  handleTabClick = key => {
    this.props.changeDisplayModel(key)
    this.props.changeState({ activeModeType: key })
  }

  render() {
    const { className, activeModeType } = this.props
    return (
      <div className='height-100'>
        <Tabs tabBarStyle={{ padding: '0px' }} activeKey={activeModeType} onTabClick={this.handleTabClick} tabPosition={'left'} className='height-100'>
          <TabPane tab={'离线开发'} key={'offLine'} className='submenu'>
            <div>
              <Menu mode='inline' defaultOpenKeys={[DISPLAY_TASK_MODEL.offLineTask]} style={{ width: 200 }}>
                {/* 工作流分类 */}
                <SubMenu
                  key={DISPLAY_TASK_MODEL.offLineTask}
                  className={'submenupanel'}
                  title={
                    <div className='pd1x' key='title'>
                      工作流分类{this.renderTopButton(DISPLAY_TASK_MODEL.offLineTask)}
                    </div>
                  }
                >
                  <div className={`task-schedule-tree overscroll-y always-display-scrollbar height-100 ${className} task-v3-category-tree `} onClick={this.onClickWhite}>
                    <div className='pd1 width-100'>
                      <Input
                        placeholder='搜索...'
                        maxLength={20}
                        onChange={this.onChangeCategoty}
                        className='pd1x mg1b'
                        allowClear
                        key='searchCategory'
                        suffix={<SearchOutlined style={{ color: 'rgba(0,0,0,.45)' }} />}
                      />
                    </div>
                    {this.renderTree(DISPLAY_TASK_MODEL.offLineTask)}
                  </div>
                </SubMenu>
                {/*工作流组分类 */}
                <SubMenu
                  key={DISPLAY_TASK_MODEL.offLineTaskGroup}
                  className={'submenupanel'}
                  title={
                    <div className='pd1x' key='title'>
                      工作流组分类{this.renderTopButton(DISPLAY_TASK_MODEL.offLineTaskGroup)}
                    </div>
                  }
                >
                  <div className={`task-schedule-tree overscroll-y always-display-scrollbar height-100 ${className} task-v3-category-tree `} onClick={this.onClickWhite}>
                    {/* <div className="line-height40 pd1x alignright" key="title">
                      {this.renderTopButton(DISPLAY_TASK_MODEL.offLineTaskGroup)}
                    </div> */}
                    <div className='pd1 width-100'>
                      <Input
                        placeholder='搜索...'
                        maxLength={20}
                        onChange={this.onChangeCategotyGroup}
                        className='pd1x mg1b'
                        allowClear
                        key='searchCategoryGroup'
                        suffix={<SearchOutlined style={{ color: 'rgba(0,0,0,.45)' }} />}
                      />
                    </div>
                    {this.renderTree(DISPLAY_TASK_MODEL.offLineTaskGroup)}
                  </div>
                </SubMenu>
              </Menu>
            </div>
          </TabPane>

          {!showRealTimeTaskTabInDataDev ? null : (
            <TabPane tab={DISPLAY_TASK_MODEL_TRANSLATE[DISPLAY_TASK_MODEL.realTimeCalc]} key={DISPLAY_TASK_MODEL.realTimeTask} className='submenu'>
              <div className={'noclose'}>
                <Menu mode='inline' openKeys={this.state.openKeys} onOpenChange={this.onOpenChange} style={{ width: 200 }}>
                  <div className={`task-schedule-tree overscroll-y always-display-scrollbar height-100 ${className} task-v3-category-tree `} onClick={this.onClickWhite}>
                    <div className='noclose line-height44 pd1x alignright' key='title'>
                      <span style={{ float: 'left', marginLeft: 5 }}>工作流</span>
                      {this.renderTopButton(DISPLAY_TASK_MODEL.realTimeCalc)}
                    </div>
                    <div className='pd1 width-100'>
                      <Input
                        placeholder='搜索...'
                        maxLength={20}
                        onChange={event => this.setState({ realTimeCalcKeyword: event.target.value })}
                        className='pd1x mg1b'
                        allowClear
                        key='searchCategory'
                        suffix={<SearchOutlined style={{ color: 'rgba(0,0,0,.45)' }} />}
                      />
                    </div>
                    {this.renderTree(DISPLAY_TASK_MODEL.realTimeCalc)}
                  </div>
                </Menu>
              </div>
            </TabPane>
          )}
          {!showRealTimeCalculateTabInDataDev ? null : (
            <TabPane tab={DISPLAY_TASK_MODEL_TRANSLATE[DISPLAY_TASK_MODEL.realTimeCalc]} key={DISPLAY_TASK_MODEL.realTimeCalc} className='submenu'>
              <div className={'noclose'}>
                <Menu mode='inline' openKeys={this.state.openKeys} onOpenChange={this.onOpenChange} style={{ width: 200 }}>
                  <div className={`task-schedule-tree overscroll-y always-display-scrollbar height-100 ${className} task-v3-category-tree `} onClick={this.onClickWhite}>
                    <div className='noclose line-height44 pd1x alignright' key='title'>
                      <span style={{ float: 'left', marginLeft: 5 }}>工作流</span>
                      {this.renderTopButton(DISPLAY_TASK_MODEL.realTimeCalc)}
                    </div>
                    <div className='pd1 width-100'>
                      <Input
                        placeholder='搜索...'
                        maxLength={20}
                        onChange={event => this.setState({ realTimeCalcKeyword: event.target.value })}
                        className='pd1x mg1b'
                        allowClear
                        key='searchCategory'
                        suffix={<SearchOutlined style={{ color: 'rgba(0,0,0,.45)' }} />}
                      />
                    </div>
                    {this.renderTree(DISPLAY_TASK_MODEL.realTimeCalc)}
                  </div>
                </Menu>
              </div>
            </TabPane>
          )}

          <TabPane tab='实时采集' key={DISPLAY_TASK_MODEL.realtimeCollect} className='submenu'>
            <div className={'noclose'}>
              <Menu mode='inline' openKeys={this.state.openKeys} onOpenChange={this.onOpenChange} style={{ width: 200 }}>
                <div className={`task-schedule-tree overscroll-y always-display-scrollbar height-100 ${className} task-v3-category-tree `} onClick={this.onClickWhite}>
                  <div className='noclose line-height44 pd1x alignright' key='title'>
                    <span style={{ float: 'left', marginLeft: 5 }}>采集工作流</span>
                    {this.renderTopButton(DISPLAY_TASK_MODEL.realtimeCollect)}
                  </div>
                  <div className='pd1 width-100'>
                    <Input
                      placeholder='搜索...'
                      maxLength={20}
                      onChange={this.onChangeRealtimeCollect}
                      className='pd1x mg1b'
                      allowClear
                      key='searchCategory'
                      suffix={<SearchOutlined style={{ color: 'rgba(0,0,0,.45)' }} />}
                    />
                  </div>
                  {this.renderTree(DISPLAY_TASK_MODEL.realtimeCollect)}
                </div>
                {/* </SubMenu> */}
              </Menu>
            </div>
          </TabPane>
        </Tabs>
        {this.renderEditTypeModal()}
        {this.renderEditWorkModal()}
      </div>
    )
  }
}
