import React from 'react'
import _ from 'lodash'
import moment from 'moment'
import ReactEcharts from '../../components/Charts/ReactEchartsEnhance'
import {genOptionHas1DimensionsAndMultiMeasures} from '../../common/echarts-option-generator'
import {extractWindowData} from './data-transform'
import PubSub from 'pubsub-js'

export default class LineViz extends React.Component {

  componentDidMount() {
    // let echarts_instance = this._echart.getEchartsInstance()
    // echarts_instance.on('legendselectchanged', this.onEchartsLegendChanged)
    // echarts_instance.on('click', this.onDataPointClick)
  }

  onDataPointClick = (obj) => {
    let {
      currFunnel: {
        params: {
          funnelLayers2d = [],
          granularity
        }
      }
    } = this.props

    let {seriesName, name: since} = obj

    let until = moment(since).add(moment.duration(granularity)).add(-1, 'ms').format('YYYY-MM-DD HH:mm:ss.SSS')
    let m = seriesName.match(/第\s(\d+)\s步转化率/)
    let stepNumber = m[1] * 1
    PubSub.publish('sugoFunnel.onShowLostUser', {
      lossBeforeStepIdx: stepNumber,
      relativeTime: 'custom',
      since,
      until
    })
  }

  onEchartsLegendChanged = (obj) => {
    /*{
     "name": "总体",
     "selected": {
     "总体": true,
     "第 1 步转化率": true,
     "第 2 步转化率": true,
     "第 3 步转化率": false
     },
     "type": "legendselectchanged"
     }*/
    let {onLineChartStepToggle} = this.props
    if (obj.name === '总体') {
      onLineChartStepToggle(0)
    } else {
      let m = obj.name.match(/第\s(\d+)\s步转化率/)
      onLineChartStepToggle(m[1] * 1)
    }
  }

  render() {
    let {
      currFunnel: {
        params: {
          funnelLayers2d = [],
          compareType,
          compareByDimension
        }
      },
      funnelCompareGroupName,
      funnelTotalData,
      funnelDataAfterGroupBy,
      hideSteps,
      isLoadingChartData,
      isComparing,
      theme='light'
    } = this.props
    console.log(this.props,'line-viz')
    let statisticData = funnelCompareGroupName === '总体' ? funnelTotalData : (funnelDataAfterGroupBy[funnelCompareGroupName] || [])

    let chartData = extractWindowData(statisticData, _.size(funnelLayers2d))

    let allLines = this.props.currFunnel.params.funnelLayers2d.map((l, i) => i === 0 ? '总体' : `第 ${i} 步转化率`)

    let steps = _.isEmpty(hideSteps) ? _.range(allLines.length) : _.range(allLines.length).filter(idx => !_.includes(hideSteps, idx))
    let activeLines = steps.map(s => s === 0 ? '总体' : `第 ${s} 步转化率`)

    let option = genOptionHas1DimensionsAndMultiMeasures({
      data: chartData || [],
      xAxisName: 'timestamp',
      yAxisNames: allLines,
      chartType: 'line',
      theme
    })
    option.legend.selected = _.zipObject(allLines, allLines.map(step => _.includes(activeLines, step)))
    option.legend.right = 20
    option.grid = {
      ...option.grid,
      bottom: '20px',
      left: '30px',
      right: '30px',
      top: isComparing
        ? `${10 + Math.ceil(allLines.length / 2) * 20}px`
        : `${10 + Math.ceil(allLines.length / 4) * 20}px`
    }

    if (isLoadingChartData) {
      return (
        <p className="pd2">加载中...</p>
      )
    }

    return (
      <div className="height-100 relative corner border bg-white" >
        <ReactEcharts
          className="width-100 height-100 center-of-relative"
          style={{maxHeight: '300px', minHeight: '135px'}}
          {...this.props}
          // ref={ref => this._echart = ref }
          option={option}
          notMerge
        />
      </div>
    )
  }
}
