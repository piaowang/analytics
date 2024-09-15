import React from 'react'
import { Input } from 'antd'

/**
 * 编辑告警接口-自定义方法参数组件(key: value)
 * @export
 * @class InterfaceParamsInput
 * @extends {React.Component}
 */
export default class InterfaceParamsInput extends React.Component {

  constructor(props) {
    super(props)
    const value = this.props.value || {}
    this.state = {
      key: value.key || '',
      val: value.val || ''
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
    if (typeof v === 'object') {
      v = v.target.value
    }
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
    const { size, index, disabled } = this.props
    const { key, val } = this.state
    return (
      <span ref={`marketBrain-form-jpush-extra-params-${index}`}>
        <Input
          type="text"
          size={size}
          value={key}
          onChange={(v) => this.handleItemChange('key', v)}
          className="mg1r"
          placeholder="参数名称(key)"
          style={{ width: '40%' }}
          disabled={disabled}
        />
        <span>:</span>
        <Input
          type="text"
          size={size}
          value={val}
          placeholder="参数值(value)"
          onChange={(v) => this.handleItemChange('val', v)}
          className="mg2l mg2r"
          style={{ width: '40%' }}
          disabled={disabled}
        />
      </span>
    )
  }
}
