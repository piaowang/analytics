import React from 'react'
import { Table, Tag, Popconfirm, message } from 'antd'
import ReactEcharts from 'echarts-for-react'
import _ from 'lodash'
import moment from 'moment'
import Fetch from 'client/common/fetch-final'
import { Link } from 'react-router'
import { FLOW_STATUS_TEXT_MAP, FLOW_STATUS_COLOR_MAP, getSpendTime } from '../constants'

const PageSize = 10
class TaskScheduleLog extends React.Component {

  state = {
    pageIndex: 1,
    data: {}
  }

  componentDidMount() {
    const { projectId, taskName } = this.props
    if (projectId && taskName) {
      this.getData(projectId, taskName, 1)
    }
  }

  componentWillReceiveProps(nextporps) {
    const { projectId, taskName } = this.props
    if (projectId !== nextporps.projectId || taskName !== nextporps.taskName) {
      this.getData(nextporps.projectId, nextporps.taskName, 1)
    }
  }

  getData = async (projectId = this.props.projectId, taskName = this.props.taskName, pageIndex = 1) => {
    const res = await Fetch.get(`/app/task-schedule/manager?ajax=fetchFlowExecutions&project=${taskName}&refProjectId=${projectId}&flow=${taskName}&start=${(pageIndex - 1) * PageSize}&length=${PageSize}`)
    this.setState({ pageIndex: pageIndex, data: res })
  }

  // 重新执行任务
  restartFlows = async id => {
    let url = `/app/task-schedule/executor?ajax=retryJob&execid=${id}`
    let resp = await Fetch.get(url)
    if (resp.status === 'restart success') {
      const { execid } = resp
      message.success(`任务重启成功, id编号为:${execid}`)
    } else {
      message.error('任务重启失败')
    }
    this.getData()
  }

  getOption = () => {
    const { data } = this.state
    const executions = _.orderBy(data.executions, 'submitTime', 'ASC')
    const title = _.map(executions, p => moment(p.submitTime).format('HH:mm'))
    const value = _.map(executions, p => {
      const sec = moment(p.endTime).diff(moment(p.submitTime), 'seconds')
      return sec < 0 ? 0 : sec
    })
    // set node color
    const color = _.map(executions, p => FLOW_STATUS_COLOR_MAP[p.status])
    const pieces = []
    if(color) {
      for(let i=0; i<color.length; i++) {
        let pieceItem = {}
        pieceItem.gte = i
        pieceItem.lt = i+1
        pieceItem.color = color[i]
        pieces.push(pieceItem)
      }
    }

    return {
      xAxis: {
        name: '任务开始时间',
        type: 'category',
        data: title
      },
      yAxis: {
        name: '任务耗时',
        type: 'value'
      },
      series: [
        {
          name: '执行时间',
          type: 'line',
          showAllSymbol: false,
          data: value,
          symbolSize: 8, 
          itemStyle: {
            normal: {
              lineStyle: {
                color: 'black'
              }
            }
          }
        }
      ],
      visualMap: {
        show: false,
        dimension: 0,
        pieces: pieces
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line'
        },
        formatter: function (params) {
          let index = params[0].dataIndex//executions
          return (`
            ${params[0]['seriesName']}: ${params[0].value} sec<br/>
            开始时间: ${moment(executions[index].submitTime).format('YYYY-MM-DD HH:mm:ss')}<br/>
            结束时间: ${moment(executions[index].endTime).format('YYYY-MM-DD HH:mm:ss')}<br/>
            状态: ${FLOW_STATUS_TEXT_MAP[executions[index].status]}<br/>
          `)
        }
      }

    }
  }

  render() {
    const { pageIndex, data } = this.state
    const { projectId, taskName, taskId } = this.props
    const columns = [
      {
        dataIndex: 'execId',
        title: '执行编号',
        width: 130,
        render: (text) => <Link to={`/console/task-schedule-manager/${taskId}?code=${text}&activeKey=execLog`} >{text}</Link>
      }, {
        dataIndex: 'executor',
        title: '执行器',
        render: (text, obj) => {
          let executor = _.get(obj, ['executor'])
          return executor ? `${executor.host}:${executor.port}` : '-'
        }
      }, {
        dataIndex: 'submitTime',
        title: '开始时间',
        render: (str) => (str === '-1') ? '-' : moment(str).format('YYYY-MM-DD HH:mm:ss')  
      },{
        dataIndex: 'endTime',
        title: '结束时间',
        render: (str, o) => {
          if (o.status === 'RUNNING') {
            return '-'
          }
          return moment(str).format('YYYY-MM-DD HH:mm:ss')
        }
      }, {
        dataIndex: 'time',
        title: '耗时',
        width: 110,
        render: (str, obj) => getSpendTime(obj)
      }, {
        dataIndex: 'businessTime',
        title: '业务时间',
        render: str => moment(str).format('YYYY-MM-DD HH:mm:ss')
      }, {
        dataIndex: 'status',
        title: '状态',
        width: 50,
        render: (val) => {
          const status = _.toUpper(val)
          return <Tag color={FLOW_STATUS_COLOR_MAP[status]}>{FLOW_STATUS_TEXT_MAP[status]}</Tag>
        }
      }, {
        title: '操作',
        dataIndex: 'caozuo',
        align: 'center',
        width:'120',
        render: (text, o) => {
          return (o.status === 'RUNNING' || o.status === 'PREPARING') 
            ? '-'
            : [
              (<Popconfirm
                key="reload"
                title="是否重新执行任务"
                onConfirm={() => this.restartFlows(o.execId)}
              >
                <a className="pointer" style={{marginRight: '20px'}}>重新执行</a>
              </Popconfirm>),
              (<Link 
                key="log"
                to={`/console/task-schedule-manager/${taskId}?code=${o.execId}&activeKey=execLog`}
              >
                  查看日志
              </Link>)
            ]
        }
      }
    ]

    return (<div>
      <ReactEcharts
        option={this.getOption()}
        notMerge
      />
      <Table
        bordered
        columns={columns}
        rowKey="execId"
        dataSource={data.executions}
        pagination={{
          current: pageIndex,
          pageSize: PageSize,
          total: data.total,
          showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range[0]}-${range[1]} 条`,
          onChange: (pageIndex) => this.getData(projectId, taskName, pageIndex)
        }}
      />
    </div>)
  }
}

export default TaskScheduleLog
