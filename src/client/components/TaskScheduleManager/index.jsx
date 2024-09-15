import React from 'react'
import Bread from '../Common/bread'
import _ from 'lodash'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import TaskTree from './task-tree'
import { FolderOutlined, ScheduleOutlined } from '@ant-design/icons';
import { Button, Radio, Table, Tag } from 'antd'
import TaskEditor from './task-editor'
import TypeEditor from './type-editor'
import {browserHistory} from 'react-router'
import {isDiffByPath} from '../../../common/sugo-utils'
import {synchronizer} from '../Fetcher/synchronizer'
import tagRequirementChecker from '../TagManager/tag-require'
import { tryJsonParse } from '../../../common/sugo-utils'
import { AccessDataType } from 'common/constants'
import PubSub from 'pubsub-js'
import {RELOAD_TREE} from './constants'

const LEFT_PANEL_WIDTH = 240

@synchronizer(props => {
  let projectId = _.get(props, 'projectCurrent.id')
  return {
    url: '/app/sugo-schedule-task-extra-infos',
    modelName: 'taskExtraInfos',
    doFetch: !!projectId,
    doSync: true,
    query: {
      where: {
        project_id: projectId
      }
    }
  }
})
@synchronizer(props => {
  // TODO 待优化-》只在选中节点时查当前调度，而不是查询所有调度
  let projectId = _.get(props, 'projectCurrent.id')
  return {
    url: `/app/task-schedule/schedule?refProjectId=${projectId}`,
    modelName: 'schedules',
    doFetch: !!projectId,  // schedule
    resultExtractor: data => {
      return (data && data.schedules) 
        ? data.schedules.map(item => ({
          refProjectId:item.refProjectId,
          showName:item.showName,
          ...item.schedule
        }))
        : []
    }
  }
})
@synchronizer(props => ({
  // onLoaded: props.onLoaded,
  url: `/app/task-schedule/manager?treeOperation=getTreeInfo&refProjectId=${props.projectCurrent.id}`,
  modelName: 'treeInfos',
  doFetch: !!props.projectCurrent.id,
  resultExtractor: (data = []) => {
    if (!data) return []
    return [{
      types: data.projectTypes,
      tasks: data.projects.map(p => ({ ...p, cronInfo: tryJsonParse(p.cronInfo) })),
      order: data.projectTypeSort
    }]
  }
}))
@synchronizer(props => ({
  // onLoaded: props.onLoaded,
  url: '/app/task-schedule/executors?action=getActiveExecutors',
  modelName: 'executors',
  doFetch: !!props.projectCurrent.id,
  resultExtractor: data => data ? data.activeExecutors : []
}))
export default class TaskScheduleManager extends React.Component {
  state = {
    activeType: 'tree', // default:tree/table
    treeData: [],
    creatingKind: 'type', // ''(editing) | 'type' | 'task'
    // see this -> onSelectNode  
    pendingObject: {parentId: 0}
  }
  
  componentDidMount() {
    PubSub.subscribe(RELOAD_TREE, () => {
      this.props.reloadTreeInfos()
    })
  }

  componentWillReceiveProps(nextProps) {
    if (isDiffByPath(this.props, nextProps, 'params.nodeKey')) {
      this.onSelectNode(_.get(nextProps, 'params.nodeKey'))
    }
    if (isDiffByPath(this.props, nextProps, 'projectCurrent')) {
      this.setState({treeData: []})
    }
    if(isDiffByPath(this.props, nextProps, 'treeInfos')) {
      this.onLoadTreeData(nextProps.treeInfos)
    }
  }

  componentWillUnmount() {
    PubSub.unsubscribe(RELOAD_TREE)
  }

  goToDefaultTask = () => {
    const { location } = this.props
    let treeData = _.get(this._taskTree, 'state.treeData')
    function recurFindFirstTaskId(tree) {
      if (_.isEmpty(tree)) {
        return null
      }
      let [headNode, ...rest] = tree
      if (isFinite(headNode.key)) {
        return headNode.key
      }
      return recurFindFirstTaskId(headNode.children) || recurFindFirstTaskId(rest)
    }
    let firstTaskId = recurFindFirstTaskId(treeData)
    // patchPush(`/console/task-schedule-manager/${firstTaskId || ''}?activeKey=overview`)
    browserHistory.push(`/console/task-schedule-manager/${firstTaskId || ''}${location.search ? location.search : '?activeKey=overview'}`)
  }

  onLoadTreeData = data => {
    let { treeData } = this.state
    let nodeKey = _.get(this.props, 'params.nodeKey')

    this.setState({treeData: data}, () => {
      // 首次数据加载后，才跳转到第一个 task
      if (_.isEmpty(treeData) && !nodeKey) {
        this.goToDefaultTask()
      } else if (nodeKey) {
        let pendingObj = this.onSelectNode(nodeKey)
        if (!pendingObj) {
          // 跳转到了一个不存在的 task
          this.goToDefaultTask()
        }
      }
    })
  }

  renderCreatingPanel = () => {
    let nodeKey = _.get(this.props, 'params.nodeKey')
    let {creatingKind} = this.state
    let title = creatingKind === '' ? '编辑分类' : creatingKind === 'type' ? '添加任务分类' : '添加分类'
    let currTypeId = +(nodeKey || '').substr(5) || 0
    return (
      <div key="creating" className="bg-white corner relative" style={{height: 115, marginBottom: '10px', padding: '12px'}}>
        <div className="line-through-effect">
          <div className="creating-kind-title itblock bg-white" >{title}</div>
        </div>
        <div style={{marginTop: '20px'}}>
          <Button
            icon={<FolderOutlined />}
            type={creatingKind === 'type' ? 'primary' : 'default'}
            onClick={() => {
              this.setState({creatingKind: 'type', pendingObject: {parentId: currTypeId}})
            }}
          >添加任务分类</Button>
          <Button
            icon={<ScheduleOutlined />}
            className="mg2l"
            type={creatingKind === 'task' ? 'primary' : 'default'}
            onClick={() => this.setState({creatingKind: 'task', pendingObject: {typeId: currTypeId}})}
          >添加任务</Button>
        </div>
      </div>
    );
  }

  renderTypeEditor = () => {
    let { projectCurrent } = this.props
    let { pendingObject, treeData } = this.state

    return [
      this.renderCreatingPanel(),
      <TypeEditor
        key="typeEditor"
        projectId={projectCurrent && projectCurrent.id}
        value={pendingObject}
        treeData={treeData}
        onChange={nextType => {
          this.setState({pendingObject: nextType})
        }}
        onCurrentNodeDeleted={() => {
          this.goToDefaultTask()
        }}
      />
    ]
  }

  renderTaskEditor = () => {
    let {
      projectCurrent,
      datasourceCurrent, 
      taskExtraInfos, 
      modifyTaskExtraInfos, 
      location, 
      changeUrl,
      schedules, 
      reloadSchedules, 
      activeExecutors,
      reloadTreeInfos,
      executors
    } = this.props

    const { pendingObject } = this.state
    let scheduleArr = schedules.filter((item) => (item.projectId === pendingObject.id))

    return (
      <div style={{'minHeight': 'calc(100vh - 120px)', padding: '14px 35px 14px 14px'}} className="bg-white corner task-editor">
        <TaskEditor
          code={_.get(this.props, 'location.query.code')}
          projectId={projectCurrent && projectCurrent.id}
          dataSource={datasourceCurrent}
          value={pendingObject}
          activeExecutors={activeExecutors}
          changeUrl={changeUrl}
          location={location}
          onChange={nextTask => {
            console.log(nextTask)
          }}
          onCurrentNodeDeleted={async () => {
            // 删除本地额外信息
            await modifyTaskExtraInfos('', taskExtraInfos => (taskExtraInfos || []).filter(te => te.task_id !== pendingObject.id))
            this.goToDefaultTask()
          }}
          // 标签信息
          taskExtraInfo={_.find(taskExtraInfos, {task_id: pendingObject.id})}
          tagsAlreadyBinded={_(taskExtraInfos).filter(t => t.task_id !== pendingObject.id).flatMap(t => t.related_tags).value()}
          onExtraInfoChange={async (nextExtraInfo) => {
            let isCreating = !(pendingObject && pendingObject.id)
            let currTaskIdx = isCreating ? _.size(taskExtraInfos) : _.findIndex(taskExtraInfos, {task_id: pendingObject.id})
            if (currTaskIdx === -1) {
              currTaskIdx = _.size(taskExtraInfos)
            }
            return await modifyTaskExtraInfos([currTaskIdx], () => nextExtraInfo)
          }}
          scheduleInfo={scheduleArr}
          reloadSchedules={reloadSchedules}
          reloadTreeInfos={reloadTreeInfos}
          // 执行器
          executors={executors}
        />
      </div>
    )
  }

  onSelectNode = async nodeKey => {
    let {treeData} = this.state
    // 保存当前选中项 
    let pendingObject = _.startsWith(nodeKey, 'type-')
      ? _(treeData).chain().get([0, 'types']).find({id: +(nodeKey || '').substr(5)}).value()
      : _(treeData).chain().get([0, 'tasks']).find({id: +(nodeKey || '')}).value()

    this.setState({
      pendingObject: pendingObject || {parentId: 0},
      creatingKind: !pendingObject ? 'type' : ''
    })
    return pendingObject
  }

  FetchScheduleFromSelectNode = async () => {
    // TODO 根据当前任务进行调度查询
    let url = '/app/task-schedule/schedule?projectId=2&flowId=test22&ajax=fetchSchedulesByProject'
  }

  checkViewChange = e => {
    const type = e.target.value
    this.setState({
      activeType: type
    })
  }

  renderBread = () => {
    const { activeType } = this.state

    return (<Bread 
      path={[{name: '任务调度'}]} 
      children={
        (<Radio.Group value={activeType} onChange={this.checkViewChange} defaultValue="tree">
          <Radio.Button value="tree">任务分类</Radio.Button>
          <Radio.Button value="table">任务表格</Radio.Button>
        </Radio.Group>)
      }
            />)
  }

  renderTaskTree = () => {
    let nodeKey = _.get(this.props, 'params.nodeKey')
    let { creatingKind, treeData } = this.state
    let { projectCurrent, treeInfos } = this.props
    return ([
      <div
        className="task-tree-panel height-100"
        defaultWeight={LEFT_PANEL_WIDTH}
        collapseTitle="任务选择"
        key="choose"
      >
        <div className="bg-white corner height-100">
          <TaskTree
            innerRef={ref => this._taskTree = ref}
            projectId={projectCurrent && projectCurrent.id}
            className="task-tree overscroll-y"
            selectedKeys={[nodeKey].filter(_.identity)}
            onSelect={(selectedKeys) => {
              // 总是选择一个项
              if (!selectedKeys[0] && treeData[0].types.length) {
                return
              }
              browserHistory.push(`/console/task-schedule-manager/${selectedKeys[0] || ''}?activeKey=overview`)
            }}
            treeInfos={treeInfos || []}
            goToDefaultTask={this.goToDefaultTask}
            nodeKey={nodeKey}
          />
        </div>
      </div>,
      <div
        className="task-details-panel height-100 overscroll-y always-display-scrollbar"
        defaultWeight={window.innerWidth - LEFT_PANEL_WIDTH}
        key="preview"
      >
        {isFinite(nodeKey) /* type-xx is not finite */ || creatingKind === 'task'
          ? this.renderTaskEditor()
          : this.renderTypeEditor()}
      </div>
    ])
  }

  renderTaskTable = () => {
    const { schedules } = this.props
    const { treeData } = this.state
    const treeInfo = _.get(treeData, [0]) || {}
    const { tasks } = treeInfo
    if(tasks) {
      const columns = [{
        title: '任务名称',
        dataIndex: 'showName',
        align: 'center',
        render: (text, obj) => (
          <span 
            style={{cursor: 'pointer', color: '#428bca'}}
            onClick={() => {
              this.setState({
                activeType: 'tree'
              }, () => browserHistory.push(`/console/task-schedule-manager/${obj.id || ''}?activeKey=overview`))
            }}
          >{text}</span> )
      }, {
        title: '创建时间',
        dataIndex: 'createTimesString',
        align: 'center',
        key: 'createTimesString'
      }, {
        title: '是否启用调度',
        dataIndex: 'showName',
        align: 'center',
        key: 'schedule',
        render: text => {
          let schedule = schedules.filter(item => item.showName === text)
          return schedule.length > 0 ? <Tag color="#6969d7">已启用</Tag> : <Tag>未启用</Tag>
        } 
      }, {
        title: '调度数量',
        dataIndex: 'cronExpression',
        align: 'center',
        key: 'cronExpression',
        render: (text, obj) => {
          let schedule = schedules.filter(item => item.showName === obj.showName)
          return schedule.length
        }
      }, {
        title: '操作',
        dataIndex: 'domsome',
        align: 'center',
        key: 'domsome',
        render: () => (<span style={{cursor: 'pointer', color: '#428bca'}} onClick={() => {
          this.setState({
            activeType: 'tree'
          }, () => this.props.changeUrl({activeKey: 'execResult'}))
          //
        }}
        >执行记录</span>)
      }]
      
      return (
        <div className="task-table-container height-100 width-100">
          <Table 
            bordered
            dataSource={tasks} 
            columns={columns} 
            rowKey="id"
          />
        </div>
      )
    }
  }

  render() {
    let { activeType } = this.state
    // 去掉任务调度的项目限制 modify by WuQic 2019-04-10
    // let { projectCurrent, datasourceCurrent } = this.props
    // MySQL 接入允许访问调度任务
    // if (projectCurrent.access_type !== AccessDataType.MySQL) {
    //   let hintPage = tagRequirementChecker({projectCurrent, datasourceCurrent, moduleName: '任务调度'})
    //   if (hintPage) {
    //     return hintPage
    //   }
    // }

    return (
      <div className="task-schedule-manager height-100">
        {
          this.renderBread()
        }
        <HorizontalSplitHelper
          style={{height: 'calc(100% - 44px)'}}
          collapseWidth={100}
        >
          {
            activeType === 'tree'
              ? this.renderTaskTree()
              : this.renderTaskTable()
          }
        </HorizontalSplitHelper>
      </div>
    )
  }
}
