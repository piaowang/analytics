import React from 'react'
import ReactEchartsCore from 'echarts-for-react/lib/core'
import {isEqualWithFunc} from '../../../../common/sugo-utils'
import echarts from 'echarts'
import {chartDarkTHeme, chartLightTheme} from '../../../common/echartThemes'
import ReactEcharts from 'echarts-for-react'

let registedTheme = false

// https://github.com/hustcc/echarts-for-react/blob/master/src/echarts-for-react.js
export default class ReactEchartsLazyLoad extends React.Component {
  constructor(props) {
    super(props);
    if (!registedTheme && props.echarts) {
      echarts.registerTheme('chartLightTheme', chartLightTheme)
      echarts.registerTheme('chartDarkTHeme', chartDarkTHeme)
      registedTheme = true
    }
  }
  
  shouldComponentUpdate = (nextProps) => {
    return this.props.optionsOverwriter !== nextProps.optionsOverwriter
      || !isEqualWithFunc(this.props.option, nextProps.option)
      || !isEqualWithFunc(this.props.style, nextProps.style)
  }

  getEchartsInstance () {
    return this.refs.echarts.getEchartsInstance()
  }

  render() {
    let {optionsOverwriter, option, echarts, theme='light', ...rest} = this.props
    let targetTheme = theme==='light'?'chartLightTheme':'chartDarkTHeme'
  
    return (
      <ReactEchartsCore
        ref="echarts"
        echarts={echarts}
        theme={targetTheme}
        option={optionsOverwriter ? optionsOverwriter(option) : option}
        {...rest}
      />
    )
  }
}
