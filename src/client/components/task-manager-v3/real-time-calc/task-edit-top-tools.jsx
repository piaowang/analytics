import { Button, message, Popconfirm } from 'antd'
import { PlayCircleOutlined, SaveOutlined } from '@ant-design/icons'
import PubSub from 'pubsub-js'
import React, { useEffect, useState } from 'react'
import { namespace } from 'client/components/task-manager-v3/task-edit/model'
import Fetch from 'client/common/fetch-final'
import _ from 'lodash'
import { cancelExecution } from 'client/components/task-manager-v3/task-edit/services'
import { delayPromised } from 'common/sugo-utils'
import { convertAlertConfig } from 'common/convert-alarm-info'

export default function TaskEditTopToolsForRealTimeCalcTask(props) {
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

  const [runningTaskExecutionId, setRunningTaskExecutionId] = useState(null)

  // 点击手动执行 先保存在执行
  const executeTask = function () {
    const apiAlertInfos = window.store.getState()[namespace].pgTaskInfoMap[id].params.apiAlertInfos
    props.dispatch({
      type: `${namespace}/executeTask`,
      payload: {
        projectId: id,
        isTaskGroup,
        graphInfo,
        showName: editTaskInfo.showName,
        name: editTaskInfo.name,
        alertConfig: convertAlertConfig(apiAlertInfos || [])
      },
      callback: res => {
        setRunningTaskExecutionId(res?.execid?.[0])
        loop(loadRunningTaskExecutionId, 10 * 1000)
        PubSub.publish('schedule-log-refresh')
      }
    })
  }

  function loop(fn, time) {
    async function inside() {
      let executionId = await fn()
      if (!executionId) {
        PubSub.publish('schedule-log-refresh')
      } else {
        setTimeout(inside, time)
      }
    }
    setTimeout(inside, time)
  }

  useEffect(() => {
    const canEdit = !runningTaskExecutionId
    // 开始执行后，将状态变更为不可修改
    const { tabObjs } = window.store.getState()[namespace]
    props.dispatch({
      type: `${namespace}/changeState`,
      payload: {
        tabObjs: _.map(tabObjs, d => (d.id === id ? { ...d, canEdit } : d))
      }
    })
  }, [runningTaskExecutionId])

  const cancelFlow = async function () {
    const res = await cancelExecution({ execid: runningTaskExecutionId })
    if (res?.status === 'success') {
      message.success('取消常驻执行成功')
    }
    await delayPromised(500)
    await loadRunningTaskExecutionId()
    PubSub.publish('schedule-log-refresh')
  }

  function loadRunningTaskExecutionId() {
    const url = '/app/task-schedule-v3/history?action=getRunningFlows'
    return Fetch.get(url)
      .then(res => {
        const runningFlows = res?.status === 'success' ? res.runningFlows : []
        const currFlow = _.find(runningFlows, f => f.first.projectId === +id)
        const executionId = currFlow?.first?.executionId
        setRunningTaskExecutionId(executionId)
        return executionId
      })
      .catch(err => console.error(err))
  }

  useEffect(() => {
    loadRunningTaskExecutionId()
    loop(loadRunningTaskExecutionId, 10 * 1000)
  }, [editTaskInfo.id])

  const canNotRun = isGest || runningTaskExecutionId
  const canNotStop = isGest || !runningTaskExecutionId
  return (
    <>
      <Button key='save' type='primary' icon={<SaveOutlined />} disabled={disabled || isGest} onClick={() => PubSub.publish(`taskEditV3.saveTaskInfo.${id}`)}>
        保存
      </Button>
      <Popconfirm title={`确定常驻执行 "${editTaskInfo.showName}" 吗？`} placement='topLeft' onConfirm={executeTask} disabled={canNotRun}>
        <Button key='excuter' disabled={canNotRun} icon={<PlayCircleOutlined />} className='mg1l'>
          常驻执行
        </Button>
      </Popconfirm>

      <Popconfirm title={`确定停止常驻执行 "${editTaskInfo.showName}" 吗？`} placement='topLeft' onConfirm={cancelFlow} disabled={canNotStop}>
        <Button key='stop-excuter' disabled={canNotStop} className='mg1l'>
          停止常驻执行
        </Button>
      </Popconfirm>
    </>
  )
}
