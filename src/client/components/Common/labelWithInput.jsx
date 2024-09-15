import React from 'react'
import {Input} from 'antd'

export default class LabelWithInput extends React.Component {


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
          <Input 
            onChange={onChange}
            {...rest}
          />
        </div>
      </React.Fragment>
    )
  }
}

