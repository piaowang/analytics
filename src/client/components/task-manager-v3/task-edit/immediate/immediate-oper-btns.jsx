import React, { useState } from 'react'
import { Button, Popconfirm, message } from 'antd'
import PubSub from 'pubsub-js'
import _ from 'lodash'
import AttributeModal from './immediate-attribute-modal'
import UploadModal from './immediate-task-upload'
import { namespace } from './immediate-model'


const TaskOperBtns = (props) => {

  const {
    id,
    longExecution,
    cancelLongExecution,
    isRunning,
    dispatch,
    modalProps: { dataSourceAllList, typeData, taskInfo, taskProps } = {},
    stoping = false
  } = props

  const [showAttrModal, setShowAttrModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  const renderSetAttrModal = () => {
    return (
      <AttributeModal
        dataSourceAllList={dataSourceAllList}
        typeData={typeData}
        value={taskProps}
        onClose={() => setShowAttrModal(false)}
        visible={showAttrModal}
        onSave={data => {
          let commonObj = {}
          data.common.forEach(item => { commonObj[item.name] = item.value })
          dispatch({
            type: `${namespace}_${id}/setFlinkProjectProps`,
            payload: {
              projectId: id,
              parentJobName: taskInfo.jobName,
              projectCommonProperties: commonObj,
              projectSourceProperties: data.source
            }
          })
        }}
      />
    )
  }

  const renderUploadPanel = () => {
    return (
      <UploadModal
        showModal={showUploadModal}
        taskId={taskInfo.projectId}
        toggleUploadModal={() => setShowUploadModal(false)}
      />
    )
  }

  const showSetAttrModal = () => {
    if (!taskInfo.projectId) return message.error('请先保存当前任务')
    setShowAttrModal(true)
    dispatch({
      type: `${namespace}_${id}/fetchFlinkProjectProps`,
      payload: {
        taskId: id,
        jobName: _.get(taskInfo, 'jobName', '')
      }
    })
  }

  return (
    <div className='pd1b'>
      <Button
        type='primary'
        className='mg1l'
        onClick={() => PubSub.publish(`immediateTaskEdit.saveTaskInfo.${id}`)}
      >
        保存任务
      </Button>
      <Popconfirm
        disabled={isRunning}
        title='确定常驻执行该任务？'
        onConfirm={longExecution}
      >
        <Button disabled={isRunning} className='mg1l'>常驻执行</Button>
      </Popconfirm>
      <Button className='mg1l' loading={stoping} onClick={cancelLongExecution} disabled={!isRunning}>停止常驻执行</Button>
      <Button className='mg1l' onClick={showSetAttrModal}>任务属性</Button>
      <Button className='mg1l' onClick={() => setShowUploadModal(true)}>文件上传</Button>
      {showAttrModal ? renderSetAttrModal() : null}
      {renderUploadPanel()}
    </div>
  )
}

export default TaskOperBtns
