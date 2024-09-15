/**
 * 创建关联规则的结果展示
 */
import { Component } from 'react'
import { Table } from 'antd'
import pagination from './tablePagination'

class AssociationRules extends Component {

  toFixed(val) {
    return val.toFixed ? val.toFixed(3) : val
  }

  getProps(model) {
    const { associationRules } = model
    if(!associationRules.length) return {}

    let th = Object.keys(associationRules[0])
    let columns = th.map((a) => {
      return {
        title: a,
        dataIndex: a,
        key: a,
        className: 'elli'
      }
    })

    let dataSource = associationRules.map(a => {
      let newA = {}
      for(let key in a) newA[key] = this.toFixed(a[key])
      return newA
    })

    return {
      columns,
      dataSource,
      scroll:{x: true}
    }
  }

  render() {
    const {data} = this.props
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

export default AssociationRules
