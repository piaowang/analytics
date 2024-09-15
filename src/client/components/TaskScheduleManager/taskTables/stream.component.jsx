import React, { Component } from 'react'
import Bread from '../../Common/bread'
import _ from 'lodash'
import { Table, Tag, Popconfirm } from 'antd'
import { FLOW_STATUS_COLOR_MAP, FLOW_STATUS_TEXT_MAP, formatDate, getSpendTime } from '../constants'
import StreamFilterForm from './share-component'
import moment from 'moment'

class StreamComponent extends Component {
  state = {
    data: []
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    return {
      data: nextProps.taskTables.runningFlows
    }
  }

  componentDidMount() {
    this.getData()
  }

  componentDidUpdate(prevProp) {
    if(this.props.id !== prevProp.id ) {
      this.getData()
    }
  }

  filter = param => {
    const { runningFlows } = this.props.taskTables
    let arr = _.filter(runningFlows, item => item.showName.match(param))
    this.setState({
      data: arr
    })
  }

  getData = async (param) => {
    const { id } = this.props
    await this.props.actions.getRunningFlows({refProjectId: id, ...param})
  }

  renderRunningTable = () => {
    const { data } = this.state
    const { loading } = this.props.taskTables
    const runningColumns = [
      {
        title: '执行编号',
        align: 'center',
        dataIndex: 'executionId',
        sorter: (a, b) => a.executionId - b.executionId,
        render: (text, o) => (<span 
          className="text-blue" 
          onClick={() => this.turnToLog(o)}
                              >
          {text}
        </span>)
      }, {
        title: '执行器',
        align: 'center',
        dataIndex: 'actNum',
        render: text => text ? text : '-'
        // render: (text, obj) => {
        //   let executor = _.get(obj, ['executor'])
        //   return executor ? `${executor.host}:${executor.port}` : '-'
        // }
      }, {
        title: '任务名称',
        align: 'center',
        dataIndex: 'showName',
        sorter: (a, b) => a.showName > b.showName,
        render: (text, o) => (<span 
          className="text-blue" 
          onClick={() => this.turnToProject(o)}
                              >
          {text}
        </span>)
      }, {
        title: '开始时间',
        align: 'center',
        dataIndex: 'submitTime',
        sorter: (a, b) => a.submitTime - b.submitTime,
        render: text => formatDate(text)
      }, {
        title: '结束时间',
        dataIndex: 'endTime',
        sorter: (a, b) => a.endTime - b.endTime,
        render: text => formatDate(text)
      }, {
        title: '耗时',
        align: 'center',
        dataIndex: 'spend',
        sorter: (a, b) => (a.endTime- a.submitTime) - (b.endTime- b.submitTime),
        render: (x, o) => getSpendTime(o) //getSpendTime(o)
      }, {
        title: '状态',
        align: 'center',
        width: 160,
        dataIndex: 'status',
        render: text => <Tag color={FLOW_STATUS_COLOR_MAP[text]}>{FLOW_STATUS_TEXT_MAP[text]}</Tag>
      }, {
        title: '操作',
        align: 'center',
        dataIndex: 'setting',
        render: (text, o) => (<Popconfirm 
          title="是否停止任务"
          okType="danger"
          onConfirm={() => this.killProject(o)}
        >
          <a className="pointer">停止</a>
        </Popconfirm>)
      }
    ]

    return (
      <div className="table-box">
        <Table 
          bordered
          loading={loading}
          columns={runningColumns} 
          dataSource={data}
          rowKey={'executionId'}
        />
      </div>
    )
  }

  turnToLog = o => {
    this.props.router.push(`/console/task-schedule-manager/${o.projectId}?code=${o.executionId}&activeKey=execLog`)
  }
  turnToProject = o => {
    this.props.router.push(`/console/task-schedule-manager/${o.projectId}`)
  }
  killProject = async obj => {
    await this.props.actions.cancelFlow(obj.executionId)
  }
  render() {
    return(
      <div>
        <Bread path={[{name: '正在执行'}]} />
        <StreamFilterForm filter={this.filter} getData={this.getData} />
        <div className="table-container">
          {
            this.renderRunningTable()
          }
        </div>
      </div>
    )
  }
}

export default StreamComponent
