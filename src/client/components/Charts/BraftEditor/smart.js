import React, { useMemo, Component } from 'react'
import PropTypes from 'prop-types'
import { Row, Col } from 'antd'
import Alert from '../../Common/alert'
import metricFormatterFactory from '../../../common/metric-formatter-factory'
import TextFitter from '../../Common/text-fitter'
import { withSizeProviderDec } from 'client/components/Common/size-provider'
import { Carousel } from 'antd'
import './css.styl'
import 'braft-editor/dist/output.css'
import _ from 'lodash'
import moment from 'moment'

@withSizeProviderDec()
export default class SmartRichTextList extends Component {
  static propTypes = {
    style: PropTypes.object,
    isLoading: PropTypes.bool,
    dimensions: PropTypes.array,
    metrics: PropTypes.array,
    translationDict: PropTypes.object,
    metricsFormatDict: PropTypes.object,
    data: PropTypes.array,
    isThumbnail: PropTypes.bool
  };

  static defaultProps = {
    metricsFormatDict: {}
  };

  getData = (druidData=[], i=0, dimensions, netData, obj={}) => {
    druidData.map(d => {
      if(dimensions[i+1]) {
        this.getData(d[`${dimensions[i+1]}_GROUP`], i+1, dimensions, netData, {...obj, [dimensions[i]]: d[dimensions[i]]})
      }else {
        netData.push({
          ...obj,
          ...d
        })
      }
    })
    return netData
  }

  render() {
    let {
      settings,
      data,
      dimensions,
      metrics,
      style,
      translationDict,
      metricsFormatDict,
      isThumbnail,
      option,
      spWidth,
      numberSpanOverWrite,
      className,
      druidData,
      ...rest
    } = this.props

    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} {...rest} />
    }

    const { htmlTemplate, pageSize, dots, autoplay, vertical,sorting='default',
      iconSrc, imgWidth=32, imgHeight=32, showSrc='true', autoplaySpeed=3000, layout='vertical',
      positionX=0, positionY=0, cellWidth=120, topSpacing=0, imgSrc='default', link='default',
      target='inside'
    } = settings || {}
    let netData = this.getData(druidData, 0, dimensions, [])
    netData = sorting === 'default' || _.isEmpty(metrics) ? netData
      : (
        sorting === 'desc' ? _.orderBy(netData, [metrics[0]], ['desc'])
          : _.orderBy(netData, [metrics[0]], ['asc'])
      )
    let contentData = netData.map(
      d => {
        let Obj = {}
        Object.keys(d).map((key, i) => {
          Obj[`y${i+1}`] = d[key] 
        })
        return Obj
      }
    )
    let newContentData = _.cloneDeep(contentData).map((c, i) => {
      Object.keys(c).map(key => {
        c[key] = `<span class="iblock pointer" style='width: ${cellWidth}px;'>${c[key]}</span>`
      })
      return {...c, y0: `<span class="iblock" style='width: ${cellWidth}px;'>${i+1}</span>`}
    })
    return (
      <div className={`braft-editor-comp height-100 ${className}`}>
        <Carousel 
          autoplaySpeed={autoplaySpeed}
          autoplay={autoplay}
          vertical={vertical}
          dots={dots}
          className="height-100"
        >
          {_(newContentData)
            .chunk(pageSize)
            .map((dArr, idx) => {
              return (
                <div key={idx}>
                  {_.map(dArr, (d, j) => {
                    let data = _.get(_.chunk(contentData, pageSize), `[${idx}][${j}]`, {})
                    
                    let html = htmlTemplate
                    try {
                      html = _.template(htmlTemplate)(d)
                    } catch (e) {
                      debug(e.message)
                    }
                    return (
                      <div 
                        className={layout === 'vertical' ? 'relative' :  'relative itblock'} 
                        style={{marginTop: topSpacing + 'px'}}
                      >
                        {
                          showSrc ? (<img
                            className="pointer absolute"
                            style={{
                              width: imgWidth,
                              height: imgHeight,
                              top: positionY + 'px',
                              left: positionX + 'px'
                            }}
                            onClick={()=>{
                              if(link === 'default' || !data['y' + link]) return
                              if (target === 'inside') {
                                window.location.href = data['y' + link]
                                return
                              }
                              window.open(data['y' + link])
                            }}
                            src={data['y' + imgSrc] || iconSrc}
                            alt=""
                          />) : null
                        }
                        <div
                          key={j}
                          className="braft-output-content"
                          onClick={()=>{
                            if(link === 'default' || !data['y' + link]) return
                            if (target === 'inside') {
                              window.location.href = data['y' + link]
                              return
                            }
                            window.open(data['y' + link])
                          }}
                          dangerouslySetInnerHTML={{ __html: html }}
                        />
                      </div>
                    )
                  })}
                </div>
              )
            })
            .value()}
        </Carousel>
      </div>
    )
  }
}
