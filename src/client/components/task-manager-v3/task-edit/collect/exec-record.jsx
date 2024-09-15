/**
 * 执行记录
 */
import React from 'react'
import { SearchOutlined } from '@ant-design/icons'
import { Button, Modal, DatePicker, Table, Tag, Select } from 'antd'
import { connect } from 'react-redux'
import moment from 'moment'
import _ from 'lodash'
import PubSub from 'pubsub-js'
import { FLOW_STATUS_TEXT_MAP, FLOW_STATUS_COLOR_MAP } from '../../constants'
import withRuntimeSagaModel from '../../../Common/runtime-saga-helper'
import ExecRecordModel, { namespace } from './exec-record-model'
import { getUsers } from 'client/actions'

const DefaultTime = [moment().add(-7, 'd').startOf('d'), moment().startOf('d')]

@connect(props => {
  return {
    ...props[namespace],
    users: _.get(props, 'common.users', [])
  }
})
@withRuntimeSagaModel(ExecRecordModel)
export default class ExecRecord extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      collectVisible: false, // 概览弹窗visible
      selectType: '',
      lastErrorVisible: false,
      lsSelectType: '',
      lastErrorInfo: '',
      streamLoadVisible: false
    }
  }

  componentDidMount() {
    this.handleQueryExecRecord()
    this.props.dispatch(getUsers())
    PubSub.subscribe(`schedule-log-refresh-cj_${this.props.projectId}`, msg => {
      this.handleQueryExecRecord()
    })
  }
  componentWillUnmount() {
    PubSub.unsubscribe(`schedule-log-refresh-cj_${this.props.projectId}`)
  }
  changeState = obj => {
    const { taskId } = this.props
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload: obj
    })
  }

  /**
   * 查询执行记录列表
   * @param {number} page 分页
   * @param {number} size 每页条数
   */
  handleQueryExecRecord = (page = 1, size = 10) => {
    let { searchStartTime, searchEndTime, projectId } = this.props
    let payload = {
      page,
      size,
      projectId,
      begin: moment(searchStartTime || DefaultTime[0])
        .startOf('d')
        .format('MM/DD/YYYY HH:mm'),
      end: moment(searchEndTime || DefaultTime[1])
        .endOf('d')
        .format('MM/DD/YYYY HH:mm')
    }
    this.props.dispatch({
      type: `${namespace}/queryExecRecord`,
      payload
    })
  }

  /**
   * 计算任务耗时
   * @param obj
   * key
   */
  getSpendTime = obj => {
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

  handleReviewLog = (executionId, isRunning) => {
    this.props.dispatch({
      type: `${namespace}/queryExecJobId`,
      payload: {
        executionId,
        isRunning,
        cb: this.handleOpenLog
      }
    })
  }

  handleOpenLog = (executionId, jobId) => {
    window.open(`/console/task-schedule-v3/details-text?type=logs&hideTopNavigator=1&action=fetchExecJobLogs&execid=${executionId}&jobId=${jobId}`)
  }

  handleCancelExec = executionId => {
    this.props.dispatch({
      type: `${namespace}/cancelExec`,
      payload: {
        executionId
      }
    })
  }
  handleRestart = (executionId, status) => {
    if (status === 'RUNNING') return

    this.props.dispatch({
      type: `${namespace}/restart`,
      payload: {
        executionId
      }
    })
  }

  /**
   * 请求数据并打开弹窗
   * @param {*} projectId
   */
  handleQueryCollect = (projectId, executionId) => {
    this.props.dispatch({
      type: `${namespace}/queryCollect`,
      payload: { projectId, executionId }
    })
    this.setState({ collectVisible: true })
  }
  /**
   * 查看最后报错信息
   * @param {*} projectId
   */
  handleCheckLastErrorInfo = executionId => {
    //
    this.props.dispatch({
      type: `${namespace}/queryLastErrorLog`,
      payload: { executionId }
    })
    this.setState({ lastErrorVisible: true })
  }

  /**
   * 查看导入明细
   * @param {*} projectId
   */
  handleCheckStreamLoadInfo = () => {
    this.setState({ streamLoadVisible: true })
  }

  setStreamLoadData = list => {
    this.setState({ streamLoadData: list })
  }
  /**
   * 渲染搜索框
   */
  renderSearchBar = () => {
    const { pageStatus } = this.props
    return (
      <div className='height40 mg2y'>
        <div className='alignright iblock width60'>开始时间:</div>
        <DatePicker className='mg2l mg3r iblock' placeholder='开始时间' defaultValue={DefaultTime[0]} onChange={v => this.changeState({ searchStartTime: v })} />
        <div className='alignright iblock width60'>结束时间:</div>
        <DatePicker className='mg2l mg3r iblock' placeholder='结束时间' defaultValue={DefaultTime[1]} onChange={v => this.changeState({ searchEndTime: v })} />
        <Button type='primary' icon={<SearchOutlined />} onClick={() => this.handleQueryExecRecord()}>
          搜索
        </Button>
      </div>
    )
  }

  /**
   * 渲染table
   */
  renderTable = () => {
    const { recordList = [], total = 0, pageNum, pageSize, users } = this.props
    const rlFirst = _.first(recordList)
    const userDict = _.keyBy(users, 'id')

    const columns = [
      {
        title: '执行编号',
        dataIndex: 'executionId'
      },
      {
        title: '任务名称',
        dataIndex: 'showName'
      },
      {
        title: '执行人',
        dataIndex: 'submitUser',
        width: 150,
        render: val => {
          const { first_name, username } = userDict[val] || {}
          let name = first_name ? `${first_name}(${username})` : username
          return (
            <div className='mw120 elli' title={name}>
              {name}
            </div>
          )
        }
      },
      {
        title: '执行器',
        dataIndex: 'host'
      },
      {
        title: '开始时间',
        dataIndex: 'startTime',
        render: v => {
          return v ? moment(v).format('YYYY-MM-DD HH:mm:ss') : '-'
        }
      },
      {
        title: '结束时间',
        dataIndex: 'endTime',
        render: v => {
          return v && v !== -1 ? moment(v).format('YYYY-MM-DD HH:mm:ss') : '-'
        }
      },
      {
        title: '耗时',
        dataIndex: 'useTime',
        render: (v, o) => this.getSpendTime(o)
      },
      {
        title: '业务时间',
        dataIndex: 'businessTime',
        render: v => {
          return v ? moment(v).format('YYYY-MM-DD HH:mm') : '-'
        }
      },
      {
        title: '状态',
        dataIndex: 'status',
        render: v => <Tag color={_.get(FLOW_STATUS_COLOR_MAP, v, '-')}>{_.get(FLOW_STATUS_TEXT_MAP, v, '-')}</Tag>
      },
      {
        title: '操作',
        key: 'action',
        render: (text, o) => (
          <>
            {o.status === 'RUNNING' ? (
              <a className='mg2r' onClick={() => this.handleCancelExec(o.executionId)}>
                停止执行
              </a>
            ) : null}
            <a onClick={() => this.handleReviewLog(o.executionId, o.status === 'RUNNING')}>查看日志</a>
            <a className='mg2l' onClick={() => this.handleQueryCollect(o.projectId, o.executionId)}>
              概览
            </a>
            <a className='mg2l' onClick={() => this.handleCheckLastErrorInfo(o.executionId)}>
              查看最后报错信息
            </a>
          </>
        )
      }
    ]

    return (
      <div className='overscroll-y always-display-scrollbar'>
        <Table
          bordered
          size='middle'
          rowKey='executionId'
          columns={columns}
          dataSource={recordList}
          loading={this.props.loading}
          pagination={{
            total: total,
            current: pageNum,
            pageSize: pageSize,
            showSizeChanger: true,
            onChange: this.handleQueryExecRecord,
            onShowSizeChange: this.handleQueryExecRecord,
            showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`
          }}
        />
      </div>
    )
  }

  /**
   * 渲染概览弹窗
   */
  renderCollectModal = () => {
    const { collectList, collectTypes = [] } = this.props
    const { collectVisible, selectType } = this.state
    const columns = [
      {
        title: '输入表名',
        dataIndex: 'inputTable'
      },
      {
        title: '输出表名',
        dataIndex: 'outTable'
      },
      {
        title: 'insert次数',
        dataIndex: 'INSERT'
      },
      {
        title: 'update次数',
        dataIndex: 'UPDATE'
      },
      {
        title: 'delete次数',
        dataIndex: 'DELETE'
      },
      {
        title: '报错次数',
        dataIndex: 'ERROR'
      },
      {
        title: '最后更新时间',
        dataIndex: 'lastUpdateTime',
        render: val => (val ? moment(val).format('YYYY-MM-DD HH:mm') : '-')
      },
      {
        title: '同步状态',
        dataIndex: 'status',
        render: val => {
          const statusStr = {
            OFFLINE: '离线',
            REALTIME: '实时',
            KILLED: '停止',
            STOP: '终止'
          }
          return statusStr[val] || '-'
        }
      }
    ]

    const starRocksColumns = [
      {
        title: '输入表名',
        dataIndex: 'inputTable'
      },
      {
        title: '输出表名',
        dataIndex: 'outTable'
      },
      {
        title: 'insert次数',
        dataIndex: 'INSERT'
      },
      {
        title: 'update次数',
        dataIndex: 'UPDATE'
      },
      {
        title: 'delete次数',
        dataIndex: 'DELETE'
      },
      {
        title: '报错次数',
        dataIndex: 'ERROR'
      },
      {
        title: '导入次数',
        dataIndex: 'streamLoadResult',
        render: val => {
          const list = _.values(val)
          return (
            <div>
              <a
                onClick={() => {
                  this.handleCheckStreamLoadInfo()
                  this.setStreamLoadData(list)
                }}
              >
                {list.length}
              </a>
            </div>
          )
        }
      },
      {
        title: '报错次数',
        dataIndex: 'FAIL'
      },
      {
        title: '导入数据量',
        dataIndex: 'LOADEDROWS'
      },
      {
        title: '成功导入次数',
        dataIndex: 'SUCESS'
      },
      {
        title: '最后更新时间',
        dataIndex: 'lastUpdateTime',
        render: val => (val ? moment(val).format('YYYY-MM-DD HH:mm') : '-')
      },
      {
        title: '同步状态',
        dataIndex: 'status',
        render: val => {
          const statusStr = {
            OFFLINE: '离线',
            REALTIME: '实时',
            KILLED: '停止',
            STOP: '终止'
          }
          return statusStr[val] || '-'
        }
      }
    ]
    const selectKey = selectType || _.first(collectTypes) || ''
    const change = () => {
      console.log('collectList=====', collectList)
    }
    return (
      <Modal
        title='概览'
        visible={collectVisible}
        width='80%'
        onCancel={() => {
          this.setState({ collectVisible: false })
        }}
        footer={
          <div className='alignright'>
            <Button
              onClick={() => {
                change()
                this.setState({ collectVisible: false })
              }}
            >
              关闭
            </Button>
          </div>
        }
      >
        <div className='mg2b'>
          选择：{' '}
          <Select className='width150' onChange={val => this.setState({ selectType: val })} value={selectKey}>
            {collectTypes.map((p, idx) => (
              <Select.Option key={`item_${idx}`} value={p}>
                {p}
              </Select.Option>
            ))}
          </Select>
        </div>
        <Table
          bordered
          size='middle'
          rowKey='table'
          columns={_.get(collectList, selectKey, [])[0]?.dbType === 'starrocks' || !_.get(collectList, selectKey, [])[0]?.dbType ? starRocksColumns : columns}
          dataSource={_.get(collectList, selectKey, [])}
          pagination={false}
        />
      </Modal>
    )
  }

  /**
   * 渲染最后报错信息弹窗
   */
  renderLastError = () => {
    const { lastErrorList, lastErrorTypes = [] } = this.props
    const { lastErrorVisible, lsSelectType } = this.state
    const lsSelectKey = lsSelectType || _.first(lastErrorTypes) || ''
    let errorInfo = lastErrorList?.[lsSelectKey]?.errorInfo ?? ''
    // this.setState({ lastErrorInfo: errorInfo })

    return (
      <Modal
        title='最后报错信息'
        visible={lastErrorVisible}
        width='80%'
        onCancel={() => this.setState({ lastErrorVisible: false })}
        footer={
          <div className='alignright'>
            <Button onClick={() => this.setState({ lastErrorVisible: false })}>关闭</Button>
          </div>
        }
      >
        <div className='mg2b'>
          选择：
          <Select className='width200' dropdownMatchSelectWidth={false} onChange={val => this.setState({ lsSelectType: val })} value={lsSelectKey}>
            {lastErrorTypes.map((p, idx) => (
              <Select.Option key={`item_${idx}`} value={p}>
                {p}
              </Select.Option>
            ))}
          </Select>
        </div>
        <div
          style={{
            border: '1px solid #eee',
            padding: '12px'
          }}
        >
          {errorInfo}
        </div>
      </Modal>
    )
  }

  /**
   * 渲染stream load导入详细弹窗
   */
  renderSreamLoad = val => {
    const { streamLoadVisible, streamLoadData } = this.state
    const columns = [
      {
        title: '事务ID',
        dataIndex: 'TxnId'
      },
      {
        title: '标签',
        dataIndex: 'Label'
      },
      {
        title: '加载状态',
        dataIndex: 'Status'
      },
      {
        title: '消息',
        dataIndex: 'Message',
        width: '200px',
        render: val => {
          let data = val
          if (val.length > 25) {
            data = val.substring(0, 25) + '...'
          }
          return <div title={val}>{data}</div>
        }
      },
      {
        title: '总行数',
        dataIndex: 'NumberTotalRows'
      },
      {
        title: '已加载行数',
        dataIndex: 'NumberLoadedRows'
      },
      {
        title: '过滤行数',
        dataIndex: 'NumberFilteredRows'
      },
      {
        title: '未选择行数',
        dataIndex: 'NumberUnselectedRows'
      },
      {
        title: '加载字节',
        dataIndex: 'LoadBytes'
      },
      {
        title: '加载时间',
        dataIndex: 'LoadTimeMs'
      },
      {
        title: '开始事务时间',
        dataIndex: 'BeginTxnTimeMs'
      },
      {
        title: '流加载计划时间',
        dataIndex: 'StreamLoadPlanTimeMs'
      },
      {
        title: '读取数据时间',
        dataIndex: 'ReadDataTimeMs'
      },
      {
        title: '写入数据时间',
        dataIndex: 'WriteDataTimeMs'
      },
      {
        title: '提交和发布时间',
        dataIndex: 'CommitAndPublishTimeMs'
      }
    ]
    return (
      <Modal
        title='导入明细'
        visible={streamLoadVisible}
        width='80%'
        onCancel={() => this.setState({ streamLoadVisible: false })}
        footer={
          <div className='alignright'>
            <Button onClick={() => this.setState({ streamLoadVisible: false })}>关闭</Button>
          </div>
        }
        bodyStyle={{ height: '61vh' }}
      >
        <Table scroll={{ y: 400 }} bordered size='middle' rowKey='table' columns={columns} dataSource={streamLoadData} pagination={true} />
      </Modal>
    )
  }

  render() {
    return (
      <div className='pd2x bg-white'>
        {this.renderSearchBar()}
        {this.renderTable()}
        {this.renderCollectModal()}
        {this.renderLastError()}
        {this.renderSreamLoad()}
      </div>
    )
  }
}
