import React, { Component } from 'react'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Select, DatePicker, Switch } from 'antd'
import CronPicker from '../../../Common/cron-picker'
import _ from 'lodash'
import moment from 'moment'

const FormItem = Form.Item
const formItemLayout = {
  labelCol: { span: 5 },
  wrapperCol: { span: 18 }
}

export default class SetScheduleExecute extends Component {
  changeState = payload => {
    this.props.changeState(payload)
  }

  render() {
    let { cronInfo, disabled } = this.props
    const taskStartTime = cronInfo.taskStartTime ? moment(cronInfo.taskStartTime) : moment()
    const taskEndTime = cronInfo.taskEndTime ? moment(cronInfo.taskEndTime) : moment().add(10, 'y')
    return (
      <Form style={{ height: '350px' }}>
        <FormItem label='任务不依赖上一周期调度' className='mg1b' hasFeedback {...formItemLayout}>
          <Switch disabled={disabled} checked={cronInfo.concurrentOption || false} onChange={val => this.changeState({ cronInfo: { ...cronInfo, concurrentOption: val } })} />
        </FormItem>
        <FormItem label='开始时间' className='mg1b' {...formItemLayout}>
          <DatePicker
            disabled={disabled}
            showTime
            defaultValue={taskStartTime}
            format='YYYY-MM-DD HH:mm'
            onOk={v => {
              this.changeState({ cronInfo: { ...cronInfo, taskStartTime: v } })
            }}
          />
        </FormItem>
        <FormItem label='结束时间' className='mg1b' {...formItemLayout}>
          <DatePicker
            disabled={disabled}
            showTime
            defaultValue={taskEndTime}
            format='YYYY-MM-DD HH:mm'
            onOk={v => {
              this.changeState({ cronInfo: { ...cronInfo, taskEndTime: v } })
            }}
          />
        </FormItem>
        <FormItem label='调度规则' className='mg1b' {...formItemLayout}>
          <CronPicker
            disabled={disabled}
            value={cronInfo}
            beginDate={moment(taskStartTime)}
            currentDate={taskStartTime}
            onChange={v => {
              this.changeState({ cronInfo: v })
            }}
            blockBeginTimeWarp
            showStartTime={false}
          />
        </FormItem>
      </Form>
    )
  }
}
