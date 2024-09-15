/* eslint-disable react/prop-types */
import React, { Component } from 'react'
import { Table, Button, Col, Row, Modal, Select } from 'antd'
import ReactEcharts from 'echarts-for-react'
import _ from 'lodash'

const SelectOption = Select.Option

export default class ExectorInfo extends Component {

  componentDidUpdate(prevProps) {
    const { getServerStatistics, port, host, showExecutorInfo } = this.props
    if (host && host !== prevProps.host && showExecutorInfo) {
      getServerStatistics({ host, port })
    }
  }

  renderCpuAndMemoryChart = () => {
    const { serverStatistics } = this.props
    let option = {
      series: [
        /*仪表盘图，做中间刻度线*/
        {
          type: 'gauge',
          name: '业务指标',
          radius: '90%',
          startAngle: '0',
          endAngle: '-359.99',
          splitNumber: '100',
          pointer: {
            show: false
          },
          title: {
            show: false
          },
          detail: {
            show: false
          },
          data: [{ value: 95, name: '完成率' }],
          axisLine: {
            lineStyle: {
              width: 20,
              opacity: 0
            }
          },
          axisTick: {
            show: false
          },
          splitLine: {
            show: true,
            length: 10,
            lineStyle: {
              color: '#ccc',
              width: 2,
              type: 'solid'
            }
          },
          axisLabel: {
            show: false
          }
        },
        /*内心原型图，展示整体数据概览*/
        {
          name: 'pie',
          type: 'pie',
          clockWise: true,
          startAngle: 90,
          radius: ['82%', '80%'],
          hoverAnimation: false,
          center: ['50%', '50%'],
          data: [{
            value: _.get(serverStatistics, 'memoryResource.useMemoryInMB', 0),
            label: {
              normal: {
                formatter: '内存使用\n{d}%',
                position: 'center',
                show: true,
                textStyle: {
                  fontSize: '20',
                  fontWeight: 'normal'
                }
              }
            },
            itemStyle: {
              normal: {
                color: '#f74369',
                shadowColor: '#f74369',
                shadowBlur: 20
              }
            }
          }, {
            value: _.get(serverStatistics, 'memoryResource.totalMemoryInMB', 1) - _.get(serverStatistics, 'memoryResource.useMemoryInMB', 0),
            name: 'invisible',
            itemStyle: {
              normal: {
                color: 'rgba(247,67,105,0)', // 未完成的圆环的颜色
                label: {
                  show: false
                },
                labelLine: {
                  show: false
                }
              },
              emphasis: {
                color: '#fff' // 未完成的圆环的颜色
              }
            }
          }]
        }
      ]
    }

    const memoryOption = {
      tooltip: {
        formatter: '{a} <br/>{b} : {c}%'
      },
      series: [
        {
          radius: '100%',
          name: 'CPU使用率 ',
          type: 'gauge',
          detail: { formatter: '{value}%' },
          data: [{ value: ((serverStatistics.cpuUsage || 0) * 100).toFixed(2), name: 'CPU使用率' }],
          axisLine: {            // 坐标轴线
            lineStyle: {       // 属性lineStyle控制线条样式
              width: 10
            }
          },
          axisTick: {            // 坐标轴小标记
            length: 15,        // 属性length控制线长
            lineStyle: {       // 属性lineStyle控制线条样式
              color: 'auto'
            }
          },
          splitLine: {           // 分隔线
            length: 20,         // 属性length控制线长
            lineStyle: {       // 属性lineStyle（详见lineStyle）控制线条样式
              color: 'auto'
            }
          }
        }
      ]
    }

    return (<div>
      <Row>
        <Col span={12} className="pd2x">
          <ReactEcharts option={option} />
        </Col>
        <Col span={12} className="pd2x">
          <ReactEcharts option={memoryOption} />
        </Col>
      </Row>
    </div>)
  }

  renderTable = () => {
    let { serverStatistics } = this.props
    const columns = [{
      title: '分区名称',
      dataIndex: 'blockName',
      width: 100
    }, {
      title: '总空间(GB)',
      dataIndex: 'totalCapacityInGB',
      width: 100
    }, {
      title: '已用空间(GB)',
      dataIndex: 'useCapacityInGB',
      width: 100
    }]
    return (<Table
      rowKey="blockName"
      size="middle"
      columns={columns}
      dataSource={serverStatistics.diskResource || []}
      bordered
      pagination={false}
    />)
  }

  render() {
    const { executors, serverStatistics, getServerStatistics, showExecutorInfo, hideModal } = this.props
    return (
      <Modal
        maskClosable={false}
        title={'系统概况'}
        wrapClassName="vertical-center-modal"
        visible={showExecutorInfo}
        bodyStyle={{ padding: '10px 20px' }}
        onCancel={hideModal}
        footer={
          <div className="alignright">
            <Button onClick={hideModal}>关闭</Button>
          </div>
        }
        width={'600px'}
      >
        <div className="alignright">
          <Select
            value={serverStatistics.host}
            allowClear
            className="width200"
            placeholder="请选择执行器"
            onChange={e => {
              if(e &&  typeof(e)==='string'){
                const [host, port] = e.split(':')
                getServerStatistics({ host, port })
              }
            }
            }
          >
            {
              executors.map(p => {
                if (!p.active) return null
                return <SelectOption key={`${p.host}:${p.port}`} value={`${p.host}:${p.port}`}>{p.host}</SelectOption>
              })
            }
          </Select>
        </div>
        {this.renderCpuAndMemoryChart()}
        {this.renderTable()}
      </Modal>
    )
  }
}
