import React, { Component } from 'react'
import { connect } from 'react-redux'
import { namespace } from './store/life-cycle'
import Empty from '~/components/common/empty'
import { Button, Card, Select, message } from 'antd'
import CreateModel from './life-cycle-createModel' 
import TimePicker from '../Common/time-picker'
import { convertDateType, isRelative } from '../../../common/param-transform'
import { dateOptionsGen } from '../../../common/constants'
import { immutateUpdates } from '../../../common/sugo-utils'
import { fetch, getResultByDate } from 'client/services/marketing/events'
import LineChart from '../Marketing/events/line-chart'
import setStatePromise from '../../common/set-state-promise'

const Option = Select.Option

const excludeDateTypeTitleSet = new Set([ '今年', '去年' ])
const customDateTypes = immutateUpdates(dateOptionsGen(), 'exact', dateTypes => {
  return []
},
'natural', dateTypes => {
  return dateTypes.filter(dt => !excludeDateTypeTitleSet.has(dt.title))
}
)

let metricOption = [{
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


@connect(state => ({ ...state[namespace], ...state.sagaCommon }))
@setStatePromise
class LCMarketingModule extends Component {

  state = {
    createVisible: false,
    timeRange: '-7 day',
    metric: ['target_total'],
    scene: '',
    event: [],
    eventOption: []
  }

  componentDidMount() {
    this.dispatch('fetchMarketing')
  }

  // changeProps(payload) {
  //   this.props.dispatch({
  //     type: `${namespace}/setState`,
  //     payload
  //   })
  // }

  dispatch(func, payload) {
    this.props.dispatch({
      type: `${namespace}/${func}`,
      payload
    })
  }

  handleVisible(visible) {
    this.setState({createVisible: visible})
  }

  async fetchEvent(scene_id) {
    const { result } = await fetch({ scene_id })
    if (!_.isEmpty(result)) {
      const { rows } = result
      this.setState({eventOption: rows.filter( i => i.project_id)})
    }
  }

  fetchResult() {
    const { timeRange, event } = this.state
    let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
    let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(relativeTime)

    for (let i = 0; i < event.length; i ++) {
      this.dispatch('fetchMarketingResult', { id: event[i], time: [since, until]})
    }

  }

  empty() {
    return (
      <div style={{textAlign: 'center'}}>
        <Empty
          style={{margin: '40px 8px'}}
          description="暂未关联营销模型，请创建营销模型及营销策略"
        />
        <Button
          type="primary"
          onClick={() => this.handleVisible(true)}
        >创建</Button>
        {this.renderCreateModal()} 
      </div>
    )
  }

  renderCreateModal() {
    const { createVisible } = this.state
    return (
      <CreateModel handleVisible={(v) => this.handleVisible(v)} createVisible={createVisible} />
    )
  }

  renderMarketing() {
    const { lifeCycle, marketingModule: { marketingResult = {} } } = this.props
    const { timeRange, metric, scene, eventOption, event } = this.state

    let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
    let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(relativeTime)

    return (
      <Card
        title="营销效果"
      >
        <React.Fragment>
          <div className="lcmarketing-headbar height50">
            <div className="fleft">
              <span className="mg2l">指标:</span>
              <Select
                mode="multiple"
                className="width250"
                value={metric}
                onChange={(v) => {
                  if (v.length > 2 ) return message.error('最多选择两项')
                  if (v.length < 1 ) return message.error('最少选择一个')
                  this.setState({metric: v})
                }}
              >
                {
                  metricOption.map( i => (
                    <Option value={i.value} key={i.value}>{i.title}</Option>
                  ))
                }
              </Select>
              <span className="mg2l">场景:</span>
              <Select
                value={scene}
                className="width120"
                onChange={(v) => {
                  this.setState({
                    scene: v,
                    eventOption: [],
                    event: []
                  })
                  this.fetchEvent(v)
                }}
              >
                {
                  (lifeCycle.stages || []).map( i => (
                    <Option key={i.stage} value={i.scene_id}>{i.stage}</Option>
                  ))
                }
              </Select>
              <span className="mg2l">事件:</span>
              <Select
                mode="multiple"
                className="width300"
                value={event}
                onChange={async (v) => {
                  if (v > 4) return message.error('最多4个')
                  await this.setStatePromise({ event: v })
                  await this.fetchResult()
                }}
              >
                {
                  eventOption.map( i => (
                    <Option key={i.id} value={i.id}>{i.name}</Option>
                  ))
                }
              </Select>
            </div>
            <div className="fright">
              <span>时间筛选:</span>
              <TimePicker
                className="width120 mg2r"
                dateType={relativeTime}
                dateTypes={customDateTypes}
                dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
                // getPopupContainer={getPopupContainer}
                onChange={async ({ dateType: relativeTime, dateRange: [since, until] }) => {
                  await this.setStatePromise({
                    timeRange: relativeTime === 'custom' ? [since, until] : relativeTime
                  })
                  await this.fetchResult()
                // if (moment.duration(moment(until).diff(since)).asDays() > 90) message.error('时间范围请小于90天')
                }}
              />
            </div>
          </div>
          <div className="lc-marketing-result-box mg3t">
            {
              _.chunk(event, 2).map( (i, idx) => (
                <div key={idx + '营销事件结果行'} >
                  { i.map( (j,jdx) => {
                    return (
                      <div  key={jdx + '营销事件结果列'} className="fleft width-50 height300">
                        <LineChart 
                          title={_.find(eventOption, o => o.id === j).name}
                          data={marketingResult[j]}
                          selectedMetric={metric}
                        />
                      </div>
                    )
                  })}
                </div>
              ))
            }
          </div>
        </React.Fragment>
      </Card>
    )
  }
 

  render() {
    const { marketingModule: { lcModel } } = this.props
    const { createVisible } = this.state

    if (_.isEmpty(lcModel)) return this.empty()

    return (
      <div>
        <div className="height50">
          <Button 
            type="primary"
            className="fright"
            onClick={() => this.handleVisible(true)}
          >编辑</Button>
          <CreateModel handleVisible={(v) => this.handleVisible(v)} createVisible={createVisible} />
        </div>
        <div>
          {this.renderMarketing()}
        </div>
      </div>
    )

  }
}

export default LCMarketingModule
