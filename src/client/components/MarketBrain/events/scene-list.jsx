/* eslint-disable react/prop-types */
/**
 * @author WuQic
 * @email chao.memo@gmail.com
 * @create date 2019-03-19 14:06:22
 * @modify date 2019-03-19 14:06:22
 * @description 智能营销-场景列表
 */
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import { PlusOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import {
  Button,
  List,
  Col,
  Divider,
  Switch,
  Row,
  Radio,
  Input,
  Badge,
  Popover,
  Spin,
  Popconfirm,
} from 'antd';
import Icon from '~/components/common/sugo-icon'
import { validateFieldsAndScroll } from 'client/common/decorators'
import _ from 'lodash'
import classnames from 'classnames'
import { Empty } from '../../Common/empty'
import moment from 'moment'
import { META as meta } from 'redux-saga-model-loading'
import { browserHistory } from 'react-router'
import { compressUrlQuery }  from 'common/sugo-utils'
import { SENDCHANNELENUM } from 'common/marketBrain/constants'

const { marketBrain: { 
  feature
} } = window.sugo

@connect(state => ({
  ...state['marketBrainScenes'],
  loading: state.loading.models['marketBrainScenes']
}))
@Form.create()
@validateFieldsAndScroll
export default class SceneList extends Component {

  static propTypes = {
    dispatch: PropTypes.func,
    model_id: PropTypes.string,
    list: PropTypes.array,
    scenePopVisible: PropTypes.bool
  }

  constructor(props) {
    super(props)
  }

  componentDidMount() {
    this.changeState({expandedRows: {}})
    const { model_id } = this.props
    if (model_id) {
      this.fetchData(model_id)
    }

    this.userRole = 'admin'
    if (window.sugo.jwtData) {
      const { jwt_company_id, jwt_store_id } = _.get(window,'sugo.jwtData.others', {})
      if (jwt_company_id || jwt_store_id) {
        this.userRole = 'jwtUser'
      }
      if (!jwt_company_id && !jwt_store_id) {
        this.userRole = 'jwtAdmin'
      }
    }
  }

  componentDidUpdate(prevProps) {
    const model_id = this.props.model_id
    if (model_id !== prevProps.model_id) {
      this.fetchData(model_id)
    }
  }

  renderPopContent = (getFieldDecorator, editModel, cancelHandler) => (
    <div className="add-event-content">
      <div className="iblock pd2 width450 ">
        <Form layout="inline">
          <Form.Item label="场景名称">
            {getFieldDecorator('name', {
              rules: [{
                required: true,
                message: '请输入场景名称'
              }, {
                pattern: /^[^\s]*$/,
                message: '禁止输入空格'
              }, {
                min: 1,
                max: 50,
                type: 'string',
                message: '1~50个字符'
              }],
              initialValue: _.get(editModel, 'name', '')
            })(
              <Input placeholder="请输入场景名称" type="text"/>
            )}
          </Form.Item>
          <Form.Item
            label=""
          >
            {getFieldDecorator('status', {
              initialValue: _.get(editModel, 'status', 1)
            })(
              <Radio.Group>
                <Radio defaultChecked value={1}>启用</Radio>
                <Radio value={0}>停用</Radio>
              </Radio.Group>
            )}
          </Form.Item>
        </Form>
      </div>
      <div className="block aligncenter mg2l">
        <Button className="mg2l" onClick={cancelHandler}>取消</Button>
        <Button className="mg2l" type="primary" onClick={this.saveHandler}>保存</Button>
      </div>
    </div>
  )

  renderSceneItems = item => {
    const { expandedRows, form: { getFieldDecorator }, editModel } = this.props
    const row = expandedRows[item.id] || {}
    return (
      <Row className="width-100">
        <Col span={9}>
          <div className="mg2r iblock">
            <h2 className={classnames({'color-grey': item.status === 0})}>{item.name}</h2>
          </div>
        </Col>
        <Col span={4}>
          {item.status === 1 ? <Badge status="success" text="已启用" /> : <Badge status="default" text="已停用" />}
        </Col>
        <Col span={6} className={classnames({'color-grey': item.status === 0})}>
          共有{item.event_total}个策略{item.tactics_status === 0 ? null : `， ${item.opened_total}个开启策略`}
        </Col>
        <Col span={5}>
          <div className="iblock mg3l">
            <a className="color-main pointer" onClick={() => this.onExpandRowHandler(item)}>
              查看 <Icon type="down" />
            </a>
            {
              this.userRole === 'jwtUser' 
                ? null
                : <Popover
                  trigger="click"
                  visible={!!row.visible}
                  placement="bottom"
                  arrowPointAtCenter
                  onVisibleChange={visible => this.toggleEditHandler(item, visible)}
                  title="修改营销场景"
                  getPopupContainer={() => document.querySelector(`.marketing-scene-${item.id}`)}
                  content={this.renderPopContent(getFieldDecorator, editModel, () => this.toggleEditHandler(item, false))}
                >
                  <a className={`mg2l pointer marketing-scene-${item.id}`} onClick={() => this.toggleEditHandler(item, true)}>
                    <Icon type="form" className="font16" />
                  </a>
                </Popover>
            }
            {
              this.userRole === 'jwtUser'
                ? null
                :  (Number(item.event_total) > 0 ? null : (
                  <Popconfirm title="确定要删除该营销场景吗" onConfirm={() => this.deleteHandler(item.id)}>
                    <a className="mg2l pointer">
                      <Icon type="sugo-delete" className="font16" />
                    </a>
                  </Popconfirm>
                ))
            }
          </div>
        </Col>
        {/** 场景事件列表数据 */}
        <Col span={23}>
          {this.renderSceneContent(item)}
        </Col>
      </Row>
    )
  }

  renderSceneContent = item => {
    const { expandedRows } = this.props
    const row = expandedRows[item.id] || {}
    const expanded = row.expanded
    const loading = row.loading
    if (expanded === void 0) {
      return null
    }
    return (
      <Spin spinning={!!loading}>
        <div className={classnames('width-100 scence-content', {hide: !expanded})}>
          <Divider />
          <Row className="scence-content-row">
            <Col span={24} className="mg2b">
              {
                this.userRole === 'jwtUser' ? null : <a className="bold" onClick={() => this.createEventHandler(item)}>
                  <Icon type="plus" /> 新增策略
                </a>
              }
            </Col>
            {this.renderEventList(item)}
          </Row>
          <Divider />
        </div>
      </Spin>
    )
  }

  copyEventToActive = event => {
    browserHistory.push(`/console/market-brain-acts/new?id=${event.id}&_sv=${compressUrlQuery(`${event.model_id}|${event.scene_id}`)}&baseEvent=true`)
  }

  renderEventList = item => {
    const { expandedRows } = this.props
    const row = expandedRows[item.id] || {}
    const events = row.events || []
    return (
      _.isEmpty(events) ? (
        <Col span={23}>
          <Empty />
        </Col>
      ) : (
        events.map(event => {
          return (
            <React.Fragment key={event.id}>
              <Col span={11}>
                <a onClick={() => this.editEventHandler(event)}>{event.name}</a>
              </Col>
              <Col span={3}>
                <span className="bold">{SENDCHANNELENUM[feature][event.touch_up_way][event.send_channel]}</span>
              </Col>
              <Col span={6}>
                <span className="color-blue-grey">
                  创建时间：{moment(event.created_at).format('YYYY-MM-DD')}
                </span>
              </Col>
              <Col span={2}>
                <span className="mg2l">
                  {
                    this.userRole === 'jwtUser' ? null : <Popconfirm title={`确定${event.tactics_status === 1 ? '关闭' : '开启'}该策略？`} onConfirm={() => this.channelCounterHandler(event, 'event_total')}>
                      <Switch size="small" checked={event.tactics_status === 1}/>
                    </Popconfirm>
                  }
                </span>
              </Col>
              <Col span={2}>
                {
                  event.tactics_status ?
                    <Popconfirm title="确定要使用该策略吗" onConfirm={() => this.copyEventToActive(event)}>
                      <a className="mg1l">使用</a>
                    </Popconfirm>
                    : null
                }
              </Col>
            </React.Fragment>
          )
        })
      )
    )
  }

  fetchData = (model_id) => {
    if (!model_id) {
      return
    }
    this.props.dispatch({
      type: 'marketBrainScenes/fetch',
      payload: model_id,
      meta
    })
  }

  changeState = payload => {
    this.props.dispatch({
      type: 'marketBrainScenes/change',
      payload
    })
  }

  toggleCreateHandler = (editModel = {}, visible = true) => {
    this.changeState({
      scenePopVisible: visible,
      editModel
    })
  }

  toggleEditHandler = (editModel = {}, visible) => {
    const { expandedRows: values } = this.props
    let expandedRows = _.clone(values)
    const { id: key } = editModel
    if(!expandedRows[key]) {
      expandedRows[key] = {}
    }
    expandedRows[key].visible = visible
    this.changeState({
      editModel: visible ? editModel : {},
      expandedRows
    })
  }

  saveHandler = async () => {
    const { editModel } = this.props
    const values = await this.validateFieldsAndScroll()
    if (!values) return
    await this.props.dispatch({
      type: 'marketBrainScenes/save',
      payload: {
        id: editModel && editModel.id,
        values
      }
    })
    this.props.form.resetFields()
  }

  deleteHandler = id => {
    this.props.dispatch({
      type: 'marketBrainScenes/remove',
      payload: id
    })
  }

  onExpandRowHandler = async item => {
    const { id: key } = item
    const { expandedRows: values, dispatch, selected_model_id } = this.props
    let expandedRows = _.clone(values)
    if(!expandedRows[key]) {
      expandedRows[key] = {}
    }
    expandedRows[key].expanded = !expandedRows[key].expanded
    if (expandedRows[key].expanded) { // 如果是展开操作，则需查询事件列表数据
      expandedRows[key].loading = true
      this.changeState({
        expandedRows
      })
      // 查询事件列表
      await dispatch({
        type: 'marketBrainScenes/fetchEvents',
        payload: {
          model_id: selected_model_id,
          scene_id: item.id,
          page_size: 10000
        }
      })
    }
    this.changeState({
      expandedRows
    })
  }

  createEventHandler = item => {
    const { selected_model_id } = this.props
    browserHistory.push(`/console/market-brain-events/new?_sv=${compressUrlQuery(`${selected_model_id}|${item.id}`)}`)
  }

  editEventHandler = (record) => {
    browserHistory.push(`/console/market-brain-events/new?id=${record.id}&_sv=${compressUrlQuery(`${record.model_id}|${record.scene_id}`)}`)
  }

  channelCounterHandler = (event, propkey) => {
    this.props.dispatch({
      type: 'marketBrainScenes/updateEvent',
      payload: {
        event,
        propkey
      }
    })
  }

  render() {
    const { list, scenePopVisible, form: { getFieldDecorator }, editModel, loading } = this.props
    return (
      <div className="scroll-content always-display-scrollbar" style={{height: 'calc(100% - 180px)'}}>.
        {
          this.userRole === 'jwtUser' 
          ? null
          : <Popover
            trigger="click"
            visible={scenePopVisible}
            placement="bottom"
            arrowPointAtCenter
            onVisibleChange={visible => this.toggleCreateHandler({}, visible)}
            title="新增营销场景"
            content={this.renderPopContent(getFieldDecorator, editModel, () => this.toggleCreateHandler({}, false))}
          >
            <Button icon={<PlusOutlined />} style={{width: '700px'}} type="dashed" onClick={() => this.toggleCreateHandler({}, true)}>新增场景</Button>
          </Popover>
        }
        <Spin spinning={!!loading}>
          <List
            size="large"
            rowKey="id"
            split={false}
            style={{width: '700px', maxHeight: 'calc(100% - 300px)'}}
            dataSource={list}
            renderItem={item => (
              <List.Item>
                {this.renderSceneItems(item)}
              </List.Item>
            )}
          />
        </Spin>
      </div>
    );
  }
}
