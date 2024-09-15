import React from 'react'
import { InputNumber, Select } from 'antd'

/**
 * 监控告警--设定告警目标--时间选择控件
 * @export
 * @class AlarmTimeInput
 * @extends {React.Component}
 */
export default class AlarmTimeInput extends React.Component {

  constructor(props) {
    super(props)
    const value = this.props.value || {}
    this.state = {
      time: value.time || 5,
      unit: value.unit || 'minutes'
    }
  }

  componentWillReceiveProps(nextProps) {
    // Should be a controlled component.
    if ('value' in nextProps) {
      const value = nextProps.value
      if (value)
        this.setState(value)
    }
  }

  handleItemChange = (k, v) => {
    let changedValue = {}
    changedValue[k] = v
    if (!('value' in this.props)) {
      this.setState(changedValue)
    }
    this.triggerChange(changedValue)
  }

  triggerChange = (changedValue) => {
    // Should provide an event to pass value to Form.
    const onChange = this.props.onChange
    if (onChange) {
      onChange(Object.assign({}, this.state, changedValue))
    }
  }

  render() {
    const { size } = this.props
    const state = this.state
    return (
      <span>
        <span className="mg2r">每隔</span>
        <InputNumber
          type="text"
          size={size}
          value={state.time}
          onChange={(v) => this.handleItemChange('time', v)}
          className="mg2r"
          style={{ width: '32%' }}
        />
        <Select
          value={state.unit}
          size={size}
          style={{ width: '90px' }}
          onChange={(v) => this.handleItemChange('unit', v)}
        >
          <Select.Option value="minutes">分钟</Select.Option>
          <Select.Option value="hours">小时</Select.Option>
        </Select>
      </span>
    )
  }
}
