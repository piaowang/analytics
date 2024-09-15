/**
 * @author WuQic
 * @email chao.memo@gmail.com
 * @create date 2019-03-21 15:27:48
 * @modify date 2019-03-21 15:27:48
 * @description 营销事件-营销时机事件选择组件
 */
import React, { Component } from 'react'
import { Tooltip, Select, InputNumber, TimePicker } from 'antd'
import moment from 'moment'
import Icon from '~/components/common/sugo-icon'
import PropTypes from 'prop-types'
import { immutateUpdate } from 'common/sugo-utils'
import { MARKETING_EVENT_TIMER_TYPE } from 'common/constants'
import _ from 'lodash'
import { getMarketingEventCronExpression } from 'common/marketing'
import { getNextTriggerByCronParser } from 'client/common/cron-picker-kit'

export const defaultRealTimer = {
  start: '00:00',
  end: '23:59',
  value: 10,
  unit: 'minute' // hour
}

export default class SendTimerTypes extends Component {

  static propTypes = {
    timerType: PropTypes.number,
    value: PropTypes.object,
    onChange: PropTypes.func
  }

  createRealTimerHandler = () => {
    const { value, onChange } = this.props
    onChange(
      immutateUpdate(value, ['realTimers', _.size(value.realTimers)], () => defaultRealTimer)
    )
  }

  removeRealTimerHandler = (item, idx) => {
    const { value, onChange } = this.props
    onChange(
      immutateUpdate(value, ['realTimers'], prev => prev.filter((r, idx0) => idx0 !== idx))
    )
  }

  renderTimingTimer = () => {
    const { value, onChange } = this.props
    const crons = getMarketingEventCronExpression(value, MARKETING_EVENT_TIMER_TYPE.TIMING)
    const nextTriggers = getNextTriggerByCronParser(crons[0].cron)
    return (
      <div className="pd2 bg-dark-white realtimer-item mg2b">
        <div className="mg1r inline alignright width65">发送时间:</div>
        <span>
          <TimePicker
            onChange={v => onChange(
              immutateUpdate(value, 'timingTimer', () => moment(v).format('HH:mm'))
            )}
            value={moment(value.timingTimer, 'HH:mm')}
            format={'HH:mm'}
          />
        </span>
        <div className="mg2l">
          <div className="color-grey line-height20 bold">接下来3次触发时间：</div>
          {
            nextTriggers.map((p, i) => <div key={`next_time${i}`} className="line-height20">{p}</div>)
          }
        </div>
      </div>
    )
  }

  renderRealTimer = () => {
    const { value, onChange } = this.props
    const crons = getMarketingEventCronExpression(value, MARKETING_EVENT_TIMER_TYPE.REALTIME)
    return  (
      <div className="width450">
        {
          value.realTimers.map((item, idx) => {
            const nextTriggers = getNextTriggerByCronParser(crons[idx].cron, {
              currentDate: moment(item.start, 'HH:mm').toDate(),
              endDate: moment(item.end, 'HH:mm').toDate()
            })
            return (
              <div key={`realtimer-item-${idx}`} className="pd2 relative realtimer-item bg-dark-white">
                <div>
                  <div className="mg1r inline alignright width65">营销时间段:</div>
                  <TimePicker
                    className="mg1r"
                    value={moment(item.start, 'HH:mm')}
                    format={'HH:mm'}
                    onChange={v => onChange(
                      immutateUpdate(value, ['realTimers', idx, 'start'], () => moment(v).format('HH:mm'))
                    )}
                  />
                  <span className="mg2x">~</span>
                  <TimePicker
                    className="mg2r"
                    value={moment(item.end, 'HH:mm')}
                    format={'HH:mm'}
                    onChange={v => onChange(
                      immutateUpdate(value, ['realTimers', idx, 'end'], () => moment(v).format('HH:mm'))
                    )}
                  />
                  <Tooltip placement="rightTop" title={(
                    <div>
                      <p>1. 时间段的数据不能跨天；</p>
                      <p>2. 时间段以外的数据，不发送；若要发送，请创建一个定时发送的事件作为补充</p>
                    </div>
                  )}
                  >
                    <Icon type="question-circle" className="font14" />
                  </Tooltip>
                </div>
                <div>
                  <div className="mg1r inline alignright width65">每隔:</div>
                  <span className="mg1r">
                    {item.unit === 'minute' ? (
                      <Select
                        className="width80"
                        value={item.value}
                        onChange={v => onChange(
                          immutateUpdate(value, ['realTimers', idx, 'value'], () => v)
                        )}
                      >
                        <Select.Option value={10}>10</Select.Option>
                        <Select.Option value={15}>15</Select.Option>
                        <Select.Option value={20}>20</Select.Option>
                        <Select.Option value={30}>30</Select.Option>
                      </Select>
                    ) : (
                      <InputNumber
                        min={1}
                        max={24}
                        value={item.value}
                        onChange={v => onChange(
                          immutateUpdate(value, ['realTimers', idx, 'value'], () => Math.max(1, v))
                        )}
                      />
                    )}
                  </span>
                  <span>
                    <Select
                      value={item.unit}
                      className="mg1r width80"
                      onChange={v => onChange(
                        immutateUpdate(value, ['realTimers', idx], (item) => {
                          return {
                            ...item,
                            unit: v,
                            value: v === 'minute' ? 10 : 1
                          }
                        })
                      )}
                    >
                      <Select.Option value="minute">分钟</Select.Option>
                      <Select.Option value="hour">小时</Select.Option>
                    </Select>
                  </span>
                  <span>运行一次该营销事件</span>
                </div>
                {
                  idx === 0 ? null : (
                    <Tooltip title="删除营销时段">
                      <div onClick={() => this.removeRealTimerHandler(item, idx)} className="absolute font18 pointer" style={{top: 35, right: -25}}>
                        <Icon type="minus-circle-o" />
                      </div>
                    </Tooltip>
                  )
                }
                <div className="mg2l">
                  <div className="color-grey line-height20 bold">接下来3次触发时间：</div>
                  {
                    nextTriggers.map((p, i) => <div key={`next_time${i}`} className="line-height20">{p}</div>)
                  }
                </div>
              </div>
            )
          })
        }
        <div className="mg1">
          <span
            className="pointer pd1y"
            onClick={this.createRealTimerHandler}
            title="增加一个营销时段"
          >
            <Icon className="mg1r font14" type="plus-circle-o" />
              增加一个营销时段
          </span>
        </div>
      </div>
    )
  }

  render() {
    const { timerType = 0 } = this.props
    return timerType === 0 ? this.renderTimingTimer() : this.renderRealTimer()
  }
}
