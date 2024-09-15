import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Divider, Select, Radio } from 'antd';
import _ from 'lodash'
import CronPicker from '../Common/cron-picker'
import moment from 'moment'
import { immutateUpdates } from '~/src/common/sugo-utils'

const FormItem = Form.Item
const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 18 }
}

class ModelCalcParams extends Component {

  state = {
  }

  onChange = (e) => {
    const value = e.target.value
    const { content, changeState } = this.props
    changeState({ content: immutateUpdates(content, 'timers.autoCalc', () => value, 'timers.cronInfo', () => { }) })
  }

  render() {
    const { content, changeState } = this.props
    const taskStartTime = _.get(content, 'timers.taskStartTime')
    return (
      <div >
        <Divider orientation="left">模型计算</Divider>
        <div style={{ paddingLeft: 20 }}>
          <FormItem label="计算时间" className="mg1b" key="calc_time" hasFeedback {...formItemLayout}>
            <Radio.Group onChange={this.onChange} value={_.get(content, 'timers.autoCalc', 0)}>
              <Radio value={0}>手动计算</Radio>
              <Radio value={1}>自动计算</Radio>
            </Radio.Group>
          </FormItem>
          {
            _.get(content, 'timers.autoCalc', 0) === 1
              ? <div style={{ marginLeft: '20%' }}>
                <CronPicker
                  value={_.get(content, 'timers.cronInfo', {})}
                  beginDate={moment(taskStartTime)}
                  currentDate={taskStartTime}
                  onChange={v => {
                    changeState({ content: immutateUpdates(content, 'timers.cronInfo', () => v) })
                  }}
                  blockBeginTimeWarp
                  showStartTime={false}
                />
              </div>
              : null
          }
          <FormItem label="行为时间" className="mg1b" key="action_time" hasFeedback {...formItemLayout}>
            <Radio.Group onChange={this.onChange} value={1}>
              <Radio value={1}>计算后替换原有分群</Radio>
            </Radio.Group>
          </FormItem>
        </div >
      </div>
    )
  }
}

ModelCalcParams.propTypes = {

}

export default ModelCalcParams
