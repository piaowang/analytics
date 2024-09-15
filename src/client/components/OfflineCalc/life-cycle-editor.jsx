import React from 'react'
import {DatePicker, Radio} from 'antd'
import _ from 'lodash'
import moment from 'moment'

export default class LifeCycleEditor extends React.Component {
  render() {
    let {value, onChange, ...rest} = this.props
    return (
      <React.Fragment>
        <Radio.Group
          onChange={e => {
            let {value} = e.target
            if (+value === 1) {
              onChange(null)
            } else {
              onChange([null, null])
            }
          }}
          value={_.isEmpty(value) ? '1' : '2'}
          disabled={rest.disabled}
        >
          <Radio value="1">长期有效</Radio>
          <Radio value="2">具体的时间段</Radio>
        </Radio.Group>
        {_.isEmpty(value) ? null : (
          <DatePicker.RangePicker
            allowClear
            format="YYYY-MM-DD"
            className="width250"
            value={value.map(o => {
              let m = _.isString(o) ? moment(o, 'YYYY-MM-DD') : o
              return m && m.isValid() ? m : null
            })}
            onChange={(dates, dateStrs) => onChange(dateStrs)}
            {...rest}
          />
        )}
        
      </React.Fragment>
    )
  }
}
