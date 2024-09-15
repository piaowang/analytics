import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router'
import autoTrackModel, { namespace } from './model'
import { Button, Input, Row, Col, Drawer, Table, Select, Form, Popconfirm, Tabs } from 'antd'
import { connect } from 'react-redux'
import withRuntimeSagaModel from '../../../Common/runtime-saga-helper'
import ReactEcharts from 'echarts-for-react'
import EditEvent from './edit-event'
import Store from './../view-web/store'
const { TabPane } = Tabs
const eventTranslate = {
  click: '点击',
  focus: '获取焦点',
  submit: '提交',
  change: '修改',
  touchstart: '触碰开始',
  touchend: '触碰结束',
}

@connect(props => {
  return {
    ...props[namespace]
  }
})
@withRuntimeSagaModel(autoTrackModel)
export default class AutoTrackList extends Component {
  // static propTypes = {
  //   list: PropTypes.Array,
  //   loading: PropTypes.Boolean,
  //   showEventInfo: PropTypes.Boolean,
  //   selectId: PropTypes.String,
  //   title: PropTypes.String,
  //   entry: PropTypes.String
  // }

  constructor (props, context) {
    super(props, context)
    this.store = new Store()
    this.store.subscribe(state => this.setState(state))
    /** @type {WebSDKAccessorState} */
    this.state = this.store.getState()
  }

  changeState = (params) => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload: params
    })
  }

  deleteEvent = (record) => {
    const {id,screenshot_id}=record
    this.props.dispatch({
      type: `${namespace}/deleteEvent`,
      payload: { id ,screenshot_id}
    })
  }

  setDataAnalyticsSdkConfig (opt) {
    this.props.dispatch(VMAction.setDataAnalyticsSdkConfig,opt)
    this.props.dispatch(DataAnalysisAction.change, opt)
    return this
  }
  onSelectEdit = (obj) => {
    const { id, screenshot_id: screenshotId, sugo_autotrack_page_path: autotrackPagePath, sugo_autotrack_path: autotrackPath, event_path_type } = obj
    // 只有web的不需要根据id去获取截屏文件
    event_path_type !== 'web' && this.props.dispatch({
      type: `${namespace}/getScreenshot`,
      payload: { id, screenshotId }
    })
    this.props.dispatch({
      type: `${namespace}/getEventData`,
      payload: { id, autotrackPath, autotrackPagePath }
    })
    this.changeState({ showEventInfo: true, selectId: id })
  }

  /**
   * 渲染上方操作区域
   * @return {XML}
   */
  renderOperate() {
    const { autoTrackEntry } = this.props
    return (
      <div className="bordert">
      <div className="mg2t pd2y dashed inputsearch">
        <Input
          className="width250"
          onChange={(e) => this.changeState({ searchKey: e.target.value })}
          placeholder="请输入事件名称"
        />
      </div>
      <div className="alignright fright trackentry">

      <Link to={autoTrackEntry}>
        <Button
          type="primary"
          className="mg2r"
        >全埋点圈选</Button>
      </Link>
    </div>
    </div>
    )
  }

  /**
   * 渲染AppVersion Table
   * @return {XML}
   */
  renderDataTable() {
    const { list = [], searchKey, loading } = this.props
    const columns = [
      {
        title: '名称',
        dataIndex: 'event_name',
        key: 'event_name'
      },
      {
        title: '描述',
        dataIndex: 'event_memo',
        key: 'event_memo'
      },
      {
        title: '类型',
        dataIndex: 'event_type',
        key: 'event_type',
        render: text => _.get(eventTranslate, text, eventTranslate.click)
      },
      {
        title: '匹配页面',
        dataIndex: 'sugo_autotrack_page_path',
        key: 'sugo_autotrack_page_path'
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: text => text ? '正常' : '7天内无数据上报'
      },
      {
        title: '操作',
        dataIndex: 'id',
        key: 'op',
        width: 200,
        render: (text, record, index) => {
          return (
            <div className="pd1">
              <Button type="link" onClick={() => this.onSelectEdit(record)}>编辑</Button>
              <Popconfirm onConfirm={() => this.deleteEvent(record)} title="确定删除事件" okText="确定" cancelText="取消">
                <Button type="link" >删除</Button>
              </Popconfirm>
            </div>
          )
        }
      }
    ]

    return (
      <div className="pd2t">
        <Table
          bordered
          rowKey="id"
          size="small"
          dataSource={list.filter(p => !searchKey || _.includes(p.event_name, searchKey))}
          loading={loading}
          columns={columns}
        />
      </div>
    )
  }

  renderEditor() {
    const { autoTrackTitle, DataAnalysis, refreshInit } = this.props
    const { auto_track_init } = DataAnalysis
    return (
      <div className="pd2">
        {this.renderOperate()}
        {this.renderDataTable()}
        {this.renderEditPanel()}
      </div>
    )
  }

  renderEditPanel = () => {
    const { list = [], selectId, showEventInfo, screenshotMap } = this.props
    const info = list.find(p => p.id === selectId) || {}
    if(!showEventInfo) {
      return null
    }
    return <EditEvent
      info={info}
      screenshot={_.get(screenshotMap, info.screenshot_id, '')}
      changeState={this.changeState}
      showEventInfo={showEventInfo}
      saveEvent={vals => {
        this.props.dispatch({
          type: `${namespace}/saveEvent`,
          payload: vals
        })
      }}
    />
  }

  render() {
    return this.renderEditor()
  }
}
