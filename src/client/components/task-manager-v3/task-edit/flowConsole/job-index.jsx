import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { DeleteOutlined } from '@ant-design/icons'
import { Tabs, Button, Input, message, Tooltip } from 'antd'
import BaseInfo from './baseInfo'
import { namespace } from '../model'
import _ from 'lodash'
import { getUsers } from '../../../../actions/users'
import { TASK_EDIT_NODE_TYPE } from '../../constants'

const { TabPane } = Tabs

function JobFlowConsole(props) {
  const {
    taskId = '',
    selectJobId = '',
    disabled = false,
    usersDict = {},
    pgTaskInfoMap = {},
    taskProjectInfo,
    taskShowName,
    dispatch,
    nodeName,
    onDelete,
    nodeType,
    isTaskGroup,
    changeJobName
  } = props
  //taskProjectInfo usersDict pgTaskInfo 来自store 其他来自上级组件
  let pgTaskInfo = pgTaskInfoMap[taskId] || {}
  const [newNodeName, setNewNodeName] = useState(nodeName)

  useEffect(() => {
    dispatch(getUsers())
  }, [JSON.stringify(usersDict)])

  useEffect(() => {
    setNewNodeName(nodeName)
  }, [nodeName])

  let baseInfoObj = {
    title: _.get(taskProjectInfo, 'name'),
    flowName: taskShowName || '新建工作流',
    created_at: _.get(pgTaskInfo, 'created_at') || new Date(),
    created_by: _.get(pgTaskInfo, 'created_by') || window.sugo.user.id,
    approveState: _.get(pgTaskInfo, 'status') || 0
  }

  const saveData = () => {
    let regex = new RegExp('^([\u4E00-\uFA29]|[\uE7C7-\uE7F3]|[a-zA-Z0-9_]){1,60}$')
    if (!regex.test(baseInfoObj.flowName)) return message.error('工作流名称只允许数字 中文 英文和下划线组成，长度1-60')
    const jobName = _.last(_.split(selectJobId, '_'))
    if (!taskId) {
      message.error('请先保存工作流信息')
      return
    }
    props.dispatch({
      type: `${namespace}/getTaskNodeBaseInfo`,
      payload: {
        jobName,
        taskId: taskId + ''
      },
      callback: obj => {
        props.dispatch({
          type: `${namespace}/saveTaskNodeInfo`,
          payload: {
            ..._.reduce(
              obj.overrideParams,
              (r, v, k) => {
                r[`jobOverride[${k}]`] = v
                return r
              },
              {}
            ),
            projectId: taskId,
            jobName,
            'jobOverride[name]': newNodeName,
            'jobOverride[showName]': newNodeName,
            'jobOverride[type]': TASK_EDIT_NODE_TYPE[nodeType] || nodeType,
            paramJson: {}
          },
          callback: () => changeJobName(jobName, newNodeName)
        })
      }
    })
  }

  const tabBarExtraContent = isTaskGroup ? (
    <div className='mg2r'>
      <Tooltip title='删除节点'>
        <DeleteOutlined disabled={disabled} className='mg2l color-red pointer' onClick={() => onDelete(selectJobId)} />
      </Tooltip>
    </div>
  ) : (
    <div className='mg2r'>
      节点名称
      <Input
        disabled={disabled}
        className='width150 mg1l'
        value={newNodeName}
        onKeyDown={e => e.stopPropagation()}
        onChange={e => {
          setNewNodeName(e.target.value)
        }}
      />
      <Button className='mg2l' type='primary' onClick={saveData} disabled={disabled}>
        保存
      </Button>
      {
        <Tooltip title='删除节点'>
          <DeleteOutlined disabled={disabled} className='mg2l color-red pointer' onClick={() => onDelete(selectJobId)} />
        </Tooltip>
      }
    </div>
  )

  return (
    <div className='bg-white height-100'>
      <Tabs defaultActiveKey={'baseInfo'} tabBarExtraContent={tabBarExtraContent}>
        <TabPane tab={'基本信息'} key={'baseInfo'}>
          <BaseInfo usersDict={usersDict} nodeInfo={baseInfoObj} nodeName={nodeName} />
        </TabPane>
      </Tabs>
    </div>
  )
}

export default connect(props => {
  return {
    ...props[namespace],
    usersDict: _.keyBy(props.common.users, 'id')
  }
})(JobFlowConsole)
