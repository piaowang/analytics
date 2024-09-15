import React, {Component} from 'react'
import PropTypes from 'prop-types'
import ReactEcharts from '../ReactEchartsEnhance'
import _ from 'lodash'
import Alert from '../../Common/alert'
import {isEqualWithFunc} from '../../../../common/sugo-utils'
import metricFormatterFactory  from '../../../common/metric-formatter-factory'
import measureTextWidth from '../../../common/measure-text-width'
import {defaultDimensionColumnFormatterGen} from '../../../common/echarts-option-generator'
import {genShowTooltipEventListener} from './show-tooltip-when-hover-axis-label'


export default class HorizontalBarChart extends Component {
  static propTypes = {
    dimensions: PropTypes.array,
    metrics: PropTypes.array,
    data: PropTypes.array,
    translationDict: PropTypes.object,
    metricsFormatDict: PropTypes.object,
    isThumbnail: PropTypes.bool,
    showLegend: PropTypes.bool,
    dimensionColumnFormatterGen: PropTypes.func,
    optionsOverwriter: PropTypes.func
  }

  static defaultProps = {
    metricsFormatDict: {},
    dimensionColumnFormatterGen: defaultDimensionColumnFormatterGen
  }

  shouldComponentUpdate(nextProps) {
    return this.props.optionsOverwriter !== nextProps.optionsOverwriter || !isEqualWithFunc(nextProps, this.props)
  }

  calcExtraMarginRight(option, metrics, metricsFormatDict) {
    // 解决缩略图右边数字不能完全显示
    let extraMarginRight = _.max(option.series.map((s, si) => {
      let metric = metrics[si]
      let metricFormat = metricsFormatDict[metric]
      let metricFormatter = metricFormatterFactory(metricFormat)
      let maxValInThisSeries = _.max(s.data) || 0
      let labelStrLength = metricFormatter(maxValInThisSeries)
      return measureTextWidth(labelStrLength + '0') * 1.1 / 2
    }))
    return Math.round(extraMarginRight)
  }
  
  onEchartsEvents = genShowTooltipEventListener(this)

  render() {
    let {data, dimensions, metrics, translationDict, isThumbnail, metricsFormatDict,
      dimensionColumnFormatterGen, showLegend, ...rest} = this.props

    if (!data || data.length === 0) {
      return <Alert msg={'查无数据'} {...rest} />
    }
    
    let yCols = data.map(d => dimensions[0] ? d[dimensions[0]] : ' ')
    let symbolBoundingData = _.max(metrics.map(yAxisName => {
      return _.max(data.map(d => d[yAxisName]))
    }))
    let option = {
      'title': {
        // 'text': '自定义象形柱图--PictorialBarCustomize',
        // 'left': 'center',
        // 'y': '10',
        // 'textStyle': {
        //   'color': '#fff'
        // }
        show: false
      },
      legend: {
        data: metrics.map(n => translationDict[n] || n),
        show: true
      },
      'backgroundColor': 'transparent',
      'grid': {
        'left': '20%',
        'top': '10%',
        'bottom': '10%'
      },
      'tooltip': {
        'trigger': 'item',
        'textStyle': {
          'fontSize': 12
        },
        'formatter': '{b0}:{c0}'
      },
      'xAxis': {
        'splitLine': {
          'show': false
        },
        'axisLine': {
          'show': false
        },
        'axisLabel': {
          'show': false
        },
        'axisTick': {
          'show': false
        }
      },
      'yAxis': {
        'type': 'category',
        'inverse': true,
        splitNumber: 10,
        'data': yCols,
        'axisLine': {
          'show': false
        },
        'axisTick': {
          'show': false
        },
        'axisLabel': {
          'textStyle': {
            'color': 'black',
            'fontSize': 16.25
          }
        }
      },
      series: _.flatten(metrics.map(yAxisName => {
        return  [{
          name: translationDict[yAxisName] || yAxisName,
          'type': 'pictorialBar',
          label: {
            normal: {
            // 格式化label数据
              formatter: ({ value }) => metricFormatterFactory(metricsFormatDict[yAxisName])(value)
            }
          },
          data: data.map(d => d[yAxisName]),
          'symbol': 'image://data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFoAAABaCAYAAAA4qEECAAADYElEQVR4nO2dz0sUYRjHP7tIdAmxQ1LdlhCKMohAIsgiyEuHjkUEFQTlpejS/xCCBB06RBGBBKIG4cGyH0qHBKE9eKyFqBQPRQeNCt06vGNY7bq7szPfeZLnAwuzM+/zgw/DDvMu70wOIVveLscJOwycA44A24CfwAfgKXAbeFVvovlC/o/vuVwuTj+x0FWiYdGbgXvA8RrjHgAXgIVaCbMU3SKr1BhtwEtgZx1jTwI7gG7ga5pNNUO+9pBMuEN9klfYD9xMqZdEsCj6AHAiRtxZYFeyrSSHRdGnYsblCD8jJrEoek8TsbsT6yJhLIrelFFsqlgUPZtRbKpYFP2kidjxxLpIGIuiB4AvMeLmgJGEe0kMi6I/AVdjxPVSx91hVlgUDXAXuEaY16jFMnAJeJhqR01iVTTAdeAYUFxjzBRwCLgl6agJrM51rDAO7AP2EmbxthPO8vfAc2Ams84axLpoCGKLrH1mm8eC6KPAGaAL2Fpj7AZgY7T9DfhRY/wc4eflPmH+OjOynI8uEGbpukXlJ4Dz84V8aWWHcj46q4thFzCNTjJRren2UrlLWPM3WYjuAMYIk/tq2oCx9lK5Q11YLboFGARaxXVX0woMtpfK0uuTWvRFoFNcsxKdhF5kqEX3iuuthbQXtehG/gdMG2kvlm/B1xUuWoSLFmFF9CRwg2TnM4pRzskEc8bGiugR4ArhNjkpJqKcJv51sSJ63eOiRbhoES5ahIsW4aJFuGgRLlqEixbhokW4aBEuWoSLFuGiRbhoES5ahIsW4aJFuGgRLlqEWvTHKvs/p1izWu5qvaSCWvTlCvtmgeEUaw5TeUVtpV5SQy16COgBRoHXhMWb3aS7PnAhqjEQ1RwFeuYL+aEUa/5DFmtYHkefOEwQVmcBvKD+FQNvgNN/P+pHiV8MRbhoES5ahIsW4aJFuGgRLlqEixbhokW4aBEuWoSLFuGiRbhoES5ahIsW4aJFuGgRLlqEixbhokVYEx3nudGKXE1jTfS6xUWLcNEiXLQIFy3CRYtw0SJctAgXLcJFi3DRIv430eUq2+axJvp7jePPqmzHySXFmuhHwFKVYzNA/6rv/VR/s9BSlMsM1kTPEN4DPkU4I8vAO6APOAgsrhq7GO3ri8aUo5ipKIep1zv9AtipgOACGIrLAAAAAElFTkSuQmCC',
          'symbolRepeat': 'fixed',
          'symbolMargin': '5%',
          'symbolClip': true,
          'symbolSize': 22.5,
      
          symbolBoundingData,
          'z': 10
        },
        {
          'type': 'pictorialBar',
          'itemStyle': {
            'normal': {
              'opacity': 0.3
            }
          },
          label: {
            normal: {
              show: false
            }
          },
          data: data.map(d => d[yAxisName]),
          'animationDuration': 0,
          'symbolRepeat': 'fixed',
          'symbolMargin': '5%',
          'symbol': 'image://data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFoAAABaCAYAAAA4qEECAAADYElEQVR4nO2dz0sUYRjHP7tIdAmxQ1LdlhCKMohAIsgiyEuHjkUEFQTlpejS/xCCBB06RBGBBKIG4cGyH0qHBKE9eKyFqBQPRQeNCt06vGNY7bq7szPfeZLnAwuzM+/zgw/DDvMu70wOIVveLscJOwycA44A24CfwAfgKXAbeFVvovlC/o/vuVwuTj+x0FWiYdGbgXvA8RrjHgAXgIVaCbMU3SKr1BhtwEtgZx1jTwI7gG7ga5pNNUO+9pBMuEN9klfYD9xMqZdEsCj6AHAiRtxZYFeyrSSHRdGnYsblCD8jJrEoek8TsbsT6yJhLIrelFFsqlgUPZtRbKpYFP2kidjxxLpIGIuiB4AvMeLmgJGEe0kMi6I/AVdjxPVSx91hVlgUDXAXuEaY16jFMnAJeJhqR01iVTTAdeAYUFxjzBRwCLgl6agJrM51rDAO7AP2EmbxthPO8vfAc2Ams84axLpoCGKLrH1mm8eC6KPAGaAL2Fpj7AZgY7T9DfhRY/wc4eflPmH+OjOynI8uEGbpukXlJ4Dz84V8aWWHcj46q4thFzCNTjJRren2UrlLWPM3WYjuAMYIk/tq2oCx9lK5Q11YLboFGARaxXVX0woMtpfK0uuTWvRFoFNcsxKdhF5kqEX3iuuthbQXtehG/gdMG2kvlm/B1xUuWoSLFmFF9CRwg2TnM4pRzskEc8bGiugR4ArhNjkpJqKcJv51sSJ63eOiRbhoES5ahIsW4aJFuGgRLlqEixbhokW4aBEuWoSLFuGiRbhoES5ahIsW4aJFuGgRLlqEWvTHKvs/p1izWu5qvaSCWvTlCvtmgeEUaw5TeUVtpV5SQy16COgBRoHXhMWb3aS7PnAhqjEQ1RwFeuYL+aEUa/5DFmtYHkefOEwQVmcBvKD+FQNvgNN/P+pHiV8MRbhoES5ahIsW4aJFuGgRLlqEixbhokW4aBEuWoSLFuGiRbhoES5ahIsW4aJFuGgRLlqEixbhokVYEx3nudGKXE1jTfS6xUWLcNEiXLQIFy3CRYtw0SJctAgXLcJFi3DRIv430eUq2+axJvp7jePPqmzHySXFmuhHwFKVYzNA/6rv/VR/s9BSlMsM1kTPEN4DPkU4I8vAO6APOAgsrhq7GO3ri8aUo5ipKIep1zv9AtipgOACGIrLAAAAAElFTkSuQmCC',
          'symbolSize': 22.5,
          symbolBoundingData,
          'z': 5
        }
        ]
        
      }))
    }

    return (
      <ReactEcharts
        {...rest}
        option={option}
        notMerge
        onEvents={rest.onEvents ? {...rest.onEvents, ...this.onEchartsEvents} : this.onEchartsEvents}
      />
    )
  }

}

