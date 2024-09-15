import React from 'react'
import TaskScheduleDesign from './flow/flow-design'
import TaskScheduleLog from './flow/schedule-log'
import { DeleteOutlined, PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { Tabs, Button, Modal } from 'antd'
import TaskBasicSettings from './task-basic-settings'
import TaskLogger from './taskLogger/'
import {withPoster} from '../Fetcher/poster'
import _ from 'lodash'
// import {message} from 'antd/lib/index'
import { message } from 'antd'
import {RELOAD_TREE} from './constants'
import {sendURLEncoded} from '../../common/fetch-utils'
import PubSub from 'pubsub-js'
import {toQueryParams, tryJsonParse} from '../../../common/sugo-utils'
import Fetch from '../../common/fetch-final'
import {browserHistory} from 'react-router'
import MonitorDashBorad from './dqMonitor/monitor-dashboard'
// import UploadModal from './upload-modal'

const TabPane = Tabs.TabPane

export default class TaskEditor extends React.Component {
  execResultRef = React.createRef()
  TaskLoggerRef = React.createRef()
  taskBasicSettingsRef = React.createRef()
  heartbeatId = 0
  state = {
    uploadVisable: false
  }
  renderDeleteTaskBtn = withPoster(_.identity)(poster => {
    let { onCurrentNodeDeleted, reloadTreeInfos, value } = this.props
    return (
      <Button
        className="mg2l"
        key="del"
        icon={<DeleteOutlined />}
        loading={poster.isFetching}
        onClick={async () => {
          Modal.confirm({
            title: `确认删除此任务 ${value.showName} ？`,
            content: '此操作无法撤销，请谨慎操作',
            okText: '确定',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
              let res = await poster.fetch(null, {
                ...sendURLEncoded,
                body: poster.prePost
              })
              // {status: "success"}
              res = tryJsonParse(res)
              if ('error' in res) {
                message.warn(`删除任务失败：${res.error}`)
              } else {
                message.success('删除任务成功')
                PubSub.publish(RELOAD_TREE)
                onCurrentNodeDeleted()
                reloadTreeInfos()
              }
            }
          })
        }}
      >删除任务</Button>
    );
  })

  execTask = async () => {
    Modal.confirm({
      title: '确认立即执行任务？',
      onOk: async () => {
        let {value, projectId} = this.props
        let flowsInfo = await Fetch.get(`/app/task-schedule/manager?${toQueryParams({
          ajax: 'fetchprojectflows',
          project: value.name,
          refProjectId: projectId
        })}`)

        // console.log(flowsInfo) => { flows: [{flowId: "tas1"}], project: "tas1", projectId: 29 }

        if (_.isEmpty(flowsInfo.flows)) {
          message.warn('没有配置任务流程，无法启动调度。')
          return
        }

        let executorParam = {
          ajax: 'executeFlow',
          project: value.name,
          projectId: value.id,
          refProjectId: projectId,
          flow: _.get(flowsInfo, 'flows[0].flowId')
        }

        // 多执行器现在不再单独保存，而是保存在的任务当中公用、同调度
        // let formField = await this.taskBasicSettingsRef.getFormField()
        // let flowOverride = _.get(formField, ['flowOverride'])
        // if(flowOverride.type === 1 && flowOverride.deviceArr.length) {
        //   let arr = flowOverride.deviceArr.map(item => item.id)
        //   executorParam.flowOverride = {useExecutorList: JSON.stringify(arr)}
        // }

        let res = await Fetch.get(`/app/task-schedule/executor?${toQueryParams(executorParam)}`)
        if (res.status === 'error') {
          let errmsg = res.error
          if(res.error.match(/running/)) {
            errmsg = '任务正在执行中，请勿重复执行'
          }
          
          Modal.warn({
            title: '执行任务失败',
            content: errmsg
          })
          return
        }

        Modal.success({
          title: '发送执行请求成功',
          content: `执行记录 ID 为：${res.execid}`,
          onOk: () => {
            res.execid.length > 1
              ? browserHistory.push(`/console/task-schedule-manager/${value.id}?activeKey=execResult`)
              : browserHistory.push(`/console/task-schedule-manager/${value.id}?code=${res.execid}&activeKey=execLog`)
          }
        })
      }
    })
  }

  renderExtra = activeKey => {
    let {value} = this.props
    if (!_.get(value, 'id')) {
      return null
    }
    if(activeKey === 'overview') {
      return [
        <Button
          className="mg2l"
          type="primary"
          key="exec"
          onClick={this.execTask}
          icon={<PlayCircleOutlined />}
        >执行操作</Button>,
        this.renderDeleteTaskBtn({
          url: '/app/task-schedule/manager',
          prePost: toQueryParams({
            treeOperation: 'deleteProject',
            projectId: value.id
          }),
          doFetch: false,
          key: 'del'
        })
        // <UploadModal key={'upload'} {...this.props.value} /> move to flow......
      ];
    }
    if(activeKey === 'execResult') {
      return (
        <Button
          onClick={() => this.execResultRef.current.getData()}
          icon={<ReloadOutlined />}
          type="primary"
        >刷新</Button>
      );
    }
    if(activeKey === 'execLog') {
      return (
        <Button
          onClick={() => this.TaskLoggerRef.current.getData()}
          icon={<ReloadOutlined />}
          type="primary"
        >刷新</Button>
      );
    }
  }

  state = {
    activeKey: 'overview'
  }

  startHeartbeat = (projectId, taskName) => {
    this.heartbeatId = window.setInterval(async () => await Fetch.get(`/app/task-schedule/manager?project=${taskName}&ajax=heartbeat&refProjectId=${projectId}`), 5000)
  }

  clearHeartbeat = () => {
    if (this.heartbeatId) {
      window.clearInterval(this.heartbeatId)
    }
  }

  componentWillUnmount() {
    this.clearHeartbeat()
  }

  componentDidMount() {
    const { location } = this.props
    this.setState({
      activeKey: location.query.activeKey || 'overview'
    })
  }

  componentWillReceiveProps(nextProps) {
    const { projectId, value, location } = this.props
    if (location.query.activeKey === 'flow' && (projectId !== nextProps.projectId || value.name !== nextProps.value.name)) {
      this.clearHeartbeat()
      this.startHeartbeat(nextProps.projectId, nextProps.value.name)
    }
    if(location.query.activeKey !==  nextProps.location.query.activeKey ) {
      this.clearHeartbeat()
      if(nextProps.location.query.activeKey === 'flow') {
        this.startHeartbeat(nextProps.projectId, nextProps.value.name)
      }
      this.setState({
        activeKey: nextProps.location.query.activeKey || 'overview'
      })
    }
  }

  addPanes = (id) => {
    this.setState({
      panes: { title: '执行日志', content: '执行日志', key: 'execLog' },
      activeKey: 'execLog'
    })
  }

  changeTab = (activeKey) => {
    const { projectId, value } = this.props
    if(activeKey !== 'flow') {
      this.clearHeartbeat()
    } else {
      this.startHeartbeat(projectId, value.name)
    }
    // if(activeKey !== 'execLog' ) {
    //   this.props.changeUrl({code: '',activeKey})
    // } else {
    this.props.changeUrl({activeKey})
    // }
    this.setState({ activeKey })
  }

  render() {
    let { panes, activeKey } = this.state
    let {
      value,
      onChange,
      projectId,
      dataSource,
      code,
      taskExtraInfo,
      tagsAlreadyBinded,
      onExtraInfoChange,
      scheduleInfo,
      reloadSchedules,
      activeExecutors,
      reloadTreeInfos,
      location,
      executors
    } = this.props

    let isCreating = !_.get(value, 'id')
    return (
      <div>
        <Tabs
          type="card"
          activeKey={activeKey}
          tabBarExtraContent={this.renderExtra(activeKey)}
          onChange={(activeKey) => {
            this.changeTab(activeKey)
          }}
        >
          <TabPane
            tab={(<div className="itblock minw85 aligncenter" >概览</div>)}
            key="overview"
          >
            {activeKey === 'overview' && (
              <TaskBasicSettings
                wrappedComponentRef={(inst) => this.taskBasicSettingsRef = inst}
                projectId={projectId}
                value={value}
                dataSource={dataSource}
                taskExtraInfo={taskExtraInfo}
                tagsAlreadyBinded={tagsAlreadyBinded}
                onExtraInfoChange={onExtraInfoChange}
                scheduleInfo={scheduleInfo}
                reloadSchedules={reloadSchedules}
                activeExecutors={activeExecutors}
                reloadTreeInfos={reloadTreeInfos}
                location={location}
                executors={executors}
              />
            )}
          </TabPane>

          {isCreating ? null : (
            <TabPane
              tab={(<div className="itblock minw85 aligncenter" >流程编辑</div>)}
              key="flow"
            >
              {activeKey === 'flow' && (
                <TaskScheduleDesign
                  projectId={projectId}
                  taskName={value.name}
                  value={value}
                />
              )}
            </TabPane>
          )}

          {isCreating ? null : (
            <TabPane
              tab={(<div className="itblock minw85 aligncenter" >执行记录</div>)}
              key="execResult"
            >
              {activeKey === 'execResult' && (
                <TaskScheduleLog
                  ref={this.execResultRef}
                  opentExecLog={this.addPanes}
                  projectId={projectId}
                  taskName={value.name}
                  taskId={value.id}
                />
              )}
            </TabPane>
          )}
          {
            (!isCreating && code) && <TabPane
              tab={(<div className="itblock minw85 aligncenter" >日志记录</div>)}
              key="execLog"
            >
              {
                activeKey === 'execLog'
                && <TaskLogger ref={this.TaskLoggerRef} activeKey={activeKey} code={code} />
              }
            </TabPane>
          }{value.name ?
            <TabPane
              tab={(<div className="itblock minw85 aligncenter" >监控指标</div>)}
              key="monitor"
            >
              {
                activeKey === 'monitor'

                && <MonitorDashBorad
                  taskName={value.name}
                />
              }
            </TabPane> : null
          }

        </Tabs>
      </div>
    )
  }
}
