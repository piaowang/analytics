import React from 'react'
import { ClockCircleOutlined } from '@ant-design/icons';
import { Tooltip, Button, Popover, Tag, Spin } from 'antd';
import _ from 'lodash'
import moment from 'moment'
import druidTypes from '../../../common/druid-column-type'

const colors = ['#1bb39c', '#6969d7']
const defaultFormat = 'YYYY-MM-DD HH:mm:ss'
const limitStep = 100

function sorter (prop) {
  return (a, b) => {
    return a[prop] > b[prop] ? 1 : -1
  }
}

export default class InsightEvts extends React.Component {

  state = {
    limit: 100
  }

  componentWillReceiveProps(nextProps) {
    if (
      nextProps.eventDate !== this.props.eventDate ||
      !_.isEqual(nextProps.query, this.props.query)
    ) {
      this.setState({
        limit: 100
      })
    }
  }

  shouldComponentUpdate(nextProps) {
    return !_.isEqual(this.props, nextProps)
  }

  renderEventItem = (event, index) => {
    let {
      datasource,
      dimensionTree,
      dimensions
    } = this.props
    let commonDimensions = _.get(datasource, 'params.commonDimensions', [])
    let titleDimension = _.get(datasource, 'params.titleDimension')
    let isSDK = _.get(datasource, 'params.isSDKProject')
    let prop = isSDK ? 'event_time' : '__time'
    let time = event[prop]
      ? moment(event[prop]).format('HH:mm:ss')
      : '无数据导入时间'
    let date = event[prop]
      ? moment(event[prop]).format(defaultFormat)
      : '无数据导入时间'

    if (titleDimension && !commonDimensions.includes(titleDimension)) {
      commonDimensions = [titleDimension, ...commonDimensions]
    }
    let title = commonDimensions.map((type, j) => {
      let text = event[type]
      let dimTitle = dimensionTree[type] || type
      return (
        <div
          key={j + '@' + type}
          className="mg1r"
        >
          <b>{dimTitle}</b>: {text}
        </div>
      )
    })
    let content = commonDimensions.map((type, j) => {
      let text = event[type]
      return (
        <span
          key={j + '@' + type}
          className="mg1r"
        >
          {text}
        </span>
      )
    })
    let eventText = (
      <Tooltip
        title={<div>{title}</div>}
        placement="topLeft"
      >
        <div className="insight-detail-content elli iblcok">
          {content}
        </div>
      </Tooltip>
    )
    let detail = (
      <div className="insight-detail">
        {
          Object.keys(event).sort().reverse().map((key, i) => {
            let name = key === '__time'
              ? '数据导入时间'
              : dimensionTree[key]
            let dim = _.find(dimensions, {name: key}) || {}
            let isDate = dim.type === druidTypes.Date || dim.type === druidTypes.DateString
            let v = isDate
              ? moment(event[key]).format(defaultFormat)
              : event[key]
            return (
              <div
                key={i + 'ins-det' + key}
                className="borderb pd1y pd2x wordbreak"
              >
                <b>{name}</b>:
                <span className="mg1l">{v}</span>
              </div>
            )
          })
        }
      </div>
    )
    let detailTitle = <b className="font14">{date}用户行为详情</b>
    return (
      <Popover
        title={detailTitle}
        content={detail}
        placement="left"
        trigger="click"
        key={'insight-event-item_' + index}
      >
        <div
          className="insight-event-item"
        >
          <Tooltip
            title={date}
            placement="topLeft"
          >
            <span className="insight-event-time iblock">
              <ClockCircleOutlined className="color-grey mg1r" />
              {time}
            </span>
          </Tooltip>
          {eventText}
          <span className="pointer insight-detail-btn iblock">详情</span>
        </div>
      </Popover>
    );
  }

  renderDayList = (tree) => {
    
    return Object.keys(tree).sort()
      .map((date, index) => {
        let day = tree[date]
        return (
          <div
            key={index + '_insight-day-events_' + date} 
            className="insight-day-events pd2t"
          >
            <div className="insight-day-title font14">
              {date}
            </div>
            <div className="insight-day-list pd2r font12">
              {
                Object.keys(day).map((sessionId, j) => {
                  let list = day[sessionId]
                  return (
                    <div
                      key={j + '__' + sessionId}
                      className="insight-session-unit relative"
                    >
                      <div className="insight-session-line" />
                      <div className="insight-session-content relative">
                        <div className="insight-session-start">
                          <Tag color={colors[0]}>访问开始</Tag>
                        </div>
                        {
                          list.map(this.renderEventItem)
                        }
                        <div className="insight-session-end mg1t">
                          <Tag color={colors[1]}>访问结束</Tag>
                        </div>
                      </div>
                    </div>
                  )
                })
              }
            </div>
          </div>
        )
      })
  }

  onClick = () => {
    let {limit} = this.state
    let limitNew = limit + limitStep
    this.setState({
      limit: limitNew
    }, () => {
      this.props.getEvents(limitNew)
    })
  }

  renderMoreBtn = () => {
    let {limit} = this.state
    let {eventList, loading} = this.props
    if (eventList.length < limit) {
      return null
    }
    return (
      <div className="aligncenter pd1y">
        <Button
          type="ghost"
          loading={loading}
          disabled={loading}
          onClick={this.onClick}
        >
        加载更多
        </Button>
      </div>
    )
  }

  render () {
    let {
      eventList,
      datasource,
      loading,
      dateNav,
      style,
      loadingEventCount
    } = this.props
    let isSDK = _.get(datasource, 'params.isSDKProject')
    let prop = isSDK ? 'event_time' : '__time'

    let dates = eventList.map(e => moment(e[prop]).format('YYYY-MM-DD'))
    dates = _.uniq(dates).sort()
    let len = dates.length

    let dateStr = len > 1
      ? `${dates[0]} ~ ${dates[len - 1]}`
      : dates[0]

    let header = (
      <div className="pd2x insight-event-header font14">
        <div className="borderb">
          <ClockCircleOutlined className="mg1r" />
          <b>{dateStr}</b> 行为记录
          {dateNav}
        </div>
      </div>
    )

    if (!eventList.length) {
      let emptyDom = (
        <div>
          {header}
          <div className="pd2y aligncenter">没有事件</div>
        </div>
      )
      return (
        <div className="insight-events" style={style}>
          {
            loading
              ? <div className="pd2y aligncenter">载入中...</div>
              : emptyDom
          }
        </div>
      )
    }

    let {commonSession} = datasource.params || {}

    let tree = _.groupBy(eventList, (event) => {
      return moment(event[prop]).format('YYYY-MM-DD')
    })

    for (let i in tree) {
      tree[i] = _.groupBy(tree[i].sort(sorter(prop)), commonSession)
    }

    return (
      <div className="insight-events" style={style}>
        {header}
        <div className="insight-event-list">
          <Spin spinning={loading || loadingEventCount}>
            {this.renderDayList(tree)}
            {this.renderMoreBtn()}
          </Spin>
        </div>
      </div>
    )
  }
}
