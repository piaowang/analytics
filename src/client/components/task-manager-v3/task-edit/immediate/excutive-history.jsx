import React, { useState, useEffect } from 'react'
import _ from 'lodash'
import moment from 'moment'
import { Table, Button, Tag, Radio } from 'antd'
import CombinationQuery from './excutive-query'
import { FLOW_STATUS_TEXT_MAP, FLOW_STATUS_COLOR_MAP } from '../../constants'
import { parseRes, parseRes2, getHref } from './utils'
import { queryTaskHistory, queryLogs } from '../services'
import './style.styl'

const ExecutiveHistoryModal = props => {
  const { id } = props
  const [queryParams, setQueryParams] = useState({ page: 1, size: 10 })
  const [currentHistory, setCurrentHistory] = useState({})
  const [stateObj, setStateObj] = useState({
    logsList: [],
    historyList: [],
    historyCount: 0,
    logsCount: 0
  })

  useEffect(() => {
    const initData = async () => {
      const response = await queryTaskHistory({
        ...queryParams,
        projectId: id
      })
      const obj = parseRes(response)
      setStateObj({ ...stateObj, ...obj })
    }
    initData()
  }, [])

  const queryData = async params => {
    const response = await queryTaskHistory({
      ...queryParams,
      params,
      projectId: id
    })
    const obj = parseRes(response)
    setStateObj({ ...stateObj, ...obj })
    setQueryParams({ queryParams: params })
  }

  const search = value => {
    queryData({ ...value, page: 1 })
  }

  const clearParams = () => {
    queryData({ page: 1 })
  }

  // FIXME 分页有问题，接口不确定，current 参数没用到，紧急
  const historyPaginationChange = async ({ current = 1, executionId }) => {
    const response = await queryLogs(executionId)
    if (response.status) {
      const list = parseRes2(response)
      setStateObj({
        ...stateObj,
        logsList: list,
        historyCount: list.length
      })
    }
  }

  const historyColumns = [
    {
      title: '执行编号',
      dataIndex: 'identifier',
      width: 100
    },
    {
      title: '任务名称',
      dataIndex: 'name'
    },
    {
      title: '执行器',
      dataIndex: 'actuator'
    },
    {
      title: '开始时间',
      dataIndex: 'start_at',
      width: 155,
      render: val => (!val || val <= 0 ? '-' : moment(val).format('YYYY-MM-DD HH:mm:ss'))
    },
    {
      title: '结束时间',
      dataIndex: 'end_at',
      width: 155,
      render: val => (!val || val <= 0 ? '-' : moment(val).format('YYYY-MM-DD HH:mm:ss'))
    },
    {
      title: '耗时',
      dataIndex: 'take_up_time',
      render: val => ((val !== 0 && !val) || val < 0 ? '-' : `${val}毫秒`)
    },
    {
      title: '业务时间',
      dataIndex: 'business_time',
      width: 155,
      render: val => (!val || val <= 0 ? '-' : moment(val).format('YYYY-MM-DD HH:mm:ss'))
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 70,
      render: val => <Tag color={_.get(FLOW_STATUS_COLOR_MAP, [`${val}`], '#cccccc')}>{_.get(FLOW_STATUS_TEXT_MAP, [`${val}`])}</Tag>
    },
    {
      title: '操作',
      width: 140,
      render: (val, row, index) => {
        return (
          <div>
            {row.status === 0 ? (
              <Button type='link' style={{ padding: 0, border: 'none' }}>
                停止执行
              </Button>
            ) : (
              <Button type='link' style={{ padding: 0, border: 'none' }}>
                重新执行
              </Button>
            )}
            <Button
              type='link'
              style={{ paddingRight: 0, border: 'none' }}
              onClick={() => {
                setCurrentHistory(row)
                historyPaginationChange({ executionId: row.executionId })
              }}
            >
              查看日志
            </Button>
          </div>
        )
      }
    }
  ]

  const logsColumns = [
    {
      title: '名称',
      dataIndex: 'name'
    },
    {
      title: '类型',
      dataIndex: 'type'
    },
    {
      title: '时间轴',
      width: 240,
      dataIndex: 'timeline',
      render: (val, row, index) => {
        let end = row.endTime > 0 ? row.endTime : row.updateTime
        let spend = ((end - row.startTime) / row.totalSpend) * 100
        // let indent = ((row.startTime - row.startTime) / row.totalSpend) * 100
        return (
          <div className='progress-container'>
            <span style={{ width: `${spend}%` }} className={`progress-child ${row.status}`} />
          </div>
        )
      }
    },
    {
      title: '开始时间',
      dataIndex: 'start_at',
      render: val => (!val || val <= 0 ? '-' : moment(val).format('YYYY-MM-DD HH:mm:ss'))
    },
    {
      title: '结束时间',
      dataIndex: 'end_at',
      render: val => (!val || val <= 0 ? '-' : moment(val).format('YYYY-MM-DD HH:mm:ss'))
    },
    {
      title: '耗时',
      dataIndex: 'take_up_time',
      render: val => ((val !== 0 && !val) || val < 0 ? '-' : val)
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 70,
      render: val => <Tag color={_.get(FLOW_STATUS_COLOR_MAP, [`${val}`], '#cccccc')}>{_.get(FLOW_STATUS_TEXT_MAP, [`${val}`])}</Tag>
    },
    {
      title: '操作',
      width: 80,
      render: (val, row, index) => {
        return (
          <a href={getHref(currentHistory.executionId, row.id)} target='view_window'>
            详情
          </a>
        )
      }
    }
  ]

  const getTitle = () => {
    return (
      <Radio.Group className='mg1b' defaultValue='history' buttonStyle='solid' value={currentHistory.id ? 'logs' : 'history'}>
        <Radio.Button value='history' onClick={() => setCurrentHistory({})}>
          执行历史
        </Radio.Button>
        <Radio.Button value='logs' disabled={!currentHistory.id}>
          日志
        </Radio.Button>
      </Radio.Group>
    )
  }

  const { logsList, historyCount, historyList, logsCount } = stateObj
  return (
    <div className='pd2x scroll-content always-display-scrollbar' style={{ height: 'calc(100% - 15px)' }}>
      {getTitle()}
      {currentHistory.id ? (
        <Table
          bordered
          rowKey='id'
          size='middle'
          columns={logsColumns}
          dataSource={logsList}
          pagination={{
            total: historyCount,
            showSizeChanger: false,
            defaultPageSize: 10,
            onChange: page => queryData({ page }),
            showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`
          }}
        />
      ) : (
        <React.Fragment>
          <CombinationQuery search={search} clearParams={clearParams} />
          <div className='filter-split width-100' />
          <Table
            bordered
            rowKey='id'
            size='middle'
            columns={historyColumns}
            dataSource={historyList}
            pagination={{
              total: logsCount,
              showSizeChanger: false,
              defaultPageSize: 10,
              onChange: current => historyPaginationChange({ current, executionId: currentHistory.executionId }),
              showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`
            }}
          />
        </React.Fragment>
      )}
    </div>
  )
}

export default ExecutiveHistoryModal
