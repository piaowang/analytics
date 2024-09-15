import React from 'react'
import {Card, Col, Row} from 'antd'
import AsyncTaskRunner from '../Common/async-task-runner'
import _ from 'lodash'
import SliceChartFacade from '../Slice/slice-chart-facade'
import Fetch from '../../common/fetch-final'
import DruidColumnType from '../../../common/druid-column-type'

const ApiCallsOverviewConfigNames = [
  '有效API接口数',
  '累计调用次数',
  '失败次数',
  '每天调用趋势',
  '每小时调用趋势',
  '调用量 top10',
  '失败率 top10'
]

export default class ApiCallsOverview extends React.Component {
  
  render() {
    return (
      <div
        className="pd3x overscroll-y"
        style={{ height: 'calc(100vh - 50px - 45px - 16px)' }}
      >
        <Row gutter={16} >
          <Col key={'调用概览'} className="mg2b" span={12}>
            <Card title={'调用概览'}>
              <Row>
                {
                  _.take(ApiCallsOverviewConfigNames, 3).map(configName => {
                    return (
                      <Col span={8} key={configName}>
                        <AsyncTaskRunner
                          args={[configName]}
                          task={async (configName) => {
                            let res = await Fetch.get('/app/data-apis/call-logs', { configName })
                            let { vizType, data, dimensions, metrics=[] } = _.get(res, 'result') || {}
                            return {
                              druidData: vizType === 'number' ? undefined : data,
                              total: vizType === 'number' ? _.get(data, '[0]') : undefined,
                              dimNameDict: {
                                date: { name: 'date', type: DruidColumnType.Date, title: '日期' },
                                time: { name: 'time', type: DruidColumnType.Date, title: '时间' }
                              },
                              slice: {
                                params: {
                                  vizType,
                                  dimensions,
                                  metrics,
                                  dimensionExtraSettingDict: _.isEmpty(dimensions) ? {} : {
                                    [dimensions[0]]: {
                                      granularity: dimensions[0] === 'time' ? 'PT1H' : 'P1D',
                                      pattern: dimensions[0] === 'time' ? 'MM-DD HH时' : undefined
                                    }
                                  },
                                  customMetrics: metrics.map(m => {
                                    return {
                                      name: m,
                                      title: m,
                                      pattern: m === '失败率' ? '.2%' : 'd'
                                    }
                                  })
                                }
                              },
                              numberSpanOverWrite: 8 
                            }
                          }}
                        >
                          {({ result, isRunning }) => {
                            if (!result) {
                              return null
                            }
                            return (
                              <SliceChartFacade
                                publicAccess
                                wrapperClassName="height200 bg-white corner"
                                style={{ height: '100%' }}
                                isThumbnail={configName === '每小时调用趋势' /*自动倾斜*/}
                                showLegend={false}
                                {...result}
                              />
                            )
                          }}
                        </AsyncTaskRunner>
                      </Col>
                    )
                  })
                }
              </Row>
            </Card>
          </Col>
        
          {_.slice(ApiCallsOverviewConfigNames, 3).map(configName => {
            return (
              <Col key={configName} className="mg2b" span={12}>
                <Card title={configName}>
                  <AsyncTaskRunner
                    args={[configName]}
                    task={async (configName) => {
                      let res = await Fetch.get('/app/data-apis/call-logs', {configName})
                      let {vizType, data, dimensions, metrics=[]} = _.get(res, 'result') || {}
                      if (dimensions[0] === 'date' || dimensions[0] === 'time') {
                        data = _.orderBy(data, dimensions[0], 'asc')
                      }
                      return {
                        druidData: vizType === 'number' ? undefined : data,
                        total: vizType === 'number' ? _.get(data, '[0]') : undefined,
                        dimNameDict: {
                          date: {name: 'date', type: DruidColumnType.Date, title: '日期'},
                          time: {name: 'time', type: DruidColumnType.Date, title: '时间'}
                        },
                        slice: {
                          params: {
                            vizType,
                            dimensions,
                            metrics,
                            dimensionExtraSettingDict: _.isEmpty(dimensions) ? {} : {
                              [dimensions[0]]: {
                                granularity: dimensions[0] === 'time' ? 'PT1H' : 'P1D',
                                pattern: dimensions[0] === 'time' ? 'MM-DD HH时' : undefined
                              }
                            },
                            customMetrics: metrics.map(m => {
                              return {
                                name: m,
                                title: m,
                                pattern: m === '失败率' ? '.2%' : 'd'
                              }
                            })
                          }
                        },
                        ...(configName === '调用概览' ? {numberSpanOverWrite: 8} : {})
                      }
                    }}
                  >
                    {({result, isRunning}) => {
                      if (!result) {
                        return null
                      }
                      return (
                        <SliceChartFacade
                          publicAccess
                          wrapperClassName="height200 bg-white corner"
                          style={{height: '100%'}}
                          isThumbnail={configName === '每小时调用趋势' /*自动倾斜*/}
                          showLegend={false}
                          {...result}
                        />
                      )
                    }}
                  </AsyncTaskRunner>
                </Card>
              </Col>
            )
          })}
        </Row>
      </div>
    )
  }
}
