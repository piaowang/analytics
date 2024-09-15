import { Modal, Table, Tag, Popconfirm, message } from 'antd'
import React from 'react'
import { validateFieldsAndScroll } from '../../../common/decorators'
import '../css.styl'
import { FLOW_STATUS_COLOR_MAP, FLOW_STATUS_TEXT_MAP } from '../constants'
import moment from 'moment'
import _ from 'lodash'
import Fetchfinal from '../../../common/fetch-final'


@validateFieldsAndScroll
export default class ScheduleLogPopWindow extends React.Component {

  constructor(props, context) {
    super(props, context)
    this.state = {
      showAlllogView: false,
      expandedRowKeys: []
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { showAlllogView, expandedRowKeys } = this.state
    const { handlesingleLog, checkLogTableList, singleLogMap, queryAllLog } = this.props
    const allLog = _.get(singleLogMap, 'all', '')
    const execId = _.get(checkLogTableList, 'execid', 0)
    if (showAlllogView && showAlllogView !== prevState.showAlllogView && !allLog) {
      queryAllLog({ execId, jobId: 'all' })
    }
    const diff = _.difference(expandedRowKeys, prevState.expandedRowKeys)
    if (expandedRowKeys.length && diff.length) {
      const singleLog = _.get(singleLogMap, diff[0], '')
      if (!singleLog) {
        const jobId = _.get(checkLogTableList, `nodes.${diff[0]}.id`, 0)
        handlesingleLog({ execId, jobId })
      }
    }
  }

  executeSeparately = (obj) => {
    const { checkLogTableList = {} } = this.props
    const { project = '', flow = '', projectId = 0, nodes = [] } = checkLogTableList
    const disabled = nodes.filter(n => n.nestedId !== obj.nestedId).map(n => n.nestedId)
    const url = '/app/new-task-schedule/executor?ajax=executeFlow'
    let formData = new FormData()
    formData.append('projectId', projectId)
    formData.append('project', project)
    formData.append('flow', flow)
    formData.append('disabled', JSON.stringify(disabled))
    const res = Fetchfinal.post(url, null, {
      body: formData,
      headers: {}
    })
    if (res.error) {
      return message.error(res.error)
    } else {
      return message.success('执行成功')
    }
  }

  /**
  * 计算任务耗时
  * @param obj 
  * key 
  */
  getSpendTime = (obj) => {
    if (obj.endTime === -1 || obj.startTime === -1) {
      return '-'
    }
    let start = obj.startTime
    if (typeof start === 'undefined') {
      start = obj.submitTime
    }

    const sec = moment(obj.endTime).diff(moment(start), 'ms')
    return (sec < 60000 ? `${_.ceil(sec / 1000, 1)} 秒` : moment.duration(sec, 'ms').humanize())
  }

  renderProgress = (timeline) => {
    let style
    style = {
      left: timeline.indent + '%',
      width: timeline.spend + '%'
    }
    return (<div className="progress-container">
      <span style={style} className={`progress-child ${timeline.status}`} />
    </div>)
  }

  render() {
    const { visible, handleCancel, checkLogTableList } = this.props

    let endTime = _.get(checkLogTableList, 'endTime', 0)
    endTime = endTime > 0 ? endTime : _.get(checkLogTableList, 'updateTime', 0)
    let totalSpend = endTime - _.get(checkLogTableList, 'startTime', 0)
    let title = '查看日志'

    const columns = [
      {
        title: '工作流名称',
        dataIndex: 'taskName',
        key: 'taskName'
      },
      { title: '节点名称', dataIndex: 'showName', key: 'showName' },
      { title: '类型', dataIndex: 'type', key: 'type' },
      {
        title: '时间轴',
        dataIndex: 'timeline',
        width: 220,
        render: (v, o) => {
          let end = o.endTime > 0 ? o.endTime : o.updateTime
          let spend = ((end - o.startTime) / (o.endTime - o.startTime)) * 100
          const style = {
            width: spend + '%'
          }
          return (
            <div className="progress-container">
              <span style={style} className={`progress-child ${o.status}`} />
            </div>)
        }
      },
      { title: '开始时间', dataIndex: 'startTime', key: 'startTime', render: (v, o) => o.startTime <= 0 ? '-' : moment(o.startTime).format('YYYY-MM-DD HH:mm:ss') },
      { title: '结束时间', dataIndex: 'endTime', key: 'endTime', render: (v, o) => o.endTime <= 0 ? '-' : moment(o.endTime).format('YYYY-MM-DD HH:mm:ss') },
      { title: '耗时', dataIndex: 'useTime', key: 'useTime', render: (v, o) => this.getSpendTime(o) },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: status => (
          <span>
            {
              <Tag color={FLOW_STATUS_COLOR_MAP[status]} key={status}>
                {FLOW_STATUS_TEXT_MAP[status]}
              </Tag>
            }
          </span>
        )
      }, {
        title: '操作',
        dataIndex: 'operation',
        key: 'operation',
        render: (v, obj) => {
          const isRunning = _.includes(['RUNNING', 'FAILED_FINISHING', 'QUEUED'], obj.status) ? 1 : 0
          return (
            <div>
              <span>
                <Popconfirm placement="top" title="是否单独执行" onConfirm={() => this.executeSeparately(obj)} okText="确定" cancelText="取消">
                  <a className="mg2r">单独执行</a>
                </Popconfirm>
              </span>
              <span>
                <a
                  className="mg2r"
                  disabled={!obj.execid}
                 // href={`/console/task-schedule-v3/details-text?type=logs&hideTopNavigator=1&action=fetchExecJobLogs&execid=${obj.execid}&jobId=${obj.id}&offset=0&attempt=${obj.attempt || 0}&isRunning=${isRunning}`}
                  href={`/console/task-schedule-v3/details-text?type=logs&hideTopNavigator=1&action=fetchExecJobLogs&execid=${obj.execid}&jobId=${obj.id}`}
                  target="view_window"
                >
                  日志详情
                </a>
              </span>
              <span>
                <a className="mg2r" disabled={(obj.type !== 'hive' && obj.type !== 'command') || (obj.type === 'command' && obj.showName.includes('结束'))} href={`/console/task-schedule-v3/details-text?type=yarn&hideTopNavigator=1&action=fetchExecJo&execid=${obj.execid}&jobId=${obj.id}&attempt=${obj.attempt || 0}`} target="view_window">yarn日志</a>
              </span>
              {
                obj.type === 'tindex'
                  ? (<span>
                    <a className="mg2r" href={`/console/task-schedule-v3/details-text?type=task&hideTopNavigator=1&action=fetchTindexFlowLog&execid=${obj.execid}&jobId=${obj.id}&offset=0`} target="view_window">task详情</a>
                  </span>) : null
              }
            </div>
          )
        }
      }
    ]
    if (checkLogTableList && checkLogTableList.group) {
      columns.unshift({ title: '工作流组名称', dataIndex: 'taskGroupName', key: 'taskGroupName' })
    }
    return (
      <div>
        <Modal
          maskClosable={false}
          title={title}
          visible={visible}
          onCancel={() => {
            handleCancel()
            this.setState({ showAlllogView: false, expandedRowKeys: [] })
          }}
          footer={null}
          bodyStyle={{ height: '80vh', overflowY: 'scroll' }}
          width="80%"
        >
          <Table
            bordered
            columns={columns}
            // expandedRowRender={this.showSingleLogView}
            dataSource={_.get(checkLogTableList, 'nodes', [])}
            pagination={false}
          // expandedRowKeys={expandedRowKeys}
          // onExpandedRowsChange={v => this.setState({ expandedRowKeys: v })}
          />
        </Modal>
      </div>
    )
  }

}
