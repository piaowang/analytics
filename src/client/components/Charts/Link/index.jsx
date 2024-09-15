import { Component } from 'react'

export default class EchartsLiquidFill extends Component {
  render() {
    let { sliceId, sliceName } = this.props
    return <a href={`/console/web-heat-map/${sliceId}`}>{sliceName}</a>
  }
}

