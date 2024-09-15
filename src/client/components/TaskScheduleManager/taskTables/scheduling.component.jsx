import React, { Component } from 'react'
import Bread from '../../Common/bread'
import _ from 'lodash'
import { Table, Popconfirm, Tag, Popover } from 'antd'
import { FLOW_STATUS_COLOR_MAP, FLOW_STATUS_TEXT_MAP, formatDate } from '../constants'
import ScheduleFilterForm from './share-component'
import { getNextTriggerDateByLater } from '../../../common/cron-picker-kit.js'

class SchedulingComponent extends Component {
  state = {
    scheduleList: []
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    return {
      scheduleList: nextProps.taskTables.scheduleTables
    }
  }

  componentDidMount() {
    this.getData()
  }

  componentDidUpdate(prevProps) {
    if(this.props.id && this.props.id !== prevProps.id) {
      this.getData()
    }
  }

  getData = async () => {
    const { id } = this.props
    await this.props.actions.getSchduleTable(id)
  }

  handleFilter = param => {
    const { scheduleTables } = this.props.taskTables
    let arr = _.filter(scheduleTables, item => item.showName.match(param))
    this.setState({
      scheduleList: arr
    })
  }

  cancelProject = async obj => {
    await this.props.actions.cancelSchduleProject(obj.scheduleId)

    await this.getData()
  }

  turnToProject = o => {
    this.props.router.push(`/console/task-schedule-manager/${o.projectId}`)
  }

  render() {
    const { loading } = this.props.taskTables
    const { scheduleList } = this.state

    const columns = [
      {
        title: '任务名称',
        align: 'center',
        dataIndex: 'showName',
        sorter: (a, b) => a.showName > b.showName ? 1 : -1,
        render: (text, o) => (<span
          className="text-blue"
          onClick={() => this.turnToProject(o)}
        >
          {text}
        </span>)
      }, {
        title: '提交时间',
        align: 'center',
        dataIndex: 'submitTime',
        sorter: (a, b) => a.submitTime - b.submitTime,
        render: text => formatDate(text)
      }, {
        title: '第一次调度时间',
        align: 'center',
        dataIndex: 'firstSchedTime',
        sorter: (a, b) => a.firstSchedTime - b.firstSchedTime,
        render: text => formatDate(text)
      }, {
        title: '下次执行时间',
        align: 'center',
        dataIndex: 'nextExecTime',
        filters: [
          { 
            text: '今天', value: [
              new Date(new Date().toLocaleDateString()).getTime(), 
              new Date(new Date().toLocaleDateString()).getTime() + 24 * 60 * 60 * 1000
            ] 
          },
          { 
            text: '明天', value: [
              new Date(new Date().toLocaleDateString()).getTime() + 24 * 60 * 60 * 1000, 
              new Date(new Date().toLocaleDateString()).getTime() + 2 * 24 * 60 * 60 * 1000
            ] 
          }
        ],
        onFilter: (value, record) => {
          const start = parseInt(value.split(',')[0])
          const end = parseInt(value.split(',')[1])
          return record.nextExecTime >= start && record.nextExecTime < end
        },
        sorter: (a, b) => a.nextExecTime - b.nextExecTime,
        render: text => formatDate(text)
      }, {
        title: '执行周期',
        align: 'center',
        dataIndex: 'cronExpression',
        render: (text, obj) => {
          if(!text) return null
          const content = getNextTriggerDateByLater(_.get(obj, 'info.cronExpression', '0 0 * * *'))
          let title = <p style={{padding:0, margin: 0}}>调度执行时间</p>
          let arr = content.map((item,i) => <p key={i}>{item}</p>)
          return (<Popover placement="bottom" title={title} content={arr}>
            <a href className="pointer">{text}</a>
          </Popover>)
        }
      }, {
        title: '状态',
        align: 'center',
        dataIndex: 'status',
        render: text => (<Tag color={FLOW_STATUS_COLOR_MAP[text]}>{FLOW_STATUS_TEXT_MAP[text]}</Tag>)
      }, {
        title: '操作',
        align: 'center',
        dataIndex: 'cancel',
        render: (text, o) => (<Popconfirm 
          title="是否取消调度"
          okType="danger"
          onConfirm={() => this.cancelProject(o)}
        >
          <a className="pointer">取消调度</a>
        </Popconfirm>)
      }
    ]

    return(
      <div>
        <Bread path={[{name: '调度'}]} />
        <ScheduleFilterForm filter={this.handleFilter} getData={this.getData} />
        <div className="table-container">
          <div className="table-box">
            <Table
              bordered
              loading={loading} 
              columns={columns} 
              dataSource={scheduleList}
              pagination={{
                showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range[0]}-${range[1]} 条`
              }}
              rowKey="scheduleId"
            />
          </div>
        </div>
      </div>
    )
  }
}

export default SchedulingComponent
