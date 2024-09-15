/**
 * 未使用的列
 */
import React, { Component } from 'react'
import { Checkbox } from 'antd'

export default class NoUseColumn extends Component {
  constructor(props) {
    super(props)
    this.state = {
      list: [],
      checkData: []
    }
  }

  componentDidMount() {
    const { noUseList } = this.props
    let obj = []
    noUseList.map(item => {
      obj.push(item.name)
    })
    this.setState({
      list: obj
    })
  }

  onChange = list => {
    this.setState({
      checkData: list
    })
  }

  render() {
    return (
      <div>
        <Checkbox.Group options={this.state.list} onChange={this.onChange} />
      </div>
    )
  }
}
