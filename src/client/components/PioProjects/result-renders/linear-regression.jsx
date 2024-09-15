import { Component } from 'react'
import { Table } from 'antd'
import pagination from './tablePagination'

class LinearRegression extends Component {

  toFixed(arr) {
    let res = arr.map(d => {
      if(typeof d === 'undefined' || d === null) return ''
      else return d.toFixed ? d.toFixed(3) : d
    })
    let p = arr[arr.length - 1]
    if(p < 0.001) p = '****'
    else if(p < 0.01) p = '***'
    else if(p < 0.05) p = '**'
    else if(p < 0.1) p = '*'
    else p = ''
    res.push(p)
    return res
  }

  getProps(model) {
    // let th = ['Attribute', 'Coefficient', 'Std.Error', 'Std.Coefficient', 'Tolerance', 't-Stat', 'p-Value', 'Code']
    let th = ['字段', '回归系数', '标准误差', '标准化系数', '容许值', 'T检验值', 'p值', '显著性']
    let columns = th.map((a, i) => {
      return {
        title: a,
        dataIndex: i,
        key: a,
        className: 'elli'
      }
    })

    let attrNames = model.attributeNames.filter((a, i) => model.selectedAttributes[i])
    attrNames = model.useIntercept ? attrNames.concat('(Intercept)') : attrNames

    let dataSource = attrNames.map((name, i) => {
      return this.toFixed([
        name,
        model.coefficients[i],
        model.standardErrors[i],
        model.standardizedCoefficients[i],
        model.tolerances[i],
        model.tStatistics[i],
        model.pValues[i]
      ])
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

export default LinearRegression
