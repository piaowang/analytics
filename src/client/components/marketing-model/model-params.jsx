import React, { Component } from 'react'
import { MinusCircleOutlined, PlusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import {
  Divider,
  Select,
  Tabs,
  Row,
  Col,
  InputNumber,
  Input,
  message,
  DatePicker,
  Tooltip
} from 'antd'
import _ from 'lodash'
import { immutateUpdate, immutateUpdates } from '~/src/common/sugo-utils'
import { rfmItems, lifeCycleItems, userValueItems } from './constants'
import moment from 'moment'

const { RangePicker } = DatePicker
const FormItem = Form.Item
const { TabPane } = Tabs
const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 18 }
}
export const ParamsType = { Base: 'Base', Custom: 'Custom' }


class ModelParams extends Component {

  // eslint-disable-next-line react/display-name
  renderRfmParams = () => {
    const { content, changeState } = this.props
    const { getFieldDecorator } = this.props.form
    const startTime = _.get(content, 'params.historyStart') ? moment(_.get(content, 'params.historyStart')) : moment().add(-1, 'y')
    return (
      <div>
        <FormItem
          label={<span>
            时间范围
            <Tooltip title="指用于计算业绩贡献所选取数据的时间范围">
              <QuestionCircleOutlined />
            </Tooltip>
          </span>}
          className="mg1b"
          key="diemns_time"
          hasFeedback
          {...formItemLayout}
        >
          {getFieldDecorator('params.time_filter', {
            rules: [{
              required: true, message: '时间范围必填!'
            }],
            initialValue: [startTime, moment(_.get(content, 'params.historyEnd'))]
          })(
            <RangePicker className="width250" />
          )}
        </FormItem>
        <Tabs
          onChange={(v) => {
            changeState({
              content: immutateUpdate(content,
                'params',
                () => {
                  return { type: v, ...(v === ParamsType.Base ? { R: 2, F: 2, M: 2 } : { R: [[0], [0]], F: [[0], [0]], M: [[0], [0]] }) }
                }
              )
            })
          }}
          defaultActiveKey={_.get(content, 'params.type', ParamsType.Base)}
        >
          <TabPane tab="基础设置" key={ParamsType.Base}>
            {this.generateParamsBaseConfigure()}
          </TabPane>
          <TabPane tab="自定义设置" key={ParamsType.Custom}>
            {this.generateParamsCustomConfigure()}
          </TabPane>
        </Tabs>
      </div>
    )
  }

  // eslint-disable-next-line react/display-name
  renderLifeCycleParams = () => {
    const { content, changeState } = this.props
    const { getFieldDecorator } = this.props.form
    const interval = _.get(content, 'params.interval', 30)
    const startTime = _.get(content, 'params.historyStart') ? moment(_.get(content, 'params.historyStart')) : moment().add(-1, 'y')
    return (
      <div>
        <FormItem
          label={<span>
            消费间隔
            <Tooltip title="用于划分用户生命周期，最高可以设置90天">
              <QuestionCircleOutlined />
            </Tooltip>
          </span>}
          className="mg1b"
          key="diemns_time"
          hasFeedback
          {...formItemLayout}
        >
          {getFieldDecorator('params.interval', {
            rules: [{
              required: true, message: '消费间隔必填!'
            }],
            initialValue: interval
          })(
            <InputNumber className="width180" max={90} min={1} />
          )}
        </FormItem>
        <FormItem
          label={<span>
            时间范围
            <Tooltip title="指用于计算业绩贡献所选取数据的时间范围">
              <QuestionCircleOutlined />
            </Tooltip>
          </span>}
          className="mg1b"
          key="diemns_time"
          hasFeedback
          {...formItemLayout}
        >
          {getFieldDecorator('params.time_filter', {
            rules: [{
              required: true, message: '时间范围必填!'
            }],
            initialValue: [startTime, moment(_.get(content, 'params.historyEnd'))]
          })(
            <RangePicker className="width250" />
          )}
        </FormItem>
        <div>
          {
            lifeCycleItems.map((p, i) => {
              const val = _.get(content, `params.stage${i + 1}`, p.name)
              return (<div key={`stage_${i}`} className="mg1b" >
                <Row>
                  <Col span={4} className="color-main alignright" style={{ lineHeight: '32px', marginRight: '8px' }}>阶段{i + 1}:</Col>
                  <Col span={18}>
                    <Input
                      className="width100"
                      defaultValue={val}
                      onChange={e => changeState({ content: immutateUpdate(content, `params.stages.${i}`, () => e.target.value) })}
                    />
                    <span className="pd3l">说明: {p.memo}</span>
                  </Col>
                </Row>
              </div>)
            })
          }
        </div>
      </div>
    )
  }

  // eslint-disable-next-line react/display-name
  renderUserValueParams = () => {
    const { content, changeState } = this.props
    const { getFieldDecorator } = this.props.form
    const startTime = _.get(content, 'params.historyStart') ? moment(_.get(content, 'params.historyStart')) : moment().add(-1, 'y')
    return (
      <div>
        <FormItem
          label={<span>
              时间范围
            <Tooltip title="指用于计算业绩贡献所选取数据的时间范围">
              <QuestionCircleOutlined />
            </Tooltip>
          </span>}
          className="mg1b"
          key="diemns_time"
          hasFeedback
          {...formItemLayout}
        >
          {getFieldDecorator('params.time_filter', {
            rules: [{
              required: true, message: '时间范围必填!'
            }],
            initialValue: [startTime, moment(_.get(content, 'params.historyEnd'))]
          })(
            <RangePicker className="width250" />
          )}
        </FormItem>
        <Tabs>
          <TabPane tab="ABC分层设置" key={ParamsType.Base}>
            {
              userValueItems.map((p, i) => {
                const val = _.toNumber(_.get(content, `params.tier.${i}`, p.value)) * 100
                return (
                  <Row key={`stage_${i}`} className="mg2b">
                    <Col span={4} className="alignright" style={{ lineHeight: '32px', fontWeight: 600 }} >{p.title}:</Col>
                    <Col span={18}>
                      <Input
                        className="mg1l mg1r width150"
                        defaultValue={val}
                        onChange={e => changeState({
                          content: immutateUpdate(
                            content,
                            `params.tier.${i}`,
                            () => {
                              return {
                                id: i + 1,
                                name: `Tier${p.name}`,
                                percent: (_.toNumber(e.target.value) / 100)
                              }
                            })
                        })}
                      />%</Col>
                  </Row>
                )
              })
            }
            <Row>
              <Col span={4} className="alignright">总计:</Col>
              <Col span={18} className="pd1l">{_.sumBy(userValueItems, (p) => _.toNumber(_.get(content, `params.${p.name}`, p.value))) * 100}%</Col>
            </Row>
          </TabPane>
        </Tabs>
      </div>
    )
  }

  generateParamsBaseConfigure() {
    const { content, changeState } = this.props
    const { type = ParamsType.Base, ...value } = _.get(content, 'params', {})

    const RFMValues = [2, 3, 4]

    return (
      <div className="pd2t">
        <Row>
          <Col span={12} />
          <Col span={12}>
            <div className="height30" style={{ paddingLeft: 16 }}>智能划分块数</div>
          </Col>
        </Row>
        {rfmItems.map(r => {
          return (
            <div className="pd1b" key={r.key}>
              <Row key={r.key} gutter={16}>
                <Col span={12} className="alignright">
                  {`${r.title}(${r.key})：`}
                </Col>
                <Col span={12}>
                  <Select
                    value={_.get(value, r.key, '2').toString() || 2}
                    className="width120"
                    placeholder="请选择划分块数"
                    onChange={v => {
                      changeState({
                        content: immutateUpdate(content, `params.${r.key}`, () => parseInt(v))
                      })
                    }}
                  >
                    {RFMValues.map((v, i) => {
                      v = v.toString()
                      return (
                        <Select.Option value={v} key={i}>{v}</Select.Option>
                      )
                    })}
                  </Select>
                </Col>
              </Row>
            </div>
          )
        })}
      </div>
    )
  }

  removeCustomParam = (name, index) => {
    const { changeState, content } = this.props
    const newContent = immutateUpdate(content, `params.${name}`, val => _.filter(val, (p, i) => i !== index))
    changeState({ content: newContent })
  }

  addCustomParam = (name) => {
    const { changeState, content } = this.props

    const prev = _.get(content, `params.${name}`, [])

    if (prev.length >= 4) {
      return message.warn('最多只能创建四个分位条件')
    }

    const last = prev.slice(-1)[0]
    const next = prev.slice()
    next.push(last.slice())

    changeState({ content: immutateUpdate(content, `params.${name}`, () => next) })
  }

  generateParamsCustomConfigure() {
    const { content, changeState } = this.props
    const { type, ...value } = _.get(content, 'params', {})
    if (type !== ParamsType.Custom) return null

    const items = [
      { title: '最近一次消费', key: 'R', unit: '天' },
      { title: '消费频率', key: 'F', unit: '次' },
      { title: '累计消费金额', key: 'M', unit: '元' }
    ]

    const span = ~~(24 / items.length)

    return (
      <Row gutter={16}>
        {items.map((r, i) => {
          let p = value[r.key] || []
          let l = p.length - 1
          return (
            <Col span={span} key={i}>
              <div className="pd1 aligncenter">{`${r.title}(${r.key})：`}</div>
              {p.map((v, j) => {
                return (
                  <Row gutter={16} key={j}>
                    <Col span={20}>
                      <div className="pd1y alignright">
                        {
                          j < l
                            ? (
                              <span>
                                <InputNumber
                                  disabled
                                  className="width60"
                                  size="small"
                                  value={j === 0 ? 0 : p[j - 1][0]}
                                />
                                <span className="pd1x">~</span>
                              </span>
                            )
                            : (<span className="pd1x">超过</span>)
                        }
                        <InputNumber
                          disabled={j === l}
                          onChange={
                            // TODO 调整
                            (val) => {
                              let newContent = {}
                              if (j === (l - 1)) {
                                newContent = immutateUpdates(
                                  content,
                                  `params.${r.key}.${j}.0`,
                                  () => parseInt(val),
                                  `params.${r.key}.${j + 1}.0`,
                                  () => parseInt(val)
                                )
                              } else {
                                newContent = immutateUpdate(content, `params.${r.key}.${j}.0`, () => parseInt(val))
                              }
                              changeState({ content: newContent })
                            }
                          }
                          min={0}
                          size="small"
                          className="width60"
                          value={v[0]}
                        />
                        <span className="pd1x">{r.unit}</span>
                      </div>
                    </Col>
                    <Col span={4}>
                      <div className="pd1y alignleft">
                        {j === 0
                          ? (
                            <PlusCircleOutlined onClick={() => this.addCustomParam(r.key)} className="pointer" />
                          )
                          : null
                        }
                        {j > 0 && j < l
                          ? (
                            <MinusCircleOutlined onClick={() => this.removeCustomParam(r.key, j)} className="pointer" />
                          )
                          : null
                        }
                      </div>
                    </Col>
                  </Row>
                )
              })}
            </Col>
          )
        })}
      </Row>
    )
  }

  render() {
    const { content } = this.props
    let paramsPanel = null
    if (content.type === 0) {
      paramsPanel = this.renderRfmParams()
    } else if (content.type === 1) {
      paramsPanel = this.renderLifeCycleParams()
    } else {
      paramsPanel = this.renderUserValueParams()
    }
    return (
      <div>
        <Divider orientation="left">模型参数</Divider>
        <div style={{ paddingLeft: 20 }}>
          {paramsPanel}
        </div>
      </div>
    )
  }
}

ModelParams.propTypes = {

}

export default ModelParams
