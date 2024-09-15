// 调度,正在执行,执行历史表格公共模块,在模块内部进行组件拆分
import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import * as actions from './taskTables.actions'

import HistoryTable from './history.component'
import SchedulingTable from './scheduling.component'
import StreamTable from './stream.component'
import './styles.styl'
import tagRequirementChecker from '../../TagManager/tag-require'
import { AccessDataType } from 'common/constants'

@connect(
  state => state,
  dispatch => ({
    actions: bindActionCreators(actions, dispatch)
  })
)
export default class TaskMultipleTables extends Component {
  static getDerivedStateFromProps(nextProps, prevState) {
    return {
      ...prevState, 
      route: nextProps.params.name, 
      id: nextProps.projectCurrent.id
    }
  }

  state = {
    route:'default',
    id: ''
  }


  renderbody() {
    const { route, id } = this.state
    const { actions, taskTables, router } = this.props
    switch(route) {
      case 'scheduling': 
        return <SchedulingTable actions={actions} taskTables={taskTables} router={router} id={id} />
      case 'stream': 
        return <StreamTable actions={actions} taskTables={taskTables} router={router} id={id} />
      case 'history':
        return <HistoryTable actions={actions} taskTables={taskTables} router={router} id={id} />
    }
  }

  render() {
    let {projectCurrent, datasourceCurrent} = this.props

    // MySQL 接入允许访问调度任务
    if (projectCurrent.access_type !== AccessDataType.MySQL) {
      let hintPage = tagRequirementChecker({projectCurrent, datasourceCurrent, moduleName: '任务调度'})
      if (hintPage) {
        return hintPage
      }
    }

    const { route, id } = this.state
    return(
      <div className="task-schedule-table">
        {
          (route !== 'default' && id)
            && this.renderbody()
        }
      </div>
    )
  }
}
