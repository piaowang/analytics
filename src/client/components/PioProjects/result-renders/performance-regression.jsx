/**
 * 回归评估结果展示
 */
import { Component } from 'react'
import { Table } from 'antd'
import pagination from './tablePagination'

class PerformanceRegression extends Component {

  getProps(model) {
    let { description } = model
    let values = description.match(/:.*\n/g).map(v => v.replace(/^[:\s]+|\n$/g, ''))
    let keys = description.match(/-.*\:/g).map(k => k.replace(/^-+|:$/g, ''))
    
    let th = ['评估指标', '评估值']

    let dataSource = keys.map((key, i) => {
      return {
        key,
        'value': values[i]
      }
    })

    let columns = th.map((a) => {
      return {
        title: a,
        dataIndex: a,
        key: a,
        className: 'elli'
      }
    })

    return {
      columns,
      dataSource,
      scroll:{x: true}
    }
  }

  render() {
    const { data } = this.props
    let props = this.getProps(data)

    return (
      <Table 
        {...props}
        pagination={pagination}
        bordered
        size="small"
      />
    )
  }
}

export default PerformanceRegression
