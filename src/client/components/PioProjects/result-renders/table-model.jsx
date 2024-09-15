import { Component } from 'react'
import { Radio, Table } from 'antd'
import pagination from './tablePagination'

const RadioGroup = Radio.Group
const RadioButton = Radio.Button

const weightColumns = [{
  title: 'Attribute',
  dataIndex: 'attribute',
  key: 'attribute'
}, {
  title: 'Weight',
  dataIndex: 'weight',
  key: 'weight'
}]

class TableModel extends Component {
  state = {
    tab: 'vector'
  }

  onChange = (e) => {
    this.setState({
      tab: e.target.value
    })
  }

  getVectorProps(model, attributeConstructions) {
    let th = ['counter', 'label', 'func', 'alpha', 'abs(alpha)'].concat(attributeConstructions)
    let columns = th.map((a, i) => {
      return {
        title: a,
        dataIndex: i,
        key: a,
        className: 'elli'
      }
    })

    let dataSource = model.atts.map((a, i) => {
      return [i, model.ids[i] ? 'YES' : 'NO', model.ys[i], model.alphas[i], Math.abs(model.alphas[i])].concat(a)
    })

    return {
      columns,
      dataSource,
      scroll:{x: true}
    }
  }

  render() {
    const { data } = this.props
    const { tab } = this.state
    let {
      attributeConstructions,
      weights,
      model
    } = data
    let classNames = {
      vector: 'hide',
      weight: 'hide'
    }
    classNames[tab] = ''

    let vectorProps = this.getVectorProps(model, attributeConstructions)

    let radioGroup = [
      <RadioButton value="vector" key="vector">支持向量表</RadioButton>
    ]

    let divs = [
      <div className={classNames['vector']} key="vector">
        <Table 
          {...vectorProps}
          pagination={pagination}
          bordered
          size="small"
        />
      </div>
    ]

    if(weights){
      let weightData = attributeConstructions.map((a, i) => {
        return {
          attribute: a,
          weight: weights[i] || 0
        }
      })
      radioGroup.push(<RadioButton value="weight" key="weight">权重表</RadioButton>)
      divs.push(
        <div className={classNames['weight']} key="weight">
          <Table 
            columns={weightColumns} 
            dataSource={weightData} 
            pagination={pagination}
            bordered
            size="small"
          />
        </div>
      )
    }

    return (
      <div>
        <div className={'tabs pd1y' + radioGroup.length > 1 ? '' : 'hide'}>
          <RadioGroup onChange={this.onChange} value={tab} size="small">
            {radioGroup}
          </RadioGroup>
        </div>
        {divs}
      </div>
    )
  }
}

export default TableModel
