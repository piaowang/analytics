
import React, {Component} from 'react'
import PropTypes from 'prop-types'
/** @jsx jsx */
import { jsx, css } from '@emotion/core'
import * as d3 from 'd3'
import _ from 'lodash'
import './bulletChart.styl'
import Alert from '../../Common/alert'
import metricFormatterFactory from '../../../common/metric-formatter-factory'
import TextFitter from '../../Common/text-fitter'
import {withSizeProviderDec} from 'client/components/Common/size-provider'

const bloc_arrows = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
<path id="bloc_arrows" fill="#7689c0" class="cls-1" d="M1381.41,770.467h0l-4,4-1-1,4-4-4-4,1-1,5,4.994Z" transform="translate(-1373.41 -763.469)"/>
</svg>`

function createSvgByColor(svgSrc, fill, height) {
  const finalSrc = svgSrc.replace(/fill="[^"]+"/, `fill="${fill}"`)
  return `data:image/svg+xml;base64,${btoa(finalSrc)}`
}

@withSizeProviderDec()
export default class BulletChart extends Component {

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

  renderTitle = () => {
    let {
      data, metrics, style, translationDict, metricsFormatDict, option,
      className, styleConfig, settings, ...rest
    } = this.props
    if (!data || data.length === 0) {
      return null
    }
    const { titleStyle } =  _.get(styleConfig, '_extra.option', {})
    return (<div className="text-container" style={titleStyle}>
      {
        metrics.map((item, idx) => {
          if (idx === 0) {
            return null
          }
          let metricsSetting =  option && option[translationDict[item]] || {}
          let metricsData = data[0][metrics[0]]-data[0][item]
          return (
            <React.Fragment key={item}>
              <span className="pd1r" style={{color: titleStyle && titleStyle.textColor || '#7689C0'}}>{metricsData >= 0 ? '超' : '欠'}{ metricsSetting.changName || translationDict[item]}</span>
              <span style={{color: titleStyle && titleStyle.numColor || '#D5DCF1', marginRight: '15px'}}>{(Math.abs(metricsData)).toFixed(2)}</span>
            </React.Fragment>)
        })
      } 
    </div>)
  }

  render() {
    let {
      data, metrics, style, translationDict, metricsFormatDict, isThumbnail, option, spWidth, numberSpanOverWrite,
      className, ...rest
    } = this.props
    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} style={style} {...rest} />
    }
    const { borderStyle, bulletStyle, layoutSetting = 'default', bulletContentStyle } = option || {}
    
    //排序
    let metricsData = _.omit(data[0],metrics[0])
    let metricsDataArr=[]
    for(let key in metricsData){
      metricsDataArr.push({data:metricsData[key],name:key})
    }
    metricsDataArr = _.sortBy(metricsDataArr, 'data')
    let maxData = _.max(metrics.map(item => {
      return data[0][item]
    }))

    let barWidth = ''
    let averageRatio = 85 / metricsDataArr.length
    let firstData = data[0][metrics[0]]
    metricsDataArr.map((item, idx) => {
      let metricsData = averageRatio * (idx + 1)
      if (idx === 0 && firstData < item.data) {
        barWidth = averageRatio * (firstData/ item.data)
      }else if (idx === metricsDataArr.length-1 && firstData >= item.data) {
        barWidth = firstData === item.data ? metricsData : metricsData + 10
      }else if (firstData >= item.data && firstData < (metricsDataArr && metricsDataArr[idx+1].data)) {
        barWidth = metricsData + averageRatio * ((firstData - item.data)/(metricsDataArr[idx+1].data - item.data))
      }
    })
    //let barWidth = data[0][metrics[0]] / (maxData) * 100
    return (
      <div className={`bulletChart aligncenter hide-all-scrollbar-y overscroll-y relative ${className}`} style={style}>
        {
          <div className="pd1y center-of-relative width-100"
            style={{...borderStyle, left:(bulletStyle && bulletStyle.containerLeft || 50) + '%'}}
          >
            {
              layoutSetting === 'titleTop' || layoutSetting === 'hideTitle' ? null 
                : this.renderTitle()
            }
            <div className="container" style={bulletStyle}>
              <div className="bar-other"
                style={
                  {
                    width: '100%',
                    borderRadius: '9px',
                    background: 'rgba(68,77,228,0)',
                    backgroundImage: `url(${createSvgByColor(bloc_arrows, firstData > metricsDataArr[metricsDataArr.length-1].data 
                      ? (option && option[translationDict[metrics[0]]] || {}).background 
                      : '#7689C0')})`,
                    backgroundRepeat: 'repeat-x',
                    backgroundSize: (bulletContentStyle && bulletContentStyle.height || 14) + 'px',
                    ...bulletContentStyle
                  }
                }
              />
              <div className="bar" 
                style={
                  {
                    width: barWidth + '%',
                    ...bulletContentStyle,
                    background:firstData > metricsDataArr[metricsDataArr.length-1].data 
                      ? (option && option[translationDict[metrics[0]]] || {}).background
                      : 'rgba(0,0,0,0)'
                  }
                }
                ref="bar"
              />
              {
                metricsDataArr.map((item, idx) => {
                  let metricsSetting =  option && option[translationDict[item.name]] || {}
                  //let metricsData = data[0][item.name] / (maxData) * 100
                  let metricsData = averageRatio * (idx + 1)
                  let arrows = ''
                  if(idx>=1 && barWidth < metricsData && barWidth < metricsData - averageRatio){
                    arrows = 'rgba(118,137,192,1)'
                  }
                  if(
                    idx>=1 
                    && barWidth <= metricsData 
                    && barWidth > metricsData - averageRatio  
                    || (
                      idx === 0
                      && barWidth < metricsData 
                    )
                  ){
                    if (this.refs.bar){
                      this.refs.bar.style.zIndex= 11 + metrics.length-idx
                      this.refs.bar.style.background = metricsSetting.background
                    }
                  }
                  return (<div className="bar-other" key={idx}
                    style={
                      {
                        zIndex:10 + metrics.length-idx,
                        width: metricsData + '%',
                        borderRadius: '9px 0 0 9px',
                        background: barWidth >= metricsData ? metricsSetting.background || '#F6E594'  : 'rgba(68,77,228,0)',
                        backgroundImage: `url(${createSvgByColor(bloc_arrows, arrows || (barWidth >= metricsData ? 'rgba(68,77,228,0)' : metricsSetting.background || '#7689C0'))})`,
                        backgroundRepeat: 'repeat-x',
                        backgroundSize: (bulletContentStyle && bulletContentStyle.height || 14) + 'px',
                        ...bulletContentStyle
                      }
                    }
                          />)
                })
              }
              {
                metricsDataArr.map((item, idx) => {
                  //渲染方块
                  let metricsSetting =  option && option[translationDict[item.name]] || {}
                  //实际比例
                  //let metricsData = data[0][item.name] / (maxData) * 100
                  //美观比例
                  let metricsData = averageRatio * (idx + 1)
                  return <div key={idx} className="square1" style={{left: metricsData + '%', ...metricsSetting}}>{ metricsSetting.changName || translationDict[item.name]}</div>
                })
              }
            </div>
            {
              layoutSetting !== 'titleTop' ? null 
                : this.renderTitle()
            }
          </div>
        }
      </div>
    )
  }
}
