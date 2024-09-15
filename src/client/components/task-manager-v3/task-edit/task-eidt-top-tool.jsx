import React from 'react'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloudDownloadOutlined,
  CloudOutlined,
  CopyOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  ProfileOutlined,
  SettingOutlined,
  SaveOutlined
} from '@ant-design/icons'
import { Button, Popconfirm, message, Popover } from 'antd'
import { namespace } from './model'
import _ from 'lodash'
import PubSub from 'pubsub-js'
import JobParamsEdit from './../monaco-editor/popover/job-params-edit'
import { isRealTimeCalcProject } from 'client/components/task-manager-v3/task-edit/immediate/real-time-calc-helper'

export default function TaskEditTopTool(props) {
  const {
    id,
    editTaskInfo = {},
    isGest = true,
    taskProjectId,
    disabled,
    setShowImportPanel,
    setShowCopyModal,
    isTaskGroup,
    graphInfo,
    changeEditStatus,
    changeState,
    jobParams = [],
    cacheJobParams,
    setShowVersionModal
  } = props
  const setSchedule = function () {
    props.dispatch({
      type: `${namespace}/setSchedule`,
      payload: {
        id,
        taskId: editTaskInfo.id,
        taskProjectId,
        isTaskGroup
      }
    })
  }

  const submitAudit = function (bl) {
    props.dispatch({
      type: `${namespace}/${bl ? 'submitAudit' : 'cancelAudit'}`,
      payload: { taskId: editTaskInfo.id, taskProjectId, flowId: _.get(editTaskInfo, 'flows.0.id', ''), isTaskGroup }
    })
  }

  // 点击手动执行 先保存在执行
  const executeTask = function () {
    props.dispatch({ type: `${namespace}/executeTask`, payload: { projectId: id, isTaskGroup, graphInfo, showName: editTaskInfo.showName, name: editTaskInfo.name } })
  }

  const setDefaultParams = data => {
    changeState({ jobParams: data || [] })
  }

  const canEdit = !disabled
  let buttons = []
  if (id && !sugo.taskManagerV3ShouldExamine) {
    canEdit &&
      buttons.push(
        <Popconfirm key='set-schedule' title={`确定设置 "${editTaskInfo.showName}" 定时调度吗？`} placement='topLeft' onConfirm={() => setSchedule(id)} disabled={isGest}>
          {/* <Button disabled={disabled} icon={<CheckCircleOutlined />} className='mg1l'>
            设置定时调度
          </Button> */}
        </Popconfirm>
      )
    !canEdit &&
      buttons.push(
        <Popconfirm key='cancel-schedule' title={`确定取消 "${editTaskInfo.showName}" 定时调度吗？`} placement='topLeft' onConfirm={() => submitAudit(false)}>
          {/* <Button icon={<CloseCircleOutlined />} disabled={isGest} className='mg1l'>
            取消调度
          </Button> */}
        </Popconfirm>
      )
  }
  if (id && sugo.taskManagerV3ShouldExamine && sugo.user.id === editTaskInfo.created_by) {
    canEdit &&
      buttons.push(
        <Button key='submit-check' icon={<CheckCircleOutlined />} disabled={isGest} className='mg1l' onClick={() => submitAudit(true)}>
          提审
        </Button>
      )
    !canEdit &&
      buttons.push(
        <Button key='cancel-check' icon={<CloseCircleOutlined />} disabled={isGest} className='mg1l' onClick={() => submitAudit(false)}>
          {editTaskInfo.status === '2' ? '撤销审核' : '撤销提审'}
        </Button>
      )
  }
  if (!id) return buttons
  if (isTaskGroup) {
    buttons = _.concat(buttons, [
      <Popconfirm key='excuter' title={`确定手动执行 "${editTaskInfo.showName}" 吗？`} placement='topLeft' onConfirm={() => executeTask()}>
        <Button disabled={isGest} icon={<PlayCircleOutlined />} className='mg1l'>
          手动执行
        </Button>
      </Popconfirm>,
      <Popconfirm
        key='delete'
        title={`确定删除 "${editTaskInfo.showName}" 吗？`}
        placement='topLeft'
        onConfirm={() => {
          props.dispatch({
            type: `${namespace}/deleteTask`,
            payload: { taskId: editTaskInfo.id, taskProjectId, isTaskGroup },
            callback: () => PubSub.publish('taskEditV3.closeCurrentTab', id)
          })
        }}
      >
        <Button icon={<DeleteOutlined />} disabled={disabled || isGest} className='mg1l'>
          删除
        </Button>
      </Popconfirm>,
      <Button
        key='version'
        icon={<ProfileOutlined />}
        className='mg1l'
        disabled={disabled || isGest}
        onClick={() => {
          props.dispatch({
            type: `${namespace}/getVersionList`,
            payload: { projectId: id }
          })
          setShowVersionModal(true)
        }}
      >
        版本记录
      </Button>
    ])
  } else {
    buttons = _.concat(buttons, [
      <Popconfirm key='excuter' title={`确定手动执行 "${editTaskInfo.showName}" 吗？`} placement='topLeft' onConfirm={() => executeTask()}>
        <Button key='excuter' disabled={isGest} icon={<PlayCircleOutlined />} className='mg1l'>
          手动执行
        </Button>
      </Popconfirm>,
      // <Button key='upload' disabled={isGest} icon={<CloudDownloadOutlined />} className='mg1l'>
      //   <a style={{ color: 'inherit' }} target='_blank' href={`/app/task-schedule-v3/manager?action=download&projectId=${id}`}>
      //     下载工作流
      //   </a>
      // </Button>,
      // <Button
      //   key='download'
      //   icon={<CloudOutlined />}
      //   className='mg1l'
      //   disabled={disabled || isGest}
      //   onClick={() => {
      //     if (!editTaskInfo.id) {
      //       message.warn('请先保存当前流程')
      //       return
      //     }
      //     setShowImportPanel(true)
      //   }}
      // >
      //   上传工作流
      // </Button>,
      // <Button
      //   key='copy'
      //   icon={<CopyOutlined />}
      //   className='mg1l'
      //   disabled={isGest}
      //   onClick={() => {
      //     if (!editTaskInfo.id) {
      //       message.warn('请先保存当前流程')
      //       return
      //     }
      //     setShowCopyModal(true)
      //   }}
      // >
      //   {isTaskGroup ? '复制工作流组' : '复制工作流'}
      // </Button>,
      <Popconfirm
        key='delete'
        title={`确定删除 "${editTaskInfo.showName}" 吗？`}
        placement='topLeft'
        onConfirm={() => {
          props.dispatch({
            type: `${namespace}/deleteTask`,
            payload: { taskId: editTaskInfo.id, taskProjectId },
            callback: () => PubSub.publish('taskEditV3.closeCurrentTab', id)
          })
        }}
      >
        <Button icon={<DeleteOutlined />} disabled={disabled || isGest} className='mg1l'>
          删除
        </Button>
      </Popconfirm>,
      <Popover
        key='setParams'
        overlayStyle={{ width: '350px' }}
        content={
          <JobParamsEdit
            params={jobParams.filter(o => o.name !== 'nodeType')}
            setParams={params => {
              changeEditStatus(id, true)
              changeState({ jobParams: params })
            }}
            changeEditStatus={() => {
              changeEditStatus(id, true)
            }}
            reduction={() => {
              setDefaultParams(cacheJobParams)
            }}
          />
        }
        placement='rightTop'
        arrowPointAtCenter
        trigger='click'
        title={[
          <span key='title' className='font16 mg2r'>
            设置全局参数
          </span>
        ]}
      >
        <Button disabled={disabled || isGest} className='mg1l' icon={<SettingOutlined />}>
          设置参数
        </Button>
      </Popover>,
      <Button
        key='version'
        icon={<ProfileOutlined />}
        className='mg1l'
        disabled={disabled || isGest}
        onClick={() => {
          props.dispatch({
            type: `${namespace}/getVersionList`,
            payload: { projectId: id },
            callback: () => PubSub.publish('taskEditV3.closeCurrentTab', id)
          })
          setShowVersionModal(true)
        }}
      >
        版本记录
      </Button>
    ])
  }
  buttons.push(
    <Button
      key='save'
      className='mg1l'
      type='primary'
      icon={<SaveOutlined />}
      disabled={disabled || isGest}
      onClick={() => {
        PubSub.publish(`taskEditV3.saveTaskInfo.${id}`)
      }}
    >
      保存
    </Button>
  )
  return buttons
}
