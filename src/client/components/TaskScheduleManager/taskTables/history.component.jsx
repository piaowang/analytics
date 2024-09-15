import React, { Component } from 'react'
import { Table, Tag, Popconfirm } from 'antd'
import _ from 'lodash'
import HistoryFilter from './history.filter'
import Bread from '../../Common/bread'
import { FLOW_STATUS_COLOR_MAP, FLOW_STATUS_TEXT_MAP, formatDate, getSpendTime } from '../constants'
import { ORDER_FIELDS_MAP } from './setting'
import moment from 'moment'
import { convertDateType } from 'common/param-transform'

const dateType = '-1 days'
const formatTemplate = 'MM/DD/YYYY HH:mm'

class HistoryComponent extends Component {
  state = {
    page: 1,
    size: 10,
    status: '',
    flowcontain: '',
    begin: convertDateType(dateType, formatTemplate)[0],
    end: convertDateType(dateType, formatTemplate)[1],
    orderby : '',
    order: ''
  }

  componentDidMount() {
    this.getData()
  }

  componentDidUpdate(prevProps) {
    if(this.props.id && (this.props.id !== prevProps.id)) {
      this.getData()
    }
  }

  doFetchList = async params => {
    this.setState({
      ...params
    }, () => {
      this.getData()
    })
  }

  getData = async () => {
    const { id } = this.props
    await this.props.actions.getHistoryFlows({
      refprojcontain: id,
      ...this.state
    })
  }

  // 重新执行任务
  restartFlows = async obj => {
    await this.props.actions.restartAnyFlows(obj.executionId)
    this.getData()
  }

  turnToProject = o => {
    this.props.router.push(`/console/task-schedule-manager/${o.projectId}?code=${o.executionId}&activeKey=execLog`)
  }

  turnToFlows = o => {
    this.props.router.push(`/console/task-schedule-manager/${o.projectId}?activeKey=overview`)
  }

  handleChange = (pagination, filters, sorter) => {
    // console.log(pagination)
    const { current } = pagination
    if (!_.isEqual(sorter, this.state.sortedInfo)) {
      this.setState({
        orderby: ORDER_FIELDS_MAP[sorter.field] || '',
        order: sorter.order === 'descend' ? 'desc' : 'asc',
        page: current
      }, () => this.getData())
    }
  }

  renderTable = () => {
    const { historyFlows = [], loading } = this.props.taskTables || {}
    const { flowHistory, pageNum, pageSize, totalNum } = historyFlows
    const columns = [{
      title: '执行编号',
      align: 'center',
      dataIndex: 'executionId',
      sorter: true,
      render: (text, o) => (<span 
        className="text-blue"
        onClick={() => this.turnToProject(o)}
      >
        {text}
      </span>)
    }, {
      title: '任务名称',
      align: 'center',
      sorter: true,
      dataIndex: 'showName',
      render: (text, o) => <span className="text-blue" onClick={() => this.turnToFlows(o)}>{text}</span>
    }, {
      dataIndex: 'device',
      title: '执行器',
      align: 'center'
    }, {
      title: '开始时间',
      dataIndex: 'submitTime',
      align: 'center',
      sorter: true,
      render: text => formatDate(text)
    }, {
      title: '结束时间',
      dataIndex: 'endTime',
      align: 'center',
      sorter: true,
      render: text => formatDate(text)
    }, {
      title: '耗时',
      dataIndex: 'costTime',
      align: 'center',
      sorter: true,
      render: (text, o) => getSpendTime(o)
    }, {
      dataIndex: 'businessTime',
      title: '业务时间',
      align: 'center',
      render: str => moment(str).format('YYYY-MM-DD hh:mm:ss')
    },{
      title: '状态',
      dataIndex: 'status',
      align: 'center',
      render: text => (<Tag color={FLOW_STATUS_COLOR_MAP[text]}>{FLOW_STATUS_TEXT_MAP[text]}</Tag>)
    }, {
      title: '操作',
      dataIndex: 'caozuo',
      align: 'center',
      render: (text, o) => {
        return [
          <Popconfirm
            key="task"
            title="是否重新执行任务"
            onConfirm={() => this.restartFlows(o)}
          >
            <a className="pointer">重新执行</a>
          </Popconfirm>,
          <a 
            key="point" 
            style={{margin: '10px'}} 
            onClick={() => this.turnToProject(o)}
            className="pointer"
          >查看日志</a>
        ]
      }
    }]
  
    return (<Table
      bordered
      loading={loading}
      columns={columns}
      dataSource={flowHistory}
      rowKey={'executionId'}
      onChange={this.handleChange}
      pagination={{
        current: pageNum,
        hideOnSinglePage: false,
        pageSize: pageSize,
        total: totalNum,
        showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range[0]}-${range[1]} 条`
      }}
    />)
  }

  render(){
    return(
      <div>
        <Bread path={[{name: '执行历史'}]} />
        {<HistoryFilter doFetchList={this.doFetchList} dateType={dateType} formatTemplate={formatTemplate}/>}
        <div className="table-container">
          {this.renderTable()}
        </div>
      </div>
    )
  }
}

export default HistoryComponent
