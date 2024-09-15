import React, { useEffect, useState } from 'react'
import { Tabs, Button } from 'antd'
import { connect } from 'react-redux'
import Fetch from 'client/common/fetch-final'
import PubSub from 'pubsub-js'

import DataCollect from './data-collect'
import taskV3RealTimeCollectModel, { namespace } from './model'
import withRuntimeSagaModel from '../../../Common/runtime-saga-helper'
import AlarmConfig from './alarm-config'
import ExecRecord from './exec-record'

const withSaga = withRuntimeSagaModel(taskV3RealTimeCollectModel)(RealTimeCollectIndex)
function RealTimeCollectIndex(props) {
  const { editTaskInfo } = props
  const TabPane = Tabs.TabPane

  const handleSave = () => {
    props.dispatch({ type: `${namespace}_${props.id}/saveRealtimeCollect`, payload: {} })
  }

  let status_exc = editTaskInfo.status_exc
  /**
   * 常驻执行
   */
  const handleExecutor = () => {
    loop(loadRunningTaskExecutionId, 10 * 1000)
    const flowId = _.get(props, 'editTaskInfo.name', '')
    props.dispatch({ type: `${namespace}_${props.id}/handleExecutor`, payload: { flowId } })
  }

  /**
   * 停止执行
   */
  const handleStop = () => {
    const { runningList = [] } = props
    const record = _.first(runningList) || {}
    props.dispatch({
      type: `${namespace}_${props.id}/cancelExec`,
      payload: {
        executionId: record.executionId
      }
    })
  }
  /**
   * 执行完成
   */
  const handleFail = () => {
    const { runningList = [] } = props
    const record = _.first(runningList) || {}
    props.dispatch({
      type: `${namespace}_${props.id}/refreshExec`
    })
    PubSub.publish(`schedule-log-refresh-cj_${props.id}`)
  }

  function loadRunningTaskExecutionId() {
    const url = `/app/task-schedule-v3/history?action=getRunningFlows`
    return Fetch.get(url)
      .then(res => {
        const runningFlows = res?.status === 'success' ? res.runningFlows : []
        const currFlow = _.find(runningFlows, f => f.first.projectId === +id)
        const executionId = currFlow?.first?.executionId
        return executionId
      })
      .catch(err => console.error(err))
  }
  function loop(fn, time) {
    async function inside() {
      let executionId = await fn()
      if (!executionId) {
        handleFail()
      } else {
        setTimeout(inside, time)
      }
    }
    setTimeout(inside, time)
  }

  const handleQueryRunningFlows = () => {
    const projectId = _.get(props, 'id', '')
    props.dispatch({ type: `${namespace}_${props.id}/queryRunningFlows`, payload: { projectId } })
  }
  const handleTabsChange = activeKey => {
    if (activeKey !== 'history') {
      handleQueryRunningFlows()
    }
  }

  useEffect(() => {
    return () => {
      props.dispatch({
        type: `${namespace}_${props.id}/changeState`,
        payload: {
          inputDsType: '',
          inputDsId: '',
          inputDbName: '',
          inputTables: [],
          outputConfig: [{ id: 1 }], //数据保存的输入配置 进入编辑需要赋值
          inputConfig: {}, // 输入配置
          apiAlertInfos: [], //告警配置信息
          validForm: [], // 告警设置保存form表单，必须叫这个名
          loadding: true
        }
      })
    }
  }, [])

  const { loadding } = props
  return (
    <div className='height-100 overscroll-y pd2 always-display-scrollbar real-time-collect-task-edit relative' style={{ display: 'flex', flexDirection: 'column' }}>
      <div className='alignright'>
        <Button className='mg2r' onClick={handleSave} type='primary'>
          保存任务
        </Button>
        <Button className='mg2r' onClick={handleExecutor} disabled={status_exc === 'RUNNING'}>
          常驻执行
        </Button>
        <Button className='mg2r' onClick={handleStop} disabled={status_exc !== 'RUNNING'}>
          停止执行
        </Button>
      </div>
      <div style={{ flex: 1 }}>
        <Tabs onChange={handleTabsChange}>
          <TabPane tab='基本配置' key='base'>
            <DataCollect id={props.id} loadding={loadding} />
          </TabPane>
          <TabPane tab='告警设置' key='setting' forceRender>
            <AlarmConfig
              apiAlertInfos={_.get(props, 'apiAlertInfos', [])}
              validForm={props.validForm}
              changeState={payload => {
                props.dispatch({ type: `${namespace}_${props.id}/changeState`, payload })
              }}
            />
          </TabPane>
          <TabPane tab='执行记录' key='history'>
            <ExecRecord projectId={props.id} taskProjectId={props.taskProjectId} />
          </TabPane>
        </Tabs>
      </div>
    </div>
  )
}

export default connect((props, ownProps) => ({ ...props[`${namespace}_${ownProps.id}`] }))(withSaga)
