import React from 'react'
import { connect } from 'react-redux'
import { Tabs, Button, Input, message } from 'antd'
import BaseInfo from './baseInfo'
import ControlConfig from './controlConfig'
import NotifyWarn from './notifyWarn'
import ApiWarn from './api-warn'
import ExecuteParams from './executeParams'
import { namespace } from '../model'
import _ from 'lodash'
import { DEFAULT_CRONINFO } from '../../../TaskScheduleManager2/constants'
import { getUsers } from '../../../../actions/users'
import moment from 'moment'
import PubSub from 'pubsub-js'
import PropTypes from 'prop-types'
import LogPanel from './log'
import { validateFieldsAndScrollByForm } from '../../../../common/decorators'
import { ALARM_API_TEMPLATE_CONTENT } from './alarm-api-template'
import { immutateUpdate } from '../../../../../common/sugo-utils'
import { ALARM_API_TYPE } from '../../../../../common/convert-alarm-info'

const { TabPane } = Tabs

class FlowConsole extends React.Component {

  state = {
    flowName: '新建工作流',
    cronInfo: {
      ...DEFAULT_CRONINFO,
      taskEndTime: moment().add(10, 'y')
    },
    notifyWarnObj: {
      successEmails: '',
      emailAlertType: 'on_all'
    },
    executeParamsObj: {
      flowPriority: 5,
      retries: window.sugo.taskReRun.retries,
      backoff: window.sugo.taskReRun.backoff,
      executeType: 1,
      idealExecutorIds: '',
      executors: []
    },
    validForm: [],
    selectTabs: 'baseInfo'
  }

  componentDidMount() {
    this.props.dispatch(getUsers())
    const { pgTaskInfoMap, taskId, taskShowName, executeParams } = this.props
    if (pgTaskInfoMap && taskId) {
      let pgTaskInfo = pgTaskInfoMap[taskId] || {}
      this.setState({
        cronInfo: { ...DEFAULT_CRONINFO, taskEndTime: moment().add(10, 'y'), ..._.get(pgTaskInfo, 'params.cronInfo') },
        notifyWarnObj: { successEmails: '', emailAlertType: 'on_all', ..._.get(pgTaskInfo, 'params.notifyWarnObj') },
        apiAlertInfos: _.get(pgTaskInfo, 'params.apiAlertInfos'),
        executeParamsObj: {
          ...executeParams,
          executeType: _.get(pgTaskInfo, 'params.executeParamsObj.idealExecutorIds', '') ? 2 : 1,
          idealExecutorIds: _.get(pgTaskInfo, 'params.executeParamsObj.idealExecutorIds', ''),
          flowPriority: _.get(pgTaskInfo, 'params.executeParamsObj.flowPriority', ''),
          retries: _.get(pgTaskInfo, 'params.executeParamsObj.retries', window.sugo.taskReRun.retries),
          backoff: _.get(pgTaskInfo, 'params.executeParamsObj.backoff', window.sugo.taskReRun.backoff)
        }
      })
    }
    if (taskShowName) {
      this.setState({ flowName: taskShowName })
    }
    PubSub.subscribe(`taskEditV3.saveTaskInfo.${taskId}`, (msg, callback) => {
      this.saveData(callback)
    })
  }

  componentDidUpdate(prevProps) {
    const { pgTaskInfoMap, taskId, taskShowName, executeParams } = this.props
    if (pgTaskInfoMap !== prevProps.pgTaskInfoMap && taskId) {
      let pgTaskInfo = pgTaskInfoMap[taskId] || {}
      this.setState({
        cronInfo: { ...DEFAULT_CRONINFO, taskEndTime: moment().add(10, 'y'), ..._.get(pgTaskInfo, 'params.cronInfo') },
        notifyWarnObj: { successEmails: '', emailAlertType: 'on_all', ..._.get(pgTaskInfo, 'params.notifyWarnObj') },
        executeParamsObj: {
          ...executeParams,
          executeType: _.get(pgTaskInfo, 'params.executeParamsObj.idealExecutorIds', '') ? 2 : 1,
          idealExecutorIds: _.get(pgTaskInfo, 'params.executeParamsObj.idealExecutorIds', ''),
          flowPriority: _.get(pgTaskInfo, 'params.executeParamsObj.flowPriority', ''),
          retries: _.get(pgTaskInfo, 'params.executeParamsObj.retries', window.sugo.taskReRun.retries),
          backoff: _.get(pgTaskInfo, 'params.executeParamsObj.backoff', window.sugo.taskReRun.backoff)
        }
      })
    }
    if (taskShowName !== prevProps.taskShowName) {
      this.setState({ flowName: taskShowName })
    }
  }

  componentWillUnmount() {
    const { taskId } = this.props
    PubSub.unsubscribe(`taskEditV3.saveTaskInfo.${taskId}`)
  }

  saveData = async (callback) => {

    const {
      taskId = '', changeEditStatus,
      graphInfo, taskProjectId,
      taskName, selectCategory, isTaskGroup = false,
      taskList, offLineTaskGroupList = [], jobParams, typeName
    } = this.props
    const { flowName, cronInfo, notifyWarnObj, executeParamsObj, validForm, apiAlertInfos: stateApiAlertInfos } = this.state

    let apiAlertInfos = []
    for (let i in validForm) {
      const item = validForm[i]
      const val = await validateFieldsAndScrollByForm(item)
      if (!val) {
        this.changeState({ selectedKey: 'apiWarn' })
        return false
      }
      if (val.url || val.emails) {
        const template = _.get(ALARM_API_TEMPLATE_CONTENT, val.templateType || val.alarmType, {})
        let paramMap = template.paramMap
        if (val.templateType !== ALARM_API_TYPE.custom) {
          paramMap = immutateUpdate(paramMap, 'text.content', () => val.content)
          if (val.alterUsers && val.alterUsers.length) {
            paramMap = immutateUpdate(paramMap, 'at.atMobiles', () => val.alterUsers)
          }
        } else {
          try {
            paramMap = eval(`(${val.customContent})`)
          } catch (error) {
            item.setFields({ customContent: { value: val.customContent, errors: [new Error('不是有效的json格式')] } })
            this.changeState({ selectedKey: 'apiWarn' })
            return false
          }
        }
        let data = {
          url: val.url,
          alarmType: val.alarmType,
          emails: val.emails,
          paramMap,
          method: val.method,
          templateType: val.templateType,
          alterType: val.alterType,
          alarmWay: val.alarmWay
        }
        if (val.alarmType === ALARM_API_TYPE.execTimeoutAlarm) {
          data = {
            ...data,
            intervalMills: val.intervalMills || 5,
            timeoutMills: val.timeoutMills || 30
          }
        }
        apiAlertInfos.push(data)
      }
    }
    apiAlertInfos = _.isEmpty(apiAlertInfos) ? stateApiAlertInfos : apiAlertInfos
    let regex = new RegExp('[^a-zA-Z0-9\_\u4e00-\u9fa5]', 'i')
    if (regex.test(flowName)) return message.error('工作流名称只允许数字 中文 英文 下划线组成')
    if (flowName.length > 60) return message.error('1-60个字符')
    if (!flowName.length) return message.error('不允许为空')
    if (isTaskGroup) {
      if (offLineTaskGroupList.filter(o => o.showName === flowName && o.id !== taskId).length)
        return message.warn('工作流组命名重复')
    } else {
      if (taskList.filter(o => o.showName === flowName && o.id !== taskId).length)
        return message.warn('工作流命名重复')
    }

    const jobParamsObj = {}
    jobParams.forEach(o => _.set(jobParamsObj, o.name, o.value))
    const payload = {
      task_id: taskId,
      name: taskName,
      task_project_id: taskProjectId,
      showName: flowName,
      graphInfo,
      params: {
        cronInfo,
        notifyWarnObj,
        executeParamsObj,
        apiAlertInfos
      },
      isTaskGroup,
      jobParams: jobParamsObj,
      typeName
    }
    if (selectCategory) {
      payload.category_id = selectCategory
    }
    this.props.dispatch({
      type: `${namespace}/saveTaskInfo`,
      payload,
      callback: (str) => {
        changeEditStatus(taskId, false)
        callback && callback()
        if (!taskId) {
          PubSub.publish('taskEditV3.afterSaveNewTab', { id: str, isTaskGroup })
        }
      }
    })
  }

  render() {
    const {
      taskId = '', taskName = '', changeEditStatus, disabled = false,
      taskProjectInfo = {}, usersDict = {}, pgTaskInfoMap = {},
      isTaskGroup = false, display, height
    } = this.props
    if (!display) {
      return null
    }
    const { flowName, cronInfo, notifyWarnObj, executeParamsObj, selectTabs, apiAlertInfos = [], validForm } = this.state
    let pgTaskInfo = pgTaskInfoMap[taskId] || {}
    let defaultBaseInfoObj = {
      title: _.get(taskProjectInfo, 'name'),
      flowName,
      created_at: _.get(pgTaskInfo, 'created_at') || new Date(),
      created_by: _.get(pgTaskInfo, 'created_by') || window.sugo.user.id,
      approveState: _.get(pgTaskInfo, 'status') || 0
    }
    let tabs = [
      {
        tab: '基本信息',
        key: 'baseInfo',
        component: <BaseInfo usersDict={usersDict} nodeInfo={defaultBaseInfoObj} />
      },
      {
        tab: '调度配置',
        key: 'controlConfig',
        component: <ControlConfig
          cronInfo={cronInfo}
          changeState={(payload) => {
            changeEditStatus(taskId, true)
            this.setState({ cronInfo: payload.cronInfo })
          }}
          disabled={disabled}
        />
      },
      {
        tab: '告警设置',
        key: 'apiWarn',
        forceRender: true,
        component: (
          <div style={{ height: height - 80 }} className='scroll-content always-display-scrollbar pd2x'>
            <ApiWarn
              apiAlertInfos={apiAlertInfos.map((p, i) => ({ ...p, id: i }))}
              validForm={validForm}
              changeState={(payload, isMount) => {
                !isMount && changeEditStatus(taskId, true)
                this.setState(payload)
              }}
              taskId={taskId}
              taskName={taskName}
              disabled={disabled}
              userList={_.values(usersDict)}
            />
          </div>)
      },
      !isTaskGroup ?
        {
          tab: '执行参数',
          key: 'executeParams',
          component: (
            <ExecuteParams
              backoff={executeParamsObj.backoff}
              retries={executeParamsObj.retries}
              flowPriority={executeParamsObj.flowPriority}
              executeType={executeParamsObj.executeType}
              idealExecutorIds={executeParamsObj.idealExecutorIds}
              executors={executeParamsObj.executors}
              changeState={(payload) => {
                changeEditStatus(taskId, true)
                this.setState({ executeParamsObj: { ...executeParamsObj, ...payload } })
              }}
              disabled={disabled}
            />)
        }
        : null,
      {
        tab: '执行记录',
        key: 'exectueHistory',
        component: <LogPanel taskId={taskId} taskType={isTaskGroup ? 'group' : 'project'} />
      }
    ]
    return (
      <div className='bg-white height-100'>
        <Tabs
          activeKey={selectTabs}
          onChange={v => this.setState({ selectTabs: v })}
        >
          {
            tabs.map(i => {
              if (i) {
                return <TabPane forceRender={i.forceRender || false} tab={i.tab} key={i.key}>{i.component}</TabPane>
              }
            })
          }
        </Tabs>
      </div>
    )
  }
}

FlowConsole.propTypes = {
  taskId: PropTypes.string,
  backoff: PropTypes.number,
  retries: PropTypes.number,
  changeEditStatus: PropTypes.func,
  graphInfo: PropTypes.any,
  disabled: PropTypes.bool,
  taskProjectId: PropTypes.string,
  taskProjectInfo: PropTypes.any,
  usersDict: PropTypes.any,
  pgTaskInfoMap: PropTypes.any,
  dispatch: PropTypes.any,
  taskName: PropTypes.string,
  taskShowName: PropTypes.string,
  executeParams: PropTypes.any,
  isTaskGroup: PropTypes.bool,
  selectCategory: PropTypes.string,
  taskList: PropTypes.any,
  offLineTaskGroupList: PropTypes.any,
  display: PropTypes.bool,
  jobParams: PropTypes.array,
  height: PropTypes.any
}

export default connect(props => {
  return {
    ...props[namespace],
    usersDict: _.keyBy(props.common.users, 'id')
  }
})(FlowConsole)
