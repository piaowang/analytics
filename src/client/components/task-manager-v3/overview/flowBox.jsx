import React, { useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { browserHistory } from 'react-router'
import _ from 'lodash'
import moment from 'moment'
import LabelWithSelect from 'client/components/dbconnectcenter/labelWithSelect'
import OverviewStatisticsComponent from 'client/components/dbconnectcenter/overview-statistics-component'
import WorkflowStatisticsComponent from 'client/components/dbconnectcenter/workflow-statistics-component'
import { Button } from 'antd'
import dbConnectCenterManagerModel from './model'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import { bindActionCreators } from 'redux'
import * as actions from 'client/actions/users'
import * as constants from '../constants'

const longArrow = '/_bc/sugo-analytics-static/assets/images/task-overview/long-arrow.png'
const icon1 = '/_bc/sugo-analytics-static/assets/images/task-overview/icon1.png'
const icon2 = '/_bc/sugo-analytics-static/assets/images/task-overview/icon2.png'
const icon3 = '/_bc/sugo-analytics-static/assets/images/task-overview/icon3.png'
const icon4 = '/_bc/sugo-analytics-static/assets/images/task-overview/icon4.png'

const zeroDefault = {
  cancelled: 0,
  failed: 0,
  killed: 0,
  killing: 0,
  queued: 0,
  ready: 0,
  running: 0,
  success: 0
}
const typeList = [
  { label: '离线开发', value: constants.CIRCLE_DISPATCH_MANAGER_PROJECT.OFFLINE }
  // { label: '实时开发', value: constants.CIRCLE_DISPATCH_MANAGER_PROJECT_REALTIME }
]
const groupList = [
  { label: '工作流', value: constants.CIRCLE_DISPATCH_MANAGER_PROJECT.PROJECT },
  { label: '工作流组', value: constants.CIRCLE_DISPATCH_MANAGER_PROJECT.GROUP }
]
const cardList = [
  {
    title: '数据源管理',
    descriptions: ['支持多种数据源的可视化接入。', '支持实时接入和离线接入两种模式。'],
    bg: icon1,
    href: '/console/new-task-schedule/dbconnectmanager'
  },
  {
    title: '数据开发',
    descriptions: ['支持离线和实时开发两种模式', '通过可视化ETL工具完成专业级开发。', '支持多团队协助开发，提升开发效率。'],
    bg: icon2,
    href: '/console/task-schedule-v3/task-project'
  },
  {
    title: '发布审核',
    descriptions: ['支持任务统一发布和审核管理。', '支持开发环境和生产环境任务快速发布。'],
    bg: icon3,
    href: '/console/new-task-schedule/publish-manager'
  },
  {
    title: '运维管理',
    descriptions: ['统一的作业调度与灵活的作业监控告警。', '支持作业明细日志查看，快速定位问题。'],
    bg: icon4,
    href: '/console/new-task-schedule-manager/circle-dispatch-manager'
  }
]
const timeList = [
  {
    label: '最近十二个小时',
    value: 12
  },
  {
    label: '最近一天',
    value: 24
  },
  {
    label: '最近三天',
    value: 72
  },
  {
    label: '最近十五天',
    value: 360
  }
]

function FlowBox(props) {
  const {
    allInfo = [],
    tasks = null,
    taskGroups = null,
    selectedProjectId = '',
    failedTimes = [],
    execTimes = [],
    selectedTime = 12, //最近多少个小时，默认是选择最近十二个小时
    selectedType = constants.CIRCLE_DISPATCH_MANAGER_PROJECT.OFFLINE,
    projectList = [],
    offLineStatistics = [],
    offLineStatisticGroups = [],
    dispatch,
    selectedGroup = constants.CIRCLE_DISPATCH_MANAGER_PROJECT.PROJECT
  } = props

  const [execXlsx, setExecXlsx] = useState([]) //执行时长top10的xlsx数据
  const [failXlsx, setFailXlsx] = useState([]) //离线时长top10的xlsx数据

  // 当离线执行失败top10发生变化时，更新离线失败的excels
  useEffect(() => {
    let workflowName = '工作流名称'
    let workflowList = tasks || []
    if (selectedGroup === constants.CIRCLE_DISPATCH_MANAGER_PROJECT.GROUP) {
      workflowName = '工作流组名称'
      workflowList = taskGroups || []
    }
    let sheetList = [
      {
        sheetName: 'sheet1',
        data: failedTimes.map((failedTime, index) => {
          // 根据当前的数据类型，从tasks或者taskGroups中获取到项目的id。再获取到项目的名称
          let { task_project_id } = _.find(workflowList, function (o) {
            return o.id.toString() === failedTime.projectId.toString()
          })
          let { name = '' } = _.find(projectList, function (o) {
            return o.id === task_project_id
          })
          return {
            序号: index + 1, //序号默认从1开始
            所属项目: name,
            [workflowName]: failedTime.showName,
            次数: failedTime.times >>> 0
          }
        })
      }
    ]
    setFailXlsx(sheetList)
  }, [failedTimes])

  // 当任务执行时长top10发生变化时，更新执行时长的excels
  useEffect(() => {
    let workflowName = '工作流名称'
    let workChildName = '工作流节点'
    let workflowList = tasks || []
    if (selectedGroup === constants.CIRCLE_DISPATCH_MANAGER_PROJECT.GROUP) {
      workflowName = '工作流组名称'
      workflowList = taskGroups || []
      workChildName = '工作流名称'
    }

    let sheet2index = 0
    let sheetList = [
      {
        sheetName: 'sheet1',
        data: execTimes.map((execTime, index) => {
          // 根据当前的数据类型，从tasks或者taskGroups中获取到项目的id。再获取到项目的名称
          const workFlowids = _.map(projectList, p => p.id)
          let task_project_id =
            _.find(workflowList, function (o) {
              return o.id.toString() === execTime.projectId.toString() && _.includes(workFlowids, o.task_project_id)
            })?.task_project_id || ''
          let name =
            _.find(projectList, function (o) {
              return o.id === task_project_id
            })?.name || ''
          return {
            序号: index + 1, //序号默认从1开始
            所属项目: name,
            [workflowName]: execTime.showName,
            // 这个时间格式返回的是字符串，要转化下
            开始时间: moment(parseInt(execTime.submitTime, 10)).format('YYYY-MM-DD hh:mm:ss'),
            结束时间: moment(parseInt(execTime.endTime, 10)).format('YYYY-MM-DD hh:mm:ss'),
            // 执行时长转化为大于小时用小时显示，小于的用秒显示,防止出现字符串，undefined之类，所以做下非法字符串判定
            耗时: execTime.times / 3600 > 1 ? (execTime.times / 3600).toFixed(2) + '小时' : execTime.times + '秒'
          }
        })
      },
      {
        sheetName: 'sheet2',
        data: allInfo
          .map(info => {
            // 根据当前的数据类型，从tasks或者taskGroups中获取到项目的id。再获取到项目的名称
            const workFlowids = _.map(projectList, p => p.id)
            let task_project_id =
              _.find(workflowList, function (o) {
                return o.id.toString() === info.projectId.toString() && _.includes(workFlowids, o.task_project_id)
              })?.task_project_id || ''
            let name =
              _.find(projectList, function (o) {
                return o.id === task_project_id
              })?.name || ''

            return info.nodes.map(node => {
              sheet2index++
              const times = (node.endTime - node.startTime) / 1000
              return {
                序号: sheet2index, //序号默认从1开始
                所属项目: name,
                [workflowName]: info.flowName,
                [workChildName]: node.showName,
                开始时间: moment(node.startTime).format('YYYY-MM-DD hh:mm:ss'),
                结束时间: moment(node.endTime).format('YYYY-MM-DD hh:mm:ss'),
                // 执行时长转化为大于小时用小时显示，小于的用秒显示,防止出现字符串，undefined之类，所以做下非法字符串判定
                耗时: times / 3600 > 1 ? (times / 3600).toFixed(2) + '小时' : times.toFixed(2) + '秒'
              }
            })
          })
          .flat()
      }
    ]
    setExecXlsx(sheetList)
  }, [execTimes])

  // 选择的项目发生变动时候，去获取工作流/工作流组的列表
  useEffect(() => {
    dispatch({
      type: 'dbConnectCenterManagerModel/getAllTasksByProjectId',
      payload: {
        project_id: selectedProjectId
      }
    })
  }, [selectedProjectId])

  // 工作流列表变化时，刷新数据
  useEffect(() => {
    // 排除第一次的时候
    if (tasks === null) return
    // 如果返回的数据是空数组，则直接更新echarts的数据为空
    if (tasks.length === 0) {
      resetGraphics('offLineStatistics')
      // 默认都是0的数据
      return
    }
    // 获取离线的工作流数据
    dispatch({
      type: 'dbConnectCenterManagerModel/getOffLineDataByProjectId',
      payload: {
        selectedTime,
        projectIds: tasks.map(e => e.id).join(','),
        isGroup: false
      }
    })
    // 获取top10
    if (selectedGroup === constants.CIRCLE_DISPATCH_MANAGER_PROJECT.PROJECT) {
      dispatch({
        type: 'dbConnectCenterManagerModel/getDataTopByProjectIds',
        payload: {
          projectIds: tasks.map(e => e.id).join(','),
          selectedTime,
          selectedGroup
        }
      })
    }
  }, [tasks])

  // 工作流组列表变化时，刷新数据
  useEffect(() => {
    if (taskGroups === null) return
    // 如果返回的数据是空数组，则直接更新echarts的数据为空
    if (taskGroups.length === 0) {
      resetGraphics('offLineStatisticGroups')
      // 默认都是0的数据
      return
    } else {
      // 获取离线的工作流组数据
      dispatch({
        type: 'dbConnectCenterManagerModel/getOffLineDataByProjectId',
        payload: {
          selectedTime,
          projectIds: taskGroups.map(e => e.id).join(','),
          isGroup: true
        }
      })
      // 获取top10
      if (selectedGroup === constants.CIRCLE_DISPATCH_MANAGER_PROJECT_GROUP) {
        dispatch({
          type: 'dbConnectCenterManagerModel/getDataTopByProjectIds',
          payload: {
            projectIds: taskGroups.map(e => e.id).join(','),
            selectedTime,
            selectedGroup
          }
        })
      }
    }
  }, [taskGroups])

  // 当读取的流都是空白的时候，重设图形为空
  function resetGraphics(key) {
    dispatch({
      type: 'dbConnectCenterManagerModel/changeColumnName',
      payload: {
        [key]: zeroDefault
      }
    })
    dispatch({
      type: 'dbConnectCenterManagerModel/changeState',
      payload: {
        // [key]: cashValue,
        allInfo: [],
        failedTimes: [],
        execTimes: []
      }
    })
  }
  // 按钮组切换选中
  function onChangeSelected(key, value) {
    dispatch({
      type: 'dbConnectCenterManagerModel/changeState',
      payload: {
        [key]: value
      }
    })
    // 如果工作流长度为0且当前是切换到工作流，则直接显示0
    if (selectedGroup === constants.CIRCLE_DISPATCH_MANAGER_PROJECT.PROJECT && tasks.length === 0) {
      resetGraphics('offLineStatistics')
      // 默认都是0的数据
      return
    }
    // 如果工作流组长度为0且当前是切换到工作流组，则直接显示0
    if (selectedGroup === constants.CIRCLE_DISPATCH_MANAGER_PROJECT.GROUP && taskGroups.length === 0) {
      resetGraphics('offLineStatisticGroups')
      // 默认都是0的数据
      return
    }
    // 如果工作流组长度为0且当前是切换到工作流组，则直接显示0
    if (value === constants.CIRCLE_DISPATCH_MANAGER_PROJECT.GROUP && taskGroups.length === 0) {
      resetGraphics('offLineStatisticGroups')
      // 默认都是0的数据
      return
    }
    // 如果工作流长度为0且当前是切换到工作流，则直接显示0
    if (value === constants.CIRCLE_DISPATCH_MANAGER_PROJECT.PROJECT && tasks.length === 0) {
      resetGraphics('offLineStatistics')
      // 默认都是0的数据
      return
    }
    switch (key) {
      // 最近几个小时的切换
      case 'selectedTime':
        // 获取离线的工作流数据
        dispatch({
          type: 'dbConnectCenterManagerModel/getOffLineDataByProjectId',
          payload: {
            selectedTime: value,
            projectIds: tasks.map(e => e.id).join(','),
            isGroup: false
          }
        })
        // 获取离线的工作流组数据
        dispatch({
          type: 'dbConnectCenterManagerModel/getOffLineDataByProjectId',
          payload: {
            selectedTime: value,
            projectIds: taskGroups.map(e => e.id).join(','),
            isGroup: true
          }
        })
        dispatch({
          type: 'dbConnectCenterManagerModel/getDataTopByProjectIds',
          payload: {
            projectIds: selectedGroup === constants.CIRCLE_DISPATCH_MANAGER_PROJECT.PROJECT ? tasks.map(e => e.id).join(',') : taskGroups.map(e => e.id).join(','),
            selectedTime: value,
            selectedGroup
          }
        })
        break
      //工作流/工作流组的切换
      case 'selectedGroup':
        dispatch({
          type: 'dbConnectCenterManagerModel/getDataTopByProjectIds',
          payload: {
            projectIds: value === constants.CIRCLE_DISPATCH_MANAGER_PROJECT.PROJECT ? tasks.map(e => e.id).join(',') : taskGroups.map(e => e.id).join(','),
            selectedTime,
            selectedGroup
          }
        })
        break
      // 离线/实时的切换,暂时不处理
      case 'selectedType':
      default:
        break
    }
  }
  // 更改项目
  function handleSelct($option) {
    let optionData = { selectedProjectId: $option }
    if ($option === constants.CIRCLE_DISPATCH_MANAGER_PROJECT.ALL) {
      optionData = { selectedProjectId: '' }
    }
    dispatch({
      type: 'dbConnectCenterManagerModel/changeState',
      payload: optionData
    })
  }

  return (
    <div className='flowTableBox'>
      {/* 顶部 */}
      <div className='flowTableTop'>
        {/* 进度条 */}
        <div className='progress'>
          <div className='worddiv'>
            <span>1</span>
          </div>
          <div className='imagediv'>
            <img src={longArrow} />
          </div>
          <div className='worddiv'>
            <span>2</span>
          </div>
          <div className='imagediv'>
            <img src={longArrow} />
          </div>
          <div className='worddiv'>
            <span>3</span>
          </div>
          <div className='imagediv'>
            <img src={longArrow} />
          </div>
          <div className='worddiv'>
            <span>4</span>
          </div>
        </div>
        {/* 卡片布局 */}
        <div className='card'>
          {cardList.map((card, index) => (
            <div key={index} className='container'>
              <div className='top'>
                <div className='left'>
                  <img src={card.bg} />
                </div>
                <div className='right'>
                  <p>{card.title}</p>
                  <ul>
                    {card.descriptions.map((description, index) => (
                      <li key={index}>{description}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div
                className='use'
                onClick={() => {
                  browserHistory.push(card.href)
                }}
              >
                开始使用
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className='flowTableBottom'>
        {/* 时间以及模式切换选择 */}
        <div className='selectTab'>
          {/* 离线开发/实时开发 */}
          <div className='typetab'>
            {typeList.map((type, index) => (
              <Button
                key={`${index}type`}
                value={type.value}
                type={selectedType === type.value ? 'primary' : 'default'}
                // onClick={() => { onChangeSelected('selectedType', type.value) }}
              >
                {type.label}
              </Button>
            ))}
          </div>
          {/* 最近时间切换 */}
          <div className='timetab'>
            {timeList.map((time, index) => (
              <Button
                key={`${index}time`}
                value={time.value}
                type={selectedTime === time.value ? 'primary' : 'default'}
                onClick={() => {
                  onChangeSelected('selectedTime', time.value)
                }}
              >
                {time.label}
              </Button>
            ))}
          </div>
        </div>
        <React.Fragment>
          <LabelWithSelect onSelect={handleSelct} options={projectList} />
        </React.Fragment>
        <div className='top20'>
          {/* 工作流任务总览统计 */}
          <OverviewStatisticsComponent key='offLineComponent' title='工作流任务总览统计' data={offLineStatistics} />
          {/* 工作流组任务总览统计 */}
          <OverviewStatisticsComponent key='realTimeComponent' title='工作流组任务总览统计' data={offLineStatisticGroups} />
        </div>
        {/* 离线开发工作流 */}
        <div className='offLine_container'>
          <div className='grouptab'>
            {groupList.map((group, index) => (
              <Button
                key={`${index}group`}
                value={group.value}
                type={selectedGroup === group.value ? 'primary' : 'default'}
                onClick={() => {
                  onChangeSelected('selectedGroup', group.value)
                }}
              >
                {group.label}
              </Button>
            ))}
          </div>
          <div className='flex'>
            {/* 任务执行时长top10 */}
            <WorkflowStatisticsComponent key='workflowComponent' title={'任务执行时长Top10'} data={execTimes.slice(0, 10)} xlsxdata={execXlsx} />
            {/* 离线任务执行失败top10 */}
            <WorkflowStatisticsComponent key='workflowsComponet' title={'离线任务执行失败Top10'} data={failedTimes.slice(0, 10)} xlsxdata={failXlsx} isTime />
          </div>
        </div>
      </div>
    </div>
  )
}

const withForm = withRuntimeSagaModel(dbConnectCenterManagerModel)(
  connect(
    state => _.pick(state.common, ['users']),
    dispatch => bindActionCreators(actions, dispatch)
  )(FlowBox)
)

let mapStateToProps = props => {
  return {
    ...props['dbConnectCenterManagerModel']
  }
}

export default connect(mapStateToProps)(withForm)
