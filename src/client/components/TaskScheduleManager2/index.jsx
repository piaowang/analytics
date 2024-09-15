import React, { Component } from 'react'
import Bread from '../Common/bread'
import TaskTree from './task-tree'
import { TASK_TREE_TYPE, TASK_ACTION_TYPE, TASK_OPERTION_FORM_TYPE, TASK_FORM_SET_HW_STEP, DEFAULT_CRONINFO, getTreeTypeId, validInputName } from './constants'
import { connect } from 'react-redux'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Table, Button, Popover, message, Popconfirm, Modal, Input } from 'antd'
import TaskListModel, { namespace, taskTreeNamespance } from './store/model'
import TaskEditModal from './edit-task-datacollect'
import TaskEditModalOther from './edit-task-other'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import CopyTaskModal from './form/copy-task'
import { getNextTriggerDateByLater } from '../../common/cron-picker-kit.js'
import _ from 'lodash'
import { browserHistory } from 'react-router'
import DropOption from '../Common/DropOption'
import SchedlueAlarmSet from './schedlue-alarm-set/index'
import ImportTask from './import-task-flow'
import { Anchor } from '../Common/anchor-custom'

const LEFT_PANEL_WIDTH = 240
@connect(props => {
  return {
    listData: _.get(props, [taskTreeNamespance, 'listData'], []),
    selectedKeys: _.get(props, [taskTreeNamespance, 'selectedKeys'], []),
    isDataCollect: _.get(props, [taskTreeNamespance, 'isDataCollect'], []),
    taskActionType: _.get(props, [taskTreeNamespance, 'taskActionType'], []),
    scheduleInfos: _.get(props, [taskTreeNamespance, 'scheduleInfos'], {}),
    taskTreeInfo: _.get(props, [taskTreeNamespance, 'taskTreeInfo'], {}),
    ...props[namespace]
  }
})
@withRuntimeSagaModel(TaskListModel)
export default class TaskScheduleList extends Component {
  startTask = payload => {
    this.props.dispatch({
      type: `${namespace}/startTask`,
      payload
    })
  }

  changeState = payload => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload
    })
  }

  deleteTask = payload => {
    this.props.dispatch({
      type: `${namespace}/deleteTask`,
      payload
    })
  }

  editTask = (isDataCollect, obj, payload) => {
    this.changeState({ showEidtTaskInfo: true })
    if (isDataCollect) {
      this.props.dispatch({
        type: `${namespace}/getTaskInfo`,
        payload
      })
    } else {
      let { taskActionType } = this.props
      this.changeState({
        taskInfo: obj,
        showEidtTaskInfo: true,
        addStep: taskActionType === TASK_ACTION_TYPE.dataModeling ? TASK_OPERTION_FORM_TYPE.editModelInfo : TASK_OPERTION_FORM_TYPE.editTaskInfo
      })
    }
  }

  renderTable = isDataCollect => {
    const { listData, selectedKeys, scheduleInfos } = this.props
    const tableButton = (v, o) => {
      let paths = [
        {
          click: () => this.editTask(isDataCollect, o, { name: o.name }),
          label: '编辑'
        },
        {
          click: () => {
            this.changeState({ showAlarmSet: true, taskInfo: o })
          },
          label: '调度'
        },
        {
          click: () => this.startTask({ project: o.name, projectId: o.id }),
          label: '立即执行'
        },
        {
          click: () => browserHistory.push(`/console/new-task-schedule-manager/execute-manager/${o.id}`),
          label: '执行记录'
        },
        {
          label: (
            <Anchor target='_blank' href={`/app/new-task-schedule/manager?project=${o.name}&amp&download=true`}>
              导出
            </Anchor>
          )
        },
        {
          click: () => this.changeState({ copyProject: o.name, showInportTask: true }),
          label: '导入'
        },
        isDataCollect
          ? null
          : {
              click: () => this.changeState({ copyProject: o.name, visibleCopy: true }),
              label: '复制'
            },
        {
          click: () => this.deleteTask({ id: o.id }),
          label: '删除'
        }
      ].filter(_.identity)
      //** 通常由扩展包决定 开启项目列表 => 数据接入菜单
      if (window.sugo.enableProjectAccessMenu === false) {
        paths = paths.filter(p => p.label !== '数据接入')
      }
      return <DropOption menuOptions={paths} />
    }
    // <Popconfirm placement="top" title='确定删除' onConfirm={() => this.deleteTask({ id: o.id })} okText="确定" cancelText="取消">
    //   <a className="mg1r color-disable pointer-shadow" >删除</a>
    // </Popconfirm>

    const columns = isDataCollect
      ? [
          {
            title: '任务名称',
            dataIndex: 'showName',
            width: 100
          },
          {
            title: '业务部门',
            dataIndex: 'businessDepartment',
            render: (v, o) => _.get(o, 'metadata.businessDepartment'),
            width: 100
          },
          {
            title: '业务名称',
            dataIndex: 'businessName',
            render: (v, o) => _.get(o, 'metadata.businessName'),
            width: 100
          },
          {
            title: '采集类型',
            dataIndex: 'collectType',
            render: (v, o) => (_.get(o, 'metadata.increaseCollectColumn', '') ? '增量采集' : '全量采集'),
            width: 70
          },
          {
            title: '表/文件/topic',
            dataIndex: 'sourceTable',
            width: 150,
            render: (v, o) => _.get(o, 'metadata.sourceTableInfo', '')
          },
          {
            title: '目标数据表',
            dataIndex: 'targetTable',
            width: 150,
            render: (v, o) => _.get(o, 'metadata.targetTableInfo', '')
          },
          {
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
              return (
                <Popover placement='bottom' title={title} content={arr}>
                  <a className='pointer'>{val}</a>
                </Popover>
              )
            }
          },
          {
            title: '状态',
            dataIndex: 'active',
            width: 50,
            render: (v, o) => {
              const val = _.get(scheduleInfos, `${o.id}.0.info.cronExpression`, '')
              return val ? (
                <div>
                  <span className='mg1r icon-active' />
                  启用
                </div>
              ) : (
                <div>
                  <span className='mg1r icon-normal' />
                  禁用
                </div>
              )
            }
          },
          {
            title: '创建时间',
            dataIndex: 'createTimestamp',
            width: 140,
            render: (v, o) => moment(_.get(o, 'createTimestamp', 0)).format('YYYY-MM-DD HH:mm')
          },
          {
            title: '操作',
            dataIndex: 'operation',
            width: 80,
            render: tableButton
          }
        ]
      : [
          {
            title: '名称',
            dataIndex: 'showName',
            width: 200
          },
          {
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
              return (
                <Popover placement='bottom' title={title} content={arr}>
                  <a className='pointer'>{val}</a>
                </Popover>
              )
            }
          },
          {
            title: '状态',
            dataIndex: 'active',
            width: 80,
            render: (v, o) => {
              const val = _.get(scheduleInfos, `${o.id}.0.info.cronExpression`, '')
              return val ? (
                <div>
                  <span className='mg1r icon-active' />
                  启用
                </div>
              ) : (
                <div>
                  <span className='mg1r icon-normal' />
                  禁用
                </div>
              )
            }
          },
          {
            title: '创建时间',
            dataIndex: 'createTimestamp',
            width: 140,
            render: (v, o) => moment(_.get(o, 'createTimestamp', 0)).format('YYYY-MM-DD HH:mm')
          },
          {
            title: '描述',
            dataIndex: 'description'
          },
          {
            title: '操作',
            dataIndex: 'operation',
            width: 100,
            render: tableButton
          }
        ]

    return (
      <div className='task-table-panel corner pd2 scroll-content always-display-scrollbar'>
        <div className='alignright mg2b'>
          <Button
            onClick={() => {
              if (!selectedKeys.length) {
                message.error('请先选择任务分类节点!')
                return
              }
              this.changeState({
                showEidtTaskInfo: true,
                taskInfo: {},
                jobInfo: {},
                graph: {},
                fileContent: [{ id: 0 }],
                addStep: TASK_OPERTION_FORM_TYPE.addBaseInfo
              })
            }}
          >
            添加任务
          </Button>
        </div>
        <Table
          rowKey='id'
          size='middle'
          columns={columns}
          dataSource={listData}
          bordered
          pagination={{
            showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`,
            total: listData.length,
            showSizeChanger: true,
            defaultPageSize: 10
          }}
        />
      </div>
    )
  }

  renderEditTaskModal = () => {
    let { taskInfo = {}, showEidtTaskInfo, isDataCollect, ...res } = this.props
    return (
      <TaskEditModal
        taskInfo={taskInfo}
        saveTaskInfo={this.saveTaskInfo}
        showEidtTaskInfo={showEidtTaskInfo && isDataCollect}
        cancelFn={() => this.changeState({ showEidtTaskInfo: false })}
        okFn={() => {}}
        changeState={this.changeState}
        {...res}
      />
    )
  }

  renderEditTaskModalOther = () => {
    let { taskInfo = {}, showEidtTaskInfo, isDataCollect, ...res } = this.props
    return (
      <TaskEditModalOther
        taskInfo={taskInfo}
        saveTaskInfo={this.saveTaskInfo}
        showEidtTaskInfo={showEidtTaskInfo && !isDataCollect}
        cancelFn={() => this.changeState({ showEidtTaskInfo: false })}
        okFn={() => {}}
        changeState={this.changeState}
        {...res}
      />
    )
  }

  saveTaskInfo = values => {
    const { addStep, selectedKeys, taskInfo, taskActionType, taskTreeInfo, jobInfo } = this.props
    // 保存第一步
    if (addStep === TASK_OPERTION_FORM_TYPE.addBaseInfo) {
      this.props.dispatch({
        type: `${namespace}/addTaskBaseInfo`,
        payload: {
          ...values,
          actionType: taskActionType,
          typeId: getTreeTypeId(selectedKeys[0], taskTreeInfo.tasks)
        }
      })
      return
    }
    // 第二部采集保存
    if (TASK_FORM_SET_HW_STEP.includes(addStep) && taskActionType === TASK_ACTION_TYPE.dataCollection) {
      this.props.dispatch({
        type: `${namespace}/saveTaskConfigInfo`,
        payload: {
          ...taskInfo,
          ...values,
          actionType: TASK_ACTION_TYPE.dataCollection,
          jobName: _.get(jobInfo, 'jobName', '')
        }
      })
      return
    }

    // 第二部清洗建模保存
    if (TASK_FORM_SET_HW_STEP.includes(addStep) && taskActionType !== TASK_ACTION_TYPE.dataCollection) {
      this.props.dispatch({
        type: `${namespace}/saveTaskFlowInfo`,
        payload: {
          ...taskInfo,
          ...values,
          actionType: taskActionType
        }
      })
      return
    }
  }

  copyOk = async newProjectShowName => {
    const { copyProject } = this.props
    this.props.dispatch({
      type: `${namespace}/copyTask`,
      payload: { name: copyProject, newProjectShowName: newProjectShowName }
    })
  }

  copyCancel = () => {
    this.changeState({ visibleCopy: false })
  }

  renderCopyPanel = () => {
    const { visibleCopy } = this.props
    return <CopyTaskModal visibleCopy={visibleCopy} copyOk={this.copyOk} copyCancel={this.copyCancel} />
  }

  renderImportPanel = () => {
    const { showInportTask, copyProject } = this.props
    return <ImportTask showInportTask={showInportTask} taskName={copyProject} hideModal={() => this.changeState({ showInportTask: false })} />
  }

  render() {
    const { isDataCollect, showEidtTaskInfo, showAlarmSet, scheduleInfos, taskInfo = {}, executors } = this.props
    let cronInfo = _.get(scheduleInfos, `${taskInfo.id}.0.info`, {})
    cronInfo = _.isEmpty(cronInfo) ? DEFAULT_CRONINFO : cronInfo
    const scheduleId = _.get(scheduleInfos, `${taskInfo.id}.0.scheduleId`, '')
    return (
      <div className='width-100 task-schedule height-100 '>
        <Bread path={[{ name: '数据开发' }]} />
        <HorizontalSplitHelper style={{ height: 'calc(100% - 44px)' }} collapseWidth={100}>
          <div className='height-100 task-left-panel' defaultWeight={LEFT_PANEL_WIDTH} collapseTitle='任务选择'>
            <TaskTree taskTreeType={TASK_TREE_TYPE.dataDevelop.name} />
          </div>
          <div className='height-100 task-right-panel ' defaultWeight={window.innerWidth - LEFT_PANEL_WIDTH}>
            {this.renderTable(isDataCollect)}
          </div>
        </HorizontalSplitHelper>
        {showEidtTaskInfo ? this.renderEditTaskModal() : null}
        {showEidtTaskInfo ? this.renderEditTaskModalOther() : null}
        {this.renderImportPanel()}
        {this.renderCopyPanel()}
        {showAlarmSet ? (
          <SchedlueAlarmSet
            scheduleId={scheduleId}
            showAlarmSet={showAlarmSet}
            taskId={taskInfo.id}
            taskName={taskInfo.name}
            cronInfo={cronInfo}
            executors={executors}
            hideModal={() => this.changeState({ showAlarmSet: false })}
          />
        ) : null}
      </div>
    )
  }
}
