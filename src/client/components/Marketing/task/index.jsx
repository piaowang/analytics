/* eslint-disable react/prop-types */
import React, { Component } from 'react'
import Bread from '../../Common/bread'
import { Table, Timeline } from 'antd'
import { connect } from 'react-redux'
import FilterBox from './filter-box'
import _ from 'lodash'
import moment from 'moment'
import { MARKETING_TASK_TYPE, MARKETING_TASK_STATUS } from 'common/constants'
import Icon from '~/components/common/sugo-icon'
import * as marketingTaskService from 'client/services/marketing/task'

const option = ['自动化营销', '活动营销']
const send_type = ['push', '短信']
const status = ['准备中','运行中', '执行中', '已暂停', '已完成', '失败']

@connect(state => ({ ...state['marketingTask'] }))
export default class MarketingTask extends Component {

  constructor(props) {
    super(props)
  }

  setProps(payload) {
    return this.props.dispatch({type: 'marketingTask/change', payload})
  }

  dispatch(func, payload = {}) {
    return this.props.dispatch({type: `marketingTask/${func}`, payload})
  }

  postFilter = (filter) => {
    this.setProps({filter})
    this.dispatch('list', { page: 1, pageSize: 10 })
  }

  renderFilterBox() {
    const { loading } = this.props
    return (
      <div className="mg2">
        <FilterBox
          loading={loading}
          postFilter={this.postFilter}
        />
      </div>
    )
  }

  expandedRowRender = (record, index) => {
    const { expandedRows } = this.props
    const row = expandedRows[record.id]
    const { hasNext, list } = row
    return (
      <React.Fragment>
        <Timeline key={`row-detail-${record.id}`} className="overscroll-y always-display-scrollbar" style={{maxHeight: 250}}>
          {
            list.map((item, idx) => {
              item.send_type = record.send_type
              item.name = record.name
              console.log(item.status, MARKETING_TASK_STATUS.FAILED)
              let isFailed = item.status === MARKETING_TASK_STATUS.FAILED
              return (
                <Timeline.Item key={`${record.id}-${index}-item-${idx}`}>
                  <div className="bold mg1x" style={{lineHeight: '24px'}}>
                    {moment(item.created_at).format('YYYY-MM-DD HH:mm')}
                    {
                      isFailed 
                        ? <a className="color-grey">执行失败</a> 
                        : <a className="mg2l" onClick={() => this.dispatch('downloadRecord', { id: record.id, record: item, execute_id: item.id })}>查看发送任务</a>
                    }
                  </div>
                  <span className="mg1x">预计发送量：</span>
                  <span className="mg1r color-main">{item.predict_total || 0 }</span>
                  <span className="mg1x">实际发送量：</span>
                  <span className="mg1r color-main">{item.actual_total || 0}</span>
                </Timeline.Item>
              )
            })
          }
        </Timeline>
        <a onClick={() => this.loadMoreHandler(record)}>点击加载更多 <Icon type="down"/></a>
      </React.Fragment>
    )
  }

  expandHandler = async (record) => {
    let { expandedRowKeys, expandedRows: values } = this.props
    let expandedRows = _.clone(values)
    if (expandedRowKeys.includes(record.id)) { // 收起操作
      expandedRowKeys = expandedRowKeys.filter(k => k !== record.id)
      await this.setProps({
        expandedRowKeys
      })
      return
    }
    const execute_id = record.id
    const row = _.get(expandedRows, execute_id, {
      list: [],
      loaded: false,
      hasNext: true,
      limit: 10,
      offset: 0
    })
    if (!row.loaded) {
      const { limit, offset } = row
      row.loading = true
      const res = await marketingTaskService.getExecutions(record.id, { limit, offset })
      row.list = row.list.concat(res.result)
      row.loaded = true,
      row.offset = row.list.length
      row.hasNext =  res.result.length === limit
      row.loading = false
    }
    expandedRows[execute_id] = row
    // 展开操作
    expandedRowKeys.push(record.id)
    this.setProps({
      expandedRowKeys,
      expandedRows
    })
  }

  loadMoreHandler = async (record) => {
    let { expandedRows: values } = this.props
    let expandedRows = _.clone(values)
    const execute_id = record.id
    let row = expandedRows[execute_id]
    const { limit, offset } = row
    const res = await marketingTaskService.getExecutions(record.id, { limit, offset })
    row.list = row.list.concat(res.result)
    row.loaded = true,
    row.offset = row.list.length
    row.hasNext =  res.result.length === limit
    row.loading = false
    expandedRows[execute_id] = row
    this.setProps({
      expandedRows
    })
  }

  renderTable() {
    const { taskList, count, page, pageSize, expandedRowKeys, loading } = this.props
    const columns = [{
      title: '任务ID',
      dataIndex: 'id',
      key: 'id'
    },{
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (v) => option[v]
    },{
      title: '活动/事件名称',
      dataIndex: 'name',
      key: 'name'
    },{
      title: '发送渠道',
      dataIndex: 'send_type',
      key: 'send_type',
      render: (text) => send_type[text]
    },{
      title: '预计发送量',
      dataIndex: 'predict_total',
      key: 'predict_total'
    },{
      title: '实际发送量',
      dataIndex: 'actual_total',
      key: 'actual_total'
    },{
      title: '执行时间',
      dataIndex: 'execute_time',
      key: 'execute_time1',
      render: v => v ? moment(v).format('YYYY-MM-DD HH:mm'): ''
    },{
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: v => status[v]
    },{
      title: '操作',
      dataIndex: 'act',
      key: 'act',
      render: (text, record) => {
        const { type } = record
        return (
          <React.Fragment>
            {
              type === MARKETING_TASK_TYPE.EVENTS ? (
                <a className="mg1r" onClick={() => this.expandHandler(record, true)}>查看执行明细</a>
              ) : (
                <a onClick={() => this.dispatch('downloadRecord', {id: record.id, record})}>查看发送任务</a>
              )
            }
          </React.Fragment>
        )
      }
    }]
    return (
      <Table
        rowKey="id"
        columns={columns}
        dataSource={taskList}
        expandedRowRender={(record) => this.expandedRowRender(record)}
        expandedRowKeys={expandedRowKeys}
        expandIconAsCell={false}
        expandIconColumnIndex={-1}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total: count,
          showTotal: (total) => '共' + total + '条',
          onChange: (page, pageSize) => {
            this.dispatch('list', { page, pageSize })
          },
          onShowSizeChange: (page, pageSize) => {
            this.dispatch('list', { page:1, pageSize })
          }
        }}
      />
    )
  }

  render() {
    return (
      <div className="scroll-content always-display-scrollbar">
        <Bread path={[{name: '发送任务管理'}]} />
        <div className="mg3">
          {this.renderFilterBox()}
          {this.renderTable()}
        </div>
      </div>
    )
  }
}
