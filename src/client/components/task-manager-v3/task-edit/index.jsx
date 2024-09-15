import { connect } from 'react-redux'
import React, { Component } from 'react'
import moment from 'moment'
import HorizontalSplitHelper from '../../Common/horizontal-split-helper'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import _ from 'lodash'
import TaskCategoryTree from './task-category-tree'
import { Tabs, message, Modal, Button, Divider, Tooltip } from 'antd'
import TaskV3EditModel, { namespace } from './model'

import TaskEdit from './task-edit'
import ImmediateTaskEdit from './immediate/immediate-task-edit'
import DataSync from './from/data-sync'
import { TASK_EDIT_TABS_TYPE, DISPLAY_TASK_MODEL, TASK_PROJECT_USER_ROLE_TYPE, DISPLAY_TASK_EDITINGORDER } from '../constants'
import PubSub from 'pubsub-js'
import WaitNode from './wait-node'
import Tindex from '../tindex-component/tindex'
import { generate } from 'shortid'
import Editor from '../monaco-editor/editor'
import Fetch from 'client/common/fetch-final'
import './index.styl'
import { makeTreeNode } from '../constants'
import SugoIcon from '../../Common/sugo-icon'
import { FLOW_INCON_MAP } from '../constants'
import { LeftOutlined, RightOutlined, FullscreenExitOutlined, FullscreenOutlined } from '@ant-design/icons'
import CodeEditor from './immediate/immediate-code-editor'
import Textcollec from './text-collection'
import HiveNode from './hive'
import GuideHome from './guide'
import { browserHistory } from 'react-router'
import RealtiemCollect from './collect/index'
import { isRealTimeCalcProject } from 'client/components/task-manager-v3/task-edit/immediate/real-time-calc-helper'
import { FlinkJar } from 'client/components/task-manager-v3/task-edit/flink-jar'

const { TabPane } = Tabs

const LEFT_PANEL_WIDTH = 240
@connect(props => {
  return {
    ...props[namespace],
    ...props['sagaCommon']
  }
})
@withRuntimeSagaModel(TaskV3EditModel)
export default class TaskEditV3Index extends Component {
  componentDidMount() {
    this.clearHeartbeat()
    PubSub.subscribe('taskEditV3.closeCurrentTab', (msg, data) => {
      this.colesTab('')
    })
    PubSub.subscribe('taskEditV3.afterSaveNewTab', (msg, data) => {
      this.colesTab(`${data.isTaskGroup ? TASK_EDIT_TABS_TYPE.offLineTaskGroup : TASK_EDIT_TABS_TYPE.offLineTask}_new`)
      this.openNewTab(data.id, '', TASK_EDIT_TABS_TYPE.offLineTask, '')
    })
    this.props.dispatch({
      type: `${namespace}/fetchTaskProjectById`,
      payload: {
        id: this.props.params.id
      }
    })
    // **检查心跳 不要去掉
    this.startHeartbeat()
    // this.getRealTimeAttrs()
  }

  componentDidUpdate(prevProps) {
    const { taskList, taskListIsLoading, firstEnter, categoryData, offLineTaskGroupList } = this.props
    // 进入页面默认打开工作流 如果地址栏传入id 则打开指定的工作流
    const taskId = _.get(this.props, 'location.query.taskId', '')
    if (taskId && taskList.length && taskList !== prevProps.taskList && firstEnter) {
      let taskInfo = taskList.find(p => p.id === taskId)
      if (!_.isEmpty(taskInfo)) {
        this.openNewTab(taskId, taskInfo.showName, TASK_EDIT_TABS_TYPE.offLineTask, '')
        this.changeState({ firstEnter: false })
        return
      }
      taskInfo = offLineTaskGroupList.find(p => p.id === taskId)
      if (!_.isEmpty(taskInfo)) {
        this.openNewTab(taskId, taskInfo.showName, TASK_EDIT_TABS_TYPE.offLineTaskGroup, '')
        this.changeState({ firstEnter: false })
        return
      }
    }
  }

  componentWillUnmount() {
    const taskId = _.get(this.props, 'location.query.taskId', '')
    PubSub.unsubscribe('taskEditV3.closeCurrentTab')
    PubSub.unsubscribe('taskEditV3.afterSaveNewTab')
    PubSub.unsubscribe(`taskEditV3.saveTaskInfo.${taskId}`)
    this.clearHeartbeat()
    this.changeState({ firstEnter: true, tabObjs: [], activeTabsKey: TASK_EDIT_TABS_TYPE.guide })
    this.handleChangeFullScreen(false)
  }

  changeState = payload => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload
    })
  }

  useCache = () => {
    const { groupTreeInfo, treeInfo } = this.props
    let categoryData = makeTreeNode(treeInfo)
    let groupCategoryData = makeTreeNode(groupTreeInfo)
    this.changeState({ editingOrder: DISPLAY_TASK_EDITINGORDER, categoryData, groupCategoryData })
  }
  // 更改当前用户的操作类型
  changeDisplayModel = displayModel => {
    this.useCache()
    this.changeState({ displayModel, selectCategory: '' })
  }
  startHeartbeat = () => {
    this.heartbeatId = window.setInterval(async () => {
      const timeOut = moment().add(-30, 'm') + 0
      const { tabObjs = [] } = this.props
      const ids = tabObjs
        .filter(p => {
          return (p.openTime > timeOut || p.hasEdit) && !p.parentId && p.id && p.id !== TASK_EDIT_TABS_TYPE.guide
        })
        .map(p => p.id)
      if (!ids.length) {
        return
      }
      await Fetch.get(`/app/task-schedule-v3/manager?projectId=${ids[0]}&projectIds=${ids.join(',')}&action=heartbeats&userId=${window.sugo.user.id}`, null, { timeout: 1800000 })
    }, 5000)
  }

  clearHeartbeat = () => {
    if (this.heartbeatId) {
      window.clearInterval(this.heartbeatId)
    }
  }

  deleteTask = payload => {
    // 点击左侧树状图的时候，没有taskProjectId，要从地址栏获取
    payload = { ...payload, taskProjectId: this.props.params.id }
    const { taskId, deleteType, type } = payload
    this.props.dispatch({
      type: `${namespace}/deleteTask`,
      payload,
      callback: () => {
        //如果当前删除的是右侧已经打开的面板，就去删除对应关闭的面板页面
        //不修改在面板中关闭，只修改在树状图中删除的
        if (deleteType) {
          this.colesTab(`${type}_${taskId}`)
        }
      }
    })
  }

  getTaskProps = payload => {
    this.props.dispatch({
      type: `${namespace}/getTaskProps`,
      payload
    })
  }

  changeEditStatus = (id, status) => {
    let { tabObjs } = this.props
    const index = _.findIndex(tabObjs, p => p.id === id)
    const parentId = _.get(tabObjs, [index, 'parentId'], '')
    if (_.get(tabObjs, [index, 'hasEdit'], false) === status) {
      return
    }
    tabObjs = _.cloneDeep(tabObjs)
    if (parentId && status) {
      const parentIndex = _.findIndex(tabObjs, p => p.id === parentId)
      _.set(tabObjs, [parentIndex, 'hasEdit'], status)
    }
    _.set(tabObjs, [index, 'hasEdit'], status)
    this.changeState({ tabObjs })
  }
  //打开新面板
  openNewTab = (id, name, type, parentId) => {
    if (!id) return
    const { tabObjs, activeTabsKey, displayModel } = this.props

    const key = `${type}${parentId ? `_${parentId}` : ''}_${id}`
    if (type === 'end') {
      message.error('无法编辑')
      return
    }
    // 如果是当前打开的面板
    if (activeTabsKey === key) {
      return
    }
    //如果是面板列表中的
    if (_.findIndex(tabObjs, p => p.key === key) > -1) {
      this.changeState({ activeTabsKey: key })
      PubSub.publish(`schedule-log-refresh-cj_${id}`)
      return
    }
    const taskLists = _.flatMap(this.getAllTaskList(), _.identity).filter(e => e != undefined)
    const taskId = parentId || id || ''
    const taskInfo = taskLists.find(p => p.id === taskId.toString())
    let val = name || taskInfo.showName
    this.changeState({
      tabObjs: [
        ...tabObjs,
        {
          key,
          id: parentId ? `${parentId}_${id}` : id,
          name: val,
          type,
          parentId,
          canEdit: taskInfo?.status === '0' || taskInfo?.status === '3',
          model: type,
          openTime: moment() + 0
        }
      ],
      activeTabsKey: key
    })
  }
  //新增工作流/工作流组,保存一个新的然后再去打开
  // edittitle为标题的文字，type为类型
  addTask = (editTitle, taskCategory, type) => {
    let categoryId = taskCategory
    let payload = {
      showName: editTitle,
      task_project_id: this.props.params.id,
      name: generate(), //序列化的名字
      projectType: type,
      creator: window.sugo.user.id,
      category_id: categoryId === '0' || categoryId === '1' || !categoryId ? '' : categoryId
    }

    let url = type === DISPLAY_TASK_MODEL.offLineTaskGroup ? `${namespace}/saveGroupSimple` : `${namespace}/saveTaskSimple`

    this.props.dispatch({
      type: url,
      payload,
      callback: str => {
        let activeModeType = /^realTime/i.test(type) ? type : 'offLine'

        // 打开新的面板
        this.openNewTab(str, editTitle, type, '')
        this.changeState({
          selectedKeys: [str],
          activeModeType
        })
      }
    })
  }

  colesTab = targetKey => {
    const { tabObjs, activeTabsKey } = this.props
    if (!targetKey) {
      targetKey = activeTabsKey
    }
    const index = _.findIndex(tabObjs, p => p.key === targetKey)
    const newTabObjs = tabObjs.filter(p => p.key !== targetKey)
    // 如果选中的是当前打开的，则关闭并打开下一个
    if (targetKey === activeTabsKey) {
      const activeTabs = _.get(newTabObjs, [index > 0 ? index - 1 : 0], {})
      this.changeState({
        tabObjs: newTabObjs,
        activeTabsKey: activeTabs.key === targetKey ? '' : activeTabs.key || TASK_EDIT_TABS_TYPE.guide
      })
    }
    // 如果选中不是当前打开的，则删除
    else {
      this.changeState({
        tabObjs: newTabObjs,
        activeTabsKey: activeTabsKey || TASK_EDIT_TABS_TYPE.guide
      })
    }
  }

  onColesTab = (targetKey, event) => {
    const { tabObjs } = this.props
    const index = _.findIndex(tabObjs, p => p.key === targetKey)
    const closeTabFun = this.colesTab
    const { hasEdit = false, name, type, id, canEdit } = _.get(tabObjs, [index], {})
    if (hasEdit && canEdit) {
      const model = Modal.confirm({
        title: `${type === TASK_EDIT_TABS_TYPE.offLineTask ? '流程' : '节点'}[${name}]有编辑未保存, 是否立即保存?`,
        okText: '保存',
        content: (
          <Button onClick={() => model.destroy()} style={{ position: 'absolute', marginTop: '24px', marginLeft: '150px' }}>
            取消
          </Button>
        ),
        cancelText: '不保存',
        cancelButtonProps: { type: 'danger' },
        onOk() {
          PubSub.publish(`taskEditV3.saveTaskInfo.${id}`, () => closeTabFun(targetKey))
        },
        onCancel() {
          closeTabFun(targetKey)
        }
      })
    } else {
      closeTabFun(targetKey)
    }
    //阻止事件冒泡，不然会切换tab，出现bug
    event.stopPropagation()
  }

  renderEditPanel = item => {
    const { metaconnectors, dispatch, realTimeNodeList, realTimeNodeInfo, userTaskRole, tabObjs, activeTabsKey } = this.props
    const { id: projectId } = this.props.params
    const isGest = userTaskRole === TASK_PROJECT_USER_ROLE_TYPE.guest
    const disabled = !item.canEdit || isGest
    const options = {
      changeEditStatus: this.changeEditStatus,
      id: item.id,
      nodeType: item.type,
      disabled,
      taskId: item.parentId
    }
    const tab = _.find(tabObjs, p => p.key === activeTabsKey)
    const taskLists = _.flatMap(this.getAllTaskList(), _.identity).filter(e => e !== undefined)
    const editTaskInfo = taskLists.find(t => t.id === item.id) || { name: tab ? tab.taskName : generate() }
    switch (item.type) {
      case TASK_EDIT_TABS_TYPE.offLineTask:
      case TASK_EDIT_TABS_TYPE.offLineTaskGroup:
        return (
          <TaskEdit
            metaconnectors={metaconnectors}
            editTaskInfo={editTaskInfo}
            realTimeNodeInfo={realTimeNodeInfo}
            realTimeNodeList={realTimeNodeList}
            changeEditStatus={this.changeEditStatus}
            id={item.id}
            taskProjectId={projectId}
            openNewTab={this.openNewTab}
            disabled={disabled}
            isGest={isGest}
          />
        )
      case TASK_EDIT_TABS_TYPE.realTimeTask:
        return (
          <ImmediateTaskEdit
            metaconnectors={metaconnectors}
            editTaskInfo={editTaskInfo}
            realTimeNodeInfo={realTimeNodeInfo}
            realTimeNodeList={realTimeNodeList}
            changeEditStatus={this.changeEditStatus}
            id={item.id}
            taskProjectId={projectId}
            openNewTab={this.openNewTab}
            disabled={disabled}
            isGest={isGest}
          />
        )
      case TASK_EDIT_TABS_TYPE.realTimeCalc:
        return (
          <TaskEdit
            metaconnectors={metaconnectors}
            editTaskInfo={editTaskInfo}
            realTimeNodeInfo={realTimeNodeInfo}
            realTimeNodeList={realTimeNodeList}
            changeEditStatus={this.changeEditStatus}
            id={item.id}
            taskProjectId={projectId}
            openNewTab={this.openNewTab}
            disabled={disabled}
            isGest={isGest}
          />
        )
      case TASK_EDIT_TABS_TYPE.realtimeCollect:
        return <RealtiemCollect editTaskInfo={editTaskInfo} id={item.id} taskProjectId={projectId} disabled={disabled} isGest={isGest} />
      case TASK_EDIT_TABS_TYPE.nodeWait:
        return <WaitNode {...options} />
      case TASK_EDIT_TABS_TYPE.hive:
        return <HiveNode {...options} dispatch={dispatch} projectId={projectId} />
      case TASK_EDIT_TABS_TYPE.command:
      case TASK_EDIT_TABS_TYPE.python:
      case TASK_EDIT_TABS_TYPE.scala:
      case TASK_EDIT_TABS_TYPE.impala:
      case TASK_EDIT_TABS_TYPE.perl:
      case TASK_EDIT_TABS_TYPE.mlsql:
      case TASK_EDIT_TABS_TYPE.sqlserver:
      case TASK_EDIT_TABS_TYPE.oraclesql:
      case TASK_EDIT_TABS_TYPE.mysql:
      case TASK_EDIT_TABS_TYPE.sybase:
      case TASK_EDIT_TABS_TYPE.sparkSql:
        return <Editor {...options} dispatch={dispatch} />
      case TASK_EDIT_TABS_TYPE.exportMysql:
        return <DataSync {...options} projectId={projectId} isExport />
      case TASK_EDIT_TABS_TYPE.exportTIndes:
        return <Tindex {...options} projectId={projectId} />
      case TASK_EDIT_TABS_TYPE.dataCollect:
        return <DataSync {...options} projectId={projectId} />
      case TASK_EDIT_TABS_TYPE.groovy:
        return <CodeEditor {...options} height='calc(100vh - 185px)' isCleanEdit />
      case TASK_EDIT_TABS_TYPE.flinkSql:
        if (isRealTimeCalcProject(item.parentId)) {
          const parentCanEdit = _.find(this.props.tabObjs, d => d.id === item.parentId)?.canEdit
          return <Editor {...options} disabled={options.disabled || !parentCanEdit} dispatch={dispatch} />
        }
        return <CodeEditor {...options} height='calc(100vh - 185px)' isCleanEdit />
      case TASK_EDIT_TABS_TYPE.textCollect:
        return <Textcollec {...options} projectId={projectId} />
      case TASK_EDIT_TABS_TYPE.flinkJar:
        const parentCanEdit = _.find(this.props.tabObjs, d => d.id === item.parentId)?.canEdit
        return <FlinkJar {...options} disabled={options.disabled || !parentCanEdit} projectId={projectId} />
      default:
        return null
    }
  }

  handleAddTask = type => {
    this.changeState({ isShowTaskEditModal: true, editTaskId: '', editTaskTitle: '', displayModel: type })
  }

  // 编辑工作流/工作流组
  editTaskWork = params => {
    const { type, editTaskId, taskModalTitle, taskCategory } = params
    let url = type === DISPLAY_TASK_MODEL.offLineTaskGroup ? `${namespace}/saveGroupSimple` : `${namespace}/saveTaskSimple`
    let payload =
      type === DISPLAY_TASK_MODEL.offLineTaskGroup
        ? {
            task_project_id: this.props.params.id,
            task_id: editTaskId,
            showName: taskModalTitle,
            category_id: taskCategory
          }
        : {
            task_project_id: this.props.params.id,
            id: editTaskId,
            showName: taskModalTitle,
            category_id: taskCategory
          }
    this.props.dispatch({
      type: url,
      payload
    })
  }
  // 编辑分类
  editTaskCategory = params => {
    const { dispatch } = this.props
    dispatch({
      type: `${namespace}/handleCategory`,
      payload: params
    })
  }
  //删除分类
  deleteCategory = (categoryId, isHaveChildren, type) => {
    if (isHaveChildren) {
      return message.error('删除失败，该分类下内容不为空')
    }
    this.changeState({ selectCategory: '' })
    this.props.dispatch({
      type: `${namespace}/deleteCategory`,
      payload: { categoryId, type }
    })
  }

  saveTreeOrder = (sortInfo, projectType) => {
    const { dispatch } = this.props
    dispatch({
      type: `${namespace}/orderCategory`,
      payload: { order: sortInfo, projectType }
    })
  }

  changeTabs = v => {
    this.changeState({ activeTabsKey: v })
    if (v === TASK_EDIT_TABS_TYPE.guide) {
      return
    }
    const { tabObjs = [] } = this.props
    const activeInfo = tabObjs.find(p => p.key === v)
    this.changeState({ selectedKeys: [activeInfo.id] })
    PubSub.publish(`schedule-log-refresh-cj_${activeInfo.id}`)
    const timeOut = moment().add(-30, 'm') + 0
    if (!activeInfo || (activeInfo.openTime < timeOut && !activeInfo.hasEdit)) {
      message.error('页面已超时，请刷新后重试')
    }
  }

  renderTabTitle = (item, isActiveChilren) => {
    return (
      <div className='pd2r'>
        <SugoIcon type={FLOW_INCON_MAP[item.model]} className='pd1r' />
        <div className='oneRowHide' title={item.name}>
          {item.name}
        </div>
        <SugoIcon type='close' className='pd1l flow-close' onClick={e => this.onColesTab(item.key, e)} />
        <div className='tab-save-tip'>{item.hasEdit ? <SugoIcon style={{ fontSize: '30px' }} type='sugo-flow-edit' /> : ''}</div>
        <div className={isActiveChilren ? 'select-tab-children' : ''} />
      </div>
    )
  }

  handleChangeFullScreen = val => {
    this.props.dispatch({
      type: 'sagaCommon/changeState',
      payload: {
        taskFullscreen: val
      }
    })
  }

  getAllTaskList() {
    const { taskList, offLineTaskGroupList, realTimeTaskList, realTimeCollectList, realTimeCalcTaskList } = this.props

    return {
      [DISPLAY_TASK_MODEL.offLineTask]: taskList,
      [DISPLAY_TASK_MODEL.offLineTaskGroup]: offLineTaskGroupList,
      [DISPLAY_TASK_MODEL.realTimeTask]: realTimeTaskList,
      [DISPLAY_TASK_MODEL.realTimeCalc]: realTimeCalcTaskList,
      [DISPLAY_TASK_MODEL.realtimeCollect]: realTimeCollectList
    }
  }

  render() {
    const {
      tabObjs = [],
      selectedKeys = [],
      activeTabsKey,
      groupCategoryData,
      categoryData,
      treeSearch,
      displayModel,
      isShowTaskEditModal,
      isShowCategoryEditModal,
      editingOrder = DISPLAY_TASK_EDITINGORDER,
      realTimeData,
      editCategoryTitle,
      editCategoryId,
      groupTreeInfo,
      treeInfo,
      userTaskRole,
      editTaskId,
      editTaskTitle,
      taskProjectInfo = {},
      saving,
      taskFullscreen = false,
      editTaskCategoryId,
      editCategoryParentId,
      activeModeType,
      realTimeCollectData,
      realTimeCalcCategoryData
    } = this.props
    const allTaskList = this.getAllTaskList()
    const isDisplayTaskModel = displayModel === DISPLAY_TASK_MODEL.offLineTask
    let { parentId: activeTabParentId, id, name: activeTabsName } = tabObjs.find(p => p.key === activeTabsKey) || {}
    const isGest = userTaskRole === TASK_PROJECT_USER_ROLE_TYPE.guest

    return (
      <div className='task-edit-index bg-main'>
        <div className='nav-bar'>
          <Button
            type='link'
            icon={<LeftOutlined />}
            style={{ padding: 0 }}
            onClick={() => {
              browserHistory.push('/console/task-schedule-v3/task-project')
            }}
          >
            返回
          </Button>
          {/* <LeftOutlined tabIndex="0" style={{marginRight: '20px'}}/> */}
          <Divider type='vertical' style={{ background: 'rgba(0, 0, 0, 0.4)', margin: '0 8px 0', height: '1.1em', width: '2px' }} />
          {taskProjectInfo.name}
          <RightOutlined style={{ fontSize: '10px', margin: '0 5px' }} />
          {activeTabsName}
          <div className='nav-bar-right-box'>
            <Tooltip title={taskFullscreen ? '取消全屏' : '全屏'}>
              {taskFullscreen ? (
                <FullscreenExitOutlined onClick={() => this.handleChangeFullScreen(false)} />
              ) : (
                <FullscreenOutlined onClick={() => this.handleChangeFullScreen(true)} />
              )}
            </Tooltip>
          </div>
        </div>
        <HorizontalSplitHelper style={{ height: 'calc(100% - 44px)', display: 'flex', flexWrap: 'nowrap' }} collapseWidth={100}>
          <div
            style={{ height: `calc(100vh - ${taskFullscreen ? 45 : 95}px)` }} // 全屏时动态改高度
            className='task-left-panel pd1'
            defaultWeight={LEFT_PANEL_WIDTH}
            collapseTitle='任务选择'
          >
            <TaskCategoryTree
              key='taskcategoryTree'
              selectedKeys={selectedKeys}
              activeTabsKey={activeTabsKey}
              editTaskCategoryId={editTaskCategoryId}
              editCategoryParentId={editCategoryParentId}
              className='bg-white'
              isTaskGroup={!isDisplayTaskModel}
              editTaskWork={this.editTaskWork}
              onAdd={this.addTask}
              editCategoryId={editCategoryId}
              editCategoryTitle={editCategoryTitle}
              editTaskId={editTaskId}
              editTaskTitle={editTaskTitle}
              editTaskCategory={this.editTaskCategory}
              groupCategoryData={groupCategoryData}
              categoryData={categoryData}
              realTimeData={realTimeData}
              realTimeCalcCategoryData={realTimeCalcCategoryData}
              realTimeCollectData={realTimeCollectData}
              changeDisplayModel={this.changeDisplayModel} //更改用户当前的操作类型
              displayModel={this.props.displayModel}
              treeSearch={treeSearch}
              deleteCategory={this.deleteCategory}
              deleteTask={this.deleteTask}
              saveOrder={this.saveTreeOrder}
              onSelect={this.openNewTab}
              changeState={this.changeState}
              allTaskList={allTaskList}
              isShowCategoryEditModal={isShowCategoryEditModal}
              isShowTaskEditModal={isShowTaskEditModal}
              editingOrder={editingOrder}
              groupTreeInfo={groupTreeInfo}
              treeInfo={treeInfo}
              disabled={isGest}
              saving={saving}
              activeModeType={activeModeType}
            />
          </div>
          <div className='height-100 task-right-panel pd1' defaultWeight={window.innerWidth - LEFT_PANEL_WIDTH} style={{ display: 'block' }}>
            <Tabs className='bg-white height-100' activeKey={activeTabsKey} type='editable-card' onChange={this.changeTabs} hideAdd>
              <TabPane tab='指引' key='guide' closable={false}>
                <div className='always-display-scrollbar scroll-content-100' style={{ height: `calc(100vh - ${taskFullscreen ? 95 : 145}px)` }}>
                  <GuideHome onAddTask={this.handleAddTask} />
                </div>
              </TabPane>
              {tabObjs.map(p => {
                const isActiveChilren =
                  (activeTabParentId && (p.parentId === activeTabParentId || p.id === activeTabParentId) && activeTabsKey !== p.key) ||
                  (!activeTabParentId && `task_${p.parentId}` === activeTabsKey)
                return (
                  <TabPane tab={this.renderTabTitle(p, isActiveChilren)} key={p.key} closable={false}>
                    <div style={{ height: `calc(100vh - ${taskFullscreen ? 95 : 128}px)` }}>{this.renderEditPanel(p)}</div>
                  </TabPane>
                )
              })}
            </Tabs>
          </div>
        </HorizontalSplitHelper>
      </div>
    )
  }
}
