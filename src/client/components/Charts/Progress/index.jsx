import React, {Component} from 'react'
import PropTypes from 'prop-types'
/** @jsx jsx */
import { jsx, css } from '@emotion/core'
import * as d3 from 'd3'
import {Row, Col, Progress} from 'antd'
import './index.styl'
import Alert from '../../Common/alert'
import metricFormatterFactory from '../../../common/metric-formatter-factory'
import TextFitter from '../../Common/text-fitter'
import {withSizeProviderDec} from 'client/components/Common/size-provider'
import _ from 'lodash'

@withSizeProviderDec()
export default class ProgressChart extends Component {
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

  render() {
    let {
      data, metrics, style, translationDict, metricsFormatDict, isThumbnail, option, spWidth, numberSpanOverWrite, styleConfig,
      className, settings:{ setWarning }, ...rest
    } = this.props
    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} style={style} {...rest} />
    }
    const { borderStyle, titleStyle, numberStyle ={color: '#666'}, layoutSetting = 'default', fixStyle = { color: '#FFF'}, prefix = '', suffix = '', progressHeight } = _.get(styleConfig, '_extra.option', option) || {}
    let valObj = data[0]
    return (
      <div className={`progressChart aligncenter hide-all-scrollbar-y overscroll-y relative ${className}`} style={style}>
        {metrics.length === 1 || metrics.length === 2
          ? (
            (metrics) => {
              let yAxisName = metrics[0]
              let metricFormatter = metricFormatterFactory(metricsFormatDict[yAxisName])
              let value = metrics.length === 1 ? (valObj[yAxisName]*100).toFixed(1) : ((valObj[yAxisName]/valObj[metrics[1]])*100).toFixed(1)
              let formattedVal = metricFormatter(valObj[yAxisName])
              let sortWarning = _.sortBy(setWarning, 'scope')
              let colorStart = ''
              let colorEnd = ''
              sortWarning.map((item, idx)=>{
                if ((idx === 0 && value <= item.scope )
                 || (idx !== 0 && value > sortWarning[idx-1].scope && value <= item.scope)) {
                  colorStart = item.colorStart
                  colorEnd = item.colorEnd
                }
              })
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
              const txtTitle = (<div className="metric-name elli" title={translateYAxisName} style={titleStyle}>
                {translateYAxisName}
              </div>)

              if (layoutSetting === 'titleTop') {
                return (<div className="pd1y center-of-relative width-100" style={borderStyle}>
                  {txtTitle}
                  {txtNumber}
                </div>)
              }
              let numPosition = value >=100 ? 100 : value
              return (
                <div className="pd1y center-of-relative width-100" style={borderStyle}>
                  {
                    titleStyle && titleStyle.display === 'none'
                      ? null 
                      : <div className="pd1r" title={translateYAxisName} style={{...titleStyle,display: 'inline-block'}}>
                        {translateYAxisName}
                      </div>
                  }
                  {
                    <div className="iblock pd1r relative" style={{width: '70%'}}>
                      {
                        numberStyle.showInfo === false
                          ? null 
                          : <div className="pd1r" title={value} 
                            style={{...numberStyle,position:'absolute',top:'-50%',left:`${numPosition}%`,zIndex:1,transform: 'translate(-50%, -50%)'}}
                          >
                            {value}%
                          </div>
                      }
                      <Progress
                        showInfo = {false}
                        css={css`
                        .ant-progress-bg{
                          background-image: linear-gradient(to right,${colorStart} 0%,
                            ${d3.interpolateRgb(colorStart, colorEnd)(0.8)} 50%,${colorEnd} 100%);
                          height:${progressHeight}px !important;
                        }
                        .ant-progress-inner{
                          background-color: #070E22;
                        }
                        .ant-progress-outer{
                          padding:0;
                          margin:0;
                        }
                      `}
                        percent={value+''}
                      />
                    </div>
                  }
                </div>
              )
            }
          )(metrics)
          : (
            <Row gutter={16} >
              {metrics.map((yAxisName, idx) => {
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
                      <div className="metric-name elli" title={translateYAxisName} style={titleStyle}>
                        {translateYAxisName}
                      </div>
                    </div>
                  </Col>
                )
              })}
            </Row>
          )}
      </div>
    )
  }
}
