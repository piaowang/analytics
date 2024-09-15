import React, {Component} from 'react'
import PropTypes from 'prop-types'
import './index.styl'
import Alert from '../../Common/alert'
import metricFormatterFactory from '../../../common/metric-formatter-factory'
import TextFitter from '../../Common/text-fitter'
import {withSizeProviderDec} from 'client/components/Common/size-provider'

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
    dataValue: 0,
    editValue: 0
  }

  componentDidUpdate(prevProps) {
    if (!_.isEqual(prevProps.data, this.props.data)) {
      let {data, metrics, style, translationDict, metricsFormatDict, isThumbnail, option, spWidth, numberSpanOverWrite, className, ...rest} = this.props
      const { borderStyle, inputStyle } = option || {}
      let valObj = data[0]
      let metricFormatter = metricFormatterFactory(metricsFormatDict[metrics[0]])
      let formattedVal = metricFormatter(valObj[metrics[0]])
      this.setState({
        editValue: 0
      })
    }
  }

  render() {
    let {data, metrics, style, translationDict, metricsFormatDict, isThumbnail,
      option, spWidth, numberSpanOverWrite, className, applyInteractionCode, paramsData,
      ...rest
    } = this.props
    const { editValue } = this.state
    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} style={style} className={className} {...rest} />
    }
    let valObj = data[0]
    let dataValue = valObj[metrics[0]]
    const { borderStyle, inputStyle } = option || {}
    return (
      <div
        id="inputNumberChart"
        className={`inputNumberChart aligncenter hide-all-scrollbar-y overscroll-y relative ${className}`}
        style={style}
      >
        <input 
          value={editValue || 
            
            Math.round(dataValue)} 
          className="pd1y center-of-relative" 
          style={{
            outline: 'none',
            ...inputStyle,
            ...borderStyle
          }} 
          onChange={(e) => {
            this.setState({
              editValue: e.target.value 
            })
            applyInteractionCode({...paramsData, data, inputData: e.target.value, this:this})
          }}
        />
      </div>
    )
  }
}
