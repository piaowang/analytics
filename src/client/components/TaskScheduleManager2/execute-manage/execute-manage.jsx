import React from 'react'
import { SearchOutlined } from '@ant-design/icons';
import { Button, Tabs, Input, Col, DatePicker, Table, Select, Tag, Modal, Popconfirm } from 'antd'
import Bread from '../../Common/bread'
import HorizontalSplitHelper from '../../Common/horizontal-split-helper'
import TaskTree from '../task-tree'
import { TASK_TREE_TYPE, FLOW_STATUS_TEXT_MAP, FLOW_STATUS_COLOR_MAP, getTypeKeysByKey } from '../constants'
import TaskListModel, { namespace, taskTreeNamespance } from './execute-manage-model'
import { connect } from 'react-redux'
import ScheduleLogPopWindow from './execute-manage-log-popwindow'
import moment from 'moment'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'

const LEFT_PANEL_WIDTH = 240
const { TabPane } = Tabs

@connect(props => {
  return {
    selectedKeys: _.get(props, [taskTreeNamespance, 'selectedKeys'], []),
    taskTreeInfo: _.get(props, [taskTreeNamespance, 'taskTreeInfo'], {}),
    ...props[namespace]
  }
})

@withRuntimeSagaModel(TaskListModel)
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
          <div
            className="height-100 task-left-panel"
            defaultWeight={LEFT_PANEL_WIDTH}
            collapseTitle="任务选择"
          >
            <TaskTree taskTreeType={TASK_TREE_TYPE.executionHandle.name} selectId={_.get(params, 'taskId', '')} />
          </div>
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
    const { pageStatus } = this.props
    return (
      <div>
        <div style={{ height: '40px' }}>
          <Tabs
            activeKey={pageStatus === 0 ? 'running' : 'history'}
            onChange={(v) => {
              if(v === 'history') {
                this.handleQueryHistoryTask({ pageStatus:  1 , searchTaskName: '', searchStartTime: '', searchEndTime: '' })
              } else {
                this.handleQueryRunningFlows({ pageStatus:  0 , searchTaskName: '', searchStartTime: '', searchEndTime: '' })
              }
            }}
          >
            <TabPane tab="正在执行" key={'running'}>
              {this.historyBar()}
              {this.renderExecuteTable()}
            </TabPane>
            <TabPane tab="执行历史" key={'history'}>
              {this.historyBar()}
              {this.renderHistoryTable()}
            </TabPane>
          </Tabs>
          {/* <Button type={!isHistory ? 'primary' : 'default'} className="mg2r" onClick={() => this.changeState({ pageStatus: 0 })}></Button>
          <Button
            type={isHistory ? 'primary' : 'default'}
            onClick={() => {
              this.changeState({ pageStatus: 1 })
              this.handleQueryHistoryTask()
            }}
          >
            执行历史
          </Button> */}
        </div>
        {/* <div className=" mg2t ">
          <Bread path={[{ name: isHistory ? '执行历史' : '正在执行' }]} />
          {this.historyBar()}
          <div className="mg2t mg2l mg2r">
            {isHistory ? this.renderHistoryTable() : this.renderExecuteTable()}
          </div>
        </div> */}
      </div>)
  }

  renderExecuteTable = () => {
    const { runningList = [], searchTaskName, searchStartTime, searchEndTime, selectedKeys, taskTreeInfo } = this.props
    let taskIds = []
    const selectKey = _.get(selectedKeys, '0', '').toString()
    if (_.startsWith(selectKey, 'type-')) {
      const key = selectKey.substr(5)
      taskIds = getTypeKeysByKey([key], taskTreeInfo.types)
      taskIds = taskTreeInfo.tasks.filter(p => taskIds.includes(p.typeId.toString())).map(p => p.id.toString())
    } else {
      taskIds = [selectKey]
    }
    let data = runningList.filter(p => {

      let res = true
      res = taskIds.includes(p.first.projectId.toString())
      if (!res) return false
      res = searchTaskName
        ? _.get(p, 'first.showName', '').indexOf(searchTaskName) >= 0
        : true
      if (!res) return false

      res = searchStartTime
        ? moment(searchStartTime).startOf('d') + 0 < _.get(p, 'first.startTime', 0)
        : true
      if (!res) return false

      res = searchEndTime
        ? moment(searchEndTime).endOf('d') + 0 >= moment(_.get(p, 'first.businessTime', 0)) + 0
        : true
      return res
    })
    const columns = [
      {
        title: '任务名称',
        dataIndex: 'showName',
        render: (v, o) => _.get(o, 'first.showName', '')
      },
      {
        title: '执行编号',
        dataIndex: 'executeNum',
        render: (v, o) => _.get(o, 'first.executionId', '')
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
        }
      },
      {
        title: '业务时间',
        dataIndex: 'businessTime',
        render: (v, o) => {
          const date = _.get(o, 'first.businessTime', '')
          return date ? moment(date).format('YYYY-MM-DD HH:mm:ss') : '-'
        }
      },
      {
        title: '状态',
        dataIndex: 'status',
        render: (v, o) => {
          const status = _.get(o, 'first.status', '')
          return (<Tag color={_.get(FLOW_STATUS_COLOR_MAP, status, '-')}>
            {_.get(FLOW_STATUS_TEXT_MAP, status, '-')}
          </Tag>)
        }
      },
      {
        title: '操作',
        key: 'action',
        align: 'center',
        render: (text, obj) => (
          <span>
            <Popconfirm placement="top" title="是否停止执行？" onConfirm={() => this.handleStopExecuteTask({ execId: _.get(obj, 'first.executionId', '') })} okText="确定" cancelText="取消">
              <a className="mg2r">停止执行</a>
            </Popconfirm>
            <a type="primary" onClick={() => this.showLogPopWindow({ execId: _.get(obj, 'first.executionId', '') })}>查看日志</a>
          </span>
        )
      }
    ]

    return (
      <div >
        <Table
          bordered
          size="middle"
          rowKey="first.executionId"
          columns={columns}
          dataSource={data}
          pagination={{
            total: data.length,
            showSizeChanger: true,
            defaultPageSize: 10,
            showTotal: (totalNum, range) => `总计 ${totalNum} 条，当前展示第 ${range.join('~')} 条`
          }}
        />
      </div>
    )
  }

  historyBar = () => {
    const { pageStatus } = this.props
    return (
      <div className="mg2t" style={{ height: '40px', display: 'flex' }}>
        <Col span={5}>
          <div >
            <div className="mg2l alignright iblock">
              任务名:
            </div>
            <Input className="mg2l mg3r width-50 iblock"
              placeholder={'请输入任务名'}
              onChange={v => this.changeState({ searchTaskName: v.target.value })}
            />
          </div>
        </Col>
        <Col span={5}>
          <div >
            <div className="alignright iblock">
              开始时间:
            </div>
            <DatePicker
              className="mg2l mg3r width-50 iblock"
              placeholder="开始时间"
              onChange={v => this.changeState({ searchStartTime: v })}
            />
          </div>
        </Col>

        <Col span={5}>
          <div >
            <div className="alignright iblock">
              {pageStatus === 0 ? '业务' : '结束'}时间:
            </div>
            <DatePicker
              className="mg2l mg3r width-50 iblock"
              placeholder="结束时间"
              onChange={v => this.changeState({ searchEndTime: v })}
            />
          </div>
        </Col>
        {
          pageStatus === 0
            ? null
            : <Col span={4}>
              <div >
                <div className="alignright iblock mg2r">
                  状态:
                </div>
                <Select defaultValue="" style={{ width: '50%' }} onChange={v => this.changeState({ searchStatus: v })}>
                  <Option value="">全部</Option>
                  <Option value="success">成功</Option>
                  <Option value="fail">失败</Option>
                  <Option value="kill">终止</Option>
                </Select>
              </div>
            </Col>
        }
        {
          pageStatus === 0
            ? <Col span={5}>
              <div className="alignleft ">
                <Button type="primary" icon={<SearchOutlined />} onClick={() => this.handleQueryRunningFlows()}>刷新</Button>
              </div>
            </Col>
            : <Col span={5}>
              <div className="alignleft ">
                <Button type="primary" icon={<SearchOutlined />} onClick={() => this.handleQueryHistoryTask({})}>搜索</Button>
              </div>
            </Col>
        }
      </div>
    );
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
