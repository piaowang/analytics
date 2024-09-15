import { Component } from 'react'
import PropTypes from 'prop-types'
import {Row, Col} from 'antd'
import './index.styl'
import Alert from '../../Common/alert'
import metricFormatterFactory from '../../../common/metric-formatter-factory'
import TextFitter from '../../Common/text-fitter'
import {withSizeProviderDec} from 'client/components/Common/size-provider'
import _ from 'lodash'
import { chartDarkTHeme,chartLightTheme } from '../../../common/echartThemes'

@withSizeProviderDec()
export default class BigNumberChart extends Component {
  static propTypes = {
    style: PropTypes.object,
    isLoading: PropTypes.bool,
    dimensions: PropTypes.array,
    metrics: PropTypes.array,
    translationDict: PropTypes.object,
    metricsFormatDict: PropTypes.object,
    data: PropTypes.array,
    isThumbnail: PropTypes.bool
  }

  static defaultProps = {
    metricsFormatDict: {}
  }

  state = {
    nowData: [0]
  }

  // componentDidMount() {
  //   const { data, metrics} = this.props
  //   if (!_.isEmpty(data) && !_.isEmpty(metrics)){
  //     let nowData = [...this.state.nowData, data[0][metrics[0]]]
  //     this.setState({nowData})
  //   }
  // }

  componentDidUpdate(preProps) {
    const { data, metrics} = preProps
    if (!_.isEmpty(data) && !_.isEmpty(metrics) && this.state.nowData.length === 1){
      let nowData = [...this.state.nowData, data[0][metrics[0]]]
      this.setState({nowData})
    }
    if (!_.isEqual(this.props.data, data)){
      let nowData = [...this.state.nowData, this.props.data[0][metrics[0]]]
      this.setState({nowData})
    }
  }

  render() {
    let { data, metrics, style, translationDict, metricsFormatDict, spWidth, numberSpanOverWrite, theme = 'light', settings, className, styleConfig,...rest } = this.props
    let targetTheme = theme === 'light' ? chartLightTheme : chartDarkTHeme
    let themeFontColor = _.get(targetTheme, 'bigNumber.color')
    let themeFontSize = _.get(targetTheme, 'bigNumber.fontSize')
    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} style={style} {...rest} />
    }
    const { borderStyle, titleStyle, numberStyle, layoutSetting = 'default', fixStyle = { color: '#FFF'}, prefix = '', suffix = '' } = _.isEmpty(settings) 
      ? _.get(styleConfig, '_extra.option', {}) : _.get(settings, '_extra.option', {}) 
    
    let valObj = data[0]
    return (
      <div
        className={`bigNumberChart aligncenter hide-all-scrollbar-y overscroll-y relative ${className}`}
        style={style}
      >
        {
          layoutSetting === 'scroll' ? <div style={{height: numberStyle.fontSize +'px', overflow: 'hidden'}}>
            <div style={{...numberStyle, transition: `all ${numberStyle.timer}s`, 
              transform: `translateY(-${(this.state.nowData.length-1) * numberStyle.fontSize}px)`}}
            >
              {
                this.state.nowData.map((item, i) => {
                  let metricFormatter = metricFormatterFactory(metricsFormatDict[metrics[0]])
                  return <div key={{i}} style={{lineHeight: numberStyle.fontSize-1 +'px',height: numberStyle.fontSize +'px'}}>{metricFormatter(item)}</div>
                })
              }
            </div>
          </div> :
            (metrics.length === 1
              ? (
                (yAxisName) => {
                  let metricFormatter = metricFormatterFactory(metricsFormatDict[yAxisName])
                  let formattedVal = metricFormatter(valObj[yAxisName])

                  const translateYAxisName = translationDict[yAxisName] || yAxisName
                  const txtNumber = (<h1 className="elli bold color-purple2 mg1b" title={formattedVal} style={numberStyle}>
                    {prefix ? <span style={fixStyle} className="pd1r">{prefix}</span> : null}
                    <TextFitter text={formattedVal} fontFamily="microsoft Yahei" maxFontSize={numberStyle && numberStyle.fontSize || 60} />
                    {suffix ? <span style={fixStyle} className="pd1l">{suffix}</span> : null}
                  </h1>)
                  if (layoutSetting === 'hideTitle') {
                    return (<div className="pd1y center-of-relative width-100" style={borderStyle}>
                      {txtNumber}
                    </div>)
                  }
                  const txtTitle = (<div className="metric-name elli" title={translateYAxisName} style={{ ...titleStyle, fontSize: themeFontSize, color: themeFontColor }}>
                    {translateYAxisName}
                  </div>)

                  if (layoutSetting === 'titleTop') {
                    return (<div className="pd1y center-of-relative width-100" style={borderStyle}>
                      {txtTitle}
                      {txtNumber}
                    </div>)
                  }
                  return (
                    <div className="pd1y center-of-relative width-100" style={borderStyle}>
                      {txtNumber}
                      {txtTitle}
                    </div>
                  )
                }
              )(metrics[0])
              : (
                <Row gutter={16} >
                  {metrics.map((yAxisName) => {
                    let metricFormatter = metricFormatterFactory(metricsFormatDict[yAxisName])
                    let formattedVal = metricFormatter(valObj[yAxisName])
                    const translateYAxisName = translationDict[yAxisName] || yAxisName
                    return (
                      <Col
                        span={numberSpanOverWrite || (768 <= spWidth ? 12 : 24)}
                        key={yAxisName}
                        className="mg2b"
                      >
                        <div className="pd1y" style={borderStyle}>
                          <h1 className="elli bold color-purple2" title={formattedVal} style={numberStyle}>
                            <TextFitter text={formattedVal} fontFamily="microsoft Yahei" maxFontSize={numberStyle && numberStyle.fontSize || 40} />
                          </h1>
                          <div className="metric-name elli" title={translateYAxisName} style={{ ...titleStyle, fontSize: themeFontSize, color: themeFontColor }}>
                            {translateYAxisName}
                          </div>
                        </div>
                      </Col>
                    )
                  })}
                </Row>
              ))
        }
      </div>
    )
  }
}

