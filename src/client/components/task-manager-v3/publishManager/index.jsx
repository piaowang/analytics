/* eslint-disable react/display-name */
import React, { useState  } from 'react'
import { connect } from 'react-redux'
import { InfoCircleOutlined } from '@ant-design/icons'
import { Table, Radio, Tooltip, message } from 'antd'
import Bread from '../../Common/bread'
import TaskV3PublishModel, { namespace } from './model'
import HorizontalSplitHelper from '../../Common/horizontal-split-helper'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import moment from 'moment'
import { getNextTriggerDateByLater } from 'client/common/cron-picker-kit'
import LabelWithInput from '../../Common/labelWithInput'
import _ from 'lodash'

function PublishManager(props) {

  const [currentTab, setCurrentTab] = useState(1)
  const [filterProjectName, setFilterProjectName] = useState('')
  const [filterWorkFlowName, setFilterWorkFlowName] = useState('')
  // useEffect(() => {
  //   props.dispatch(getUsers())
  // }, JSON.stringify(props.usersDict))

  function onExamine(record, status) {
    const { id, params, flowId } = record
    const { cronInfo, executeParamsObj, notifyWarnObj } = params
    let cb1 = (msg) => message.success(msg)
    let cb2 = (msg) => message.error(msg)

    // 这个 saveTaskNodeInfo 是publishManager的store的 有同名方法 注意区分
    props.dispatch({
      type: `${namespace}/saveTaskNodeInfo`,
      payload: {
        taskId: _.last(_.split(id, '_')),
        projectId: record['SugoTaskProject.id'],
        flowId,
        cronInfo, 
        executeParamsObj, 
        cb2,
        notifyWarnObj,
        cb1,
        status
      }
    })
  }

  function changeTab(status) {
    props.dispatch({
      type: `${namespace}/fetchWaitingExamine`,
      payload: {
        status
      }
    })
  }

  const { taskList = [], usersDict = {} } = props
  
  function renderColumns() {
    return [{
      title: '项目名称',
      dataIndex: 'SugoTaskProject.name',
      key: 'SugoTaskProject.name',
      render: (v, record) => _.get(record, 'SugoTaskProject.name', '--')
    },{
      title: '工作流名称',
      dataIndex: 'name',
      key: 'name'
    },{
      title: '调度周期',
      dataIndex: 'params.cronInfo',
      key: 'params.cronInfo',
      render: (value) => {
        const { taskStartTime, cronExpression } = value || {}
        const title = (
          <div>
            <p className="color-grey line-height20 bold">接下来3次执行时间：</p>
            {getNextTriggerDateByLater(cronExpression, taskStartTime).map((p, i) => <div style={{ lineHeight: '20px' }} key={`next_time${i}`} className="mg1r">{p}</div>)}
          </div>
        )
        return (
          <Tooltip title={title} placement="rightTop">
            <span className="elli mw200 inline">
              {moment(taskStartTime).format('YYYY-MM-DD HH:mm')}
              <InfoCircleOutlined className="mg1l" />
            </span>
          </Tooltip>
        )
      }
    },{
      title: '申请人',
      dataIndex: 'created_by',
      key: 'created_by',
      render: (v) => _.get(usersDict, `[${v}].first_name`)
    },{
      title: '申请时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v) => moment(v).format('YYYY-MM-DD HH:mm:ss') 
    },
    currentTab === 3 ?
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (v) => ['','未审批','已审批', '未通过'][v]
      }
      :
      {
        title: '操作',
        dataIndex: 'id',
        key: 'id',
        render: (v, record) => {
          return (
            <div>
              <a 
                href={`/console/task-schedule-v3/task-edit/${record.task_project_id}?taskId=${record.id}`} 
                style={{
                  verticalAlign: 'middle'
                }}
              >查看</a>
              {
                currentTab === 1 ?
                  <div 
                    className="iblock"
                    style={{
                      verticalAlign: 'middle'
                    }}
                  >
                    <a className="mg2l" onClick={() => onExamine(record, 2)}>通过</a>
                    <a className="mg2l" onClick={() => onExamine(record, 3)}>拒绝</a>
                  </div>
                  : null
              }
            </div>
          )
        }
      }]
  }

  let data = taskList.filter( i => i.name.includes(filterWorkFlowName) && i['SugoTaskProject.name'].includes(filterProjectName))
  return (
    <React.Fragment>
      <Bread
        path={[
          { name: '发布管理' }
        ]}
      />
      <HorizontalSplitHelper
        style={{height: 'calc(100% - 44px)'}}
        className="contain-docs-analytic"
      >
        <div
          className="itblock height-100"
          style={{padding: '10px'}}
          defaultWeight={5}
        >
          <div className="pd3x pd2y bg-white corner height-100 overscroll-y">
            <div className="mg3b">
              <Radio.Group 
                value={currentTab}
                buttonStyle="solid"
                onChange={(e) => {
                  setCurrentTab(e.target.value)
                  changeTab(e.target.value)
                }}
              >
                <Radio.Button value={1}>待审核</Radio.Button>
                <Radio.Button value={2}>已审核</Radio.Button>
                <Radio.Button value={3}>我发起的</Radio.Button>
              </Radio.Group>
            </div>
            <div className="mg2b">
              <LabelWithInput
                label="项目名称:"
                onChange={(e) => setFilterProjectName(e.target.value)}  
              />
              <LabelWithInput
                label="工作流名称:"
                labelClassName="mg2l"
                onChange={(e) => setFilterWorkFlowName(e.target.value)} 
              />
            </div>
            <div>
              <Table
                rowKey="id"
                bordered
                defaultWeight={5}
                dataSource={data}
                columns={renderColumns()}
              />
            </div>
          </div>
        </div>
      </HorizontalSplitHelper>
    </React.Fragment>
  )
}


export default connect(props=> {
  return {
    usersDict: _.keyBy(props.common.users, 'id'),
    ...props[namespace]
  }
})(withRuntimeSagaModel(TaskV3PublishModel)(PublishManager))
