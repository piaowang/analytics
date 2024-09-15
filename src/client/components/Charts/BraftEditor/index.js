import React, {useMemo,Component} from 'react'
import PropTypes from 'prop-types'
import {Row, Col} from 'antd'
import Alert from '../../Common/alert'
import metricFormatterFactory from '../../../common/metric-formatter-factory'
import TextFitter from '../../Common/text-fitter'
import {withSizeProviderDec} from 'client/components/Common/size-provider'
import {Carousel} from 'antd'
import './css.styl'
import 'braft-editor/dist/output.css'
import * as d3 from 'd3'
import _ from 'lodash'
import moment from 'moment'

@withSizeProviderDec()
export default class RichTextList extends Component {
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
    let {settings, data, dimensions, metrics, style, translationDict, metricsFormatDict, isThumbnail, option, spWidth, numberSpanOverWrite, className, ...rest} = this.props

    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} {...rest} />
    }
    const { htmlTemplate, pageSize, dots, autoplay, vertical, richTextList, parameters = [], parametersWarning = [], richTextListSrc } = settings || {}
    data = _.dropWhile(data, {[dimensions[0]]: '全局'})
    let contentData= Object.keys(_.omit(data[0], dimensions[0] || '')).map(yAxisName => {
      let translateYAxisName = translationDict[yAxisName] || yAxisName
      let translateYAxisNameChange =richTextList && richTextList[translateYAxisName] || translateYAxisName
      let setSrc =richTextListSrc && richTextListSrc[translateYAxisName] || ''
      //let translateYAxisNameChange =richTextList && richTextList[translateYAxisName] || translateYAxisName
      //实际值-目标值
      let extra = {}
      if (data[0][yAxisName] >= data[1][yAxisName]) {
        parameters.forEach((item) => {
          extra = {
            ...extra,
            ...item
          }
        })
      }else{
        parametersWarning.forEach((item) => {
          extra = {
            ...extra,
            ...item
          }
        })
      }
      return {y1: translateYAxisNameChange,
        y2: moment().format('YYYY-MM-DD'),
        y3:  setSrc,
        ...extra
      }
    }
    )
  
    return (
      <div className={`braft-editor-comp height-100 ${className}`} >
        <Carousel
          autoplay={autoplay}
          vertical={vertical}
          dots={dots}
          className="height-100"
        >
          {
            _(contentData)
              .chunk(pageSize)
              .map((dArr, idx) => {
                return (
                  <div key={idx}>
                    {_.map(dArr, (d, j) => {
                      let html = htmlTemplate
                      try {
                        html = _.template(htmlTemplate)(d)
                      } catch (e) {
                        debug(e.message)
                      }
                      return (
                        <div
                          key={j}
                          className="braft-output-content"
                          dangerouslySetInnerHTML={{__html: html}}
                        />
                      )
                    })
                    }
                  </div>
                )
              })
              .value()
          }
        </Carousel>
      </div>
    )
  }
}


