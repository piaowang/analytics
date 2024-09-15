import React from 'react'
import { SearchOutlined, RedoOutlined } from '@ant-design/icons'
import { Button, Tabs, Input, Row, Col, DatePicker, Table, Select, Tag, Popconfirm, Modal } from 'antd'
import { FLOW_STATUS_TEXT_MAP, FLOW_STATUS_COLOR_MAP, getTypeKeysByKey } from '../constants'
import { namespace } from './sage-model'
import ScheduleLogPopWindow from './execute-manage-log-popwindow'
import moment from 'moment'
import _ from 'lodash'

const { TabPane } = Tabs
export default class ScheduleManager extends React.Component {
  constructor(props, context) {
    super(props, context)
  }
  selectedRows = [] //选中的重跑工作流
  state = {
    loading: false, //一键重跑按钮的loading
    selectedRowKeys: [], //选中的重跑工作流的id
    showSkipNodeWiatModal: false,
    selectItem: {}
  }

  componentDidMount() {
    this.handleQueryHistoryTask({})
  }

  componentDidUpdate(prev) {
    const { pageStatus, selectedKeys } = this.props
    if (pageStatus === 1 && _.get(selectedKeys, '0', '') !== _.get(prev.selectedKeys, '0', '')) {
      this.handleQueryHistoryTask({})
    }
  }
  rowSelectionChange = (selectedRowKeys, selectedRows) => {
    this.setState({ selectedRowKeys })
    this.selectedRows = selectedRows
  }
  changeState = params => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload: params
    })
  }

  handlesingleLog = payload => {
    this.props.dispatch({
      type: `${namespace}/fetchExecJobLogs`,
      payload: payload
    })
  }

  handleTaskAllLog = payload => {
    this.props.dispatch({
      type: `${namespace}/queryTaskAllLog`,
      payload: payload
    })
  }

  handlerestartExecuteTask = payload => {
    this.props.dispatch({
      type: `${namespace}/restartExecuteTask`,
      payload: payload
    })
  }

  handlerestartExecuteFailTask = payload => {
    this.props.dispatch({
      type: `${namespace}/restartExecuteFailTask`,
      payload: payload
    })
    this.setState({ showSkipNodeWiatModal: false })
  }

  handleStopExecuteTask = payload => {
    this.props.dispatch({
      type: `${namespace}/stopExecuteTask`,
      payload
    })
  }
  handleQueryRunningFlows = payload => {
    this.props.dispatch({
      type: `${namespace}/getGroupRunningFlows`,
      payload: payload
    })
  }
  // 一键重跑
  handleRunList = () => {
    // reducer 根据id去重
    let hash = {}
    let data = _.cloneDeep(this.selectedRows)

    const data2 = data.reduce((preVal, curVal) => {
      hash[curVal.target.projectId] ? '' : (hash[curVal.target.projectId] = true && preVal.push(curVal))
      return preVal
    }, [])

    Modal.confirm({
      content: `是否重新执行工作流组${data2.map(e => e.showName).join(',')}?`,
      onOk: () => {
        this.setState({ loading: true })
        // reducer 根据id去重
        this.props.dispatch({
          type: `${namespace}/restartExexuteTaskList`,
          payload: data2,
          callback: () => {
            this.setState({ selectedRowKeys: [], loading: false })
            this.selectedRows = []
          }
        })
      }
    })
  }
  handleReset = () => {
    const { selectedKeys, searchStartTime, searchEndTime, searchStatus } = this.props
    this.changeState({
      searchTaskName: '',
      searchStartTime: '',
      searchProjectIds: '',
      searchEndTime: '',
      searchStatus: '',
      searchProjectName: ''
    })
    let payload = {
      size: 10,
      page: 1,
      flowcontain: '',
      status: '',
      begin: '',
      typeId: '',
      end: ''
    }
    this.props.dispatch({
      type: `${namespace}/queryGroupHistoryTask`,
      payload
    })
  }
  handleQueryHistoryTask = ({ page = 1, ...res }) => {
    const { selectedKeys, searchTaskName, searchProjectIds, searchStartTime, searchEndTime, searchStatus } = this.props
    const selectKey = _.get(selectedKeys, '0', '')
    let payload = {
      size: 10,
      page,
      flowcontain: searchTaskName,
      projectIds: searchProjectIds,
      status: searchStatus,
      begin: searchStartTime ? moment(searchStartTime).startOf('d').format('MM/DD/YYYY HH:mm') : '',
      typeId: '',
      projectId: selectKey,
      end: searchEndTime ? moment(searchEndTime).endOf('d').format('MM/DD/YYYY HH:mm') : '',
      ...res
    }
    this.props.dispatch({
      type: `${namespace}/queryGroupHistoryTask`,
      payload
    })
  }

  showLogPopWindow = data => {
    this.props.dispatch({
      type: `${namespace}/queryTaskGroupAllLog`,
      payload: {
        ...data,
        showLogPopWindow: true
      }
    })
  }

  //取消弹出窗
  handleCancelPopwindow = () => {
    this.changeState({
      showLogPopWindow: false,
      singleLogMap: {}
    })
  }

  executePage = () => {
    const { pageStatus } = this.props
    return (
      <div>
        <div style={{ height: '40px' }}>
          <Tabs
            activeKey={pageStatus === 0 ? 'running' : 'history'}
            onChange={v => {
              if (v === 'history') {
                this.handleQueryHistoryTask({ pageStatus: 1, searchTaskName: '', searchStartTime: '', searchEndTime: '', searchProjectIds: '' })
              } else {
                this.handleQueryRunningFlows({ pageStatus: 0, searchTaskName: '', searchStartTime: '', searchEndTime: '', searchProjectIds: '' })
              }
            }}
          >
            <TabPane tab='正在执行' key={'running'}>
              {this.historyBar()}
              {this.renderExecuteTable()}
            </TabPane>
            <TabPane tab='执行历史' key={'history'}>
              {this.historyBar()}
              {this.renderHistoryTable()}
            </TabPane>
          </Tabs>
        </div>
      </div>
    )
  }

  renderExecuteTable = () => {
    const { runningList = [], selectedKeys, taskTreeInfo, pgList = [], userList = [] } = this.props
    let taskIds = []
    const selectKey = _.get(selectedKeys, '0', '').toString()
    if (_.startsWith(selectKey, 'type-')) {
      const key = selectKey.substr(5)
      taskIds = getTypeKeysByKey([key], taskTreeInfo.types)
      taskIds = taskTreeInfo.tasks.filter(p => taskIds.includes(p.typeId.toString())).map(p => p.id.toString())
    } else {
      taskIds = [selectKey]
    }

    let keyBy = []
    if (pgList.length) {
      keyBy = _.keyBy(pgList, p => p.id)
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
        title: '任务名称',
        dataIndex: 'showName',
        render: (v, o) => _.get(o, 'first.showName', '')
      },
      {
        title: '执行编号',
        dataIndex: 'executeNum',
        render: (v, o) => _.get(o, 'first.executionId', '')
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
        }
      },
      {
        title: '业务时间',
        dataIndex: 'businessTime',
        render: (v, o) => {
          const date = _.get(o, 'first.businessTime', '')
          return date ? moment(date).format('YYYY-MM-DD HH:mm:ss') : '-'
        }
      },
      {
        title: '状态',
        dataIndex: 'status',
        render: (v, o) => {
          const status = _.get(o, 'first.status', '')
          return <Tag color={_.get(FLOW_STATUS_COLOR_MAP, status, '-')}>{_.get(FLOW_STATUS_TEXT_MAP, status, '-')}</Tag>
        }
      },
      {
        title: '操作',
        key: 'action',
        align: 'center',
        render: (text, obj) => (
          <span>
            <Popconfirm
              placement='top'
              title='是否停止执行？'
              onConfirm={() => this.handleStopExecuteTask({ execId: _.get(obj, 'first.executionId', '') })}
              okText='确定'
              cancelText='取消'
            >
              <a className='mg2r'>停止执行</a>
            </Popconfirm>
            <a type='primary' onClick={() => this.showLogPopWindow({ execId: _.get(obj, 'first.executionId', '') })}>
              查看日志
            </a>
          </span>
        )
      }
    ]

    return (
      <div>
        <Table
          bordered
          size='middle'
          rowKey='first.executionId'
          columns={columns}
          dataSource={runningList}
          pagination={{
            total: runningList.length,
            showSizeChanger: true,
            defaultPageSize: 10,
            showTotal: (totalNum, range) => `总计 ${totalNum} 条，当前展示第 ${range.join('~')} 条`
          }}
        />
      </div>
    )
  }

  historyBar = () => {
    const { pageStatus, pgList = [] } = this.props
    const { selectedRowKeys, loading } = this.state
    const sop = _.groupBy(pgList, p => p['SugoTaskProject.name'])
    if (pageStatus === 0) {
      return (
        <div className='alignright mg1b mg2r'>
          <Button type='primary' icon={<SearchOutlined />} onClick={() => this.handleQueryRunningFlows()}>
            刷新
          </Button>
        </div>
      )
    }
    return (
      <div style={{ height: '40px' }}>
        <sapn>
          <sapn className='mg2l mg1r alignright iblock'>项目名:</sapn>
          <Select
            showSearch
            className='width150'
            value={this.props.searchProjectName || '全部'}
            placeholder='请选择项目名称'
            optionFilterProp='children'
            onChange={key => {
              if (key === 0) {
                this.changeState({ searchProjectIds: [], searchProjectName: '全部' })
              } else {
                const projectIds = _.map(sop[key], p => p.id)
                this.changeState({ searchProjectIds: projectIds.join(','), searchProjectName: key })
              }
            }}
            filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
          >
            <Select.Option key={0} value={0}>
              全部
            </Select.Option>
            {_.keys(sop).map(key => (
              <Select.Option key={key} value={key}>
                {key}
              </Select.Option>
            ))}
          </Select>
        </sapn>
        <sapn>
          <sapn className='mg2l mg1r alignright iblock'>任务名:</sapn>
          <Input className='width150 iblock' value={this.props.searchTaskName} placeholder={'请输入任务名'} onChange={v => this.changeState({ searchTaskName: v.target.value })} />
        </sapn>
        <sapn>
          <sapn className='mg2l mg1r alignright iblock'>开始时间:</sapn>
          <DatePicker className='width100 iblock' value={this.props.searchStartTime} placeholder='开始时间' onChange={v => this.changeState({ searchStartTime: v })} />
        </sapn>

        <sapn>
          <sapn className=' mg2l mg1r alignright iblock'>{pageStatus === 0 ? '业务' : '结束'}时间:</sapn>
          <DatePicker className='width100 iblock' value={this.props.searchEndTime} placeholder='结束时间' onChange={v => this.changeState({ searchEndTime: v })} />
        </sapn>
        {pageStatus === 0 ? null : (
          <sapn>
            <sapn className='alignright iblock mg2l mg1r'> 状态:</sapn>
            <Select defaultValue='' className='width80' value={this.props.searchStatus} onChange={v => this.changeState({ searchStatus: v })}>
              <Select.Option value=''>全部</Select.Option>
              <Select.Option value='success'>成功</Select.Option>
              <Select.Option value='fail'>失败</Select.Option>
              <Select.Option value='kill'>终止</Select.Option>
            </Select>
          </sapn>
        )}
        <sapn className='alignleft'>
          <Button className='mg2l' type='primary' icon={<SearchOutlined />} onClick={() => this.handleQueryHistoryTask({})}>
            搜索
          </Button>
        </sapn>
        <sapn className='alignleft ' style={{ display: 'inline-block', marginLeft: 10 }}>
          <Button type='primary' loading={loading} disabled={!selectedRowKeys.length} onClick={() => this.handleRunList({})}>
            一键重跑
          </Button>
        </sapn>
        <sapn className='alignleft'>
          <Button className='mg2l' icon={<RedoOutlined />} onClick={() => this.handleReset({})}>
            重置
          </Button>
        </sapn>
      </div>
    )
  }

  /**
   * 计算任务耗时
   * @param obj
   * key
   */
  getSpendTime = obj => {
    if (obj.endTime === -1 || obj.startTime === -1) {
      return '-'
    }
    let start = obj.startTime
    if (typeof start === 'undefined') {
      start = obj.startTime
    }

    const sec = moment(obj.endTime).diff(moment(start), 'ms')
    return sec < 60000 ? `${_.ceil(sec / 1000, 1)} 秒` : moment.duration(sec, 'ms').humanize()
  }

  renderHistoryTable = () => {
    const { groupHistoryList = [], groupPageIndex, groupTotalNum, pgList = [], userList = [] } = this.props
    const { selectedRowKeys } = this.state
    let keyBy = {}
    if (pgList.length) {
      keyBy = _.keyBy(pgList, p => p.id)
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
          const key = _.get(o, 'target.projectId', '')
          return _.get(keyBy[key], 'SugoTaskProject.name', '')
        }
      },
      {
        title: '执行编号',
        dataIndex: 'executeNum',
        width: 80
      },
      {
        title: '任务名称',
        dataIndex: 'showName'
      },
      {
        title: '执行人',
        dataIndex: 'executerUser',
        render: (v, o) => {
          const key = _.get(o, 'target.submitUser', '')
          return _.get(userKeyBy[key], 'first_name', '')
        }
      },
      {
        title: '执行器',
        dataIndex: 'executer'
      },
      {
        title: '开始时间',
        dataIndex: 'startTime',
        render: v => {
          return v ? moment(v).format('YYYY-MM-DD HH:mm:ss') : '-'
        },
        width: 140
      },
      {
        title: '结束时间',
        dataIndex: 'endTime',
        render: v => {
          return v ? moment(v).format('YYYY-MM-DD HH:mm:ss') : '-'
        },
        width: 140
      },
      {
        title: '耗时',
        dataIndex: 'target',
        render: (v, o) => this.getSpendTime(o),
        width: 80
      },
      {
        title: '业务时间',
        dataIndex: 'businessTime',
        render: v => {
          return v ? moment(v).format('YYYY-MM-DD HH:mm') : '-'
        },
        width: 140
      },
      {
        title: '状态',
        dataIndex: 'tag',
        render: v => {
          return <Tag color={_.get(FLOW_STATUS_COLOR_MAP, v, '-')}>{_.get(FLOW_STATUS_TEXT_MAP, v, '-')}</Tag>
        },
        width: 80
      },
      {
        title: '操作',
        key: 'action',
        render: (text, obj) => (
          <span>
            <Popconfirm placement='top' title='是否重新执行' onConfirm={() => this.handlerestartExecuteTask(obj)} okText='确定' cancelText='取消'>
              <a className='mg2r'>重新执行</a>
            </Popconfirm>

            <a className='mg2r' type='primary' onClick={() => this.showLogPopWindow({ execId: obj.executeNum })}>
              查看日志
            </a>

            {/* <Popconfirm placement='top' title='是否重跑失败工作流'
              onConfirm={() => this.handlerestartExecuteFailTask(obj)}
              okText='确定' cancelText='取消'> */}
            <a className='mg2r' disabled={obj.tag === 'SUCCEEDED'} onClick={() => this.setState({ showSkipNodeWiatModal: true, selectItem: obj })}>
              重跑失败工作流
            </a>
            {/* </Popconfirm> */}
          </span>
        )
      }
    ]
    const rowSelection = {
      selectedRowKeys: selectedRowKeys,
      onChange: this.rowSelectionChange
    }
    return (
      <Table
        rowSelection={rowSelection}
        bordered
        size='middle'
        rowKey='id'
        columns={columns}
        dataSource={groupHistoryList}
        pagination={{
          current: groupPageIndex,
          total: groupTotalNum,
          showSizeChanger: true,
          defaultPageSize: 10,
          onChange: page => this.handleQueryHistoryTask({ page }),
          onShowSizeChange: (current, size) => this.handleQueryHistoryTask({ page: 1, size }),
          showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`
        }}
      />
    )
  }

  render() {
    const { showLogPopWindow, checkLogTableList, singleLogMap } = this.props
    const { showSkipNodeWiatModal, selectItem } = this.state
    return (
      <div className='width-100 height-100'>
        <div
          className='pd2 bg-white'
          style={{
            height: 'calc(100% - 48px)'
          }}
        >
          {this.executePage()}
        </div>
        <ScheduleLogPopWindow
          visible={showLogPopWindow}
          handleCancel={this.handleCancelPopwindow}
          checkLogTableList={checkLogTableList}
          queryAllLog={this.handleTaskAllLog}
          handlesingleLog={this.handlesingleLog}
          singleLogMap={singleLogMap}
        />
        <Modal
          title='重跑任务'
          content=''
          visible={showSkipNodeWiatModal}
          footer={
            <div>
              <Button className='mg2l' onClick={() => this.setState({ showSkipNodeWiatModal: false })}>
                取消
              </Button>
              <Button className='mg2l' type='primary' onClick={() => this.handlerestartExecuteFailTask({ ...selectItem, skipWaitNode: true })}>
                跳过
              </Button>
              <Button type='primary' onClick={() => this.handlerestartExecuteFailTask({ ...selectItem, skipWaitNode: false })}>
                不跳过
              </Button>
            </div>
          }
        >
          是否跳过等待节点重跑失败工作流
        </Modal>
      </div>
    )
  }
}
