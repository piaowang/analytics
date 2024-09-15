import React, { Component } from 'react'
import { Table, Button, Tag } from 'antd'
import { FLOW_REMARK, FLOW_STATUS_COLOR_MAP, FLOW_STATUS_TEXT_MAP, formatDate, getSpendTime } from '../constants'

class LoggerTable extends Component {
  renderNodeLogger = row => {
    const { reloadRowLogger } = this.props
    if(row.log){
      const { data } = row.log
      let log = data.split('\n')
      return (<div className="project-panel">
        <div className="child-log-box overscroll-y always-display-scrollbar">
          {
            log.map((item,i) => {
              return (<p key={i}>
                {item}  
              </p>)
            })
          }
          <div className="load-more" >
            <Button
              onClick={() => reloadRowLogger(row)}
              style={_.size(data) % 50000 !== 0 ? {display: 'none'} : undefined}
            >加载更多</Button>
          </div>
        </div>
      </div>)
    }
    return (<div>暂无日志</div>)
  }

  renderProgress = (o, i) => {
    const { spendArr } = this.props
    let style
    spendArr.filter((item, x) => {
      if(x === i) {
        style = {
          left: item.indent + '%',
          width :item.spend + '%'
        }
      }
    })
    return (<div className="progress-container">
      <span style={style} className={`progress-child ${o.status}`} />
    </div>)
  }

  render() {
    const { 
      className, 
      data,
      getRowLogger
    }  = this.props

    let filterDataArr = data.filter(item => item.status !== 'READY')

    const columns = [{
      title: '名称',
      dataIndex: 'showName'
    }, {
      title: '类型',
      dataIndex: 'type',
      render: text => FLOW_REMARK[text]
    }, {
      title: '时间轴',
      dataIndex: 'date',
      width: 220,
      render: (text, o, i) => this.renderProgress(o,i)
    }, {
      title: '开始时间',
      dataIndex: 'startTime',
      width: 160,
      render: text => formatDate(text) 
    }, {
      title: '结束时间',
      dataIndex: 'endTime',
      width: 160,
      render: text => formatDate(text)
    }, {
      title: '耗时',
      // width: 75,
      dataIndex: 'spend',
      render: (text, o) => getSpendTime(o,'start')// getSpendTime(o)
    }, {
      title: '状态',
      dataIndex: 'status',
      render: text => <Tag color={FLOW_STATUS_COLOR_MAP[text]}>{FLOW_STATUS_TEXT_MAP[text]}</Tag>
    }]

    const rerender = (record) => {
      if(!record.log && this.props.activeKey === 'execLog') {
        getRowLogger(record)
      }
      return this.renderNodeLogger(record)
    }

    return (
      <Table
        bordered
        rowKey={'nestedId'}
        dataSource={filterDataArr} 
        columns={columns} 
        className={className}
        expandedRowRender={rerender}
        expandRowByClick
      />
    )
  }
}

export default LoggerTable
