import React, { useState } from 'react'
import moment from 'moment'
import _ from 'lodash'
import { Table, Popover, message, Modal, Popconfirm } from 'antd'
import { getNextTriggerDateByLater } from '../../../common/cron-picker-kit.js'
import SetScheduleExecuteV3 from '../task-edit/flowConsole/set-schedule-execute-v3'
import Header from './handler'
import { namespace } from './model'
import { connect } from 'react-redux'

const formatDate = timer => {
  return timer > 0
    ? moment(timer).format('YYYY-MM-DD HH:mm:ss')
    : '-'
}

const defaultSetting = {
  'cronInfo': {
    'unitType': '0',
    'selectedPeriod': 'hour',
    'cronExpression': '0 * * * *',
    'hourValue': null,
    'selectedHourOption': {
      'minute': '0'
    },
    'selectedDayOption': {
      'hour': '0',
      'minute': '0'
    },
    'selectedWeekOption': {
      'hour': '0',
      'day': '1',
      'minute': '0'
    },
    'selectedMonthOption': {
      'hour': '0',
      'day': '1',
      'minute': '0'
    },
    'selectedYearOption': {
      'month': '1',
      'hour': '0',
      'day': '1',
      'minute': '0'
    },
    'selectedIntervalOption': {
      'hour': 1,
      'startHour': 18,
      'minute': 38
    },
    'period': 'day',
    'option': {
      'hour': '0',
      'month': '1',
      'day': '1',
      'minute': '0'
    },
    'taskStartTime': moment().format('YYYY-MM-DD HH:mm:ss'),
    'taskEndTime': moment().add(10, 'y').format('YYYY-MM-DD HH:mm:ss')
  },
  'notifyWarnObj': {
    'successEmails': '',
    'emailAlertType': ''
  },
  'executeParamsObj': {
    'flowPriority': 5,
    'executeType': 1,
    'idealExecutorIds': '',
    'executors': [
      {
        'id': 1,
        'host': 'dev5.sugo.net',
        'port': 12321,
        'lastStatsUpdatedTime': null,
        'active': true,
        'executorInfo': null
      }
    ]
  }
}

function TaskScheduleList(props) {
  const {
    loading,
    usersDict,
    isTaskGroup = false,
    taskList = [],
    taskGrouplist = [],
    taskProjectList = [],
    queryPamrams = {}
  } = props

  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [selectedRow, setSelectedRow] = useState([])
  const [state, setState] = useState({
    editItem: {},
    cornSetVisable: false,
    isBulk: false,
    setting: defaultSetting
  })

  /**
   * 保存调度信息
   */
  const saveCronInfo = () => {
    const { setting, isBulk, editItem } = state
    props.dispatch({
      type: `${namespace}/saveCornInfo`,
      payload: { items: isBulk ? selectedRow : [editItem], setting, isTaskGroup },
      callback: onCloseEditCorn
    })
    setSelectedRow([])
    setSelectedRowKeys([])
  }

  const setQueryParams = (obj) => {
    props.dispatch({
      type: `${namespace}/changeState`,
      payload: { queryPamrams: obj }
    })
  }

  /**
   * 暂停调度
   * @param {*} record 
   */
  const pauseAudit = (record) => {
    props.dispatch({
      type: `${namespace}/pauseAudit`,
      payload: { isTaskGroup, items: _.isEmpty(record) ? selectedRow : [record] }
    })
    setSelectedRow([])
    setSelectedRowKeys([])
  }

  /**
   * 取消调度信息
   * @param {*} record
   */
  const cancelAudit = (record) => {
    props.dispatch({
      type: `${namespace}/cancelAudit`,
      payload: { isTaskGroup, items: _.isEmpty(record) ? selectedRow : [record] }
    })
    setSelectedRow([])
    setSelectedRowKeys([])
  }

  /**
   * 启动调度信息
   */
  const startAudit = () => {
    setState({
      ...state,
      isBulk: true,
      cornSetVisable: true,
      setting: defaultSetting,
      editItem: {}
    })
  }

  /**
   *  查询工作流信息
   * @param {*} params 查询条件
   */
  const onQueryData = (params) => {
    props.dispatch({
      type: `${namespace}/${isTaskGroup ? 'getTaskGroupList' : 'getTaskList'}`,
      payload: params
    })
    setSelectedRow([])
    setSelectedRowKeys([])
  }

  const onEditSingSingleCorn = (record) => {
    setState({
      ...state,
      isBulk: false,
      cornSetVisable: true,
      setting: record.setting || defaultSetting,
      editItem: record
    })
  }

  const onCloseEditCorn = () => {
    setState({
      ...state,
      isBulk: false,
      cornSetVisable: false,
      setting: defaultSetting,
      editItem: {}
    })
  }

  let columns = [{
    title: '项目名称',
    dataIndex: 'project_name',
    key: 'project_name'
  }, {
    key: 'showName',
    dataIndex: 'showName',
    title: '任务名称'
  }, {
    key: 'lastModifiedTimestamp',
    dataIndex: 'lastModifiedTimestamp',
    title: '编辑时间',
    sorter: (a, b) => a.lastModifiedTimestamp - b.lastModifiedTimestamp,
    render: text => formatDate(text)
  }, {
    key: 'nextExecTime',
    dataIndex: ['scheduleInfo', 'nextExecTime'],
    title: '下次执行时间',
    sorter: (a, b) => a.nextExecTime - b.nextExecTime,
    render: text => formatDate(text)
  }, {
    key: 'cronExpression',
    dataIndex: ['scheduleInfo', 'info', 'cronExpression'],
    title: '执行周期',
    render: (text) => {
      if (!text) {
        return '-'
      }
      const content = getNextTriggerDateByLater(text || '0 0 * * *')
      let title = <p>调度执行时间</p>
      let arr = content.map((item, i) => <p key={i}>{item}</p>)
      return (<Popover placement='bottom' title={title} content={arr}>
        <a className='pointer'>{text}</a>
      </Popover>)
    }
  }, {
    title: '执行人',
    key: 'executeUser',
    dataIndex: ['scheduleInfo', 'executionOptions', 'executeUser'],
    render: (val) => {
      return _.get(usersDict[val], 'first_name') || _.get(usersDict[val], 'username', val)
    }
  }, {
    title: '操作',
    key: 'operate',
    render: (v, record) => {
      return (
        <React.Fragment>
          {
            record.status === '3'
              ? (<Popconfirm
                title='确定取消该项调度任务？'
                onConfirm={() => cancelAudit(record)}
              >
                <a>取消</a>
              </Popconfirm>)
              : null
          }
          {
            record.status === '2'
              ?
              <Popconfirm
                title='确定暂停该项调度任务？'
                onConfirm={() => {
                  pauseAudit(record, false)
                  return message.warn('暂停中')
                }}
              >
                <a className='mg2l'>暂停</a>
              </Popconfirm>
              : null
          }
          {
            record.status === '3' || record.status === '0'
              ? <a onClick={() => onEditSingSingleCorn(record)} className='mg2l'>启动</a>
              : null
          }
        </React.Fragment>
      )
    }
  }]

  const dataSource = isTaskGroup ? taskGrouplist : taskList

  return (
    <div className='pd3x overscroll-x'>
      <div>
        <Header
          taskProjectList={taskProjectList}
          onQueryData={onQueryData}
          queryPamrams={queryPamrams}
          setQueryParams={setQueryParams}
          cancelAudit={() => cancelAudit()}
          pauseAudit={() => pauseAudit()}
          startAudit={() => startAudit()}
        />
      </div>
      <div className='tableBox'>
        <Table
          columns={columns}
          bordered
          rowSelection={{
            selectedRowKeys,
            onChange: (rowKeys, selectedRow) => {
              setSelectedRowKeys(rowKeys)
              setSelectedRow(selectedRow)
            }
          }}
          pagination={{
            showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`,
            total: dataSource.length,
            showSizeChanger: true,
            defaultPageSize: 10
          }}
          loading={loading}
          dataSource={dataSource.map((p, i) => ({ ...p, key: i + 1 }))}
        />
      </div>
      <Modal
        title='设置任务调度'
        visible={state.cornSetVisable}
        destroyOnClose
        onOk={() => saveCronInfo()}
        onCancel={onCloseEditCorn}
      >
        <SetScheduleExecuteV3
          cronInfo={_.get(state, 'setting.cronInfo', {})}
          changeState={(v) => {
            setState({
              ...state,
              setting: {
                ...state.setting,
                ...v
              }
            })
          }}
        />
      </Modal>
    </div>
  )
}

export default connect((state) => ({
  ...state[namespace],
  usersDict: _.keyBy(state.common.users, 'id')
}))(TaskScheduleList)
