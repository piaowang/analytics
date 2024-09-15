import React, { Component } from 'react'
import Fetch from '../../common/fetch-final'
import Timer from '../Common/timer'
import SliceChartFacade from '../Slice/slice-chart-facade'
import { message } from 'antd'

export default class ApiChart extends Component {

  state = {
    data: []
  }

  componentWillMount() {
    this.getData()
  }

  componentDidUpdate(prevProps) {
    if (prevProps.accessData !== this.props.accessData || prevProps.slice !== this.props.slice) {
      this.getData()
    }
  }

  getData = async () => {
    const { accessData, slice = {} } = this.props
    const { dataPath } = slice.params
    if (!_.isEmpty(accessData)) {
      let data = await Fetch.get(accessData, null)
      if (dataPath) {
        data = _.get(data, dataPath, '')
      }
      if (!data) {
        message.error('数据错误')
        this.setState({ data: [] })
        return
      }
      if (_.isArray(data)) {
        this.setState({ data })
      }
    }
  }

  render() {
    const { slice = {}, className , ...res} = this.props
    const { autoReloadInterval = 0 } = slice.params
    let newSlice = {
      ...slice,
      params: {
        ...slice.params,
        autoReloadInterval: 0
      }
    }
    return <div className={`height-100 ${className}`}>
      {
        autoReloadInterval > 0
          ? <Timer interval={autoReloadInterval * 1000} onTick={() => this.getData()} />
          : null
      }
      <SliceChartFacade {...res} slice={newSlice} druidData={this.state.data} />
    </div>
  }
}
