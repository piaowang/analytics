import React from 'react'
import {DatePicker} from 'antd'

export default class LabelWithDatePicker extends React.Component {


  render() {
    let {onChange, label, className, labelBoxStyle = {}, labelClassName, inputBoxStyle = {}, ...rest} = this.props
    return (
      <React.Fragment>
        <div 
          style={{
            display: 'inline-block',
            verticalAlign: 'middle',
            ...labelBoxStyle
          }}
          className={labelClassName}
        >
          {label}
        </div>
        <div
          style={{
            display: 'inline-block',
            verticalAlign: 'middle',
            ...inputBoxStyle
          }}
          className={className}
        >
          <DatePicker.RangePicker
            format="YYYY-MM-DD"
            onChange={onChange}
            {...rest}
          />
        </div>
      </React.Fragment>
    )
  }
}

