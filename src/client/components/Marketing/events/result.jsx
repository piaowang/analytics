import React, { Component } from 'react'
import Bread from '../../Common/bread'
import LineChart from './line-chart'
import { DownOutlined } from '@ant-design/icons'
import { Select, Row, Col, Table, message, DatePicker, Tooltip } from 'antd'
import { SENDCHANNEL } from '../active/store/constants'
import { MARKETING_SEND_CHANNEL } from 'common/constants'
import { connect } from 'react-redux'
import moment from 'moment'

const Option = Select.Option

@connect(state => ({ ...state['sagaCommon'], ...state['marketingEventResult'] }))
class MarketingActiveResult extends Component {

  componentWillUnmount() {
    this.changeProps({resGroup: [], eventInfo: {}, lastRes: {}, selectedMetric: ['target_total', 'revisit_total'], initDate: []})
  }

  changeProps(payload) {
    this.props.dispatch({type: 'marketingEventResult/change', payload})
  }

  easyDispatch(func, payload) {
    this.props.dispatch({type: `marketingEventResult/${func}`, payload})
  }

  executeTimeCreater(eventInfo) {
    const { timer_type, timer } = eventInfo
    let executeTimeGroup = []
    switch(timer_type) {
      case 0: 
        const timingTimer = _.get(timer, 'timingTimer')     
        executeTimeGroup.push(timingTimer)
        break
      case 1:
        const realTimers = _.get(timer, 'realTimers', [])
        executeTimeGroup = realTimers.map( i => i.start + '-' + i.end)
        break
    }
    return executeTimeGroup
  }

  renderTable() {
    let { lastRes = {}, eventInfo = {} } = this.props
    let executeTimeGroup = this.executeTimeCreater(eventInfo)
    const { send_target_total = '--', send_open_total = '--', contrast_target_total = '--', send_revisit_total = '--', contrast_revisit_total = '--', updated_at, send_time } = lastRes
    const { name: eventName = '---', userGroupName, send_channel, copywriting  } = eventInfo
    let row1 = ['--', '--', ,'--', '--', '--'], row2 = ['--', '--', '--', '--', '--']
    if (!_.isEmpty(lastRes)) {
      row1 = [send_target_total, send_revisit_total, send_target_total === 0 ? 0 : (send_revisit_total / send_target_total * 100).toFixed(2) + '%', send_open_total, send_target_total === 0 ? 0 :(send_open_total / send_target_total * 100).toFixed(2) + '%']
      row2 = [contrast_target_total, contrast_revisit_total, contrast_target_total === 0 ? 0 :(contrast_revisit_total / contrast_target_total * 100).toFixed(2) + '%', '--', '--']
    }
    if (send_channel === MARKETING_SEND_CHANNEL.SMS) {
      if (_.isEmpty(_.get(copywriting,'url', ''))) {
        row1 = [send_target_total, send_revisit_total, send_target_total === 0 || '--' ? '--' : (send_revisit_total / send_target_total * 100).toFixed(2) + '%', '---', '---']
      }
    }
    const resultData = [
      {
        style: {backgroundColor: '#E7E8EC', color: '#3A404E', height:'66px',lineHeight: '66px', fontWeight: '600'},
        arr: ['','目标用户数','回访用户数','回访率','打开用户数','打开率']
      },
      {
        style: {height:'66px',lineHeight: '66px',color: '#FAC303', fontSize: '26px', borderBottom: '1px solid #e4e4e4'},
        arr: ['发送组'].concat(row1)
      },
      {
        style: {height:'66px',lineHeight: '66px',color: '#03D0D1', fontSize: '26px'},
        arr: ['对比组'].concat(row2)
      }
    ]
    return (
      <div className="bg-white pd3b">
        <div className="pd2y mg3l fw400" style={{display: 'flex','justifyContent': 'flex-start', color: '#1A1A1A'}}>
          <div className="mg3l">事件名称: {eventName}</div>
          <div className="mg3l">事件人群: {userGroupName}</div>
          <div className="mg3l">发送渠道: {_.get(SENDCHANNEL, `${send_channel}`, '---')}</div>
        </div>
        <div className="width-90 mg-auto border">
          <div style={{backgroundColor: '#EFEFEF',height: '60px', lineHeight: '60px', color: '#1A1A1A'}}>
            <div className="fleft mg2l">发送时间: {send_time ? moment(send_time).format('YYYY-MM-DD') : '----'}</div>
            <Tooltip placement="bottom" title={
              <div>
                  发送时间:
                {executeTimeGroup.map(i => (
                  <div key={i}>{i}</div>
                ))}
              </div>
            }
            >
              <div className="fleft mg1l" style={{height: '32px'}}><DownOutlined /></div>
            </Tooltip>
            <div className="fleft mg2l">统计效果截止: {updated_at ? moment(updated_at).format('YYYY-MM-DD HH:mm:ss'): '----'}</div>
          </div>
          <div>
            {
              resultData.map( (i,rdx) => (
                <Row key={rdx} style={i.style}>
                  {i.arr.map( (j, cdx) => (
                    <Col key={`${j}-${rdx}-${cdx}`} style={cdx === 0 ? {color: '#343434', 'fontSize': '14px',textIndent: '20px'} : null} span={4}>
                      {j}
                    </Col>
                  ))}
                </Row>
              ))
            }
          </div>
        </div>
      </div>
    )
  }

  renderLineChart() {
    const { resGroup, selectedMetric, eventInfo, initDate } = this.props
    let selectOption = [{
      title: '目标用户数',
      value: 'target_total'
    },{
      title: '回访用户数',
      value: 'revisit_total'
    },{
      title: '打开用户数',
      value: 'open_total'
    },{
      title: '回访率',
      value: 'revisit_rate'
    },{
      title: '打开率',
      value: 'open_rate'
    }]
    const { send_channel, copywriting, id } = eventInfo
    if (send_channel === MARKETING_SEND_CHANNEL.SMS) {
      if (_.isEmpty(_.get(copywriting,'url', ''))) {
        selectOption = [{
          title: '目标用户数',
          value: 'target_total'
        },{
          title: '回访用户数',
          value: 'revisit_total'
        },{
          title: '回访率',
          value: 'revisit_rate'
        }]
      }
    }
    return (
      <React.Fragment>
        <div className="mg2t height60 line-height60" style={{backgroundColor: '#F7F7F7'}}>
          <span className="mg2x">发送日期</span>
          <DatePicker.RangePicker
            className="width250"
            format="YYYY-MM-DD"
            allowClear={false}
            disabledDate={(current) => current && current > moment().add(-1, 'd').endOf('d')}
            value={initDate}
            onChange={(date, timeRange) => {
              this.easyDispatch('getResultByDate', {timeRange, id})
              this.changeProps({initDate: date})
            }}
          />
        </div>
        <div className="bg-white pd3y min-height500">
          <div className="mg3x">
            指标: 
            <Select 
              className="width300"
              mode="multiple"
              value={selectedMetric}
              onChange={(v) => {
                if (v.length > 2 ) return message.error('最多选择两项')
                if (v.length < 1 ) return message.error('最少选择一个')
                this.changeProps({selectedMetric: v})
              }}
            >
              {
                selectOption.map( i => (
                  <Option key={i.value} value={i.value}>{i.title}</Option>
                ))
              }
            </Select>
          </div>
          <div>
            <LineChart 
              data={resGroup}
              selectedMetric={selectedMetric}
            />
          </div>
          <div>
            {this.renderDetailTable()}
          </div>
        </div>
      </React.Fragment>
    )
  }

  renderDetailTable() {
    const { resGroup = [], eventInfo } = this.props 
    let hasOpenCount = true
    const { send_channel = '', copywriting = '' } = eventInfo
    if (!_.isEmpty(eventInfo)) {
      if (send_channel === MARKETING_SEND_CHANNEL.SMS) {
        if (_.isEmpty(_.get(copywriting,'url', ''))) {
          hasOpenCount = false
        }
      }
    }
    let data = []
    for (let i = resGroup.length - 1; i >= 0; i --) {
      const { send_target_total, send_revisit_total, send_open_total, contrast_target_total, contrast_revisit_total, send_time, id } = resGroup[i]
      data.push({
        id,
        send_time: moment(send_time).format('YYYY-MM-DD'),
        group_type: ['发送组','对照组'],
        target_total: [send_target_total,contrast_target_total],
        open_total: hasOpenCount ? [send_open_total, '---'] : '---',
        open_rate: hasOpenCount ? ( contrast_target_total === 0 ? [0, 0] : [(send_open_total / send_target_total * 100).toFixed(2) + '%', '---']) : ['---', '---'],
        revisit_total: [send_revisit_total,contrast_revisit_total],
        revisit_rate: contrast_target_total === 0 ? [0, 0] : [(send_revisit_total / send_target_total * 100).toFixed(2)+ '%' ,(contrast_revisit_total / contrast_target_total * 100).toFixed(2) + '%']
      })
    }
    const columns = [{
      title: '发送日期',
      dataIndex: 'send_time',
      key: 'send_time'
    },{
      title: '目标用户组',
      dataIndex: 'group_type',
      key: 'group_type',
      render: (value, row, index) => {
        return (
          <React.Fragment>
            <div>{value[0]}</div>
            <div>{value[1]}</div>
          </React.Fragment>
        )
      }
    },{
      title: '目标用户数',
      dataIndex: 'target_total',
      key: 'target_total',
      render: (value, row, index) => {
        return (
          <React.Fragment>
            <div>{value[0]}</div>
            <div>{value[1]}</div>
          </React.Fragment>
        )
      }
    },{
      title: '打开用户数',
      dataIndex: 'open_total',
      key: 'open_total',
      render: (value, row, index) => {
        return (
          <React.Fragment>
            <div>{value[0]}</div>
            <div>{value[1]}</div>
          </React.Fragment>
        )
      }
    },{
      title: '打开率',
      dataIndex: 'open_rate',
      key: 'open_rate',
      render: (value, row, index) => {
        return (
          <React.Fragment>
            <div>{value[0]}</div>
            <div>{value[1]}</div>
          </React.Fragment>
        )
      }
    },{
      title: '回访用户数',
      dataIndex: 'revisit_total',
      key: 'revisit_total',
      render: (value, row, index) => {
        return (
          <React.Fragment>
            <div>{value[0]}</div>
            <div>{value[1]}</div>
          </React.Fragment>
        )
      }
    },{
      title: '回访率',
      dataIndex: 'revisit_rate',
      key: 'revisit_rate',
      render: (value, row, index) => {
        return (
          <React.Fragment>
            <div>{value[0]}</div>
            <div>{value[1]}</div>
          </React.Fragment>
        )
      }
    }]

    return (
      <Table
        rowKey={(record) => record.id}
        className="mg3x"
        columns={columns}
        dataSource={data}
      />
    )
  }

  render() {
    return (
      <div className="height-100 overscroll-y" style={{backgroundColor: '#E4EAEF'}}>
        <Bread
          path={[ 
            { name: '自动化营销中心' },
            { name: '营销事件' },
            { name: '事件效果' }]}
        />
        <div className="mg2x mg2y">
          {this.renderTable()}
          {this.renderLineChart()}
        </div>
      </div>
    )
  }
}

export default MarketingActiveResult
