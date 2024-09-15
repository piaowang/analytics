import React from 'react'
import { Spin, Tooltip, Badge } from 'antd'
import _ from 'lodash'
import DateRangePicker from '../Common/time-picker'

export default class insightEvtCount extends React.Component {

  constructor (props) {
    super(props)
  }

  shouldComponentUpdate(nextProps) {
    return !_.isEqual(this.props, nextProps)
  }

  render () {
    let {
      eventDate,
      eventCountList,
      onChange,
      loading,
      relativeTime,
      since,
      until,
      onChangeDate,
      style
    } = this.props
    let countStyle = {
      background: '#aaa',
      color: '#fff',
      border: 'none'
    }
    let max = Math.max(...eventCountList.map(e => e.value)) || 1
    return (
      <div className="insight-event-dates" style={style}>
        <Spin spinning={loading}>
          <div className="pd2t pd2x insight-event-count-header relative bg-white">
            <div className="borderb pd2b">时间线/行为计数</div>
          </div>
          <div
            className="pd2y insight-event-count-header pd2x relative bg-white"
          >
            <DateRangePicker
              dateRange={[since, until]}
              dateType={relativeTime}
              onChange={onChangeDate}
              className="width-100 font13"
              showPop={this.props.showPop}
            />
          </div>
          {
            //            eventCountList.length
            //            ? <div className="insight-dates-line" />
            //            : null
          }
          <div className="insight-dates-list font12" style={{height: style.height - 118}}>
            {
              eventCountList.map((u, i) => {
                let { value = 0, data } = u
                let cls = eventDate.data === data
                  ? 'insight-date on'
                  : 'insight-date'
                let title = `${data} ${value} 个事件`
                let style = {
                  width: value ? ((value / max) * 39) + '%' : '1px'
                }
                return (
                  <Tooltip
                    title={title}
                    key={'insight-date' + i + data}
                    placement="right"
                  >
                    <div
                      className={cls}
                      onClick={() => onChange(u)}
                    >
                      <span
                        className="insight-date-content relative iblock width-100 elli"
                      >
                        <span className="insight-date-dot iblock"/>
                        <span className="insight-date-str iblock">{data}</span>
                        <span
                          className="insight-date-bg iblock"
                          style={style}
                        />
                        <span className="insight-date-count">
                          <Badge
                            showZero
                            count={value || 0}
                            overflowCount={10000000}
                            style={countStyle}
                          />
                        </span>
                      </span>
                    </div>
                  </Tooltip>
                )
              })
            }
          </div>
        </Spin>

      </div>
    )
  }
}
