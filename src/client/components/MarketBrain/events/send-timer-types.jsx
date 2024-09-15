import React, { Component } from 'react'
import { Tooltip, DatePicker, TimePicker } from 'antd'
import moment from 'moment'
import Icon from '~/components/common/sugo-icon'
import PropTypes from 'prop-types'
import { immutateUpdate } from 'common/sugo-utils'
import { MARKETING_EVENT_TIMER_TYPE } from 'common/constants'
import _ from 'lodash'
import { getMarketingEventCronExpression } from 'common/marketing'
import { getNextTriggerByCronParser } from 'client/common/cron-picker-kit'
import CronPicker from '../../Common/cron-picker'
 
export const defaultRealTimer = {
  start: '00:00',
  end: '23:59',
  value: 10,
  unit: 'minute', // hour,
  computeIntervalInfo: {
    cronExpression: '0 * * * *'
  }
}
 
export default class SendTimerTypes extends Component {
 
  static propTypes = {
    timerType: PropTypes.number,
    value: PropTypes.object,
    onChange: PropTypes.func
  }
 
  range = (start, end) => {
    const result = []
    for (let i = start; i < end; i++) {
      result.push(i)
    }
    return result
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
    const { value, onChange, disabled } = this.props
    const crons = getMarketingEventCronExpression(value, MARKETING_EVENT_TIMER_TYPE.TIMING)
    const nextTriggers = getNextTriggerByCronParser(crons[0].cron)
    return (
      <div className="pd2 bg-dark-white realtimer-item mg2b">
        <div className="mg1r inline alignright width65">执行时间:</div>
        <span>
          <DatePicker 
            disabled={disabled}
            onChange={v => onChange(
              immutateUpdate(value, 'timingDate', () => moment(v).format('YYYY-MM-DD'))
            )}
            allowClear={false}
            value={moment(value.timingDate, 'YYYY-MM-DD')}
            disabledDate={(current) => +moment(current) < +moment().startOf('d')}
          />
        </span>
        <span>
          <TimePicker
            disabled={disabled}
            disabledHours={() => {
              if (moment(value.timingDate).format('DD') === moment().format('DD')) { 
                return this.range(0, 24).splice(0,parseInt(moment().format('HH')))
              }
            }}
            disabledMinutes={(selectedHour) =>  {
              if (moment(value.timingDate).format('DD') === moment().format('DD')) {
                if (selectedHour === parseInt(moment().format('HH'))) {
                  return this.range(0,59).splice(0, parseInt(moment().format('mm')) + 1)
                }
              }
            }}
            onChange={v => onChange(
              immutateUpdate(value, 'timingTimer', () => moment(v).format('HH:mm'))
            )}
            value={moment(value.timingTimer, 'HH:mm')}
            format={'HH:mm'}
          />
        </span>
      </div>
    )
  }
 
  renderRealTimer = () => {
    const { value, onChange, disabled } = this.props
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
                {
                  idx === 0
                  ? (
                      <React.Fragment>
                        <div>
                          <div className="mg1r inline alignright width65">开始时间:</div>
                          <DatePicker
                            disabled={disabled}
                            onChange={v => onChange(
                              immutateUpdate(value, 'timingDate', () => moment(v).format('YYYY-MM-DD'))
                            )}
                            value={moment(value.timingDate, 'YYYY-MM-DD')}
                            disabledDate={(current) => +moment(current) < +moment().startOf('d')}
                          />
                          <span>
                            <TimePicker
                              disabledHours={() => {
                                if (moment(value.timingDate).format('DD') === moment().format('DD')) {
                                  return this.range(0, 24).splice(0, parseInt(moment().format('HH')))
                                }
                              }}
                              disabledMinutes={(selectedHour) => {
                                if (moment(value.timingDate).format('DD') === moment().format('DD')) {
                                  if (selectedHour === parseInt(moment().format('HH'))) {
                                    return this.range(0, 59).splice(0, parseInt(moment().format('mm')) + 1)
                                  }
                                }
                              }}
                              disabled={disabled}
                              onChange={v => onChange(
                                immutateUpdate(value, 'timingTimer', () => moment(v).format('HH:mm'))
                              )}
                              value={moment(value.timingTimer, 'HH:mm')}
                              format={'HH:mm'}
                            />
                          </span>
                        </div>
                        <div>
                          <div className="mg1r inline alignright width65">结束时间:</div>
                          <DatePicker
                            disabled={disabled}
                            onChange={v => onChange(
                              immutateUpdate(value, 'endTimingDate', () => moment(v).format('YYYY-MM-DD'))
                            )}
                            value={moment(_.get(value, 'endTimingDate', moment()), 'YYYY-MM-DD')}
                            disabledDate={(current) => +moment(current) < +moment().startOf('d')}
                          />
                          <span>
                            <TimePicker
                              disabledHours={() => {
                                if (moment(value.endTimingDate).format('DD') === moment().format('DD')) {
                                  return this.range(0, 24).splice(0, parseInt(moment().format('HH')))
                                }
                              }}
                              disabledMinutes={(selectedHour) => {
                                if (moment(value.endTimingDate).format('DD') === moment().format('DD')) {
                                  if (selectedHour === parseInt(moment().format('HH'))) {
                                    return this.range(0, 59).splice(0, parseInt(moment().format('mm')) + 1)
                                  }
                                }
                              }}
                              disabled={disabled}
                              onChange={v => onChange(
                                immutateUpdate(value, 'endTimingTimer', () => moment(v).format('HH:mm'))
                              )}
                              value={moment(_.get(value, 'endTimingTimer', moment()), 'HH:mm')}
                              format={'HH:mm'}
                            />
                          </span>
                        </div>
                      </React.Fragment>
                  )
                : null
                }
                <div>
                  <div className="mg1r inline alignright width65 market-brain-time-form-hook">执行规则:</div>
                  <CronPicker 
                    getPopupContainer={() => document.querySelector('.market-brain-time-form-hook')}
                    value={idx !== 0 ? item.computeIntervalInfo : value.computeIntervalInfo}
                    beginDate={value.timingDate + ' ' + value.timingTimer}
                    onChange={nextComputeIntervalInfo => {
                      if (idx === 0) {
                        return onChange(
                          immutateUpdate(value, 'computeIntervalInfo', () => nextComputeIntervalInfo)
                        )
                      }
                      onChange(
                        immutateUpdate(value, `realTimers[${idx}].computeIntervalInfo`, () => nextComputeIntervalInfo)
                      )
                    }}
                  />
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
 