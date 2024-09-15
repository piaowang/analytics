/**
 * 分类评估结果
 */
import { Component } from 'react'
import { Table } from 'antd'
import pagination from './tablePagination'

class PerformanceVector extends Component {

  toFixed(num) {
    return (num * 100).toFixed(2) + '%'
  }

  getProps(model) {
    const { averagable } = model
    if(!averagable.length) return {}
    const { classNames, classNameMap, counter } = averagable.find(a => a.dataType === 'multi_class_performance')
    let th = [''].concat(classNames.map(n => 'true ' + n))
    th.push('class precision')

    let dataSource = counter.map((c, i) => {
      let name = classNames[i]
      let total = 0
      let arr = classNames.map(n => {
        let t = c[classNameMap[n]]
        total += t
        return t
      })
      arr.push(this.toFixed(arr[i] / total))
      arr.unshift('pred. ' + name)
      return arr
    })
    let dataTotal = 0
    let accuracyTotal = 0
    let last = classNames.map((n, i) => {
      let index = i + 1
      let total = dataSource.reduce((prev, arr) => {
        return prev += arr[index]
      }, 0)
      dataTotal += total
      accuracyTotal += dataSource[i][index]
      return this.toFixed(dataSource[i][index] / total)
    })
    last.push('')
    last.unshift('class recall')

    dataSource.push(last)
    let columns = th.map((a, i) => {
      return {
        title: a,
        dataIndex: i,
        key: a,
        className: 'elli'
      }
    })

    return {
      accuracy: this.toFixed(accuracyTotal / dataTotal),
      columns,
      dataSource,
      scroll:{x: true}
    }
  }

  render() {
    const { data } = this.props
    let props = this.getProps(data)
    let accuracy = props.accuracy
    delete props.accuracy

    return (
      <div>
        <p className="pd1y">{'accuracy: ' + accuracy}</p>
        <Table 
          {...props}
          pagination={pagination}
          bordered
          size="small"
        />
      </div>
    )
  }
}

export default PerformanceVector
