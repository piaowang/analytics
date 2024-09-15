/**
 * FP增长树结果
 */
import { Component } from 'react'
import { Table } from 'antd'
import pagination from './tablePagination'

class FrequentItemSets extends Component {

  toFixed(val) {
    return val.toFixed ? val.toFixed(3) : val
  }

  getProps(model) {
    const { frequentSets } = model
    if(!frequentSets.length) return {}
    let th = ['Size', 'Support']
    let length = 0

    let dataSource = frequentSets.map(a => {
      let newA = {
        Size: a.items.length,
        Support: a.frequency / 1000
      }
      a.items.forEach((t, i) => newA['Item' + (i + 1)] = t.name)

      length = newA.Size > length ? newA.Size : length
      return newA
    })

    for(let i = 1; i <= length; i++) th.push('Item' + i)

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
    let { maximumSetSize, numberOfTransactions } = data
    let props = this.getProps(data)
    return (
      <div>
        <div>
          <p>{'No. of Sets: ' + numberOfTransactions}</p>
          <p>{'Total Max. Size: ' + maximumSetSize}</p>
          <p>{'min. Size: 1'}</p>
          <p>{'Max. Size: ' + maximumSetSize}</p>
        </div>
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

export default FrequentItemSets
