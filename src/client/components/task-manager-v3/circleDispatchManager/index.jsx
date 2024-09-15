import React, { useEffect } from 'react'
import { Tabs } from 'antd'
import Bread from '../../Common/bread'
import _ from 'lodash'
import { connect } from 'react-redux'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import taskV3ScheduleManager, { namespace } from './model'
import TaskList from './task-list'
import { getUsers } from '../../../actions/users'
import DependenciesView from '../dependencies-view'

const { TabPane } = Tabs

const CircleDispatchManager = function (props) {
  useEffect(() => {
    props.dispatch(getUsers())
  }, [])
  return (
    <div className='height-100'>
      <Bread path={[{ name: '周期调度管理' }]} />
      <Tabs style={{ height: 'calc(100% - 44px)', padding: '0px' }} className='overscroll-y always-display-scrollbar'>
        <TabPane tab='调度关系' key='dependencies'>
          <DependenciesView height='calc(100vh - 144px)' />
        </TabPane>
        <TabPane tab='按工作流调度' key='flow'>
          <TaskList isTaskGroup={false} />
        </TabPane>
        <TabPane tab='按工作流组调度' key='flowGroup'>
          <TaskList isTaskGroup />
        </TabPane>
      </Tabs>
    </div>
  )
}

export default connect(state => ({
  ...state[namespace]
}))(withRuntimeSagaModel(taskV3ScheduleManager)(CircleDispatchManager))
