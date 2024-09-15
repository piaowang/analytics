import { Component } from 'react'
import { Table } from 'antd'
import Bread from '../../Common/bread'
import { connect } from 'react-redux'
import { namespace } from './store'
import moment from 'moment'
import AsyncTaskRunner from '../../Common/async-task-runner'
import { doQueryDruidData } from '../../../common/slice-data-transform'
import { fetchMeasures, fetchDimensions } from '../Common/fetcher'
import _ from 'lodash'

@connect(state => ({
  ...state[namespace],
}))
export default class MarketBrainResult extends Component {

  state = {
    record: [],
    spread: {
      total: 0
    },
    deal: {
      total: 0,
      sum: 0
    },
    staffGranularity: {}
  }
  
  calc(divisor, dividend) {
    return ((divisor / (dividend || 1)) * 100).toFixed(2) + '%'
  }

  fetcher() {
    const { baseInfo, projectList } = this.props
    const projectListDataSourceIdDict = _.keyBy(projectList, 'datasource_id')
    return (
      <AsyncTaskRunner 
        args={[baseInfo, projectListDataSourceIdDict]}
        task={async (baseInfo) => {
          const { created_at, updated_at, url, params = {}, firstExecuteRecord } = baseInfo
          if (_.isEmpty(params)) return
          let recordBak = _.cloneDeep(firstExecuteRecord)
          recordBak.spreadTotal = 0
          recordBak.targetTotal = baseInfo.targetTotal
          const { 
            spreadEffectProject,
            spreadLinkField,
            // spreadStaffIdField, 
            dealEffectProject,
            dealLinkField,
            // dealStaffIdField
          } = params

          let spreadMeasures = await fetchMeasures(spreadEffectProject)
          if (!spreadMeasures.data) return { 
            spread: {},
            record: recordBak
          }
          spreadMeasures = spreadMeasures.data

          let spreadDimensions = await fetchDimensions(spreadEffectProject)
          if (!spreadDimensions.data) return { 
            spread: {},
            record: recordBak
          }
          spreadDimensions = spreadDimensions.data

          let dealMeasures = await fetchMeasures(dealEffectProject)
          if (!dealMeasures.data) return { 
            spread: {},
            record: recordBak
          }
          dealMeasures = dealMeasures.data

          let dealDimensions = await fetchDimensions(dealEffectProject)
          if (!dealDimensions.data) return { 
            spread: {},
            record: recordBak
          }
          dealDimensions = dealDimensions.data

          spreadMeasures = _.keyBy(spreadMeasures, 'title')
          spreadDimensions = _.keyBy(spreadDimensions, 'title')
          dealMeasures = _.keyBy(dealMeasures, 'title')
          dealDimensions = _.keyBy(dealDimensions, 'title')

          const measureName = _.get(window.sugo, 'marketBrain.measure', '总记录数')
          const eventName = _.get(window.sugo, 'marketBrain.spreadEventName', '浏览')


          if (!_.get(recordBak,'execute_time')) return { 
            spread: {},
            record: recordBak
          }
            let res = await doQueryDruidData({
              "druid_datasource_id": spreadEffectProject,
              params: {
                "timezone": "Asia/Shanghai",
                "metrics": [
                  _.get(spreadMeasures[measureName], 'name')
                ],
                "granularity": "P1D",
                "filters": [
                  {
                    "col": "__time",
                    "op": "in",
                    "eq": [
                      moment(_.get(recordBak,'execute_time')).format('YYYY-MM-DD HH:mm:ss'),
                      moment().format('YYYY-MM-DD HH:mm:ss')
                    ],
                    "dateStringComparingFormat": null
                  },
                  {
                    "col": "event_name",
                    "op": "in",
                    "eq": [
                      eventName
                    ],
                    "type": "string"
                  },
                  {
                    "col": spreadLinkField,
                    "op": "contains",
                    "eq": [url],
                    "type": "string"
                  }
                ],
                "queryEngine": "tindex",
                dimensionExtraSettingDict: {},
                splitType: 'tree'
              }
            })
            recordBak.spreadTotal = _.get(res, `[0][${_.get(spreadMeasures[measureName], 'name')}]`, 0)

          // for (let i = 0; i < lastThreeExecuteRecord.length; i ++) {
          //   if (!_.get(lastThreeExecuteRecord[i],'execute_time')) return 0
          //   let res = await doQueryDruidData({
          //     "druid_datasource_id": spreadEffectProject,
          //     params: {
          //       "timezone": "Asia/Shanghai",
          //       "metrics": [
          //         _.get(spreadMeasures[measureName], 'name')
          //       ],
          //       "granularity": "P1D",
          //       "filters": [
          //         {
          //           "col": "__time",
          //           "op": "in",
          //           "eq": [
          //             moment(_.get(lastThreeExecuteRecord[i],'execute_time')).format('YYYY-MM-DD HH:mm:ss'),
          //             moment(_.get(lastThreeExecuteRecord[i+1],'execute_time', moment())).format('YYYY-MM-DD HH:mm:ss')
          //           ],
          //           "dateStringComparingFormat": null
          //         },
          //         {
          //           "col": "event_name",
          //           "op": "in",
          //           "eq": [
          //             eventName
          //           ],
          //           "type": "string"
          //         },
          //         {
          //           "col": spreadLinkField,
          //           "op": "contains",
          //           "eq": [url],
          //           "type": "string"
          //         }
          //       ],
          //       "queryEngine": "tindex",
          //       dimensionExtraSettingDict: {},
          //       splitType: 'tree'
          //     }
          //   })
          //   recordBak[i].spreadTotal = _.get(res, `[0][${_.get(spreadMeasures[measureName], 'name')}]`, 0)
          // } 


          // if (!_.get(spreadMeasures['访客数'], 'name')) return

          // //打开数
          // let spread = []
          // //成交
          // let deal = []
          // let reg = /^(https?:\/\/)([0-9a-z.]+)(:[0-9]+)?([/0-9a-z.]+)?(\?[0-9a-z&=]+)?(#[0-9-a-z]+)?/i
          // if (reg.test(url)) {
          //   spread = await doQueryDruidData({
          //     "druid_datasource_id": spreadEffectProject,
          //     params: {
          //       "timezone": "Asia/Shanghai",
          //       "dimensions": [
          //         spreadStaffIdField
          //       ],
          //       "metrics": [
          //         spreadMeasures['访客数'].name
          //       ],
          //       "granularity": "P1D",
          //       "filters": [
          //         {
          //           "col": spreadStaffIdField,
          //           "op": "not in",
          //           "eq": [
          //             "空字符串 / NULL"
          //           ],
          //           "type": "string",
          //           "containsNull": true
          //         },
          //         {
          //           "col": "event_name",
          //           "op": "in",
          //           "eq": [
          //             "浏览"
          //           ],
          //           "type": "string"
          //         },
          //         {
          //           "col": spreadLinkField,
          //           "op": "contains",
          //           "eq": [url],
          //           "type": "string"
          //         }
          //       ],
          //       "dimensionExtraSettings": [
          //         {
          //           "limit": 999,
          //           "sortDirect": "desc",
          //           "sortCol": spreadMeasures['访客数'].name
          //         }
          //       ],
          //       "queryEngine": "tindex",
          //       dimensionExtraSettingDict: {},
          //       splitType: 'tree'
          //     }
          //   })
            
          //   deal = await doQueryDruidData({
          //     'druid_datasource_id': dealEffectProject,
          //     params: {
          //       "dimensions": [dealStaffIdField],
          //       "metrics": [
          //         dealMeasures['总记录数'].name
          //       ],
          //       "customMetrics": [
          //         {
          //           "name": 'buySum',
          //           "formula": `$main.filter($${dealDimensions['商品购买金额'].name}.isnt(null)).sum($${dealDimensions['商品购买金额'].name})`,
          //           "dimName": dealDimensions['商品购买金额'].name,
          //           "dimParams": {}
          //         }
          //       ],
          //       'granularity': 'P1D',
          //       "filters": [
          //         {
          //           "col": "__time",
          //           "op": "in",
          //           "eq": [
          //             moment(created_at).format('YYYY-MM-DD HH:mm:ss'),
          //             moment(updated_at).format('YYYY-MM-DD HH:mm:ss')
          //           ],
          //           "dateStringComparingFormat": null
          //         },
          //         {
          //           "col": dealStaffIdField,
          //           "op": "not in",
          //           "eq": [
          //             "空字符串 / NULL"
          //           ],
          //           "type": "string",
          //           "containsNull": true
          //         },
          //         {
          //           "col": "event_name",
          //           "op": "in",
          //           "eq": [ "商城订单明细事件" ],
          //           "type": "string"
          //         },
          //         {
          //           "col": dealLinkField,
          //           "op": "contains",
          //           "eq": [url],
          //           "type": "string"
          //         }
          //       ],
          //       dimensionExtraSettingDict: {},
          //       splitType: 'tree'
          //     }
          //   })

          //   spread = _.get(spread[0], 'resultSet')
          //   deal = _.get(deal[0], 'resultSet')
          // }



          // let open_total = 0

          // let staffGranularity = {}
          // spread.map( i => {
          //   open_total += i[spreadMeasures['访客数'].name]
          //   staffGranularity[i[spreadStaffIdField]] = {
          //       spread_total: i[spreadMeasures['访客数'].name]
          //     }
          // })

          // let deal_total = 0
          // let deal_sum = 0
          // deal.map( i => {
          //   deal_total += i[dealMeasures['总记录数'].name + 'total']
          //   deal_sum = i['buySum']
          //   staffGranularity[i[dealStaffIdField]] = {
          //     ...staffGranularity[i[dealStaffIdField]],
          //     deal_total: i[dealMeasures['总记录数'].name + 'total'],
          //     deal_sum: i['buySum']
          //   }
          // })


          return { 
            spread: {},
            record: recordBak
            // deal:{
            //   total: deal_total,
            //   sum: deal_sum
            // },
            // staffGranularity
          }
        }}
        onResult={result => {
          if (!result) return
          const { record, spread = {}, deal = {}, staffGranularity = {} } = result
          this.setState({
            record,
            spread, deal, staffGranularity
          })
        }}
      />
    )
  }

  renderTable() {
    const { baseInfo } = this.props
    const { spread, deal, record } = this.state

    let columns = [{
      key: 'startTime',
      dataIndex: 'created_at',
      title: '执行时间',
      render:(v) => moment(v).format('YYYY-MM-DD HH:mm:ss')
    },{
      key: 'targetTotal',
      dataIndex: 'targetTotal',
      title: '目标用户数',
      render: (v) => v || 0
    },
    // {
    //   key: 'actual_total',
    //   dataIndex: 'actual_total',
    //   title: '触达用户数',
    //   render: (v) => v || 0
    // },
    // {
    //   key: 'actual_rate',
    //   dataIndex: 'actual_rate',
    //   title: '触达率'
    // },
    {
      key: 'spreadTotal',
      dataIndex: 'spreadTotal',
      title: '打开用户数'
    },{
      key: 'open_rate',
      dataIndex: 'spreadTotal',
      title: '打开率',
      render: (v, i) => {
        if (!i.predict_total) return '0.00%'
        let res = ((((i.spreadTotal || 0) / i.targetTotal) * 100))
        if (res > 100) return '100.00%'
        return res.toFixed(2) + '%'
      }
    },
    {
      key: 'deal_total',
      // dataIndex: 'deal_total',
      title: '成交单数',
      render: () => 0
    },{
      key: 'gmv',
      // dataIndex: 'gmv',
      title: '成交金额',
      render: () => 0
    }
  ]
    return (
      <div className="bg-white pd3b pd3x height-80">
        <div className="base-info pd2y">
          <div style={{ 
            display: 'flex', 
            'justifyContent': 'flex-start',
            fontWeight: '600'
          }}>
            <div>
              活动名称: {baseInfo.name}
            </div>
            <div className='mg2l'>
              活动人群: {baseInfo.usergroup_title}
            </div>
            <div className='mg2l'>
              触达方式: {['自动','人工'][baseInfo.touch_up_way]}
            </div>
            <div className='mg2l'>
              发送渠道: {['短信','电话', '微信', '极光推送'][baseInfo.send_channel]}
            </div>
          </div>
        </div>
        <div className="execute-time" style={{ 
          backgroundColor: '#F2F0F1', 
          display: 'flex', 
          'justifyContent': 'flex-start',
          height: '40px',
          lineHeight: '40px'
        }}>
          <div className='mg2l'>
            执行时间: {moment(baseInfo.created_at).format('YYYY-MM-DD HH:mm:ss')}
          </div>
          <div className='mg2l'>
            统计截止时间: {moment().format('YYYY-MM-DD HH:mm:ss')}
          </div>
        </div>
        <div className="overall-situation">
          <Table 
            columns={columns}
            // dataSource={[{
            //   predict_total,
            //   actual_total,
            //   actual_rate: this.calc(actual_total, predict_total),
            //   open_total: spread.total,
            //   open_rate: this.calc(spread.total, predict_total),
            //   deal_total: deal.total,
            //   gmv: deal.sum.toFixed(2)
            // }]}
            dataSource={[record]}
          />
        </div>
      </div>
    )
  }

  renderStaffSituation() {
    const { baseInfo } = this.props

    const { staffInfo = [], detailsCountGroupByStaffId = {} } = baseInfo
    let staffIdDict = {}
    let shareIdDict = {}
    if (!_.isEmpty(staffInfo)) {
      staffIdDict = _.keyBy(staffInfo,'staff_id')
      shareIdDict = _.keyBy(staffInfo,'shareid')
    }
    const { 
      staffGranularity = {}
    } = this.state

    let columns = [{
      key: 'staff_name',
      dataIndex: 'staff_name',
      title: '员工姓名'
    },{
      key: 'predict_total',
      dataIndex: 'predict_total',
      title: '目标用户数'
    },{
      key: 'actual_total',
      dataIndex: 'actual_total',
      title: '触达用户数'
    },{
      key: 'actual_rate',
      dataIndex: 'actual_rate',
      title: '触达率'
    },{
      key: 'open_total',
      dataIndex: 'open_total',
      title: '打开用户数'
    },{
      key: 'open_rate',
      dataIndex: 'open_rate',
      title: '打开率'
    },{
      key: 'deal_total',
      dataIndex: 'deal_total',
      title: '成交单数'
    },{
      key: 'gmv',
      dataIndex: 'gmv',
      title: '成交金额'
    }]

    let datasource = []
    
    if (!_.isEmpty(detailsCountGroupByStaffId)) {
      for (let k in detailsCountGroupByStaffId) {
        let item = staffGranularity[k] || {}
        datasource.push({
          staff_name: staffIdDict[k].name || k,
          predict_total: detailsCountGroupByStaffId[k].target || 0,
          actual_total: detailsCountGroupByStaffId[k].actual || 0,
          actual_rate: this.calc(detailsCountGroupByStaffId[k].actual || 0, detailsCountGroupByStaffId[k].target || 0),
          open_total: item.spread_total || 0,
          open_rate: this.calc(item.spread_total || 0, detailsCountGroupByStaffId[k].target || 0),
          deal_total: item.deal_total || 0,
          gmv: item.deal_sum || 0
        })
      }
    }

    if (_.isEmpty(detailsCountGroupByStaffId)) {
      for (let k in staffGranularity) {
        let item = staffGranularity[k] || {}
        datasource.push({
          staff_name: _.get(shareIdDict[k], 'name') || k,
          predict_total: 0,
          actual_total: 0,
          actual_rate: 0,
          open_total: item.spread_total || 0,
          open_rate: this.calc(item.spread_total || 0, 1),
          deal_total: item.deal_total || 0,
          gmv: item.deal_sum || 0
        })
      }
    }

    return (
      <div className="bg-white pd3b pd3x mg2t height-80">
        <div className="base-info pd2y">
          <div style={{ 
            display: 'flex', 
            'justifyContent': 'flex-start',
            fontWeight: '600'
          }}>
            <div>
              员工执行情况
            </div>
          </div>
        </div>
        <div className="execute-time" style={{ 
          backgroundColor: '#F2F0F1', 
          display: 'flex', 
          'justifyContent': 'flex-start',
          height: '40px',
          lineHeight: '40px'
        }}>
          <div className='mg2l'>
            执行时间: {moment(baseInfo.created_at).format('YYYY-MM-DD HH:mm:ss')}
          </div>
          <div className='mg2l'>
            统计截止时间: {moment().format('YYYY-MM-DD HH:mm:ss')}
          </div>
        </div>
        <div className="overall-situation">
          <Table 
            columns={columns}
            dataSource={datasource}
          />
        </div>
      </div>
    )
  }

  render() {
    const { baseInfo } = this.props
    return (
      <div className="height-100 overscroll-y" style={{backgroundColor: '#E4EAEF'}}>
      <Bread
        path={[{ name: '活动效果' }]}
      />
      {this.fetcher()}
      <div className="mg2x mg2y height-100" style={{display: 'flex', flexDirection: 'column'}}>
        {this.renderTable()}
        {/* {
          baseInfo.touch_up_way === 1
          ? this.renderStaffSituation()
          : null
        } */}
      </div>
    </div>
    )
  }
}