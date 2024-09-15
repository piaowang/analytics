/* eslint-disable react/prop-types */
import React, { PureComponent } from 'react'
import Bread from '~/components/common/bread'
import { InfoCircleOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import {
  Button,
  Select,
  Row,
  Col,
  Table,
  Divider,
  Input,
  Popconfirm,
  Modal,
  Tooltip,
  DatePicker,
} from 'antd';
import { browserHistory } from 'react-router'
import { validateFieldsAndScroll } from 'client/common/decorators'
import { META as meta } from 'redux-saga-model-loading'
import moment from 'moment'
import { connect } from 'react-redux'
import { enableSelectSearch } from 'client/common/antd-freq-use-props'
import { compressUrlQuery }  from 'common/sugo-utils'
import EffectSettings from '../Common/effect-settings'
import { getNextTriggerDateByLater } from 'client/common/cron-picker-kit'
import { SENDCHANNELENUM } from 'common/marketBrain/constants'
import _ from 'lodash'
import './css.styl'

const { marketBrain: { 
  feature,
  shouldSetGlobalSceneParams
} } = window.sugo

const channelMap = SENDCHANNELENUM[feature]

@connect(({ marketBrainEvents, loading }) => ({
  ...marketBrainEvents,
  loading: loading.models.marketBrainEvents
}))
@Form.create()
@validateFieldsAndScroll
export default class EventEntry extends PureComponent {

  state = {
    formValues: {},
    visible: false,
    editRecord: {}
  }

  componentDidMount() {
    this.props.dispatch({
      type: 'marketBrainEvents/fetch',
      payload: {
        page: 1,
        pageSize: 10,
        loadTreeLevels: true,
        belongs: 0
      }
    })

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


  columns = [
    {
      title: '策略ID',
      dataIndex: 'id',
      key: 'id'
    },
    {
      title: '所属模型',
      dataIndex: 'MarketBrainModel.modelName',
      key: 'MarketBrainModel.modelName',
      render: (v, record) => _.get(record, 'MarketBrainModel.modelName', '--')
    },
    {
      title: '所属模型场景',
      dataIndex: 'MarketBrainScene.sceneName',
      key: 'MarketBrainScene.sceneName',
      render: (v, record) => _.get(record, 'MarketBrainScene.sceneName', '--')
    },
    {
      title: '策略名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '是否开启',
      dataIndex: 'tactics_status',
      key: 'tactics_status',
      render: v => v === 0 ? '关闭' : '开启'
    },
    {
      title: '触达方式',
      dataIndex: 'touch_up_way',
      key: 'touch_up_way',
      render: v => v === 0 ? '自动' : '人工'
    },
    {
      title: '发送渠道',
      dataIndex: 'send_channel',
      key: 'send_channel',
      render: (v, record) => channelMap[record.touch_up_way][v]
    },
    {
      title: '执行次数',
      dataIndex: 'timer_type',
      key: 'timer_type',
      render: v => v === 0 ? '单次' : '多次'
    },
    {
      title: '执行时间',
      dataIndex: 'timer',
      key: 'timer',
      render: (value, record) => {
        const { timingDate, timingTimer, computeIntervalInfo, realTimers } = value
        const cronExpression = _.get(computeIntervalInfo, 'cronExpression')
        const single = record.timer_type === 0
        let contentRender
        if (single) {
          return (
            <Tooltip title={'执行时间'} placement="rightTop">
            <span className="elli mw200 inline">
              {moment(timingDate + ' ' + timingTimer).format('YYYY-MM-DD HH:mm')}
              <InfoCircleOutlined className="mg1l" />
            </span>
          </Tooltip>
          );
        } else {
          const title = (
            <div>
              {
                realTimers.map((item, idx) => (
                  <React.Fragment key={'executeNext3times' + idx}>
                    <p className="color-grey line-height20 bold">接下来3次执行时间：</p>
                    {getNextTriggerDateByLater(idx === 0 ? cronExpression : item.computeIntervalInfo.cronExpression, timingDate + ' ' + timingTimer).map((p, i) => <div style={{ lineHeight: '20px' }} key={`next_time${i}`} className="mg1r">{p}</div>)}
                  </React.Fragment>
                ))
              }
            </div>
          )
          contentRender = (
            <Tooltip title={title} placement="rightTop">
              <span className="elli mw200 inline">
                {moment(timingDate + ' ' + timingTimer).format('YYYY-MM-DD HH:mm')}
                <InfoCircleOutlined className="mg1l" />
              </span>
            </Tooltip>
          )
        }
        return contentRender
      }
    },
    {
      title: '操作',
      dataIndex: 'actions',
      key: 'actions',
      render: (v, record) => (
        <React.Fragment>
          {
            this.userRole === 'jwtUser'
              ? null
              : <React.Fragment>
                <a className="mg1r pointer" onClick={() => this.editHandler(record)}>编辑</a>
                <Divider type="vertical" />
                <Popconfirm title="确定要删除该策略吗" onConfirm={() => this.deleteHandler(record)}>
                  <a className="mg1r pointer">删除</a>
                </Popconfirm>
              </React.Fragment>
          }
          {
            record.tactics_status ?
              <Popconfirm title="确定要使用该策略吗" onConfirm={() => this.copyEventToActive(record)}>
                <Button className="mg1l" type="primary" size="small">使用</Button>
              </Popconfirm>
              : null
          }
        </React.Fragment>
      )
    }
  ]

  copyEventToActive = event => {
    browserHistory.push(`/console/market-brain-acts/new?id=${event.id}&_sv=${compressUrlQuery(`${event.model_id}|${event.scene_id}`)}&baseEvent=true`)
  }

  renderFilterBox() {
    const { treeLevels = [], form: { getFieldDecorator, getFieldValue, setFieldsValue } } = this.props

    return (
      <div className="width-100 mg2 events-filter-box">
        <Form  layout="inline">
          <Row>
            <Col span={22}>
              <Row gutter={{ md: 8, lg: 24, xl: 48 }}>
                <Col md={8} sm={24}>
                  <Form.Item label="模型&场景">
                    {getFieldDecorator('selected_values') (
                      <Select
                        allowClear
                        {...enableSelectSearch}
                        className="width200"
                        placeholder="请选择模型&场景"
                      >
                        {
                          treeLevels.map(model => {
                            return (
                              <Select.OptGroup key={`p-tree-${model.id}`} label={model.name}>
                                {
                                  model.MarketBrainScenes.map(scene => (
                                    <Select.Option
                                      key={`c-tree-${scene.id}`}
                                      value={[model.id, scene.id].join('|')}
                                    >{scene.name}</Select.Option>
                                  ))
                                }
                              </Select.OptGroup>
                            )
                          })
                        }
                      </Select>
                    )}
                  </Form.Item>
                </Col>
                <Col md={8} sm={24}>
                  <Form.Item label="策略名称">
                    {getFieldDecorator('name')( <Input className="width200" placeholder="请输入策略名称" /> )}
                  </Form.Item>
                </Col>
                <Col md={8} sm={24}>
                  <Form.Item label="是否启用">
                    {getFieldDecorator('tactics_status')(
                      <Select
                        allowClear
                        placeholder="请选择状态"
                        className="width200"
                      >
                        <Select.Option value={1}>开启</Select.Option>
                        <Select.Option value={0}>关闭</Select.Option>
                      </Select>
                    )}
                  </Form.Item>
                </Col>
              </Row>
              <Row className="mg2t">
                <Col md={8} sm={24}>
                  <Form.Item label="触达方式">
                    {getFieldDecorator('touch_up_way')(
                      <Select
                        allowClear
                        placeholder="请选择触达方式"
                        className="width200"
                        onChange={(v) => {
                          setFieldsValue({ 'send_channel': undefined })
                          setFieldsValue({ 'touch_up_way': v })
                        }}
                      >
                        <Select.Option value={1}>人工</Select.Option>
                        <Select.Option value={0}>自动</Select.Option>
                      </Select>
                    )}
                  </Form.Item>
                </Col>
                <Col md={8} sm={24}>
                  <Form.Item label="发送渠道">
                    {getFieldDecorator('send_channel')(
                      <Select
                        allowClear
                        placeholder={!_.isNumber(getFieldValue('touch_up_way')) ? '请先选择触达方式' : '请选择渠道'}
                        className="width200"
                      >
                        {
                          !_.isNumber(getFieldValue('touch_up_way')) ? null : channelMap[getFieldValue('touch_up_way')].map( (i, idx) => (
                            <Select.Option key={idx} value={idx}>{i}</Select.Option>
                          ))
                        }
                      </Select>
                    )}
                  </Form.Item>
                </Col>
                <Col md={8} sm={24}>
                  <Form.Item className="width350" label="创建时间">
                    {
                      getFieldDecorator('created_range', {
                        initialValue: [moment().add(-7, 'days'), moment()]
                      })(
                        <DatePicker.RangePicker
                          className="width250"
                          format="YYYY-MM-DD"
                        />
                      )
                    }
                  </Form.Item>
                </Col>
              </Row>
            </Col>
            <Col span={1}>
              <Button type="primary" icon={<SearchOutlined />} className="mg3r" onClick={this.searchHandler}>搜索</Button>
            </Col>
            <Col span={1} />
          </Row>
        </Form>
      </div>
    );
  }

  renderTable() {
    const { rows, total, page, pageSize, loading } = this.props
    return (
      <Table
        loading={loading}
        rowKey="id"
        dataSource={rows}
        columns={this.columns}
        pagination={{
          current: page,
          pageSize,
          total,
          showTotal: total => '共' + total + '条',
          onChange: this.paginationHandler
        }}
      />
    )
  }

  renderEffectSettings = () => {
    const { projectList } = this.props
    const { editRecord, visible } = this.state
    const props = {
      projectList,
      data: editRecord,
      visible,
      onOk: this.effectOkHandler,
      onCancel: () => this.effectHandler({}, false)
    }
    return (
      <EffectSettings {...props} />
    )
  }

  effectOkHandler = (project_id, data) => {
    if (!project_id) {
      return
    }
    this.props.dispatch({
      type: 'marketBrainEvents/saveEffect',
      payload: {
        id: data.id,
        values: {
          model_id: data.model_id,
          project_id
        }
      }
    })
    this.setState({
      visible: false
    })
  }

  changeState = payload => {
    this.props.dispatch({
      type: 'marketBrainEvents/change',
      payload
    })
  }

  paginationHandler = (page, pageSize) => {
    this.props.dispatch({
      type: 'marketBrainEvents/fetch',
      payload: { page, pageSize }
    })
  }

  searchHandler = async e => {
    e.preventDefault()
    const formValues = await this.validateFieldsAndScroll()
    this.setState({
      formValues
    })
    let model_id, scene_id
    if (formValues.selected_values) {
      [model_id, scene_id] = formValues.selected_values.split('|')
    }
    const { page, pageSize } = this.props

    this.props.dispatch({
      type: 'marketBrainEvents/fetch',
      payload: {
        page,
        pageSize,
        model_id,
        scene_id,
        ...formValues,
        created_range: _.isEmpty(formValues.created_range) ? undefined : formValues.created_range.map(v => moment(v).format('YYYY-MM-DD')),
        belongs: 0
      },
      meta
    })
  }

  editHandler = (record) => {
    browserHistory.push(`/console/market-brain-events/new?id=${record.id}&_sv=${compressUrlQuery(`${record.model_id}|${record.scene_id}`)}`)
  }

  /** 效果指标设置 */
  effectHandler = (record, visible) => {
    this.setState({
      editRecord: _.clone(record),
      visible
    })
  }

  deleteHandler = record => {
    this.props.dispatch({
      type: 'marketBrainEvents/remove',
      payload: {
        id: record.id,
        belongs: 0
      }
    })
  }

  render() {
    return (
      <div className="overscroll-y height-100">
        <Bread
          path={[
            {name: '营销策略中心'},
            {name: '营销策略'}
          ]}
        >
          {
            this.userRole === 'jwtUser' 
              ? null
              : <Button
                onClick={() => {
                  browserHistory.push('/console/market-brain-events/new')
                }}
                type="primary"
                icon={<PlusOutlined />}
              >新建策略</Button>
          }
        </Bread>
        <div className="mg3">
          {this.renderFilterBox()}
          {this.renderTable()}
          {/* {this.renderEffectSettings()} */}
        </div>
      </div>
    );
  }
}
