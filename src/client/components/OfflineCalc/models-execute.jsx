import React from 'react'
import { Button, Tabs, Input, Col, DatePicker, Table, Select, Tag, Modal, Popconfirm } from 'antd'
import Bread from '../Common/bread'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import { TASK_TREE_TYPE, FLOW_STATUS_TEXT_MAP, FLOW_STATUS_COLOR_MAP, getTypeKeysByKey }  from '../TaskScheduleManager2/constants'
import TaskTree from '../TaskScheduleManager2/task-tree'
import TaskListModel, { namespace, taskTreeNamespance } from '../TaskScheduleManager2/execute-manage/execute-manage-model'
import { connect } from 'react-redux'
import ScheduleLogPopWindow from '../TaskScheduleManager2/execute-manage/execute-manage-log-popwindow'
import moment from 'moment'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import { Link } from 'react-router'

const LEFT_PANEL_WIDTH = 240
const { TabPane } = Tabs

@connect(props => {
  return {
    selectedKeys: _.get(props, [taskTreeNamespance, 'selectedKeys'], []),
    taskTreeInfo: _.get(props, [taskTreeNamespance, 'taskTreeInfo'], {}),
    ...props[namespace]
  }
})

@withRuntimeSagaModel([TaskListModel])
export default class ScheduleManager extends React.Component {

  constructor(props, context) {
    super(props, context)
  }

  componentDidUpdate(prev) {
    const { pageStatus, selectedKeys } = this.props
    if (pageStatus === 1 && _.get(selectedKeys, '0', '') !== _.get(prev.selectedKeys, '0', '')) {
      this.handleQueryHistoryTask({})
    }
  }

  changeState = params => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload: params
    })
  }

  render() {
    const { showLogPopWindow, checkAllLogContext, data, pageStatus, checkLogTableList, singleLogMap, params } = this.props
    return (
      <div className="width-100 task-schedule height-100">
        <Bread path={[{ name: '运维管理' }]} />
        <HorizontalSplitHelper
          style={{ height: 'calc(100% - 44px)' }}
          collapseWidth={100}
        >
          {/* <div
            className="height-100 task-left-panel"
            defaultWeight={LEFT_PANEL_WIDTH}
            collapseTitle="任务选择" >
            <TaskTree taskTreeType={TASK_TREE_TYPE.executionHandle.name} selectId={_.get(params, 'taskId', '')} />
          </div> */}
          <div className="height-100 task-right-panel" defaultWeight={window.innerWidth - LEFT_PANEL_WIDTH}>
            <div className="task-table-panel corner pd2">
              <div >
                {this.executePage()}
              </div>
            </div>
          </div>
        </HorizontalSplitHelper>
        <ScheduleLogPopWindow
          visible={showLogPopWindow}
          handleCancel={this.handleCancelPopwindow}
          checkLogTableList={checkLogTableList}
          changeProp={this.changeState}
          queryAllLog={this.handleTaskAllLog}
          checkAllLogContext={checkAllLogContext}
          handlesingleLog={this.handlesingleLog}
          singleLogMap={singleLogMap}
        />
      </div>)
  }

  handlesingleLog = payload => {
    this.props.dispatch({
      type: `${namespace}/fetchExecJobLogs`,
      payload: payload
    })
  }

  handleTaskAllLog = payload => {
    this.props.dispatch({
      type: `${namespace}/queryTaskAllLog`,
      payload: payload
    })
  }

  handlerestartExecuteTask = payload => {
    this.props.dispatch({
      type: `${namespace}/restartExecuteTask`,
      payload: payload
    })
  }

  handleStopExecuteTask = payload => {
    this.props.dispatch({
      type: `${namespace}/stopExecuteTask`,
      payload
    })
  }
  handleQueryRunningFlows = payload => {
    this.props.dispatch({
      type: `${namespace}/getRunningFlows`,
      payload: payload
    })
  }

  handleQueryHistoryTask = ({page = 1, ...res}) => {
    const { selectedKeys, searchTaskName, searchStartTime, searchEndTime, searchStatus } = this.props
    const selectKey = _.get(selectedKeys, '0', '')
    let payload = {
      size: 10,
      page,
      flowcontain: searchTaskName,
      status: searchStatus,
      begin: searchStartTime ? moment(searchStartTime).startOf('d').format('MM/DD/YYYY HH:mm') : '',
      typeId: _.startsWith(selectKey, 'type-') ? selectKey.substr(5) : '',
      projectId: !_.startsWith(selectKey, 'type-') ? selectKey : '',
      end: searchEndTime ? moment(searchEndTime).endOf('d').format('MM/DD/YYYY HH:mm') : '',
      ...res
    }
    this.props.dispatch({
      type: `${namespace}/queryHistoryTask`,
      payload
    })
  }

  showLogPopWindow = data => {
    this.props.dispatch({
      type: `${namespace}/queryTaskLogTableList`,
      payload: {
        ...data,
        showLogPopWindow: true
      }
    })
  }

  showStopExecuteTaskPopwindow = data => {
    this.changeState({
      showStopExecuteTaskPopwindow: true,
      data
    })
  }

  showRestartExecuteTaskPopwindow = data => {
    this.changeState({
      showRestartExecuteTaskPopwindow: true,
      data
    })
  }

  //取消弹出窗
  handleCancelPopwindow = () => {
    this.changeState({
      showLogPopWindow: false,
      showStopExecuteTaskPopwindow: false,
      showRestartExecuteTaskPopwindow: false,
      singleLogMap: {}
    })
  }

  executePage = () => {
    return (
      <div>
        <div style={{ height: '40px' }}>
          <div className="mg2y alignright">
            <Button>
              <Link to={'/console/offline-calc/models'}>返回</Link>
            </Button>
          </div>
          {this.renderHistoryTable()}
        </div>
      </div>)
  }

  renderHistoryTable = () => {
    const { historyList = [], pageIndex, totalNum } = this.props
    const columns = [
      {
        title: '执行编号',
        dataIndex: 'executeNum',
        render: (v, o) => _.get(o, 'first.executionId', ''),
        width: 80
      },
      {
        title: '任务名称',
        dataIndex: 'showName',
        render: (v, o) => _.get(o, 'first.showName', '')
      },
      {
        title: '执行器',
        dataIndex: 'executer',
        render: (v, o) => _.get(o, 'second.host', '')
      },
      {
        title: '开始时间',
        dataIndex: 'startTime',
        render: (v, o) => {
          const date = _.get(o, 'first.startTime', '')
          return date ? moment(date).format('YYYY-MM-DD HH:mm:ss') : '-'
        },
        width: 140
      },
      {
        title: '结束时间',
        dataIndex: 'endTime',
        render: (v, o) => {
          const date = _.get(o, 'first.endTime', '')
          return date ? moment(date).format('YYYY-MM-DD HH:mm:ss') : '-'
        },
        width: 140
      },
      {
        title: '耗时',
        dataIndex: 'useTime',
        render: (v, o) => this.getSpendTime(o.first),
        width: 80
      },
      {
        title: '业务时间',
        dataIndex: 'businessTime',
        render: (v, o) => {
          const date = _.get(o, 'first.businessTime', '')
          return date ? moment(date).format('YYYY-MM-DD HH:mm') : '-'
        },
        width: 140
      },
      {
        title: '状态',
        dataIndex: 'tag',
        render: (v, o) => {
          const status = _.get(o, 'first.status', '')
          return (<Tag color={_.get(FLOW_STATUS_COLOR_MAP, status, '-')}>
            {_.get(FLOW_STATUS_TEXT_MAP, status, '-')}
          </Tag>)
        },
        width: 80
      },
      {
        title: '操作',
        key: 'action',
        render: (text, obj) => (
          <span>
            <Popconfirm placement="top" title="是否重新执行" onConfirm={() => this.handlerestartExecuteTask(obj)} okText="确定" cancelText="取消">
              <a className="mg2r">重新执行</a>
            </Popconfirm>
            <a type="primary" onClick={() => this.showLogPopWindow({ execId: _.get(obj, 'first.executionId', '') })}>查看日志</a>
          </span>
        )
      }
    ]

    const data = historyList
    return (<Table
      bordered
      size="middle"
      rowKey="first.executionId"
      columns={columns}
      dataSource={data}
      pagination={{
        current: pageIndex,
        total: totalNum,
        showSizeChanger: true,
        defaultPageSize: 10,
        onChange: (page) => this.handleQueryHistoryTask({page}),
        showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`
      }}
    />
    )
  }

  /**
   * 计算任务耗时
   * @param obj 
   * key 
   */
  getSpendTime = (obj, key) => {
    if (obj.endTime === -1 || obj.submitTime === -1) {
      return '-'
    }
    let start = obj.startTime
    if (typeof start === 'undefined') {
      start = obj.submitTime
    }

    const sec = moment(obj.endTime).diff(moment(start), 'ms')
    return (sec < 60000 ? `${_.ceil(sec / 1000, 1)} 秒` : moment.duration(sec, 'ms').humanize())
  }

  historyStatusChange = (v) => {
    console.log(`selected ${v}`)
  }

  handleChange = (value, p) => {

  }

  onDateChange = (value, dateString) => {
    console.log('Selected Time: ', value)
    console.log('Formatted Selected Time: ', dateString)
  }

  onDateOk = (value) => {
    console.log('onOk: ', value._d)
  }
}
