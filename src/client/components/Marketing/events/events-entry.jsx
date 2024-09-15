/**
 * @author WuQic
 * @email chao.memo@gmail.com
 * @create date 2019-03-22 14:47:09
 * @modify date 2019-03-22 14:47:09
 * @description 智能营销-营销事件列表
 */
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
import { getMarketingEventCronExpression } from 'common/marketing'
import { getNextTriggerByCronParser } from 'client/common/cron-picker-kit'
import { MARKETING_EVENT_TIMER_TYPE } from 'common/constants'
import _ from 'lodash'

@connect(({ marketingEvents, loading }) => ({
  ...marketingEvents,
  loading: loading.models.marketingEvents
}))
@Form.create()
@validateFieldsAndScroll
export default class EventEntry extends PureComponent {

  state = {
    formValues: {},
    visible: false,
    editRecord: {}
  }

  columns = [
    {
      title: '事件ID',
      dataIndex: 'id',
      key: 'id'
    },
    {
      title: '所属模型',
      dataIndex: 'MarketingModel.modelName',
      key: 'MarketingModel.modelName',
      render: (v, record) => _.get(record, 'MarketingModel.modelName', '--')
    },
    {
      title: '所属模型场景',
      dataIndex: 'MarketingScene.sceneName',
      key: 'MarketingScene.sceneName',
      render: (v, record) => _.get(record, 'MarketingScene.sceneName', '--')
    },
    {
      title: '事件名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '渠道',
      dataIndex: 'send_channel',
      key: 'send_channel',
      render: v => v === 0 ? 'push' : '短信'
    },
    {
      title: '是否开启',
      dataIndex: 'status',
      key: 'status',
      render: v => v === 0 ? '关闭' : '开启'
    },
    {
      title: '发送时机',
      dataIndex: 'timer_type',
      key: 'timer_type',
      render: v => v === 0 ? '定时' : '实时'
    },
    {
      title: '发送时间',
      dataIndex: 'timer',
      key: 'timer',
      render: (value, record) => {
        const { timingTimer, realTimers } = value
        const isTiming = record.timer_type === MARKETING_EVENT_TIMER_TYPE.TIMING
        let contentRender
        const crons = getMarketingEventCronExpression(value, record.timer_type)
        if (isTiming) {
          const nextTriggers = getNextTriggerByCronParser(crons[0].cron)
          const title = (
            <div>
              <p className="color-grey line-height20 bold">接下来3次触发时间：</p>
              {nextTriggers.map((p, i) => <div key={`next_time${i}`} className="line-height20">{p}</div>)}
            </div>
          )
          contentRender = (
            <Tooltip title={title} placement="rightTop">
              {moment(timingTimer, 'HH:mm').format('HH:mm')}
              <InfoCircleOutlined className="mg1l" />
            </Tooltip>
          )
        } else {
          const nextTriggers = realTimers.map((item, idx) => {
            const triggers = getNextTriggerByCronParser(crons[idx].cron, {
              currentDate: moment(item.start, 'HH:mm').toDate(),
              endDate: moment(item.end, 'HH:mm').toDate()
            })
            return (
              <div className="pd1y" key={`next-trigger-timer-${idx}`}>
                <div>时间段：{moment(item.start, 'HH:mm').format('HH:mm')}-{moment(item.end, 'HH:mm').format('HH:mm')} 每隔{item.value}{item.unit === 'minute' ? '分' : '小时'}</div>
                {triggers.map((p, i) => <div key={`next_time${i}`} className="line-height20">{p}</div>)}
              </div>
            )
          })
          const title = (
            <div>
              <p className="color-grey line-height20 bold">接下来3次触发时间：</p>
              {nextTriggers}
            </div>
          )
          contentRender = (
            <Tooltip title={title} placement="rightTop">
              <span className="elli mw200 inline">
                {realTimers.map(({start, end}) => (`${moment(start, 'HH:mm').format('HH:mm')}-${moment(end, 'HH:mm').format('HH:mm')}`)).join(',')}
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
          <a className="mg1r pointer" onClick={() => this.effectHandler(record, true)}>效果设置</a>
          <Divider type="vertical" />
          <a onClick={() => {
            if (!record.project_id) return Modal.warn({ title: '提示', content: '该事件的效果指标尚未关联项目'})
            browserHistory.push(`/console/marketing-events/result?id=${record.id}`)
          }}
          >查看效果</a>
          <Divider type="vertical" />
          <Popconfirm title="确定要删除该事件吗" onConfirm={() => this.deleteHandler(record)}>
            <a className="mg1r pointer">删除</a>
          </Popconfirm>
        </React.Fragment>
      )
    }
  ]

  renderFilterBox() {
    const { treeLevels = [], form: { getFieldDecorator } } = this.props
    return (
      <div className="width-100 mg2">
        <Form onSubmit={this.searchHandler} layout="inline">
          <Row gutter={{ md: 8, lg: 24, xl: 48 }}>
            <Col md={8} sm={24}>
              <Form.Item label="模型&场景" className="iflex">
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
                              model.MarketingScenes.map(scene => (
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
              <Form.Item label="事件名称"  className="iflex">
                {getFieldDecorator('name')( <Input className="width200" placeholder="请输入事件名称" /> )}
              </Form.Item>
            </Col>
            <Col md={8} sm={24}>
              <Form.Item label="发送渠道"  className="iflex">
                {getFieldDecorator('send_channel')(
                  <Select
                    allowClear
                    placeholder="请选择渠道"
                    className="width200"
                  >
                    <Select.Option value={0}>push</Select.Option>
                    <Select.Option value={1}>短信</Select.Option>
                  </Select>
                )}
              </Form.Item>
            </Col>
          </Row>
          <Row className="mg2t">
            <Col md={8} sm={24}>
              <Form.Item label="使用状态"  className="iflex">
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
            <Col md={8} sm={24}>
              <Form.Item className="width350 iflex" label="创建时间">
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
            <Col><Button type="primary" icon={<SearchOutlined />} className="mg3l" onClick={this.searchHandler}>搜索</Button></Col>
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
      type: 'marketingEvents/saveEffect',
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
      type: 'marketingEvents/change',
      payload
    })
  }

  paginationHandler = (page, pageSize) => {
    this.props.dispatch({
      type: 'marketingEvents/fetch',
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
      type: 'marketingEvents/fetch',
      payload: {
        page,
        pageSize,
        model_id,
        scene_id,
        ...formValues,
        created_range: _.isEmpty(formValues.created_range) ? undefined : formValues.created_range.map(v => moment(v).format('YYYY-MM-DD'))
      },
      meta
    })
  }

  editHandler = (record) => {
    browserHistory.push(`/console/marketing-events/new?id=${record.id}&_sv=${compressUrlQuery(`${record.model_id}|${record.scene_id}`)}`)
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
      type: 'marketingEvents/remove',
      payload: record.id
    })
  }

  render() {
    return (
      <div>
        <Bread
          path={[
            {name: '自动化营销中心'},
            {name: '事件管理'}
          ]}
        >
          <Button
            onClick={() => {
              browserHistory.push('/console/marketing-events/new')
            }}
            type="primary"
            icon={<PlusOutlined />}
          >新建事件</Button>
        </Bread>
        <div className="mg3">
          {this.renderFilterBox()}
          {this.renderTable()}
          {this.renderEffectSettings()}
        </div>
      </div>
    );
  }
}
