import _ from 'lodash'

/**
 * 为 x 轴加入 hover 响应，用法：
 * option.xAxis.triggerEvent = true
 * <ReactEcharts onEvents={genShowTooltipEventListener(this)} />
 */
export function genShowTooltipEventListener(compInst) {
  return {
    mousemove: _.debounce((params, myChart) => {
      // 显示 label 对应的柱子的 tooltip
      if (params.targetType !== 'axisLabel') {
        return
      }
      let {dimensions, data} = compInst.props
      const targetName = params.value
      const key = dimensions[0]
      const dataIdx = _.findIndex(data, d => d[key] === targetName)
      myChart.dispatchAction({
        type: 'showTip',
        seriesIndex: 0,
        dataIndex: dataIdx
      })
      // console.log('showTip: ', data[dataIdx])
      return true
    }, 300)
  }
}

/**
 * 为 x 轴加入 hover 响应，用于多维图表，用法：
 * option.xAxis.triggerEvent = true
 * <ReactEcharts onEvents={genShowTooltipEventListener(this)} />
 */
export function genShowTooltipEventListenerForMultiDim(compInst) {
  return {
    mousemove: _.debounce((params, myChart) => {
      // 显示 label 对应的柱子的 tooltip
      if (params.targetType !== 'axisLabel') {
        return
      }
      let option = myChart.getOption()
      const targetName = params.value
      const dataIdx = _.findIndex(_.get(option, 'xAxis[0].data', []), v => v === targetName)
      myChart.dispatchAction({
        type: 'showTip',
        seriesIndex: _.findIndex(option.series, s => !_.isNil(s.data[dataIdx]) && isFinite(s.data[dataIdx])),
        dataIndex: dataIdx
      })
      // console.log('showTip: ', data[dataIdx])
      // console.log('params: ', params)
      return true
    }, 300)
  }
}
