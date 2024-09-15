import React from 'react'
import { QuestionCircleOutlined } from '@ant-design/icons';
import { Modal, Table, Tooltip, Tabs } from 'antd';
import _ from 'lodash'
import * as d3 from 'd3'
import moment from 'moment'
import PubSub from 'pubsub-js'
import classNames from 'classnames'
import {formatUseOriginalPattern} from '../../../common/druid-query-utils'

let transferArrowColorInterpolate = d3.interpolateRgb('#eeedfa', '#9799e9')

let dateFormatter = val => {
  let m = moment(val)
  if (!m.isValid()) {
    return val
  }
  return m.format('YYYY-MM-DD')
}
let dateFormatterMem = _.memoize(dateFormatter)
let percentFormat = d3.format('.1%')

export default class DailyTransferModal extends React.Component {
  state = {
    tabActiveKey: null,
    isLoadingUsergroupInfo: false
  }

  componentWillReceiveProps(nextProps) {
    if (!this.props.visible && nextProps.visible) {
      this.setState({tabActiveKey: nextProps.comparingFunnelGroupName[0], isLoadingUsergroupInfo: false})
    }
  }

  onInsight = ev => {
    let { funnelLayers2d, granularity } = this.props
    let {tabActiveKey, isLoadingUsergroupInfo} = this.state

    let step = ev.target.getAttribute('data-step')
    let date = ev.target.getAttribute('data-date')

    let since = date
    let until = moment(since).add(moment.duration(granularity)).add(-1, 'ms').format('YYYY-MM-DD HH:mm:ss.SSS')
    let stepNumber = step * 1
    PubSub.publishSync('sugoFunnel.onShowLostUser', {
      lossBeforeStepIdx: stepNumber,
      relativeTime: 'custom',
      since,
      until,
      tabActiveKey
    })
    this.setState({isLoadingUsergroupInfo: true})
  }

  render() {
    let {visible, onVisibleChange, funnelLayers2d, comparingFunnelGroupName, funnelTotalData, funnelDataAfterGroupBy,
      granularity} = this.props

    let arrowGen = (finalPercent, step, date, percentFormat0 = percentFormat) => {
      let arrowColor = transferArrowColorInterpolate(finalPercent)
      return (
        <div
          className={classNames('iblock width80 right0 zIndex4', {absolute: !!date})}
          style={{right: '-50px'}}
        >
          <span
            style={{
              float: 'right',
              width: '0', height: '0',
              borderTop: '9px solid transparent',
              borderBottom: '9px solid transparent',
              borderLeft: `9px solid ${arrowColor}`
            }}
          />
          <a
            style={{
              float: 'right', width: '60px', textAlign: 'center',
              backgroundColor: arrowColor,
              color: '#0e77ca'
            }}
            className="pointer"
            data-step={step}
            data-date={date}
            onClick={date && this.onInsight}
          >{percentFormat0(finalPercent)}</a>
        </div>
      )
    }

    let cols = [
      {
        title: '日期',
        dataIndex: 'date',
        className: 'aligncenter-force',
        sorter: (a, b) => a.title > b.title ? 1 : -1,
        key: 'date',
        render: (val) => {
          let mo = moment(val)
          /*
           转化周期为 1 天的话不显示区间
           两天的话显示
           2017-01-06 ～ 2017-01-07
          */
          if (granularity === 'P1D') {
            return val
          }
          return `${val} ~ ${formatUseOriginalPattern(mo.add(moment.duration(granularity)).add(-1, 'day'))}`
        }
      }, {
        title: '总转化率',
        dataIndex: 'completeTransferPercent',
        key: 'completeTransferPercent',
        className: 'aligncenter-force',
        sorter: (a, b) => a.completeTransferPercent > b.completeTransferPercent ? 1 : -1,
        render: (val, record) => {
          let step0 = record['第 1 步'], finalStep = record[`第 ${funnelLayers2d.length} 步`]
          let percent0 = finalStep / step0
          if (!isFinite(percent0)) {
            return '0%'
          }
          let completeTransferPercent = percentFormat(percent0)
          return completeTransferPercent
          /*return (
            <a
              className="pointer"
              data-step="总体"
              data-date={record.date}
              onClick={this.onInsight}
            >{completeTransferPercent}</a>
          )*/
        }
      },
      ...funnelLayers2d.map((fl, fli) => {
        let title = `第 ${fli + 1} 步`
        return {
          title: (<Tooltip title={fl.filter(_.identity).join(' -> ')}>
            <span>{title}</span>
          </Tooltip>
          ),
          dataIndex: title,
          key: title,
          className: 'aligncenter-force',
          render: (val, record) => {
            if (fli === funnelLayers2d.length - 1) {
              return val
            }
            let nextLayerVal = record[`第 ${fli + 2} 步`]
            let transferPercent = nextLayerVal / val
            let finalPercent = isNaN(transferPercent) ? 0 : !isFinite(transferPercent) ? 1 : transferPercent
            return (
              <div className="relative" >
                {val}
                {arrowGen(finalPercent, fli + 1, record.date)}
              </div>
            )
          }
        }
      })
    ]

    let {tabActiveKey, isLoadingUsergroupInfo} = this.state

    let finalData = []
    if (visible && tabActiveKey) {
      let statisticData = tabActiveKey === '总体' ? funnelTotalData : funnelDataAfterGroupBy[tabActiveKey]
      let windowTyped = statisticData.filter(d => d.type === 'window')
      let sorted = _.sortBy(windowTyped, r => r.timestamp)

      finalData = sorted.map(d => {
        return {
          date: dateFormatterMem(d.timestamp),
          ..._.mapValues(d.event, val => _.isNumber(val) && !Number.isInteger(val) ? Math.round(val) : val)
        }
      })
    }

    return (
      <Modal
        title="流失分析"
        visible={visible}
        width="80%"
        onOk={() => {
          onVisibleChange(false)
        }}
        onCancel={() => {
          onVisibleChange(false)
        }}
      >
        <h3
          className="absolute"
          style={{right: '20px'}}
        >
          <QuestionCircleOutlined className="mg1r" />
          点击<div className="itblock mg1l mg1r relative width80">{arrowGen(.5, 0, '', () => '转化率')}</div>查看流失分析
        </h3>
        <Tabs
          activeKey={tabActiveKey}
          onChange={key => {
            this.setState({tabActiveKey: key})
          }}
        >
          {comparingFunnelGroupName.map(g => {
            return (
              <Tabs.TabPane tab={g} key={g} />
            )
          })}
        </Tabs>
        <Table
          loading={isLoadingUsergroupInfo}
          columns={cols}
          dataSource={finalData}
          size="small"
        />
      </Modal>
    );
  }
}
