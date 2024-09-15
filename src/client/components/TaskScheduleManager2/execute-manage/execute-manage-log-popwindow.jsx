import {
  Modal,
  Button,
  Table,
  Tag,
  Input,
  Col,
  Row,
  Select,
  Spin,
  InputNumber,
  Popconfirm,
} from 'antd';
import React from 'react'
import { validateFieldsAndScroll } from '../../../common/decorators'
import '../css.styl'
import { FLOW_STATUS_COLOR_MAP, FLOW_STATUS_TEXT_MAP } from '../constants'
import moment from 'moment'
import _ from 'lodash'
import Fetchfinal from '../../../common/fetch-final'


const defaultLogLength = 1000
@validateFieldsAndScroll
export default class ScheduleLogPopWindow extends React.Component {

  componentDidMount() {
    // To disabled submit button at the beginning.
    //this.props.form.validateFields();

  }

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
    if(showAlllogView && showAlllogView !== prevState.showAlllogView && !allLog) {
      queryAllLog({ execId , jobId: 'all' })
    } 
    const diff =  _.difference(expandedRowKeys, prevState.expandedRowKeys)
    if(expandedRowKeys.length && diff.length ) {
      const singleLog = _.get(singleLogMap, diff[0], '')
      if(!singleLog) {
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
    return Fetchfinal.post(url, null, {
      body: formData,
      headers: {}
    })
  }

  /**
  * 计算任务耗时
  * @param obj 
  * key 
  */
  getSpendTime = (obj, key) => {
    if (obj.endTime === -1 || obj.startTime === -1) {
      return '-'
    }
    let start = obj.startTime
    if (typeof start === 'undefined') {
      start = obj.submitTime
    }

    const sec = moment(obj.endTime).diff(moment(start), 'ms')
    return (sec < 60000 ? `${_.ceil(sec/1000, 1)} 秒` : moment.duration(sec, 'ms').humanize())
  }

  render() {
    const { visible, handleCancel, checkLogTableList } = this.props
    const { showAlllogView, expandedRowKeys } = this.state

    let endTime = _.get(checkLogTableList, 'endTime', 0)
    endTime = endTime > 0 ? endTime : _.get(checkLogTableList, 'updateTime', 0)
    let totalSpend = endTime - _.get(checkLogTableList, 'startTime', 0)
    let title = '查看日志'

    const columns = [
      { title: '名称', dataIndex: 'showName', key: 'showName' },
      { title: '类型', dataIndex: 'type', key: 'type' },
      {
        title: '时间轴',
        dataIndex: 'timeline',
        width: 220,
        render: (v, o) => {
          let end = o.endTime > 0 ? o.endTime : o.updateTime
          let spend = ((end - o.startTime) / totalSpend) * 100
          let indent = ((o.startTime - o.startTime) / totalSpend) * 100
          let timeline = {
            spend,
            indent,
            status: o.status
          }
          return this.renderProgress(timeline)
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
        render : (v,obj) => {
          return (
            <span>
              <Popconfirm placement="top" title="是否单独执行" onConfirm={() => this.executeSeparately(obj)} okText="确定" cancelText="取消">
                <a className="mg2r">单独执行</a>
              </Popconfirm> 
            </span>
          )
        }
      }
    ]
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
          {this.checkAllLogBtn()}
          {showAlllogView ? this.showSingleLogView({ isAll: true, nestedId: 'all', status: _.get(checkLogTableList, 'status', '') }) : null}
          <div className="mg2t">
            <Table
              bordered
              columns={columns}
              expandedRowRender={this.showSingleLogView}
              dataSource={_.get(checkLogTableList, 'nodes', [])}
              pagination={false}
              expandedRowKeys={expandedRowKeys}
              onExpandedRowsChange={v => this.setState({ expandedRowKeys: v })}
            />
          </div>
        </Modal>
      </div>
    )
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

  checkAllLogBtn = () => {
    const { showAlllogView } = this.state
    return (<div className="mg2b alignright">
      <Button type="primary" onClick={this.showOrHideAllLogView}>{`${showAlllogView ? '隐藏' : '查看'}任务日志`}</Button>
    </div>)
  }

  showOrHideAllLogView = () => {
    const { showAlllogView } = this.state
    this.setState({
      showAlllogView: !showAlllogView
    })
  }

  showSingleLogView = (data) => {
    const { handlesingleLog, checkLogTableList, singleLogMap, queryAllLog } = this.props
    const singleLog = _.get(singleLogMap, data.nestedId, '')
    const getData = data.isAll ? queryAllLog : handlesingleLog
    if (_.isEmpty(singleLog) || !_.get(singleLog, 'data', '')) {
      return (<div className="child-log-box overscroll-y always-display-scrollbar">
        <div className="no-data">暂无日志</div>
      </div>)
    }

    return (<div className="project-panel mg2b">
      <div className="child-log-box overscroll-y always-display-scrollbar">
        <pre className="per-auto-wrap">{_.get(singleLog, 'data', '')}</pre>
        {
          singleLog.offset % 5000 === 0 || _.get(data, 'status', '') === 'RUNNING' || _.get(data, 'status', '') === 'KILLING'
            ? <div className="load-more"><a onClick={() => getData({ execId: _.get(checkLogTableList, 'execid', 0), jobId: data.nestedId })}>加载更多</a></div>
            : null
        }
      </div>
    </div>)
  }
}
