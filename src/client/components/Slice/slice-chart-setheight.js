import {immutateUpdate} from '../../../common/sugo-utils'
import measureTextWidth from '../../common/measure-text-width'
import _ from 'lodash'

let getMaxTextWidth = (data) => {
  let longestText = _.maxBy(data, measureTextWidth)
  return measureTextWidth(longestText) // * 1.1
}

const RotateDeg = 30

const sin30 = Math.sin(Math.PI * RotateDeg / 180)
const cos30 = Math.cos(Math.PI * RotateDeg / 180)

let getBottomOffsetInfo = (data, isThumbnail) => {
  let longestTextWidth = getMaxTextWidth(data)
  let firstTextWidth = measureTextWidth(data[0]) // * 1.1

  let height = Math.ceil(sin30 * longestTextWidth)
  let offsetLeft = Math.ceil(cos30 * firstTextWidth)
  return {
    offsetHeight: 100 < height && isThumbnail ? 100 : height + cos30 * 12, // 选择轴是文本的右上角，所以需要考虑文本高度的倾斜后高度
    offsetLeft
  }
}

let notNeedToRotateXAxisChartSet = new Set([
  'pie', 'tree_map', 'bubble', 'number', 'bullet', 'table', 'table_flat', 'map', 'arcgis', 'scatter_map', 'migration_map', 'horizontal_bar', 'balance_bar', 
  'beauty_gauge', 'gauge', 'gauge_1', 'radar', 'liquidFill', 'tree', 'force', 'chord', 'wordCloud', 'rich_text_list','rich_text_list_for_smart', 'pictorial_bar'
])

let rotateAxisText = ({isThumbnail, vizType}) => option => {
  if (notNeedToRotateXAxisChartSet.has(vizType)) {
    return option
  }
  // x 轴标签太稀疏的话，不需要倾斜
  // 稀疏的定义：sumOf date format width in px < chartWidth * 0.9
  let formatter = _.get(option, 'xAxis.axisLabel.formatter') || _.identity
  let strData = (_.get(option, 'xAxis.data') || []).map(formatter)

  let chartWidth = isThumbnail ? 260 : window.innerWidth - 471
  let dateWidth = _.sum(strData.map(str => measureTextWidth(str) + 10 /* margin */))
  let isTooSparse = dateWidth < chartWidth * 0.85
  if (isTooSparse) {
    // _displayCount 为自定义属性，表示强制显示的 label 数
    return immutateUpdate(option, 'xAxis.axisLabel._displayCount', () => strData.length)
  }
  let { offsetHeight, offsetLeft } = getBottomOffsetInfo(strData, isThumbnail)

  let newOption = immutateUpdate(option, 'xAxis.axisLabel', per => {
    let interval = 0
    if (10 < option.xAxis.data.length && isThumbnail) {
      interval = 'auto'
    } else if (50 <= option.xAxis.data.length) {
      interval = Math.ceil(option.xAxis.data.length / (isThumbnail ? 25 : 50))
    }
    return {
      ...per,
      rotate: RotateDeg,
      interval
    }
  })
  let boundaryGap = _.get(newOption, 'xAxis.boundaryGap')

  return immutateUpdate(newOption, 'grid', per => {
    let maxYAxisUILen
    if (vizType === 'heat_map') {
      // let formatter = _.get(newOption, 'yAxis.axisLabel.formatter') || _.identify
      // maxYAxisUILen = getMaxTextWidth((_.get(newOption, 'yAxis.data') || []).map(formatter))
      
      return ({
        ...per,
        bottom: offsetHeight + (vizType === 'heat_map' ? 50 : 0),
        left: 'auto' // Math.max(0, left)
      })
    } else if (newOption.yAxis.min === 0 && newOption.yAxis.max === 1) {
      maxYAxisUILen = measureTextWidth('100%')
    } else {
      let maxValue = _.max(_.flatMap(newOption.series, s => s.data).map(val => {
        if (_.isArray(val)) {
          throw new Error('Unknown how to pick value from array')
        } else {
          return val
        }
      }))
      maxYAxisUILen = measureTextWidth(maxValue + '0')
    }

    let left = per.left === 'auto' && offsetLeft < maxYAxisUILen
      ? 'auto'
      : Math.max(offsetLeft, maxYAxisUILen) + (boundaryGap ? 0 : - 30)
    return ({
      ...per,
      bottom: 'auto',// offsetHeight + (vizType === 'heat_map' ? 50 : 0),
      left: Math.max(0, left)
    })
  })
}

const truncateOption = {length: 11}
const truncate = val => _.truncate(val, truncateOption)

let notNeedToTruncateTextChartSet = new Set([
  'tree_map', 'beauty_gauge', 'gauge_1', 'bubble', 'number', 'bullet', 'table', 'table_flat', 'map', 'arcgis', 'scatter_map', 
  'migration_map', 'gauge', 'radar', 'liquidFill', 'tree', 'force', 'chord', 'wordCloud', 'rich_text_list',
  'rich_text_list_for_smart'
])
let truncateDisplayText = ({vizType, isThumbnail}) => option => {
  if (notNeedToTruncateTextChartSet.has(vizType)) {
    return option
  }
  let newOption = option
  if (vizType === 'pie') {
    if (_.isEmpty(newOption.series)) {
      return newOption
    }
    return immutateUpdate(newOption, 'series[0].label.normal.formatter', prevFormatter => {
      return _.flow([prevFormatter, val => {
        let indx = val.lastIndexOf(':')
        return _.truncate(val.substr(0, indx), truncateOption) + val.substr(indx + 1)
      }].filter(_.isFunction))
    })
  }else {
    // 限制最终显示的数据长度
    let preProcessAxis = vizType === 'heat_map'
      ? ['xAxis', 'yAxis']
      : (vizType === 'horizontal_bar' || vizType === 'balance_bar') ? ['yAxis'] : ['xAxis']
    preProcessAxis.forEach(axis => {
      newOption = immutateUpdate(newOption, `${axis}.axisLabel.formatter`, prevFormatter => {
        return _.flow([prevFormatter, truncate].filter(_.isFunction))
      })
    })
  }
  return newOption
}

export const smartIntervalForLeanDateLabel = (vizType, axisName) => options => {
  if (notNeedToRotateXAxisChartSet.has(vizType) && axisName === 'xAxis') {
    return options
  }
  let formatter = _.get(options, `${axisName}.axisLabel.formatter`) || _.identity
  let data = options[axisName].data.map(formatter)
  if (_.isEmpty(data)) {
    return options
  }

  let maxText = _.maxBy(data, measureTextWidth)
  let maxTextIdx = _.findIndex(data, s => s === maxText)
  let maxTextWidth = measureTextWidth(maxText)
  let longTextBeTrue = data.map(val => maxTextWidth * 0.90 < measureTextWidth(val))

  let firstLongTextIdx = _.findIndex(longTextBeTrue, _.identity)
  let secondLongTextIdx = firstLongTextIdx === -1 ? -1 : _.findIndex(longTextBeTrue, _.identity, firstLongTextIdx + 1)
  let longTextDistance = secondLongTextIdx !== -1 ? secondLongTextIdx - firstLongTextIdx : -1

  let isAxisRotated = _.isNumber(_.get(options, `${axisName}.axisLabel.rotate`))

  // _displayCount 为自定义属性，表示强制显示的 label 数
  let displayCount = _.get(options, `${axisName}.axisLabel._displayCount`) || (isAxisRotated ? 25 : 12.5) // 不倾斜的轴，label 需要更多的间隔
  return immutateUpdate(options,
    `${axisName}.axisLabel.interval`, oriInterval => {
      if (!_.isNumber(oriInterval) && !isFinite(`${oriInterval}`)) {
        oriInterval = Math.ceil(data.length / displayCount) - 1
      }
      if (longTextDistance !== -1 && oriInterval < longTextDistance) {
        // interval 适应日期显示，例如按小时分组时，longTextDistance 为 24，需要将 interval 调整为 x，24 % (x + 1) === 0
        oriInterval = _.find(_.range(oriInterval, longTextDistance), x => longTextDistance % (x + 1) === 0)
      }

      let mod = oriInterval + 1
      // (maxIdx + offset) % mod === 0 -> maxIdx % mod + offset === mod
      let alignToLongTextOffset = mod - maxTextIdx % mod

      return (index, value) => {
        return (index + alignToLongTextOffset) % mod === 0
      }
    })
}

export { rotateAxisText, truncateDisplayText }
