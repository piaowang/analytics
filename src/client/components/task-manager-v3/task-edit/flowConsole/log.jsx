import React from 'react'
import { SearchOutlined } from '@ant-design/icons'
import { Button, Col, DatePicker, Table, Tag, Row } from 'antd'
import { FLOW_STATUS_TEXT_MAP, FLOW_STATUS_COLOR_MAP, getTypeKeysByKey } from '../../constants'
import HistoryModel, { namespace } from './log-model'
import { connect } from 'react-redux'
import moment from 'moment'
import withRuntimeSagaModel from '../../../Common/runtime-saga-helper'
import _ from 'lodash'
import PropTypes from 'prop-types'
import PubSub from 'pubsub-js'
import { Anchor } from '../../../Common/anchor-custom'

const DefaultTime = [moment().add(-7, 'd').startOf('d'), moment().startOf('d')]
@connect(props => {
  const taskId = _.get(props, 'taskV3EditModel.activeTabsKey', '')
  return {
    ...props[namespace + _.last(_.split(taskId, '_'))]
  }
})
@withRuntimeSagaModel(HistoryModel)
export default class ScheduleLog extends React.Component {
  constructor(props, context) {
    super(props, context)
  }

  componentDidMount() {
    this.token = PubSub.subscribe('schedule-log-refresh', () => this.handleQueryHistoryTask())
  }

  componentWillUnmount() {
    PubSub.unsubscribe(this.token)
  }

  changeState = obj => {
    const { taskId } = this.props
    this.props.dispatch({
      type: `${namespace + taskId}/changeState`,
      payload: obj
    })
  }

  handleQueryHistoryTask = (page = 1) => {
    const { searchStartTime, searchEndTime, searchStatus, taskId, taskType } = this.props
    if (!taskId) {
      return
    }
    let payload = {
      size: 10,
      page,
      status: searchStatus,
      begin: moment(searchStartTime || DefaultTime[0])
        .startOf('d')
        .format('MM/DD/YYYY HH:mm'),
      taskId,
      type: taskType,
      end: moment(searchEndTime || DefaultTime[1])
        .endOf('d')
        .format('MM/DD/YYYY HH:mm')
    }
    this.props.dispatch({
      type: `${namespace + taskId}/queryHistoryTask`,
      payload
    })
  }

  historyBar = () => {
    const { pageStatus } = this.props
    return (
      <div style={{ height: '40px' }}>
        <div className='alignright iblock width100'>开始时间:</div>
        <DatePicker className='mg2l mg3r width120 iblock' placeholder='开始时间' defaultValue={DefaultTime[0]} onChange={v => this.changeState({ searchStartTime: v })} />
        <div className='alignright iblock'>{pageStatus === 0 ? '业务' : '结束'}时间:</div>
        <DatePicker className='mg2l mg3r width120 iblock' placeholder='结束时间' defaultValue={DefaultTime[1]} onChange={v => this.changeState({ searchEndTime: v })} />
        <Button type='primary' icon={<SearchOutlined />} onClick={() => this.handleQueryHistoryTask()}>
          搜索
        </Button>
      </div>
    )
  }

  renderHistoryTable = () => {
    const { taskId, taskType, pageSize, historyList = [], pageIndex, totalNum, pList = [], userList = [] } = this.props
    let keyBy = []
    if (pList.length) {
      keyBy = _.keyBy(pList, p => p.id)
    }

    let userKeyBy = {}
    if (userList.length) {
      userKeyBy = _.keyBy(userList, p => p.id)
    }

    const columns = [
      {
        title: '项目名称',
        dataIndex: 'projectName',
        render: (v, o) => {
          const key = _.get(o, 'first.projectId', '')
          return _.get(keyBy[key], 'SugoTaskProject.name', '')
        }
      },
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
        title: '执行人',
        dataIndex: 'executerUser',
        render: (v, o) => {
          const key = _.get(o, 'first.submitUser', '')
          return _.get(userKeyBy[key], 'first_name', '')
        }
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
          return <Tag color={_.get(FLOW_STATUS_COLOR_MAP, status, '-')}>{_.get(FLOW_STATUS_TEXT_MAP, status, '-')}</Tag>
        },
        width: 80
      },
      {
        title: '操作',
        key: 'action',
        render: (text, obj) => (
          <span>
            <Anchor target='_blank' href={`/console/task-schedule-v3/execute-manager?taskid=${taskId}&tasktype=${taskType}`}>
              查看日志
            </Anchor>
          </span>
        )
      }
    ]

    return (
      <Table
        bordered
        size='middle'
        rowKey='first.executionId'
        columns={columns}
        dataSource={historyList}
        pagination={{
          current: pageIndex,
          total: totalNum,
          showSizeChanger: true,
          pageSize,
          onChange: page => this.handleQueryHistoryTask({ page }),
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
    return sec < 60000 ? `${_.ceil(sec / 1000, 1)} 秒` : moment.duration(sec, 'ms').humanize()
  }

  render() {
    return (
      <div className='pd2x bg-white height240 overscroll-y always-display-scrollbar'>
        {this.historyBar()}
        {this.renderHistoryTable()}
      </div>
    )
  }
}

ScheduleLog.propTypes = {
  searchStartTime: PropTypes.string,
  searchEndTime: PropTypes.string,
  searchStatus: PropTypes.string,
  //0:正在执行 1：执行历史
  pageStatus: PropTypes.number,
  historyList: PropTypes.any,
  totalNum: PropTypes.number,
  pageIndex: PropTypes.number,
  pageSize: PropTypes.number,
  taskId: PropTypes.string,
  taskType: PropTypes.string,
  dispatch: PropTypes.any,
  pList: PropTypes.array,
  userList: PropTypes.array
}
