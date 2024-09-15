import React from 'react'
import { Button, Row, Input, Col, DatePicker, Table, Popover, Divider, Tag, Modal, Popconfirm } from 'antd'
import Bread from '../../Common/bread'
import HorizontalSplitHelper from '../../Common/horizontal-split-helper'
import TaskTree from '../task-tree'
import { TASK_TREE_TYPE, TASK_ACTION_TYPE, DEFAULT_CRONINFO } from '../constants'
import { namespace, taskTreeNamespance } from './schedule-manager-model'
import { connect } from 'react-redux'
import { getNextTriggerDateByLater } from '../../../common/cron-picker-kit.js'
const LEFT_PANEL_WIDTH = 240

@connect(props => {
  return {
    listData: _.get(props, [taskTreeNamespance, 'listData'], []),
    selectedKeys: _.get(props, [taskTreeNamespance, 'selectedKeys'], []),
    isDataCollect: _.get(props, [taskTreeNamespance, 'isDataCollect'], []),
    taskActionType: _.get(props, [taskTreeNamespance, 'taskActionType'], []),
    taskTreeInfo: _.get(props, [taskTreeNamespance, 'taskTreeInfo'], {}),
    ...props[namespace]
  }
})
export default class ScheduleManager extends React.Component {

  componentWillMount() {
    // const {limit,search,offset} = this.props
  }

  changeState = params => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload: params
    })
  }

  render() {
    return (
      <div className="width-100 task-schedule height-100">
        <Bread path={[{ name: '发布管理' }]} />
        <HorizontalSplitHelper
          style={{ height: 'calc(100% - 44px)' }}
          collapseWidth={100}
        >
          <div
            className="height-100 task-left-panel"
            defaultWeight={LEFT_PANEL_WIDTH}
            collapseTitle="任务选择"
          >
            <TaskTree taskTreeType={TASK_TREE_TYPE.scheduleHandle.name} />
          </div>
          <div className="height-100 task-right-panel" defaultWeight={window.innerWidth - LEFT_PANEL_WIDTH}>
            <div className="task-table-panel corner pd2">
              <div className="mg2t mg2b" style={{ height: '40px' }}>
                {this.searchBar()}
              </div>
              <div className="mg2">
                {this.renderTable()}
              </div>
            </div>
          </div>
        </HorizontalSplitHelper>
      </div>)
  }

  handleDeleteScheduleTask = payload => {
    this.props.dispatch({
      type: `${namespace}/cancleScheduleTask`,
      payload: payload
    })
  }

  renderTable = () => {
    const { listData, search_taskName, search_editTime, search_firstExecuteTime, search_nextExectuteTime } = this.props
    let data = []
    if (listData.length !== 0) {
      data = listData.map(p => ({ ...p.schedule, ..._.omit(p, 'schedule') }))
      data = search_taskName ? data.filter(p => p.showName.indexOf(search_taskName) > -1) : data
      data = search_editTime ? data.filter(p => {
        let time = moment(p.lastModifyTime).format('YYYY-MM-DD HH:mm:ss')
        if (time.indexOf(search_editTime) > -1) return p
      }) : data
      data = search_firstExecuteTime ? data.filter(p => {
        let time = moment(p.firstSchedTime).format('YYYY-MM-DD HH:mm:ss')
        if (time.indexOf(search_firstExecuteTime) > -1) return p
      }) : data
      data = search_nextExectuteTime ? data.filter(p => {
        let time = moment(p.nextExecTime).format('YYYY-MM-DD HH:mm:ss')
        if (time.indexOf(search_nextExectuteTime) > -1) return p
      }) : data
    }
    var sum = 10
    const columns = [
      {
        title: '任务名称',
        dataIndex: 'showName',
        key: 'showName',
        width: 200
      },
      {
        title: '编辑时间',
        dataIndex: 'lastModifyTime',
        key: 'lastModifyTime',
        width: 150,
        render: lastModifyTime => (
          <div>
            {moment(lastModifyTime).format('YYYY-MM-DD HH:mm:ss')}
          </div>
        )
      },
      {
        title: '首次执行时间',
        dataIndex: 'firstSchedTime',
        key: 'firstSchedTime',
        width: 150,
        render: firstSchedTime => (
          <div>
            {moment(firstSchedTime).format('YYYY-MM-DD HH:mm:ss')}
          </div>
        )
      },
      {
        title: '下次执行时间',
        key: 'nextExecTime',
        dataIndex: 'nextExecTime',
        width: 150,
        render: nextExecTime => (
          <div>
            {moment(nextExecTime).format('YYYY-MM-DD HH:mm:ss')}
          </div>
        )
      },
      {
        title: '执行周期',
        key: 'period',
        dataIndex: 'cronExpression',
        width: 150,
        render: (text, obj) => {
          if (!text) return null
          const content = getNextTriggerDateByLater(_.get(obj, 'info.cronExpression', '0 0 * * *'))
          let title = <p style={{ padding: 0, margin: 0 }}>调度执行时间</p>
          let arr = content.map((item, i) => <p key={i}>{item}</p>)
          return (<Popover placement="bottom" title={title} content={arr}>
            <a className="pointer">{text}</a>
          </Popover>)
        }
      },
      {
        title: '操作',
        key: 'action',
        width: 150,
        render: (text, obj) => (
          <span>
            <Popconfirm placement="top" title="是否取消调度？" onConfirm={() => this.handleDeleteScheduleTask(obj)} okText="确定" cancelText="取消">
              <a>取消调度</a>
            </Popconfirm>
          </span>
        )
      }
    ]
    return (
      <div >
        <Table
          bordered
          size="middle"
          rowKey="id"
          columns={columns}
          dataSource={data}
          pagination={{
            showSizeChanger: true,
            defaultPageSize: 10,
            showTotal: (total, range) => `总计 ${sum} 条，当前展示第 ${range.join('~')} 条`
          }}
        />
      </div>
    )
  }

  onClickEdit = (obj) => {
    const cronInfo = _.get(obj, 'info', {})
    const newState = {
      showEidtScheduleInfo: true,
      scheduleInfo: obj,
      executorIds: _.get(obj, 'idealExecutors[0].id', ''),
      cronInfo: _.isEmpty(cronInfo) ? DEFAULT_CRONINFO : cronInfo
    }
    return this.changeState(newState)
  }

  searchBar = () => {
    return (
      <div >
        <div className="aligncenter mg2l alignright iblock">任务名: </div>
        <Input className="mg2l mg3r iblock width150"
          placeholder={'请输入任务名'}
          onChange={(v) => this.changeState({ search_taskName: v.target.value })}
        />

        <div className="aligncenter alignright iblock">编辑时间:</div>
        <DatePicker
          className="mg2l mg3r iblock width150"
          format="YYYY-MM-DD"
          placeholder="编辑时间"
          onChange={(value, dateString) => this.changeState({ search_editTime: dateString })}
        />

        <div className="aligncenter alignright iblock">首次执行时间:</div>
        <DatePicker
          className="mg2l mg3r iblock width150"
          format="YYYY-MM-DD"
          placeholder="首次执行时间"
          onChange={(value, dateString) => this.changeState({ search_firstExecuteTime: dateString })}
        />

        <div className=" alignright iblock">下次执行时间:</div>
        <DatePicker
          className="mg2l mg3r iblock width150"
          format="YYYY-MM-DD"
          placeholder="下次执行时间"
          onChange={(value, dateString) => this.changeState({ search_nextExectuteTime: dateString })}
        />
      </div>
    )
  }
}
