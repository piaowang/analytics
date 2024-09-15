import React from 'react'
import { Table } from 'antd'
import * as d3 from 'd3'

let percentFormat = d3.format('.2%')

class ModelResultEffect extends React.Component {

  createTableColumns() {

    return [
      {
        title: '内容项',
        key: 'content',
        dataIndex: 'content'
      }, {
        title: '实际的流失用户数',
        key: 'col1',
        dataIndex: 'col1'
      }, {
        title: '实际的留存用户数',
        key: 'col2',
        dataIndex: 'col2'
      }, {
        title: '精确率',
        key: 'col3',
        dataIndex: 'col3'
      }
    ]
  }

  render() {
    let {precisionResult, ...rest} = this.props
    const columns = this.createTableColumns()

    let {truePos, trueNec, falsePos, falseNeg} = precisionResult

    let precision = truePos / (truePos + falsePos)
    let recall = truePos / (truePos + falseNeg)
    let data = [
      {content: '预测的流失用户数', col1: truePos, col2: falsePos, col3: isFinite(precision) ? percentFormat(precision) : '0.00%'},
      {content: '预测的留存用户数', col1: trueNec, col2: falseNeg},
      {content: '召回率', col1: isFinite(recall) ? percentFormat(recall) : '0.00%'}
    ]
    return (
      <Table
        bordered
        rowKey="content"
        columns={columns}
        dataSource={data}
        pagination={false}
        {...rest}
      />
    )
  }
}

export default ModelResultEffect
