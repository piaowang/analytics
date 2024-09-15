/* eslint-disable react/prop-types */
import React, { Component } from 'react'
import Bread from '../../Common/bread'
import { Table, Timeline } from 'antd'
import { connect } from 'react-redux'
import FilterBox from './filter-box'
import _ from 'lodash'
import { SENDCHANNELENUM } from 'common/marketBrain/constants'
import moment from 'moment'
import Icon from '~/components/common/sugo-icon'
import * as marketBrainTaskService from 'client/services/market-brain/task'

const { marketBrain: { 
  feature
} } = window.sugo

const channelMap = SENDCHANNELENUM[feature]
const status = ['准备中','运行中', '执行中', '已暂停', '已完成']

@connect(state => ({ ...state['marketBrainTask'] }))
export default class MarketBrainTask extends Component {

  constructor(props) {
    super(props)
    this.state = {
      expandedRowKeys: []
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(this.state.expandedRowKeys, nextProps.expandedRowKeys)) {
      this.setState({
        expandedRowKeys: _.cloneDeep(nextProps.expandedRowKeys)
      })
    }
  }

  setProps(payload) {
    return this.props.dispatch({type: 'marketBrainTask/change', payload})
  }

  dispatch(func, payload = {}) {
    return this.props.dispatch({type: `marketBrainTask/${func}`, payload})
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
              return (
                <Timeline.Item key={`${record.id}-${index}-item-${idx}`}>
                  <div className="bold mg1x">
                    {moment(item.created_at).format('YYYY-MM-DD HH:mm')}
                    <a className="mg2l" onClick={() => this.dispatch('downloadRecord', { id: record.id, record: item, execute_id: item.id })}>查看触达任务</a>
                  </div>
                  <span className="mg1x">预计发送量：</span>
                  <span className="mg1r color-main">{item.predict_total || 0 }</span>
                  <span className="mg1x">实际发送量：</span>
                  <span className="mg1r color-main">{item.usergroup_id ? item.actual_total || 0 : 0}</span>
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
    let expandedRows = _.cloneDeep(values)
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
      const res = await marketBrainTaskService.getExecutions(record.id, { limit, offset })
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
    const res = await marketBrainTaskService.getExecutions(record.id, { limit, offset })
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
    const { taskList, count, page, pageSize, loading } = this.props
    const { expandedRowKeys } = this.state
    const columns = [{
      title: '公司名称',
      dataIndex: 'MarketBrainEvent.jwt_company_name',
      key: 'MarketBrainEvent.jwt_company_name',
      render: (v) => v || '无'
    },{
      title: '门店名称',
      dataIndex: 'MarketBrainEvent.jwt_store_name',
      key: 'MarketBrainEvent.jwt_store_name',
      render: (v) => v || '无'
    },{
      title: '任务ID',
      dataIndex: 'id',
      key: 'id'
    },{
      title: '活动名称',
      dataIndex: 'name',
      key: 'name'
    },{
      title: '发送渠道',
      dataIndex: 'send_type',
      key: 'send_type',
      render: (v, record) =>  _.get(channelMap[record.touch_up_way], `${v}`, '无')
    },{
      title: '触达方式',
      dataIndex: 'MarketBrainEvent.touch_up_way',
      key: 'touch_up_way',
      render: (v) =>  v === 0 ? '自动' : '人工'
    },{
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: v => status[v]
    },{
      title: '执行时间',
      dataIndex: 'execute_time',
      key: 'execute_time1',
      render: v => v ? moment(v).format('YYYY-MM-DD HH:mm'): ''
    },{
      title: '操作',
      dataIndex: 'act',
      key: 'act',
      render: (text, record) => {
        const { type } = record
        return (
          <React.Fragment>
            <a className="mg1r" onClick={() => this.expandHandler(record, true)}>查看触达任务</a>
          </React.Fragment>
        )
      }
    }]
    return (
      <Table
        rowKey="id"
        columns={columns}
        dataSource={taskList}
        expandable={{
          expandIcon: () => null,
          expandedRowKeys: expandedRowKeys,
          expandedRowRender: (record) => this.expandedRowRender(record)
        }}
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total: count,
          showTotal: (total) => '共' + total + '条',
          onChange: (page, pageSize) => {
            this.dispatch('list', { page, pageSize })
          }
        }}
      />
    )
  }

  render() {
    return (
      <div className="scroll-content always-display-scrollbar">
        <Bread path={[{name: '活动管理中心'},{name: '触达任务管理'}]} />
        <div className="mg3">
          {this.renderFilterBox()}
          {this.renderTable()}
        </div>
      </div>
    )
  }
}
