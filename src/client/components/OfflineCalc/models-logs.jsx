import React, { Component } from 'react'
import Bread from '../Common/bread'
import TaskTree from '../TaskScheduleManager2/task-tree'
import { TASK_TREE_TYPE, TASK_ACTION_TYPE, TASK_OPERTION_FORM_TYPE, TASK_FORM_SET_HW_STEP, DEFAULT_CRONINFO, getTreeTypeId } from '../TaskScheduleManager2/constants'
import { connect } from 'react-redux'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import { Table, Button, Popover, message, Popconfirm } from 'antd'
import TaskListModel, { namespace } from '../TaskScheduleManager2/store/model'
import TaskTreeModel from '../TaskScheduleManager2/store/tree-model'
import TaskEditModal from '../TaskScheduleManager2/edit-task-datacollect'
import TaskEditModalOther from '../TaskScheduleManager2/edit-task-other'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import { treeNodeKeyStr } from '../TaskScheduleManager2/task-tree'
import { getNextTriggerDateByLater } from '../../common/cron-picker-kit.js'
import _ from 'lodash'
import { Link, browserHistory } from 'react-router'

const LEFT_PANEL_WIDTH = 240
const taskTreeNamespance = 'taskScheduleTree_models_logs'
@connect(props => {
  return {
    isDataCollect: _.get(props, [taskTreeNamespance, 'isDataCollect'], []),
    scheduleInfos: _.get(props, [taskTreeNamespance, 'scheduleInfos'], {}),
    taskTreeInfo: _.get(props, [taskTreeNamespance, 'taskTreeInfo'], {}),
    ...props[namespace]
  }
})
@withRuntimeSagaModel([
  TaskListModel,   
  () => TaskTreeModel({taskTreeType: 'models_logs'})])
export default class TaskScheduleList extends Component {

  componentWillMount() {
    this.props.dispatch({
      type: `${taskTreeNamespance}/getTaskTreeData`,
      payload: {
        taskTreeType: ''
      }
    })
  }

  changeState = payload => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload
    })
  }

  startTask = payload => {
    this.props.dispatch({
      type: `${namespace}/startTask`,
      payload
    })
  }

  renderTable = (isDataCollect) => {
    const { taskTreeInfo, scheduleInfos, params } = this.props
    const listData = _.get(taskTreeInfo, 'tasks', [])
    const id = _.get(params, 'id')
    let dListData = listData.filter( i => i.showName.includes(id.toLowerCase()))
    const tableButton = (v, o) => (<div>
      <a className="mg1r" onClick={() => this.startTask({ project: o.name, projectId: o.id })}>手动执行</a>
      <a className="mg1r" onClick={() => browserHistory.push(`/console/offline-calc/models/execute/${o.id}`)}>执行记录</a>
    </div>)
    const columns = isDataCollect
      ? [{
        title: '任务名称',
        dataIndex: 'showName',
        width: 100
      }, {
        title: '业务部门',
        dataIndex: 'businessDepartment',
        render: (v, o) => _.get(o, 'metadata.businessDepartment'),
        width: 100
      }, {
        title: '业务名称',
        dataIndex: 'businessName',
        render: (v, o) => _.get(o, 'metadata.businessName'),
        width: 100
      }, {
        title: '采集类型',
        dataIndex: 'collectType',
        render: (v, o) => _.get(o, 'metadata.increaseCollectColumn', '') ? '增量采集' : '全量采集',
        width: 70
      }, {
        title: '表/文件/topic',
        dataIndex: 'sourceTable',
        width: 150,
        render: (v, o) => _.get(o, 'metadata.sourceTableInfo', '')
      }, {
        title: '目标数据表',
        dataIndex: 'targetTable',
        width: 150,
        render: (v, o) => _.get(o, 'metadata.targetTableInfo', '')
      }, {
        title: '调度周期',
        dataIndex: 'cronExpression',
        width: 80,
        render: (v, o) => {
          const val = _.get(scheduleInfos, `${o.id}.0.info.cronExpression`, '')
          if (!val) {
            return ''
          }
          const content = getNextTriggerDateByLater(val)
          let title = <p style={{ padding: 0, margin: 0 }}>调度执行时间</p>
          let arr = content.map((item, i) => <p key={i}>{item}</p>)
          return (<Popover placement="bottom" title={title} content={arr}>
            <a className="pointer">{val}</a>
          </Popover>)
        }
      }, {
        title: '状态',
        dataIndex: 'active',
        width: 50,
        render: (v, o) => {
          const val = _.get(scheduleInfos, `${o.id}.0.info.cronExpression`, '')
          return val ? <div><span className="mg1r icon-active" />启用</div> : <div><span className="mg1r icon-normal" />禁用</div>
        }
      }, {
        title: '创建时间',
        dataIndex: 'createTimestamp',
        width: 140,
        render: (v, o) => moment(_.get(o, 'createTimestamp', 0)).format('YYYY-MM-DD HH:mm')
      },{
        title: '操作',
        dataIndex: 'operation',
        width: 220,
        render: tableButton
      }]
      : [{
        title: '名称',
        dataIndex: 'showName',
        width: 200
      }, {
        title: '调度周期',
        dataIndex: 'cronExpression',
        width: 200,
        render: (v, o) => {
          const val = _.get(scheduleInfos, `${o.id}.0.info.cronExpression`, '')
          if (!val) {
            return ''
          }
          const content = getNextTriggerDateByLater(val)
          let title = <p style={{ padding: 0, margin: 0 }}>调度执行时间</p>
          let arr = content.map((item, i) => <p key={i}>{item}</p>)
          return (<Popover placement="bottom" title={title} content={arr}>
            <a className="pointer">{val}</a>
          </Popover>)
        }
      }, {
        title: '状态',
        dataIndex: 'active',
        width: 80,
        render: (v, o) => {
          const val = _.get(scheduleInfos, `${o.id}.0.info.cronExpression`, '')
          return val ? <div><span className="mg1r icon-active" />启用</div> : <div><span className="mg1r icon-normal" />禁用</div>
        }
      }, {
        title: '创建时间',
        dataIndex: 'createTimestamp',
        width: 140,
        render: (v, o) => moment(_.get(o, 'createTimestamp', 0)).format('YYYY-MM-DD HH:mm')
      }, {
        title: '描述',
        dataIndex: 'description'
      }, {
        title: '操作',
        dataIndex: 'operation',
        width: 220,
        render: tableButton
      }]

    return (<div className="task-table-panel corner pd2 scroll-content always-display-scrollbar">
      <div className="alignright mg2b">
        <Button>
          <Link to={'/console/offline-calc/models'}>返回</Link>
        </Button>
      </div>
      <Table
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={dListData}
        bordered
        pagination={{
          showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`,
          total: dListData.length,
          showSizeChanger: true,
          defaultPageSize: 10
        }}
      />
    </div>)
  }

  render() {
    const { isDataCollect, showEidtTaskInfo } = this.props
    return (
      <div className="width-100 task-schedule height-100 ">
        <Bread path={[{ name: '数据开发' }]} />
        <HorizontalSplitHelper
          style={{ height: 'calc(100% - 44px)' }}
          collapseWidth={100}
        >
          <div className="height-100 task-right-panel " defaultWeight={window.innerWidth - LEFT_PANEL_WIDTH}>
            {this.renderTable(isDataCollect)}
          </div>
        </HorizontalSplitHelper>
      </div>
    )
  }
}
