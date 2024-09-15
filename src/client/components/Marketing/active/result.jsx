/* eslint-disable react/prop-types */
import React, { Component } from 'react'
import Bread from '../../Common/bread'
import LineChart from './line-chart'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { Select, Row, Col, Tooltip } from 'antd'
import { SENDCHANNEL } from './store/constants'
import { MARKETING_SEND_CHANNEL } from 'common/constants'
import { connect } from 'react-redux'
import moment from 'moment'

const Option = Select.Option

@connect(state => ({ ...state['sagaCommon'], ...state['marketingActResult'] }))
class MarketingActiveResult extends Component {

  componentWillUnmount() {
    this.changeProps({    
      resultSet: [],
      eventInfo: {},
      selectedMetric: 'revisit_total'
    })
  }

  changeProps(payload) {
    this.props.dispatch({type: 'marketingActResult/change', payload})
  }

  easyDispatch(func, payload) {
    this.props.dispatch({type: `marketingActResult/${func}`, payload})
  }

  renderTable() {
    const { resultSet = {}, eventInfo = {} } = this.props
    let send_target_total= _.get(resultSet, 'send_target_total', 0), 
      send_open_total= _.get(resultSet, 'send_open_total', 0) ,
      division_send = Math.max(send_target_total, 1),
      contrast_target_total= _.get(resultSet, 'contrast_target_total', 0), 
      division_contrast = Math.max(contrast_target_total, 1),
      send_revisit_total= _.get(resultSet, 'send_revisit_total', 0) ,
      contrast_revisit_total= _.get(resultSet, 'contrast_revisit_total', 0), 
      send_time= _.get(resultSet, 'send_time', null),
      end_time= _.get(resultSet, 'updated_at', null)

    let 
      send_revisit_rate = (send_revisit_total / division_send * 100).toFixed(2) + '%',
      send_open_rate = (send_open_total / division_send * 100).toFixed(2) + '%',
      contrast_revisit_rate = (contrast_revisit_total / division_contrast * 100).toFixed(2) + '%'

    let 
      row1 = [send_target_total, send_revisit_total ,send_revisit_rate, send_open_total, send_open_rate], 
      row2 = [contrast_target_total, contrast_revisit_total, contrast_revisit_rate, '--', '--']

    const { userGroupTitle = '----', name: actName = '---', send_channel, copywriting  } = eventInfo
    if (send_channel === MARKETING_SEND_CHANNEL.SMS) {
      if (_.isEmpty(_.get(copywriting,'url', ''))) {
        row1 = [send_target_total, send_revisit_total, (send_revisit_total / division_send * 100).toFixed(2) + '%', '--', '--']
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
          <div className="mg3l">活动名称: {actName}</div>
          <div className="mg3l">活动人群: {userGroupTitle}</div>
          <div className="mg3l">发送渠道: {_.get(SENDCHANNEL, `${send_channel}`, '---')}</div>
        </div>
        <div className="width-90 mg-auto border">
          <div style={{backgroundColor: '#EFEFEF',height: '60px', lineHeight: '60px', color: '#1A1A1A'}}>
            <div className="fleft mg2l">发送时间: {send_time ? moment(send_time).format('YYYY-MM-DD HH:mm') : '尚未发送或统计'}</div>
            <div className="fleft mg2l">统计效果截止: {end_time ? moment(end_time).format('YYYY-MM-DD HH:mm'): '----'}</div>
          </div>
          <div>
            {
              resultData.map( (i,rdx) => (
                <Row key={rdx} style={i.style}>
                  {i.arr.map( (j, cdx) => (
                    <Col key={`${j}-${cdx}`} style={cdx === 0 ? {color: '#343434', 'fontSize': '14px',textIndent: '20px'} : null} span={4}>
                      {j ==='NaN%' ? '---' : j}
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
    const { lineChartResult, eventInfo, selectedMetric, resultSet } = this.props
    const { send_channel, copywriting, timer } = eventInfo
    let selectOption = [{
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
    if (send_channel === MARKETING_SEND_CHANNEL.SMS) {
      if (_.isEmpty(_.get(copywriting,'url', ''))) {
        selectOption = [{
          title: '回访用户数',
          value: 'revisit_total'
        },{
          title: '回访率',
          value: 'revisit_rate'
        }]
      }
    }
    return (
      <div className="bg-white mg2t pd3y min-height500">
        <div className="mg3x">
          指标: 
          <Select 
            className="width160"
            defaultValue="revisit_total"
            onChange={(v) => {
              this.changeProps({selectedMetric: v})
            }}
          >
            {
              selectOption.map( i => (
                <Option key={i.value} value={i.value}>{i.title}</Option>
              ))
            }
          </Select>
          <Tooltip className="mg2x" placement="bottom" title="执行时间不为整点时,头尾不满一小时">
            <QuestionCircleOutlined />
          </Tooltip>
        </div>
        <div>
          <LineChart 
            data={lineChartResult}
            selectedMetric={selectedMetric}
            resultSet={resultSet}
          />
        </div>
      </div>
    )
  }

  render() {
    return (
      <div className="height-100 overscroll-y" style={{backgroundColor: '#E4EAEF'}}>
        <Bread
          path={[{ name: '活动效果' }]}
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
