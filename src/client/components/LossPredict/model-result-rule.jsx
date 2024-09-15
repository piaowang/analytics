import React from 'react'
import { Table } from 'antd'
import _ from 'lodash'
import * as d3 from 'd3'
import downloadTableData from '../../common/download-table-data-to-csv'

let percentFormat = d3.format('.2%')

const SplitTypeDict = {
  greater: '>',
  less_equals: '≤',
  nominal: '=',
  contain: '包含于',
  not_contain: '不包含于',
  numerical_missing: '='
}

class ModelResultRule extends React.Component {

  exportCSV() {
    downloadTableData(this._table, '规则集')
  }

  createTableColumns(possibleLabel) {
    let {mappingDict} = this.props

    let order = ['是', '否', 'Y', 'N', '1', '0']
    possibleLabel = _.orderBy(possibleLabel, l => _.findIndex(order, l))
    let lossLabel = possibleLabel[0]
    let unLossLabel = possibleLabel[1]
    return [
      {
        title: '规则编号',
        key: 'index',
        dataIndex: 'index',
        width: 80
      }, {
        title: '规则描述',
        key: 'conds',
        dataIndex: 'conds',
        render: (conds, record) => {
          let cols = conds.map((cond, idx) => {
            let {value, splitType, attributeName} = cond
            if (splitType === 'greater' || splitType === 'less_equals') {
              return `${attributeName} ${SplitTypeDict[splitType] || splitType} ${value}`
            } else {
              let valArr = mappingDict[attributeName]
              return `${attributeName} ${SplitTypeDict[splitType] || splitType} ${valArr && valArr[value] || value}`
            }
          })
          return (
            `如果  ${cols.join('  并且  ')}`
          )
        }
      }, {
        title: '是否流失',
        key: 'label',
        dataIndex: 'label',
        width: 100
      }, {
        title: '总记录数',
        key: 'total',
        width: 100,
        sorter: (a, b) => a[lossLabel] + a[unLossLabel] - b[lossLabel] - b[unLossLabel],
        render: (val, record) => {
          return record[lossLabel] + record[unLossLabel]
        }
      }, {
        title: '流失用户数',
        key: 'lossCount',
        dataIndex: lossLabel,
        width: 100,
        sorter: (a, b) => a[lossLabel] - b[lossLabel]
      }, {
        title: '不流失用户数',
        key: 'unLossCount',
        dataIndex: unLossLabel,
        width: 120,
        sorter: (a, b) => a[unLossLabel] - b[unLossLabel]
      }, {
        title: '流失率',
        key: 'lossRate',
        width: 80,
        sorter: (a, b) => {
          let suma = a[lossLabel] / (a[lossLabel] + a[unLossLabel])
          let sumb = b[lossLabel] / (b[lossLabel] + b[unLossLabel])
          suma = isFinite(suma) ? suma : 0
          sumb = isFinite(sumb) ? sumb : 0
          return suma - sumb
        },
        render: (val, record) => {
          let sum = record[lossLabel] + record[unLossLabel]
          return sum === 0 ? '0.00%' : percentFormat(record[lossLabel] / sum)
        }
      }
    ]
  }

  transformRoot(root, condArr = []) {
    let {label, children, counterMap} = root

    // 一行的数据应有 条件，label, Y, N
    if (label) {
      return [{ conds: condArr, ...counterMap, label }]
    } else {
      return _.flatMap(children, childAndCond => this.transformRoot(childAndCond.child, [...condArr, childAndCond.condition]))
    }
  }

  render() {
    let {root, ...rest} = this.props
    let data = this.transformRoot(root)
    let possibleLabel = _.uniq(data.map(d => d.label))

    let dataWithIdx = data.map((d, idx) => ({...d, index: idx + 1}))
    return (
      <Table
        ref={ref => this._table = ref}
        rowKey="ruleNo"
        size="small"
        pagination={{
          showQuickJumper: true,
          showSizeChanger: true
        }}
        bordered
        columns={this.createTableColumns(possibleLabel)}
        dataSource={dataWithIdx}
        {...rest}
      />
    )
  }
}

export default ModelResultRule
