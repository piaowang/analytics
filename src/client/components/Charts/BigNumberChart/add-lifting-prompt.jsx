import React, {Component} from 'react'
import PropTypes from 'prop-types'
import './index.styl'
import Alert from '../../Common/alert'
import _ from 'lodash'
import metricFormatterFactory from '../../../common/metric-formatter-factory'
import TextFitter from '../../Common/text-fitter'
import {withSizeProviderDec} from 'client/components/Common/size-provider'
import BigNumberChart from './index'
import Icon2 from '../../Common/sugo-icon'

@withSizeProviderDec()
export default class BigNumberChartLift extends Component {
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
  
  renderDualMetric = () => {
    let {settings: {iconsUrl}, data, metrics, style, translationDict, metricsFormatDict, isThumbnail, styleConfig, option, spWidth, numberSpanOverWrite, ...rest} = this.props
    const { pictureStyle, borderStyle, titleStyle, numberStyle, layoutSetting = 'default', fixStyle = { color: '#FFF'}, prefix = '', suffix = '', setData = {toFixed: 2} } = _.get(styleConfig, '_extra.option', option) || {}
    let valObj = data[0]
    let [yAxisName, yAxisName1] = metrics
    let metricFormatter = metricFormatterFactory(metricsFormatDict[yAxisName])
    let formattedVal1 = +valObj[yAxisName]
    let formattedVal2 = +valObj[yAxisName1]
    let formattedVal = formattedVal1-formattedVal2
    let sortIconsUrl = _.sortBy(iconsUrl, 'scope')
    let iconSrc = ''
    let iconType = ''
    let iconColor = ''
    sortIconsUrl.map((item, idx)=>{
      if ((idx === 0 && formattedVal <= item.scope )
       || (idx !== 0 && formattedVal > sortIconsUrl[idx-1].scope && formattedVal <= item.scope)) {
        iconSrc = item.iconSrc
        iconType = item.iconType
        iconColor = item.iconColor
      }
    })
    let newFormattedVal = ''
    if(setData.isPercent){
      newFormattedVal = (formattedVal*100).toFixed(setData.toFixed) + '%'
    }else{
      newFormattedVal = formattedVal.toFixed(setData.toFixed)
    }
    const translateYAxisName = translationDict[yAxisName] || yAxisName
    const txtNumber = (
      <h1 className="elli bold color-purple2 mg1b" title={newFormattedVal} style={numberStyle}>
        {prefix ? <span style={fixStyle} className="pd1r">{prefix}</span> : null}
        <TextFitter text={newFormattedVal} fontFamily="microsoft Yahei" maxFontSize={numberStyle && numberStyle.fontSize || 60} />
        {suffix ? <span style={fixStyle} className="pd1l">{suffix}</span> : null}
      </h1>
    )
    if (layoutSetting === 'hideTitle') {
      return (
        <div className="pd1y center-of-relative width-100" style={borderStyle}>
          {txtNumber}
        </div>
      )
    }
    const txtTitle = (
      <div className="metric-name elli" title={translateYAxisName} style={titleStyle}>
        {translateYAxisName}
      </div>
    )
    
    if (layoutSetting === 'titleTop') {
      return (
        <div className="pd1y center-of-relative width-100" style={borderStyle}>
          {txtTitle}
          {txtNumber}
        </div>
      )
    }
    return (
      <div className="pd1y center-of-relative width-100" style={borderStyle}>
        {txtNumber}
        {txtTitle}
        {
          iconType === 'antd'
            ? (
              <Icon2
                type={iconSrc}
                style={{
                  right: 18,
                  top: 18,
                  fontSize: pictureStyle && pictureStyle.size || 32,
                  color: iconColor,
                  ...pictureStyle
                }}
                className="pointer pd1l absolute"
              />
            ) :<img
              className="pointer pd1l absolute"
              style={{
                right: 18,
                top: 18,
                width: pictureStyle && pictureStyle.size || 32,
                height: pictureStyle && pictureStyle.height || 32,
                ...pictureStyle
              }}
              src={iconSrc}
              alt=""
            />
        }
        
      </div>
    )
  }

  render() {
    let { data, metrics, style, className, translationDict, metricsFormatDict, isThumbnail, option, spWidth, numberSpanOverWrite, ...rest} = this.props
    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} style={style} {...rest} />
    }

    if (metrics.length !== 2) {
      return (
        <BigNumberChart {...this.props} />
      )
    }
    return (
      <div className={`bigNumberLiftChart aligncenter hide-all-scrollbar-y overscroll-y relative ${className}`} style={style}>
        {this.renderDualMetric()}
      </div>
    )
  }
}
