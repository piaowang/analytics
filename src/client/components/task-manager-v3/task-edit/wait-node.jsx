/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react'
import { PlusCircleOutlined, SaveOutlined } from '@ant-design/icons'
import { Button, message } from 'antd'
import _ from 'lodash'
import { namespace } from './model'
import PubSub from 'pubsub-js'
import { connect } from 'react-redux'
import { TASK_EDIT_TABS_TYPE, DISPLAY_TASK_MODEL } from '../constants'
import WaitNodeItem from './wait-node-item'

let data = []

const JobWaitNode = function (props) {
  const { taskList, id, changeEditStatus, taskId, disabled, offLineTaskGroupList, tabObjs, activeTabsKey } = props
  const [waitInfos, setWaitInfos] = useState([{ timeout: 3600 * 1000, executeTime: '1,day' }])
  const parentTask = tabObjs.find(p => p.key === activeTabsKey)

  const isTaskGroup = (tabObjs.find(p => p.id === parentTask.parentId) || {}).model === DISPLAY_TASK_MODEL.offLineTaskGroup
  const saveData = (callback) => {
    if (data.length === 0) return
    const newData = data
    if (_.some(newData, p => !p.projectId || !p.nodeId || !p.executeTime || !p.timeout)) {
      message.error('请完善节点信息！')
      return
    }
    changeEditStatus(id, false)
    const scriptContent = JSON.stringify(newData)
    const name = _.get(newData, 'overrideParams.name', '等待')
    const retInfo = {
      projectId: taskId,
      jobName: _.last(_.split(id, '_')),
      'jobOverride[name]': name,
      'jobOverride[showName]': name,
      'jobOverride[type]': TASK_EDIT_TABS_TYPE.nodeWait,
      paramJson: {},
      scriptContent
    }
    props.dispatch({
      type: `${namespace}/saveTaskNodeInfo`,
      payload: retInfo,
      callback: callback
    })
  }

  const changgeInfo = (index, type, value) => {
    changeEditStatus(id, true)
    const infos = _.cloneDeep(waitInfos)
    if (type === 'timeout') {
      _.set(infos, [index, type], (parseInt(value) || 0) * 60 * 1000)
    } else if (type === 'projectId') {
      _.set(infos, [index, type], value)
      _.set(infos, [index, 'other', type], value)
      _.set(infos, [index, 'other', 'nodeId'], '')
      _.set(infos, [index, 'nodeId'], '')

    } else if (type === 'groupId') {
      _.set(infos, [index, type], value)
      _.set(infos, [index, 'other', type], value)
      _.set(infos, [index, 'other', 'nodeId'], '')
      _.set(infos, [index, 'other', 'projectId'], '')
      _.set(infos, [index, 'projectId'], '')
    } else if (type === 'nodeId') {
      if (_.get(infos, [index, 'projectId']) === value) {
        _.set(infos, [index, type], value)
        _.set(infos, [index, 'other', type], value)
        _.set(infos, [index, 'projectId'], _.get(infos, [index, 'groupId']))
      } else {
        _.set(infos, [index, type], value)
        _.set(infos, [index, 'other', type], value)
      }
    } else {
      _.set(infos, [index, type], value)
    }
    setWaitInfos([...infos])
  }

  const deleteNode = (index) => {
    const infos = _.cloneDeep(waitInfos)
    _.pullAt(infos, index)
    if (infos.length === 0) {
      setWaitInfos([{ timeout: 3600 * 1000, executeTime: '1,day' }])
      return
    }
    setWaitInfos(infos)
  }

  useEffect(() => {
    PubSub.subscribe(`taskEditV3.saveTaskInfo.${props.id}`, (msg, callback) => {
      saveData(callback)
    })
    if (taskId) {
      props.dispatch({
        type: `${namespace}/getTaskNodeInfo`,
        payload: { taskId, jobName: _.last(_.split(id, '_')) },
        callback: obj => setWaitInfos(JSON.parse(_.get(obj, 'scriptContent', '[{"timeout":3600000,"executeTime":"1,day"}]')))
      })
    } else {
      setWaitInfos([{ timeout: 3600 * 1000, executeTime: '1,day' }])
    }

    return () => {
      PubSub.unsubscribe(`taskEditV3.saveTaskInfo.${props.id}`)
    }
  }, [])

  useEffect(() => {
    data = waitInfos
  }, [waitInfos])

  return (
    <div style={{ height: 'calc(100vh - 118px)', overflowY: 'auto' }} className="always-display-scrollbar pd2b">
      <div className="pd1b borderb">
        {
          <Button
            icon={<SaveOutlined />}
            className="mg1l"
            onClick={() => saveData()}
            disabled={disabled}
          >
            保存
          </Button>
        }
      </div>
      {
        waitInfos.map((item, index) => {
          return (
            <WaitNodeItem
              nodeId={id}
              item={{ ...item }}
              taskList={taskList}
              disabled={disabled}
              changgeInfo={changgeInfo}
              index={index}
              key={`row_${index}`}
              isTaskGroup={isTaskGroup}
              offLineTaskGroupList={offLineTaskGroupList}
              deleteNode={deleteNode}
              taskId={taskId}
            />
          )
        })
      }

      {!disabled && (<div className="pd1t pd2x">
        <span
          className="pointer color-black font12"
          onClick={() => {
            if (_.some(waitInfos, p => !p.projectId || !p.nodeId || !p.executeTime || !p.timeout)) {
              return
            }
            setWaitInfos([...waitInfos, {
              timeout: 3600 * 1000,
              executeTime: '1,day'
            }])
          }}
          title="增加一个等待节点"
        >
          <PlusCircleOutlined className="mg2l mg1r color-green font14 " />
          增加一个等待节点
        </span>
      </div>)}
    </div>
  )
}

export default connect(props => props[namespace])(JobWaitNode)
