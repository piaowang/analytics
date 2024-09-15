import React,{ Component } from 'react'
import moment from 'moment'
import _ from 'lodash'
import { Button, Row, Col, Divider, Tag } from 'antd'
import LoggerTable from './tables.component'
import './styles.styl'
import { getProjectLog, getProjectDetail, getNodeLog } from './service'
import { FLOW_STATUS_COLOR_MAP, FLOW_STATUS_TEXT_MAP } from '../constants'

class TaskLogger extends Component{
  state = {
    loop: 10,
    projectLoggerVisiable: false,
    tableArr: [],
    projectLog: null,
    project: null
  }
  
  componentWillMount() {
    this.getData()
  }
  
  componentDidUpdate(prevProps) {
    if(prevProps.code && 
      this.props.activeKey === 'execLog' && 
      prevProps.activeKey !== this.props.activeKey
    ) {
      this.getData()
    }
  }

  getData = async () => {
    const { code } = this.props
    let detail = await getProjectDetail({code})
    let projectLog = await getProjectLog({code})
    const { tableArr, project, spendArr } = detail
    this.setState({
      tableArr,
      projectLog,
      project,
      spendArr
    })

    // when task status is success, need load all log
    if(project.status === 'SUCCEEDED' && projectLog.length !== 0) {
      this.loopRequestLog()
    }
  }

  loopRequestLog = async () => {
    // console.log('loop request')
    let length = await this.reloadProjectLog()
    // console.log(length)
    if(length !== 0) {
      await this.loopRequestLog()
    }
  }

  toggleProjectPanel = () => {
    this.setState({
      projectLoggerVisiable: !this.state.projectLoggerVisiable
    })
  }

  renderHeader = () => {
    const { project, projectLoggerVisiable } = this.state
    const { execid, status, submitTime, endTime, totalSpend, showName } = project
    let start = submitTime>0 ? moment(submitTime).format('YYYY-MM-DD HH:mm:ss') : '- - - -'
    let end = endTime>0 ? moment(endTime).format('YYYY-MM-DD HH:mm:ss') : '- - - -'
    return project&&(<div className="logger-header">
      <Divider orientation="left">当前任务: <span>{showName}</span></Divider>
      <Row>
        <Col className="task-logger-item" span={5}>
          任务执行编号: 
          <span>{execid}</span>
          <Tag color={FLOW_STATUS_COLOR_MAP[status]}>{FLOW_STATUS_TEXT_MAP[status]}</Tag>
        </Col>
        {/*<Col className="task-logger-item" span={8}>状态: <Tag color={FLOW_STATUS_COLOR_MAP[status]}>{FLOW_STATUS_TEXT_MAP[status]}</Tag></Col>*/}
        <Col className="task-logger-item" span={2}>耗时: <span>{totalSpend} sec</span></Col>
        <Col className="task-logger-item" span={6}>开始时间: <span>{start}</span></Col>
        <Col className="task-logger-item" span={6}>结束时间: <span>{end}</span></Col>
        <Col span={4}><Button size="small" onClick={this.toggleProjectPanel}>{`${projectLoggerVisiable ? '隐藏' : '查看'}任务日志`}</Button></Col>
      </Row>
    </div>)
  }

  renderProjectPanel = () => {
    const { projectLog } = this.state
    if(projectLog.data){
      let arr = projectLog.data.split('\n') 
      return (<div className="project-panel">
        <div className="projectlog-box overscroll-y always-display-scrollbar">
          {
            arr.map((item, i) => (<p key={i}>
              {item}
            </p>))
          }
          <div className="load-more"><Button onClick={this.reloadProjectLog}>加载更多</Button></div>
        </div>
      </div>)
    }
    return (<div className="project-panel">
      <div className="no-data">暂无日志</div>
    </div>)
  }

  reloadProjectLog = async () => {
    const { code } = this.props
    const { projectLog } = this.state
    let reloadProjectLog = await getProjectLog({
      code,
      offset: projectLog.length
    })
    this.setState({
      projectLog: {
        ...projectLog,
        data: projectLog.data + reloadProjectLog.data,
        length: reloadProjectLog.offset + reloadProjectLog.length
      }
    })
    return reloadProjectLog.length
  }

  getRowLogger = async row => {
    const { code } = this.props
    const { tableArr } = this.state

    let resp, length = 0, data = ''
    // do {
    resp = await getNodeLog({
      code,
      jobId: row.nestedId || '',
      offset: row.offset || 0
    })
    length += resp.length
    data += resp.data
    row.offset = resp.offset + resp.length
    // } while (resp.length && resp.length >= 50000)

    resp.length = length
    resp.data = data

    tableArr.find(i => {
      if(i.nestedId === row.nestedId) {
        i.log = resp
      }
    })
    this.setState({
      tableArr
    })
  }

  reloadRowLogger = async row => {
    const { log } = row
    const { code } = this.props
    const { tableArr } = this.state

    let reloadNodeLog, length = 0, data = ''
    // do {
    reloadNodeLog = await getNodeLog({
      code,
      jobId: row.nestedId || '',
      offset: row.offset
    })
    length += reloadNodeLog.length
    data += reloadNodeLog.data
    row.offset = reloadNodeLog.offset + reloadNodeLog.length
    // } while (reloadNodeLog.length && reloadNodeLog.length >= 50000)

    reloadNodeLog.length = length
    reloadNodeLog.data = data

    let index = tableArr.findIndex(item => item.nestedId === row.nestedId)
    tableArr[index].log = {
      ...tableArr[index].log,
      data: tableArr[index].log.data + reloadNodeLog.data,
      length: reloadNodeLog.offset + reloadNodeLog.length
    }
    this.setState({
      tableArr
    })
  }

  checkScriptStatus = arr => {
    let result = _.filter(arr, o => o.status === 'RUNNING')
    return result.length
  }

  render() {
    const { 
      projectLoggerVisiable,
      tableArr, 
      project, 
      spendArr
    } = this.state
    const { activeKey } = this.props
    return (
      <div className="task-schedule-logger">
        {project && this.renderHeader()}
        {projectLoggerVisiable && this.renderProjectPanel() }
        <div className="logger-table-container">
          <LoggerTable 
            className="logger-table" 
            activeKey={activeKey}
            project={project}
            spendArr={spendArr}
            reloadRowLogger={this.reloadRowLogger}
            getRowLogger={this.getRowLogger} 
            data={tableArr}
          />
        </div>
      </div>
    )
  }
}

export default TaskLogger
