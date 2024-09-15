import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import { Button } from 'antd'
import { connect } from 'react-redux'
import './style.styl'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import TaskListModel, { namespace } from './sage-model'
import Bread from '../../Common/bread'
import SingleScheduleManager from './single-execute-manage'
import GroupScheduleManager from './group-execute-manage'
import { browserHistory } from 'react-router'

const { Group: ButtonGroup } = Button

@connect(props => {
  return {
    historyTask: props[namespace]
  }
})
@withRuntimeSagaModel(TaskListModel)
class ExecuteLogs extends React.Component {
  constructor(prop) {
    super(prop)
    this.state = {
      workFlow: 'group'
    }
  }

  componentWillMount() {
    const { tasktype } = this.props.location.query
    if (tasktype) {
      this.setState({ workFlow: tasktype === 'group' ? 'group' : 'single' })
    }
  }

  changeState = params => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload: params
    })
  }

  render() {
    const { selectedKeys, taskTreeInfo, historyTask, dispatch } = this.props
    const { workFlow } = this.state
    const scheduleManagerModel = {
      dispatch,
      selectedKeys,
      taskTreeInfo,
      ...historyTask
    }
    return (
      <div className='width-100 task-schedule height-100'>
        <Bread
          path={[]}
          extra={
            <ButtonGroup>
              <Button
                type={workFlow === 'single' ? 'primary' : 'default'}
                onClick={() => {
                  this.setState({ workFlow: 'single' })
                  this.changeState({ selectedKeys: '', searchTaskName: '', searchProjectIds: '', searchStartTime: '', searchEndTime: '', searchStatus: '' })
                }}
              >
                工作流
              </Button>
              <Button
                type={workFlow === 'group' ? 'primary' : 'default'}
                onClick={() => {
                  const {
                    location: {
                      query: { taskid }
                    }
                  } = this.props
                  this.setState({ workFlow: 'group' })
                  this.changeState({ selectedKeys: '', searchTaskName: '', searchProjectIds: '', searchStartTime: '', searchEndTime: '', searchStatus: '' })
                  if (taskid) {
                    browserHistory.push('/console/task-schedule-v3/execute-manager')
                  }
                }}
              >
                工作流组
              </Button>
            </ButtonGroup>
          }
        />
        <div className='split' />
        <div
          className='bg-white'
          style={{
            height: 'calc(100% - 48px)',
            overflowY: 'scroll'
          }}
        >
          {workFlow === 'single' ? <SingleScheduleManager {...scheduleManagerModel} /> : <GroupScheduleManager {...scheduleManagerModel} />}
        </div>
      </div>
    )
  }
}

ExecuteLogs.propTypes = {}

export default ExecuteLogs
