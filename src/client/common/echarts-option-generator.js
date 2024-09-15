/**
 * Created by heganjie on 16/9/12.
 */
import _ from 'lodash'
import baseOptions, {customLightTheme, customDarkTheme, domStylesToCss} from './echart-base-options'
import * as d3 from 'd3'
import metricFormatterFactory, {axisFormatterFactory} from '../common/metric-formatter-factory'
import {dictBy, immutateUpdate, stringMapper} from '../../common/sugo-utils'
import {dateFormatterGenerator} from '../common/date-format-util'
import {takeRepeat} from '../../common/sugo-utils'
import {ReplaceNullOrEmpty, RESPONSIVE_PAGE_MAX_WIDTH} from '../../common/constants'
import { chartLightTheme,chartDarkTHeme } from '../common/echartThemes'

let themeMap = {
  light:chartLightTheme,
  dark:chartDarkTHeme
}

export function defaultDimensionColumnFormatterGen(dimName, opts) {
  return /time/i.test(dimName) ? dateFormatterGenerator(opts && opts.customFormat || 'LL ddd') : null
}

const commaFormat = d3.format(',')

export const formatterForDisplayNull = val => stringMapper(val, ReplaceNullOrEmpty)

const echartsLikeTooltipFormatterGenerator = (xAxisFormatter, seriesNameFormatter, valFormatterBySeriesName) => params => {
  let valFormatterBySeriesIndex = pi => {
    return valFormatterBySeriesName(params[pi].seriesName) || commaFormat
  }

  let arr = _(params).filter(p => p.value !== undefined && isFinite(p.value)).take(15).map((p, pi) => {
    let seriesName = stringMapper(p.seriesName, ReplaceNullOrEmpty)
    let seriesFormatted = seriesNameFormatter ? seriesNameFormatter(seriesName) : seriesName
    let val = valFormatterBySeriesIndex(pi)( p.value || 0 )
    return `<span style='display:inline-block;margin-right:5px;border-radius:10px;width:9px;height:9px;background-color:${p.color}' ></span>${seriesFormatted} : ${val}`
  }).value()

  let xVal = xAxisFormatter ? xAxisFormatter(params[0].name) : stringMapper(params[0].name, ReplaceNullOrEmpty)
  if (15 < params.length) {
    return `${xVal}<br />${arr.join('<br />')}<br />更多内容请切换到表格查看`
  }
  return `${xVal}<br />${arr.join('<br />')}`
}

const animationDelay = idx => idx * 10
const animationDelayUpdate = idx => idx * 5

export const genCommonOption = () => ({
  ...baseOptions,
  title: {
    text: '',
    show: false,
    textStyle: {
      fontStyle: 'normal',
      fontSize: 13,
      color: '#777'
    }
  },
  grid: {
    left: 'auto',
    right: '4%',
    top: '50px',
    bottom: '10px',
    containLabel: true
  },
  backgroundColor: 'transparent',
  animationEasing: 'elasticOut',
  animationDelayUpdate: animationDelayUpdate
})

export function genOptionHas1DimensionsAndMultiMeasures(args) {
  let {
    data, xAxisName, yAxisNames, chartType = 'bar', timeFormat, translationDict = {},
    metricsFormatDict = {}, dimensionColumnFormatterGen = defaultDimensionColumnFormatterGen,
    showLegend, theme = chartLightTheme
  } = args
  if(typeof theme ==='string') theme = themeMap[theme] || chartLightTheme;

  let xCols = data.map(d => xAxisName ? d[xAxisName] : ' ')
  let xAxisFormatterForTooltip = dimensionColumnFormatterGen(xAxisName, {showComplete: true})
  let xAxisFormatter = dimensionColumnFormatterGen(xAxisName)

  let commonOption0 = genCommonOption()
  if (!showLegend) {
    commonOption0 = immutateUpdate(commonOption0, 'grid.top', () => '15px')
  } else if (window.outerWidth < RESPONSIVE_PAGE_MAX_WIDTH) {
    commonOption0 = immutateUpdate(commonOption0, 'grid.top', () => {
      let top = Math.ceil(_.size(yAxisNames) / 2) * 25
      return `${top}px`
    })
  }
  return {
    ...commonOption0,
    legend: {
      data: yAxisNames.map(n => translationDict[n] || n),
      show: showLegend,
      textStyle: {
        fontSize: theme.legend.textStyle.fontSize,
        color: theme.legend.textStyle.color,
        fontFamily: theme.textStyle.fontFamily,
        fontWeight: theme.textStyle.fontWeight,
        lineHeight: theme.textStyle.lineHeight,
      },
      ...(window.outerWidth < RESPONSIVE_PAGE_MAX_WIDTH ? {
        textStyle: { fontSize: 8 },
        itemWidth: 21,
        itemHeight: 10
      } : {})
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      formatter: echartsLikeTooltipFormatterGenerator(
        xAxisFormatterForTooltip,
        null,
        _.memoize(seriesName => {
          let metricName = _.findKey(translationDict, (sN, m) => sN === seriesName || m === seriesName)
          return metricFormatterFactory(metricsFormatDict[metricName])
        })),
      extraCssText: `
        white-space: pre-wrap;      /* CSS3 */
        white-space: -moz-pre-wrap; /* Firefox */
        white-space: -pre-wrap;     /* Opera <7 */
        white-space: -o-pre-wrap;   /* Opera 7 */
        word-wrap: break-word;      /* IE */
        ${domStylesToCss(theme.tooltip.domStyles)}
      `
    },
    xAxis: {
      type: 'category',
      data: xCols,
      silent: false,
      splitLine: {
        show: false,
        interval: 0
      },
      axisLabel: {
        interval: 'auto',
        formatter: xAxisFormatter && _.flow(xAxisFormatter, formatterForDisplayNull) || formatterForDisplayNull,
        fontSize: theme.textStyle.fontSize,
        fontFamily: theme.textStyle.fontFamily,
        color: theme.categoryAxis.axisLabel.textStyle.color,
        fontWeight: theme.textStyle.fontWeight,
        lineHeight: theme.textStyle.lineHeight
      },
      axisTick: {
        show: true,
        interval: 'auto',
        alignWithLabel: 15 <= xCols.length,
        length: theme.categoryAxis.axisTick.length,
        lineStyle: {
          color: theme.categoryAxis.axisTick.lineStyle.color,
          width: theme.categoryAxis.axisTick.lineStyle.width
        }
      },
      axisLine: {
        lineStyle: {
          color: theme.categoryAxis.axisLine.lineStyle.color,
          width: theme.categoryAxis.axisLine.lineStyle.width
        }
      },
      splitLine: {
        lineStyle: {
          color: theme.categoryAxis.splitLine.lineStyle.color,
          width: theme.categoryAxis.splitLine.lineStyle.width,
          type: theme.categoryAxis.splitLine.lineStyle.type,
        }
      } 
    },
    yAxis: {
      type: 'value',
      axisLine: {show: false},
      axisTick: {show: false},
      axisLabel: {
        formatter: yAxisNames.length === 1 ? axisFormatterFactory(metricsFormatDict[yAxisNames[0]]) : axisFormatterFactory(),
        fontSize: theme.textStyle.fontSize,
        fontFamily: theme.textStyle.fontFamily,
        color: theme.categoryAxis.axisLabel.textStyle.color,
        fontWeight: theme.textStyle.fontWeight,
        lineHeight: theme.textStyle.lineHeight
      },
      splitLine: {
        lineStyle: {
          color: theme.categoryAxis.splitLine.lineStyle.color,
          width: theme.categoryAxis.splitLine.lineStyle.width,
          type: theme.categoryAxis.splitLine.lineStyle.type,
        }
      }
    },
    series: yAxisNames.map(yAxisName => ({
      name: translationDict[yAxisName] || yAxisName,
      type: chartType,
      barMaxWidth: 20,
      label: {
        normal: {
          // 格式化label数据
          formatter: ({ value }) => metricFormatterFactory(metricsFormatDict[yAxisName])(value)
        }
      },
      data: data.map(d => d[yAxisName]),
      animationDelay: animationDelay
    }))
  }
}

export const NumberRangeReg = /(\d+(?:\.\d+)?)\D+?(\d+(?:\.\d+)?)/

export function genOptionHas2DimensionsAndSingleMeasures(args) {
  let {
    data, dimensions, yAxisName, chartType = 'bar', timeFormat = 'LL ddd', metricsFormatDict = {},
    dimensionColumnFormatterGen = defaultDimensionColumnFormatterGen,
    dimensionExtraSettingDict, theme = chartLightTheme
  } = args

  if(typeof theme ==='string') theme = themeMap[theme] || chartLightTheme;

  let [compareCol, xAxisName] = dimensions

  if (!data[0]) {
    throw new Error('查无数据')
  }

  let arrGroupName = _.findKey(data[0], _.isArray)
  let allXCols = _.flatMap(data, d => d[arrGroupName] || []).map(l2 => l2[xAxisName])
  if (!allXCols.length) {
    throw new Error('查无数据')
  }
  let xCols = _.uniq(allXCols)

  let xColExSetting = _.get(dimensionExtraSettingDict, dimensions[1])
  if (xColExSetting && xColExSetting.sortCol === dimensions[1]) {
    // 兼容数值范围的排序
    if (_.every(xCols.filter(_.identity), str => _.isString(str) && str.match(NumberRangeReg))) {
      xCols = _.orderBy(xCols, str => str ? +str.match(NumberRangeReg)[1] : 0, xColExSetting.sortDirect)
    } else {
      xCols = _.orderBy(xCols, _.identity, xColExSetting.sortDirect)
    }
  }

  let xAxisFormatterForTooltip = dimensionColumnFormatterGen(xAxisName, {showComplete: true})
  let compareColFormatterForTooltip = dimensionColumnFormatterGen(compareCol, {showComplete: true})

  let xAxisFormatter = dimensionColumnFormatterGen(xAxisName)
  let compareColFormatter = dimensionColumnFormatterGen(compareCol)

  // 完善柱图 tooltip：如果是柱图，则不需要为 value 补 0，否则需要
  let isBarChart = _.endsWith(chartType, 'bar'),
    valueFallbackToZero = !isBarChart
  return {
    ...genCommonOption(),
    legend: {
      data: data.map(d => d[compareCol]),
      formatter: compareColFormatter || undefined,
      textStyle: {
        fontSize: theme.textStyle.fontSize,
        color: theme.legend.textStyle.color,
        fontFamily: theme.textStyle.fontFamily,
        fontWeight: theme.textStyle.fontWeight,
        lineHeight: theme.textStyle.lineHeight,
      },
      ...(window.outerWidth < RESPONSIVE_PAGE_MAX_WIDTH ? {
        textStyle: { fontSize: 8 },
        itemWidth: 21,
        itemHeight: 10
      } : {})
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      formatter: echartsLikeTooltipFormatterGenerator(
        xAxisFormatterForTooltip,
        compareColFormatterForTooltip,
        () => metricFormatterFactory(metricsFormatDict[yAxisName])),
      extraCssText: `
        white-space: pre-wrap;      /* CSS3 */
        white-space: -moz-pre-wrap; /* Firefox */
        white-space: -pre-wrap;     /* Opera <7 */
        white-space: -o-pre-wrap;   /* Opera 7 */
        word-wrap: break-word;      /* IE */
        ${domStylesToCss(theme.tooltip.domStyles)}
      `
    },
    xAxis: {
      type: 'category',
      data: xCols,
      silent: false,
      splitLine: {
        show: false,
        interval: 0
      },
      axisLabel: {
        interval: 'auto',
        formatter: xAxisFormatter && _.flow(xAxisFormatter, formatterForDisplayNull) || formatterForDisplayNull,
        fontSize: theme.textStyle.fontSize,
        fontFamily: theme.textStyle.fontFamily,
        color: theme.categoryAxis.axisLabel.textStyle.color,
        fontWeight: theme.textStyle.fontWeight,
        lineHeight: theme.textStyle.lineHeight
      },
      axisTick: {
        show: xCols.length < 15,
        interval: 0,
        length: theme.categoryAxis.axisTick.length,
        lineStyle: {
          color: theme.categoryAxis.axisTick.lineStyle.color,
          width: theme.categoryAxis.axisTick.lineStyle.width
        }
      },
      axisLine: {
        lineStyle: {
          color: theme.categoryAxis.axisLine.lineStyle.color,
          width: theme.categoryAxis.axisLine.lineStyle.width
        }
      },
      splitLine: {
        lineStyle: {
          color: theme.categoryAxis.splitLine.lineStyle.color,
          width: theme.categoryAxis.splitLine.lineStyle.width,
          type: theme.categoryAxis.splitLine.lineStyle.type,
        }
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {show: false},
      axisTick: {show: false},
      axisLabel: {
        formatter: axisFormatterFactory(metricsFormatDict[yAxisName]),
        fontSize: theme.textStyle.fontSize,
        fontFamily: theme.textStyle.fontFamily,
        color: theme.categoryAxis.axisLabel.textStyle.color,
        fontWeight: theme.textStyle.fontWeight,
        lineHeight: theme.textStyle.lineHeight
      },
      splitLine: {
        lineStyle: {
         color: theme.categoryAxis.splitLine.lineStyle.color,
          width: theme.categoryAxis.splitLine.lineStyle.width,
          type: theme.categoryAxis.splitLine.lineStyle.type,
        }
      }
    },
    series: data.map(dHasArr => {
      let arr = dHasArr[arrGroupName]
      let xAxisDataDict = dictBy(arr, l2 => l2[xAxisName], l2 => l2[yAxisName])
      return ({
        name: stringMapper(dHasArr[compareCol], ReplaceNullOrEmpty),
        type: chartType,
        barMaxWidth: 20,
        label: {
          normal: {
            // 格式化label数据
            formatter: ({ value }) => metricFormatterFactory(metricsFormatDict[yAxisName])(value)
          }
        },
        data: valueFallbackToZero
          ? xCols.map(xc => xAxisDataDict[xc] || 0)
          : xCols.map(xc => xAxisDataDict[xc]),
        animationDelay: animationDelay
      })
    })
  }
}

export function legendColorMemoize(optionGener) {
  // 将使用中的颜色记录下来，移除掉没有在使用的颜色
  let colorCache = {}
  let candidateColors = baseOptions.color
  
  return (...args) => {
    let option = optionGener(...args)
    let legends = option.legend.data

    let prevLegends = Object.keys(colorCache).map(key => key === 'null' ? null : key)
    let existedLegends = _.intersection(prevLegends, legends)

    let newColorCache = _.pick(colorCache, existedLegends)

    let newLegends = _.difference(legends, prevLegends)
    let lockedColorLen = Object.keys(colorCache).length

    let colorWillUse = _.isEmpty(newLegends)
      ? []
      : _.drop(takeRepeat(candidateColors, lockedColorLen + newLegends.length), lockedColorLen)

    _.range(newLegends.length).forEach(i => {
      newColorCache[newLegends[i]] = colorWillUse[i]
    })
    colorCache = newColorCache

    option.color = legends.map(l => colorCache[l])
    return option
  }
}
