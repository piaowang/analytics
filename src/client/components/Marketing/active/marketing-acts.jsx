/* eslint-disable react/prop-types */
import React, { PureComponent } from 'react'
import { browserHistory, Link } from 'react-router'
import Bread from '../../Common/bread'
import { PlusOutlined } from '@ant-design/icons';
import { Button, Table, Divider, message, Modal, Popconfirm } from 'antd'
import { connect } from 'react-redux'
import { STATUS, SENDCHANNEL } from './store/constants'
import FilterBox from './filter-box'
import Fetch from 'client/common/fetch-final'
import Loading from 'client/components/Common/loading'
import _ from 'lodash'
import moment from 'moment'
import EffectSettings from '../Common/effect-settings'

/**
 * @create date 2019-04-03 09:57:32
 * @description 智能营销-营销活动
 */
@connect(state => ({ ...state['sagaCommon'], ...state['marketingActives'] }))
export default class MarkingActs extends PureComponent {

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { mes } = nextProps
    if (mes.status) {
      message[mes.status](mes.content)
      this.easyDispatch('change', {
        mes: { status: null, content: ''}
      })
    }
  }

  changeProps = (payload) => {
    this.props.dispatch({
      type: 'marketingActives/change',
      payload
    })
  }

  easyDispatch(func, payload) {
    this.props.dispatch({type: `marketingActives/${func}`, payload})
  }

  delete = async (id) => {
    const res = await Fetch.get(`/app/marketing-actives/delete/${id}`)
    if (!_.get(res,'success')) return message.error(res.message)
    this.easyDispatch('getList', { page: 1, pageSize: 10})
    message.success('删除成功')
  }

  postFilter = (filter) => {
    this.changeProps({filter})
    this.easyDispatch('getList', { page: 1, pageSize: 10 })
  }

  renderFilterBox() {
    const { actGroups = [], loading } = this.props
    const props = {
      postFilter: this.postFilter,
      actGroups,
      loading
    }
    return (
      <FilterBox {...props} />
    )
  }

  renderTable() {
    const { activesList, count, page, pageSize, loading } = this.props
    const columns = [{
      title: '活动ID',
      dataIndex: 'id',
      key: 'id'
    },{
      title: '所属活动分组',
      dataIndex: ['MarketingActivityGroup', 'name'],
      key: 'group_id',
      render: (v, record) => _.get(record, 'MarketingActivityGroup.name', '--')
    },{
      title: '活动名称',
      dataIndex: 'name',
      key: 'name'
    },{
      title: '发送渠道',
      dataIndex: 'send_channel',
      key: 'send_channel',
      render: (record) => SENDCHANNEL[record]
    },{
      title: '是否开启',
      dataIndex: 'status',
      key: 'status',
      render: (record) => STATUS[record]
    },{
      title: '发送日期',
      dataIndex: 'timer',
      key: 'date',
      render: (record) => record.date
    },{
      title: '发送时间',
      dataIndex: 'timer',
      key: 'time',
      render: (record) => record.time
    },{
      title: '操作',
      dataIndex: 'act',
      key: 'act',
      render: (text, record) => (
        <span>
          <Link to={`/console/marketing-acts/new?id=${record.id}`}>编辑</Link>
          <Divider type="vertical" />
          <a onClick={() => this.changeProps({editResultProjectModalVisible: true, selectedItem: record})}>效果设置</a>
          <Divider type="vertical" />
          <a onClick={() => {
            if (!record.project_id) return Modal.warn({ title: '提示', content: '该活动的效果指标尚未关联项目'})
            browserHistory.push(`/console/marketing-acts/result?id=${record.id}`)
          }}
          >查看效果</a>
          <Divider type="vertical" />
          <Popconfirm title="确定要删除吗" onConfirm={() => this.delete(record.id)}>
            <a>删除</a>
          </Popconfirm>
        </span>
      )
    }]
    return (
      <Loading style={{height: 'calc(100% - 43px)'}} isLoading={loading}>
        <Table 
          rowKey={(record) => record.id}
          columns={columns}
          dataSource={activesList}
          loading={loading}
          pagination={{ 
            current: page,
            pageSize,
            total: count,
            showTotal: (total) => '共' + total + '条',
            onChange: (page) => {
              this.changeProps({page})
              this.props.dispatch({type: 'marketingActives/getList', payload: { page, pageSize }})
            }
          }}
        />
      </Loading>
    )
  }

  renderTablePage() {
    return (
      <React.Fragment>
        <Bread
          path={[{name: '活动营销中心'}, { name: '活动管理' }]}
        >
          <Link to="/console/marketing-acts/new">
            <Button type="primary" icon={<PlusOutlined />}>新建活动</Button>
          </Link>
        </Bread>
        <div className="mg3">
          {this.renderFilterBox()}
          {this.renderTable()}
        </div>
      </React.Fragment>
    );
  }

  renderEffectSettings = () => {
    const { editResultProjectModalVisible: visible, selectedItem: data, projectList } = this.props
    const props = {
      projectList: projectList.filter( i => i.access_type === 1),
      data,
      visible,
      onOk: this.effectOkHandler,
      onCancel: () => this.changeProps({editResultProjectModalVisible: false, selectedItem: {}})
    }
    return (
      <EffectSettings {...props} />
    )
  }

  effectOkHandler = (project_id, data) => {
    const timerDate = _.get(data,'timer.date')
    const isDisableDate = moment(timerDate).add(6, 'day').startOf('day') < moment().startOf('day')
    if (isDisableDate) return message.error('已发送并已超过7天,不允许再修改')
    this.easyDispatch('update', {
      project_id,
      id: data.id
    })
  }

  render() {
    return (
      <div>
        {this.renderTablePage()}
        {this.renderEffectSettings()}
      </div>
    )
  }
}
