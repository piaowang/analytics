import React, { Component } from 'react'
import moment from 'moment'
import PubSub from 'pubsub-js'
import '@ant-design/compatible/assets/index.css'
import { Layout, message } from 'antd'
import SizeProvider from '../../../Common/size-provider'
import { immutateUpdate } from 'common/sugo-utils'
import { connect } from 'react-redux'
import _ from 'lodash'
import TaskNodeList from '../task-node-list'
import HorizontalSplitHelper from '../../../Common/horizontal-split-helper'
import VerticalSplitHelper from '../../../Common/vertical-split-helper'
import taskEditModel, { namespace } from './immediate-model'
import withRuntimeSagaModel from '../../../Common/runtime-saga-helper'
import FlowDesignPanel from '../flow-edit'
import ImmediateOperBtns from './immediate-oper-btns'
import { REALTIME_TASK_SCRIPT_MAP, TASK_EDIT_TABS_TYPE, TASK_CAN_EDIT_NODE_TYPE } from '../../constants'
import ImmediateBottom from './immediate-bottom-panel'

const LEFT_PANEL_WIDTH = 260
const { Content } = Layout
@connect((props, ownProps) => {
  return { ...props[`${namespace}_${ownProps.id}`] }
})
@withRuntimeSagaModel(taskEditModel)
export default class ImmediateTaskEdit extends Component {
  componentDidMount() {
    const { id } = this.props
    PubSub.subscribe(`immediateTaskEdit.saveTaskInfo.${id}`, (msg, callback) => {
      this.onSaveClickHandle(callback)
    })
  }
  componentWillUnmount() {
    PubSub.unsubscribe(`immediateTaskEdit.saveTaskInfo.${this.props.id}`)
  }
  changeState = model => {
    const { id } = this.props
    this.props.dispatch({
      type: `${namespace}_${id}/changeState`,
      payload: model
    })
  }
  configRef = {}
  onRef = child => {
    this.configRef = child
  }

  onSelect = (jobName, isDbClick) => {
    const { graphInfo, nodeData, taskInfo, dispatch, selectJob, id } = this.props
    if (!jobName) {
      this.changeState({
        selectJob: _.isEmpty(selectJob) ? { id: 'main', title: taskInfo.showName } : {}
      })
      return
    }
    let data = _.get(nodeData, jobName) || _.find(graphInfo?.graph, p => p.id === jobName)
    const oriType = _.get(data, 'type', '')
    const reg = /[a-z]+S/g
    const temType = (reg.exec(oriType) || [])[0] || ''
    const type = temType.substr(0, temType.length - 1)

    if (selectJob?.id === jobName) return
    // groovy 的节点配置信息
    if (data.type === TASK_EDIT_TABS_TYPE.groovy) {
      dispatch({
        type: `${namespace}_${id}/fetchCleanProps`,
        payload: {
          parentJobName: _.get(taskInfo, 'jobName', ''),
          projectId: taskInfo.projectId,
          jobName: data.id,
          selectJob: data,
          currentType: type
        }
      })
    }
    // 输入输出节点的配置信息
    if (_.endsWith(data.type, 'Source') || _.endsWith(data.type, 'Sink')) {
      const fileName = `${data.type}_${data.id}.json`
      dispatch({
        type: `${namespace}_${id}/downloadFlinkScript`,
        payload: {
          isEditScript: isDbClick,
          fileName,
          parentJobName: _.get(taskInfo, 'jobName', ''),
          projectId: taskInfo.projectId,
          selectJob: data,
          currentType: type
        }
      })
    }
  }

  onChange = obj => {
    this.changeState({ graphInfo: obj })
  }

  onDbClick = str => {
    const { openNewTab, graphInfo, taskInfo } = this.props
    const nodeInfo = graphInfo?.graph?.find(p => p.id === str)
    if (_.isEmpty(nodeInfo)) return
    const { title, type } = nodeInfo
    //打开新面板编辑
    if ((type === TASK_EDIT_TABS_TYPE.groovy || type === TASK_EDIT_TABS_TYPE.flinkSql) && str) {
      openNewTab(str, title, type, taskInfo.projectId)
    }
  }

  onAddNodeJob = (nodeType, pos) => {
    const { graphInfo, taskNodeList = [], editTaskInfo } = this.props
    if (nodeType === 'end' && graphInfo?.graph?.find(p => p.type === 'end')) {
      return message.error('已添加结束节点')
    }
    let nodeIndex = 0
    let nodeDic = _.keyBy(taskNodeList, p => p.nodeType)
    const showName = _.get(nodeDic, `${nodeType}.name`, '-')
    const items = (graphInfo?.graph || []).filter(p => _.includes(p.title, showName))
    if (items.length) {
      nodeIndex = _.max(items.map(p => _.toNumber(p.title.replace(showName, '') || 0))) + 1
    }
    const jobName = `${editTaskInfo.name}_node_${moment() + 0}`
    let path =
      _.endsWith(nodeType, 'Source') || _.endsWith(nodeType, 'Sink')
        ? `${nodeType}_${jobName}.json`
        : `clean_${jobName}.${_.get(REALTIME_TASK_SCRIPT_MAP, nodeType, REALTIME_TASK_SCRIPT_MAP.groovy)}`
    let newRule = {
      id: jobName,
      type: nodeType,
      title: showName + (!nodeIndex ? '' : nodeIndex),
      pos,
      params: {},
      outputs: [],
      inputs: [],
      path
    }
    this.onChange(immutateUpdate(graphInfo, 'graph', arr => [...(arr || []), newRule]))
  }

  saveQualityScript = () => {
    const { selectJob, scriptInfo, dispatch, taskInfo, id } = this.props
    const beforeType = _.get(scriptInfo, ['param', 'clean.before.type'], 'default')
    const beforeContent = _.get(scriptInfo, ['before.content'])
    const afterType = _.get(scriptInfo, ['param', 'clean.after.type'], 'default')
    const afterContent = _.get(scriptInfo, ['after.content'])
    const selectJobId = selectJob?.id
    let params = {
      jobName: selectJobId,
      parentJobName: taskInfo.jobName,
      projectId: taskInfo.projectId,
      data: {
        'clean.after': (!_.isEmpty(afterType === 'default' ? afterContent || [] : afterContent)).toString(),
        'clean.after.type': _.get(scriptInfo, ['param', 'clean.after.type'], 'default'),
        'clean.after.intercept': _.get(scriptInfo, ['param', 'clean.after.intercept'], 'false'),
        'clean.after.path': `after_${selectJobId}.${afterType === 'default' ? 'json' : 'groovy'}`,
        'clean.before': (!_.isEmpty(beforeType === 'default' ? beforeContent || [] : beforeContent)).toString(),
        'clean.before.type': _.get(scriptInfo, ['param', 'clean.before.type'], 'default'),
        'clean.before.path': `before_${selectJobId}.${beforeType === 'default' ? 'json' : 'groovy'}`,
        'clean.before.intercept': _.get(scriptInfo, ['param', 'clean.before.intercept'], 'false')
      },
      ['before.content']: _.get(scriptInfo, ['before.content']),
      ['after.content']: _.get(scriptInfo, ['after.content'])
    }
    dispatch({
      type: `${namespace}_${id}/saveProjectQualityScript`,
      payload: params
    })
  }

  saveNodeConfig = () => {
    const { selectJob, dataSourceList, dispatch, taskInfo, classMap, currentType, id } = this.props
    const curSelectJob = selectJob || {}
    if (curSelectJob.type === TASK_EDIT_TABS_TYPE.groovy) return this.saveQualityScript()
    const data = this.configRef.exportData()
    const dbType = data.dbType
    const currentDataSourceList = dataSourceList.filter(item => item.dbType === currentType)
    const oriDbContent = JSON.parse(
      _.get(
        currentDataSourceList.find(item => item.id === dbType),
        'dbContent',
        '{}'
      )
    )
    const attachDbContent = data.dbContent
    // 拼接节点及其配置数据
    let params = {
      projectId: taskInfo.projectId,
      parentJobName: taskInfo.jobName,
      jobName: curSelectJob.id,
      data: {
        type: curSelectJob.type,
        name: curSelectJob.title,
        className: _.get(classMap, curSelectJob.type, ''),
        ...oriDbContent,
        ...attachDbContent
      },
      findDbTable: 'sugo_db_info'
    }
    dispatch({
      type: `${namespace}_${id}/saveSourceProperties`,
      payload: params
    })
  }

  onSaveClickHandle = () => {
    const { id } = this.props
    this.props.dispatch({
      type: `${namespace}_${id}/saveProject`,
      payload: {}
    })
  }

  cancelLongExecution = () => {
    const { dispatch, taskInfo, runningInfo, id } = this.props
    if (_.isEmpty(runningInfo)) {
      return
    }
    const { executionId } = runningInfo
    dispatch({
      type: `${namespace}_${id}/cancelExecution`,
      payload: {
        execid: executionId,
        projectId: taskInfo.projectId
      }
    })
  }

  longExecution = () => {
    const { dispatch, taskInfo, id } = this.props
    dispatch({
      type: `${namespace}_${id}/execution`,
      payload: {
        projectId: taskInfo.projectId,
        flowId: taskInfo?.data?.title
      }
    })
  }

  removeJobNode = () => {
    let { selectJob, graphInfo } = this.props
    if (_.isEmpty(selectJob)) {
      return null
    }
    let newGraph = (graphInfo.graph || [])
      .filter(p => p.id !== selectJob.id)
      .map(p => {
        if (_.includes(p.outputs, selectJob.id)) {
          return {
            ...p,
            outputs: _.pull(p.outputs, selectJob.id)
          }
        }
        if (_.includes(p.inputs, selectJob.id)) {
          return {
            ...p,
            inputs: _.pull(p.inputs, selectJob.id)
          }
        }
        return p
      })

    this.onChange({ ...graphInfo, graph: newGraph })
  }

  render() {
    const {
      runningStatus,
      id,
      scriptInfo,
      lineData,
      taskNodeList = [],
      graphInfo,
      taskInfo = {},
      selectJob,
      dataSourceList,
      editNodeParams,
      paramsMap,
      currentType,
      runningInfo,
      dataSourceAllList = {},
      typeData = {},
      taskProps = {},
      dispatch,
      stoping
    } = this.props
    const isRunning = _.includes(['SUCCESS', 'SUCCEED', 'SUCCEEDED', 'RUNNING'], _.get(runningInfo, 'status', ''))
    const curSelectJob = selectJob || {}
    return (
      <Layout className='height-100'>
        <HorizontalSplitHelper collapseWidth={100} className='height-100'>
          <div
            className='height-100 task-left-panel pd1t pd1l bg-white borderr bordert overscroll-y always-display-scrollbar'
            defaultWeight={LEFT_PANEL_WIDTH}
            collapseTitle='任务选择'
          >
            <div className='bg-white'>
              <TaskNodeList canEdit categoryInfo={[{ key: 'type-3', title: '节点列表', children: taskNodeList }]} />
            </div>
          </div>
          <div className='height-100 task-right-panel pd1' defaultWeight={window.innerWidth - LEFT_PANEL_WIDTH - 400}>
            <Content style={{ height: 'calc( 100vh - 136px )' }}>
              <ImmediateOperBtns
                cancelLongExecution={this.cancelLongExecution}
                isRunning={runningStatus ? !isRunning : isRunning}
                stoping={stoping}
                id={id}
                changeState={this.changeState}
                longExecution={this.longExecution}
                modalProps={{ dataSourceAllList, typeData, taskInfo, taskProps }}
                dispatch={dispatch}
              />
              <VerticalSplitHelper {..._.pick(this.props, ['style', 'className'])} style={{ height: 'calc(100% - 37px)' }}>
                <div defaultWeight={50} key={`task-flow-${id}`}>
                  <div id='task-edit-main' style={{ height: 'calc( 100% - 5px )' }}>
                    <SizeProvider>
                      {({ spWidth, spHeight }) => {
                        let value = graphInfo
                        if (graphInfo && _.isEmpty(graphInfo.transform)) {
                          const defaultTansform = [spWidth * 0.2, spHeight / 2]
                          value = {
                            graph: graphInfo.graph,
                            transform: defaultTansform,
                            defaultTansform
                          }
                        }
                        return (
                          <FlowDesignPanel
                            spWidth={spWidth}
                            spHeight={spHeight}
                            canEditNodeType={TASK_CAN_EDIT_NODE_TYPE} // 控制可否右键编辑 工作流组节点不允许编辑脚本
                            onChange={this.onChange}
                            onSelect={this.onSelect}
                            onEditNodeInfo={this.onDbClick}
                            value={value}
                            selectedKey={_.get(curSelectJob, 'id', '')}
                            onAddNodeJob={this.onAddNodeJob}
                          />
                        )
                      }}
                    </SizeProvider>
                  </div>
                </div>
                <div className='bg-white' defaultWeight={!_.isEmpty(curSelectJob) ? '65' : '0'} key={`task-console${id}`} collapseTitle='基础信息'>
                  <ImmediateBottom
                    selectJob={curSelectJob}
                    dataSourceList={dataSourceList}
                    editNodeParams={editNodeParams}
                    paramsMap={paramsMap}
                    currentType={currentType}
                    changeState={this.changeState}
                    taskInfo={taskInfo}
                    scriptInfo={scriptInfo}
                    lineData={lineData}
                    onRef={this.onRef}
                    removeJobNode={this.removeJobNode}
                    saveNodeConfig={this.saveNodeConfig}
                    id={id}
                  />
                </div>
              </VerticalSplitHelper>
            </Content>
          </div>
        </HorizontalSplitHelper>
      </Layout>
    )
  }
}
