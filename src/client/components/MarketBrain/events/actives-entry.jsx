/* eslint-disable react/prop-types */
import React, { PureComponent } from 'react'
import Bread from '~/components/common/bread'
import { InfoCircleOutlined, SearchOutlined } from '@ant-design/icons';
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
import EffectSettingsMap from '../Common/effect-settings'
import { getNextTriggerDateByLater } from 'client/common/cron-picker-kit'
import _ from 'lodash'
import { SENDCHANNELENUM } from 'common/marketBrain/constants'

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
export default class ActivesEntry extends PureComponent {

  state = {
    formValues: {},
    visible: false,
    editRecord: {}
  }

  columns = [
    {
      title: '公司名称',
      dataIndex: 'id',
      key: 'jwt_company_name-id',
      render: (v, record) => record.jwt_company_name || '无'
    },
    {
      title: '门店名称',
      dataIndex: 'id',
      key: 'jwt_store_name-id',
      render: (v, record) => record.jwt_store_name || '无'
    },
    {
      title: '活动ID',
      dataIndex: 'id',
      key: 'id'
    },
    {
      title: '所属模型',
      dataIndex: ['MarketBrainModel', 'modelName'],
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
      title: '活动名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '是否开启',
      dataIndex: 'status',
      key: 'status',
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
          <a className="mg1r pointer" onClick={() => this.editHandler(record)}>编辑</a>
          <Divider type="vertical" />
          <Popconfirm title="确定要删除该活动吗" onConfirm={() => this.deleteHandler(record)}>
            <a className="mg1r pointer">删除</a>
          </Popconfirm>
          <Popconfirm title="确定要使用该活动吗" onConfirm={() => this.copyEventToActive(record)} />
          <Divider type="vertical" />
          <a className="mg1l pointer" onClick={() => this.effectHandler(record, true)}>效果设置</a>
          {
            shouldSetGlobalSceneParams ?
            <React.Fragment>
              <Divider type="vertical" />
              <a className="mg1l pointer" onClick={() => browserHistory.push(`/console/market-brain-acts/result?id=${record.id}`)}>查看效果</a>
            </React.Fragment>
            : null
          }
        </React.Fragment>
      )
    }
  ]

  copyEventToActive = event => {
    
  }

  renderFilterBox() {
    const { treeLevels = [], form: { getFieldDecorator, getFieldValue, setFieldsValue } } = this.props
    return (
      <div className="width-100 mg2 acts-filter-box">
        <Form layout="inline">
          <Row>
            <Col span={22}>
              <Row gutter={{ md: 8, lg: 24, xl: 48 }}>
                <Col md={6} sm={24}>
                  <Form.Item label="公司名称">
                    {getFieldDecorator('jwt_company_name') (
                      <Input 
                        placeholder="请输入公司名称"
                      />
                    )}
                  </Form.Item>
                </Col>
                <Col md={6} sm={24}>
                  <Form.Item label="门店名称">
                    {getFieldDecorator('jwt_store_name') (
                      <Input 
                        placeholder="请输入门店名称"
                      />
                    )}
                  </Form.Item>
                </Col>
                <Col md={6} sm={24}>
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
                <Col md={6} sm={24}>
                  <Form.Item label="活动名称">
                    {getFieldDecorator('name')( <Input className="width200" placeholder="请输入活动名称" /> )}
                  </Form.Item>
                </Col>
              </Row>
              <Row className="mg2t">
                <Col md={6} sm={24}>
                  <Form.Item label="是否启用">
                    {getFieldDecorator('status')(
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
                <Col md={6} sm={24}>
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
                <Col md={6} sm={24}>
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
                <Col md={6} sm={24}>
                  <Form.Item className="width350" label="创建时间">
                    {
                      getFieldDecorator('created_range', {
                        initialValue: [moment().add(-7, 'days'), moment()]
                      })(
                        <DatePicker.RangePicker
                          className="width250"
                          format="YYYY-MM-DD"
                          placeholder={['开始时间', '结束时间']}
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
    const { projectList, form } = this.props
    const { editRecord, visible } = this.state

    const EffectSettings = EffectSettingsMap[feature]

    const formItemLayout = {
      labelCol: {span: 5},
      wrapperCol: {span: 19}
    }

    const props = {
      projectList,
      formItemLayout,
      item: editRecord,
      form,
      visible,
      onOk: this.effectOkHandler,
      onCancel: () => this.effectHandler({}, false)
    }
    return (
      EffectSettings 
      ? <EffectSettings {...props} />
      : null
    )
  }

  effectOkHandler = async () => {
    const { page, pageSize } = this.props
    let result = await this.validateFieldsAndScroll()

    let { params } = result
    const { editRecord } = this.state

    for (let k in params) {
      params[k] = params[k] || null
    }
    this.props.dispatch({
      type: 'marketBrainEvents/save',
      payload: {
        id: editRecord.id,
        values: { ...editRecord, params }
      }
    })
    this.effectHandler({}, false)
    this.paginationHandler(page, pageSize)
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
      payload: { page, pageSize, belongs: 1 }
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
        belongs: 1
      },
      meta
    })
  }

  editHandler = (record) => {
    browserHistory.push(`/console/market-brain-acts/new?id=${record.id}&_sv=${compressUrlQuery(`${record.model_id}|${record.scene_id}`)}`)
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
        belongs: 1
      }
    })
  }

  render() {
    return (
      <div className="height-100 overscroll-y">
        <Bread
          path={[
            {name: '活动管理中心'},
            {name: '活动管理'}
          ]}
        >
          {/* <Button
            onClick={() => {
              browserHistory.push('/console/market-brain-acts/new')
            }}
            type="primary"
            icon="plus"
          >新建活动</Button> */}
        </Bread>
        <div className="mg3">
          {this.renderFilterBox()}
          {this.renderTable()}
          {
            <Form layout="horizontal">
              {this.renderEffectSettings()}
            </Form>
          }
        </div>
      </div>
    )
  }
}
