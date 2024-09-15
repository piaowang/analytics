import React from 'react'
import ReactEcharts from 'echarts-for-react'
import echarts from 'echarts'
import {isEqualWithFunc} from '../../../../common/sugo-utils'
import {chartLightTheme,chartDarkTHeme} from '../../../common/echartThemes'
echarts.registerTheme('chartLightTheme',chartLightTheme)
echarts.registerTheme('chartDarkTHeme',chartDarkTHeme)

echarts.registerTheme('chartLightTheme',chartLightTheme)
echarts.registerTheme('chartDarkTHeme',chartDarkTHeme)

// https://github.com/hustcc/echarts-for-react/blob/master/src/echarts-for-react.js
export default class ReactEchartsEnhance extends React.Component {

  componentDidMount(){
    
  }
  
  shouldComponentUpdate = (nextProps) => {
    const shouldUpdate = this.props.optionsOverwriter !== nextProps.optionsOverwriter
      || !isEqualWithFunc(this.props.option, nextProps.option)
      || !isEqualWithFunc(this.props.style, nextProps.style)
      || !isEqualWithFunc(this.props.theme, nextProps.theme)
    return shouldUpdate
  }

  getEchartsInstance () {
    return this.refs.echarts.getEchartsInstance()
  }

  render() {
    let {optionsOverwriter, option, theme='light',...rest} = this.props
    let targetTheme = theme==='light'?'chartLightTheme':'chartDarkTHeme'
    let newOption =  optionsOverwriter ? optionsOverwriter(option) : option

    return (
      <ReactEcharts
        ref="echarts"
        theme={targetTheme}
        // option={_.omit(newOption, ['background', 'color', 'backgroundColor', 'grid'])}
        option={newOption}
        {...rest}
      />
    )
  }
}
