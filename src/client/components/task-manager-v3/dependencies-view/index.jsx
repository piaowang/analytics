import React, { useState, useRef, useEffect } from 'react'
import { connect } from 'react-redux'
import _ from 'lodash'
import { Select, Spin } from 'antd'
import HorizontalSplitHelper from '../../Common/horizontal-split-helper'
import VerticalSplitHelper from '../../Common/vertical-split-helper'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import TaskCategoryTree from './offline-tree'
import taskV3DependenciesViewModel, { namespace } from './model'
import SizeProvider from '../../Common/size-provider'
import FlowDesingner from './preview-flow'
import DependenciesInfo from './dependencies-info'
import './index.styl'

const Index = function (props) {
  const { taskList = [], taskGroupList = [], taskProjectList = [], selectTaskProjectId, dependencies, height, loading } = props
  const [state, setState] = useState({ showDependenciesModal: false, selectTask: '' })
  const [loadingGrahp, setLoadingGrahp] = useState(false)
  const [selectTaskGraph, setSelectTaskGraph] = useState({})
  const [selectJob, setSelectJob] = useState('')
  const dependenciesMap = useRef({})
  const selectJobRef = useRef()
  const selectTaskProjectIdRef = useRef()
  const isTaskGroupRef = useRef()

  const getTaskList = projectId => {
    handleChangeLoad(true)
    props.dispatch({
      type: `${namespace}/getTaskList`,
      payload: { selectTaskProjectId: projectId }
    })
  }

  useEffect(() => {
    // 选择工作流项目变更后获取项目数据
    if (selectTaskProjectId) {
      setState({ ...state, selectTaskProjectId })
      selectTaskProjectIdRef.current = selectTaskProjectId
      const taskId = _.get(taskList, '0.id', '')
      if (taskId) {
        handleSelectTask(taskId, false)
      }
    }
  }, [selectTaskProjectId])

  /**
   * 选择工作流后生成依赖关系
   * @param {*} str
   * @param {*} isTaskGroup
   */
  const handleSelectTask = (str, isTaskGroup) => {
    setLoadingGrahp(true)
    let info = _.get(dependenciesMap, str, {})
    if (_.isEmpty(info)) {
      info = getTaskDependencies(dependencies, str, isTaskGroup, _.concat(taskList, taskGroupList))
      dependenciesMap.current = {
        ...dependenciesMap,
        [str]: { graph: info }
      }
    }
    setState({ ...state, selectTask: str, showDependenciesModal: false })
    isTaskGroupRef.current = isTaskGroup
    setSelectTaskGraph({ graph: info })
    setLoadingGrahp(false)
  }

  /**
   * 流程图选中节点显示节点依赖详情
   * @param {*} str
   */
  const handleSelectJob = str => {
    if (selectJobRef.current == str) {
      setState({ ...state, showDependenciesModal: false })
      setSelectJob('')
      selectJobRef.current = ''
      return
    }
    setState({ ...state, showDependenciesModal: true })
    selectJobRef.current = str
    setSelectJob(str)
  }

  const handleDoubleClickJob = str => {
    window.open(`/console/task-schedule-v3/task-edit/${selectTaskProjectIdRef.current}?taskId=${str}`)
  }

  const handleChangeLoad = status => {
    props.dispatch({
      type: `${namespace}/changeState`,
      payload: { loading: status }
    })
  }

  const selectProjectInfo = taskProjectList.find(p => p.id === selectTaskProjectId)

  return (
    <div className='task-deoendencies-info bg-main' style={{ height }}>
      <HorizontalSplitHelper style={{ height: '100%', display: 'flex', flexWrap: 'nowrap' }} collapseWidth={100}>
        <div className='height-100  bg-white overscroll-y always-display-scrollbar' defaultWeight={5} collapseTitle='任务选择'>
          <Spin spinning={loading}>
            <div>
              <div className='pd1'>所属项目：</div>
              <Select className='pd1x width-100 pd1b' onChange={getTaskList} placeholder='选择查看的项目' value={selectTaskProjectId}>
                {taskProjectList.map(p => (
                  <Select.Option key={`status_${p.id}`} value={p.id}>
                    {p.name}
                  </Select.Option>
                ))}
              </Select>
            </div>
            <TaskCategoryTree
              isPreview
              taskGroupList={taskGroupList}
              taskList={taskList}
              taskProjectId={selectTaskProjectId}
              onSelectTask={handleSelectTask}
              onLoaded={() => handleChangeLoad(false)}
            />
          </Spin>
        </div>
        <div className='height-100 pd1' defaultWeight={25} style={{ display: 'block' }}>
          <VerticalSplitHelper {..._.pick(props, ['style', 'className'])} style={{ height: 'calc(100% - 9px)' }}>
            <div defaultWeight={65} key='flow-content'>
              <SizeProvider>
                {({ spWidth, spHeight }) => {
                  let value = selectTaskGraph
                  if (_.isEmpty(value.transform)) {
                    const defaultTansform = [spWidth * 0.2, spHeight / 2]
                    value = {
                      ...value,
                      transform: defaultTansform,
                      defaultTansform
                    }
                  }
                  return (
                    <Spin spinning={loadingGrahp}>
                      <FlowDesingner
                        spWidth={spWidth}
                        spHeight={spHeight}
                        isPreview
                        onChange={obj => {
                          setSelectTaskGraph(obj)
                        }}
                        onSelect={str => handleSelectJob(str, selectJob)}
                        onDbClick={handleDoubleClickJob}
                        value={value}
                        selectedKey={selectJob}
                      />
                    </Spin>
                  )
                }}
              </SizeProvider>
            </div>
            <div className='bg-white' key='flow-info' collapseTitle='依赖关系' defaultWeight={state.showDependenciesModal ? 50 : 0}>
              <DependenciesInfo
                taskList={_.concat(taskList, taskGroupList)}
                dependencies={dependencies}
                selectJob={selectJob}
                isTaskGroup={isTaskGroupRef.current}
                taskProjectName={_.get(selectProjectInfo, 'name', '')}
              />
            </div>
          </VerticalSplitHelper>
        </div>
      </HorizontalSplitHelper>
    </div>
  )
}

export default connect(state => ({
  ...state[namespace]
}))(withRuntimeSagaModel(taskV3DependenciesViewModel)(Index))

/**
 * 获取前置和后置依赖关系
 * @param {*} dependencies 依赖关系信息
 * @param {*} taskId 当前选中任务
 * @param {*} isTaskGroup 是否是工作流
 * @param {*} taskList 工作流列表
 */
const getTaskDependencies = (dependencies = [], taskId, isTaskGroup, taskList) => {
  const before = getBeforeDependencies(dependencies, taskId, isTaskGroup, taskList)
  const after = getAfterDependencies(dependencies, taskId, isTaskGroup, taskList)
  return [...before, ...after]
}

// 获取节点的依赖关系
const getBeforeDependencies = (dependencies, taskId, isTaskGroup, taskList) => {
  const info = dependencies.find(p => p.projectId.toString() === taskId)
  // 依赖关系为空只显示当前节点信息
  if (_.isEmpty(info)) {
    const obj = taskList.find(p => p.id.toString() === taskId)
    return [
      {
        pos: [0, 0],
        title: obj.showName,
        inputs: [],
        ports: {},
        id: taskId,
        type: isTaskGroup ? 'taskGroup' : 'task'
      }
    ]
  }
  let dependentList = _.flatten(info.waitNodeList.map(p => p.dependentList))
  dependentList = dependentList.filter(p => (isTaskGroup ? p.dependentGroupId : !p.dependentGroupId))
  const data = [
    {
      pos: [0, 0],
      title: info.projectName,
      inputs: dependentList.map(p => (isTaskGroup ? p.dependentGroupId.toString() : p.dependentProjectId.toString())),
      ports: {},
      id: info.projectId.toString(),
      type: isTaskGroup ? 'taskGroup' : 'task'
    }
  ]
  const dependentData = dependentList.map(p => {
    return getBeforeDependencies(dependencies, isTaskGroup ? p.dependentGroupId.toString() : p.dependentProjectId.toString(), isTaskGroup, taskList)
  })
  return _.flatten([data, ...dependentData])
}

//获取后置依赖信息
const getAfterDependencies = (dependencies, taskId, isTaskGroup) => {
  let list = dependencies
    .map(p => {
      const objs = _.flatten(p.waitNodeList.map(item => item.dependentList)).filter(d => {
        if (isTaskGroup) {
          return d.dependentGroupId && d.dependentGroupId.toString() === taskId
        }
        return d.dependentProjectId.toString() === taskId && !d.dependentGroupId
      })
      return {
        ...p,
        dependentList: objs
      }
    })
    .filter(p => p.dependentList.length)
  const data = list.map(p => {
    const res = p.dependentList.map(d => {
      return {
        pos: [0, 0],
        title: p.projectName,
        inputs: [isTaskGroup ? d.dependentGroupId.toString() : d.dependentProjectId.toString()],
        ports: {},
        id: p.projectId,
        type: isTaskGroup ? 'taskGroup' : 'task'
      }
    })
    return _.flatten(res)
  })
  const dependentData = list.map(p => {
    return getAfterDependencies(dependencies, p.projectId.toString(), isTaskGroup)
  })
  return _.flattenDeep([data, dependentData])
}
