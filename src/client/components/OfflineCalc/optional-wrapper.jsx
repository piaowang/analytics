import React from 'react'
import {Radio} from 'antd'
import _ from 'lodash'

export default class OptionalWrapper extends React.Component {
  render() {
    let {value, onChange, ctrlComponent: CtrlComponent, initialValue, disabled, ...rest} = this.props
    return (
      <React.Fragment>
        <Radio.Group
          onChange={e => {
            let {value} = e.target
            onChange(+value === 1 ? null : initialValue)
          }}
          value={_.isNil(value) ? '1' : '2'}
          disabled={disabled}
        >
          <Radio value="1">禁用</Radio>
          <Radio value="2">启用</Radio>
        </Radio.Group>
        {_.isNil(value) ? null : (
          <CtrlComponent
            value={value}
            onChange={onChange}
            disabled={disabled}
            {...rest}
          />
        )}
      
      </React.Fragment>
    )
  }
}
