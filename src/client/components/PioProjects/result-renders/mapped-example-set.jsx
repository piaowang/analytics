/**
 * mapped_example_set结果
 */
import { Component } from 'react'
import { Table } from 'antd'
import pagination from './tablePagination'
import _ from 'lodash'

const typeMap = [
  'Attribute_value',
  'Nominal',
  'Numerical',
  'Integer',
  'Real',
  'String',
  'Binominal',
  'Polynominal',
  'File_path',
  'Date_time',
  'Date',
  'Time'
]

class MappedExampleSet extends Component {

  shouldComponentUpdate() {//每个结果都应该这样优化，但如果有内部state可以换用另一种方法，例如this._table=<Table .../>
    return false
  }

  toFixed(num) {
    return (num * 100).toFixed(2) + '%'
  }

  getProps(model) {
    const { attributeNames, attributes, dataList } = model
    if(!attributeNames.length) return {}

    let dataSource = dataList.map(d => {
      return d.map((v, i) => {
        let key = attributeNames[i]
        let attr = attributes.find(a => a.name === key)
        let values = _.get(attr, 'mapping.values')
        return values ? values[v] : v
      })
    })
    let columns = attributes.map((a, i) => {
      let {name, valueType} = a
      return {
        title: (
          <div>
            <b>{name}</b>
            <span className="color-grey">({typeMap[valueType]})</span>
          </div>
        ),
        dataIndex: i,
        key: name,
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
    let props = this.getProps(data.exampleTable)

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

export default MappedExampleSet
