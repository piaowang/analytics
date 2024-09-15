import SizeProvider from '../../Common/size-provider'
import _ from 'lodash'
import FunctionPlot from '../FunctionPlot'
import React from 'react'
import PropTypes from 'prop-types'
import * as d3 from 'd3'
import {defaultStepInfo} from '../../LiveScreen/chartStyle/step_progress'
import Icon2 from '../../Common/sugo-icon'
import measureTextWidth from '../../../common/measure-text-width'

const {PI, max, floor, atan, round, abs} = Math

const mathFunction = x => {
  // http://www.iquilezles.org/apps/graphtoy/
  // floor((x)/2) + max(0, x%2-1)
  return floor(x / 2) + max(0, x % 2 - 1)
}

function getRotateBySlope(func, x, delta = 0.01) {
  let d = (func(x + delta) - func(x - delta)) / (2 * delta)
  return atan(d) * 180 / PI
}

export default function StepProgress(props) {
  const { settings, className, style, data, translationDict, dimensions, metrics, metricsFormatDict } = props
  const {
    stepInfos, progressColor, progressBgColor, progressPadding, progressHeight, progressWidth = 4, progressMetricName,
    progressDotSize, iconType, iconSrc, progressDotColor, progressPinLineWidth = 2, pinLineWidth = 1, compareLineWidth = 1
  } = settings || {}
  // stepInfo: {metricName, title, titleColor, titleFontSize, compareTemplate, compareColor, compareFontSize,
  //             compareLineHeight, notFullDotColor, fullDotColor}
  
  let valObj = data && data[0]
  let progressVal = _.get(valObj, progressMetricName) || 0
  
  // sorted: {value, progress, chartProgress}
  let targetValues = _(stepInfos)
    .filter(si => si.metricName)
    .map(si => ({stepInfo: si, value: +_.get(valObj, si.metricName) || 0}))
    .orderBy(d => d.value, 'asc')
    .thru(data => {
      let maxTarget = _.last(data)
      if (!maxTarget) {
        return []
      }
      if (maxTarget.value < progressVal) {
        // tail
        data = [...data, {value: progressVal}]
      }
      // chartProgress: (v - start) / (end - start)
      return _.map(data, (d, i) => {
        let start = i === 0 ? 0 : data[i - 1].value
        let end = d.value
        return {...d, chartProgress: _.clamp((progressVal - start) / (end - start + 1e-6), 0, 1)}
      })
    })
    .value()

  const finalProgressWidthRatio = 1 - 2 * (parseFloat(progressPadding || 0) / 100)
  const finalProgressHeightRatio = parseFloat(progressHeight) / 100
  
  const maxX = _.size(stepInfos) * 2 + 1
  const chartXScale = _.clamp(targetValues.reduce((acc, curr) => acc + curr.chartProgress * 2, 0), 0, maxX)
  const chartProgress = chartXScale / maxX
  const domainX = [0, maxX]
  const domainY = [-0.05, mathFunction(maxX) / finalProgressHeightRatio] // [0, mathFunction(maxX)]
  return (
    <div
      className={`height-100 ${className}`}
      style={style}
    >
      <SizeProvider>
        {({spWidth, spHeight}) => {
          let rScaleY = d3.scaleLinear()
            .domain(domainY)
            .range([spHeight, 0])
          const lastTargetCompareTitleLineHeight = _(targetValues)
            .chain()
            .map(tv => tv.stepInfo)
            .filter(_.identity)
            .last()
            .get('compareLineHeight', 32)
            .value()
          const pinHeight = spHeight * (1 - finalProgressHeightRatio) - (lastTargetCompareTitleLineHeight / 2)
          const progressDotTop = rScaleY(mathFunction(chartXScale))
          const chartWidth = Math.round(spWidth * finalProgressWidthRatio)
          const chartMarginLeft = Math.round((spWidth - chartWidth) / 2)
          return (
            <div
              className="relative height-100"
              style={{
                marginLeft: `${chartMarginLeft}px`
              }}
            >
              {/* bg */}
              <FunctionPlot
                className="absolute top0 left0"
                domainX={domainX}
                domainY={domainY}
                mathFunction={mathFunction}
                width={chartWidth}
                height={spHeight}
                lineWidth={progressWidth}
                lineFill={progressBgColor}
              />
              {/* progress */}
              <FunctionPlot
                className="absolute top0 left0"
                domainX={domainX}
                domainY={domainY}
                data={_.range(round(chartWidth * chartProgress))}
                mathFunction={mathFunction}
                width={chartWidth}
                height={spHeight}
                lineWidth={progressWidth}
                lineFill={progressColor}
              />
              {/* dot, title, comparing... */}
              {_.map(targetValues, (tv, i) => {
                // Xpx -> scale -> call func -> y -> unScale -> Ypx
                const xScale = (i + 1) * 2
                const finalX = chartWidth * xScale / maxX
                const finalY = rScaleY(mathFunction(xScale))
            
                const stepInfo = _.defaults({}, tv.stepInfo, defaultStepInfo)
                const compareTitle = _.template(stepInfo.compareTemplate)({
                  v: _.round(progressVal - tv.value, 2),
                  current: progressVal,
                  target: tv.value
                })
                const compareTitleWidth = measureTextWidth(compareTitle, stepInfo.compareFontSize) * 1.1
                const pinHeadSize = stepInfo.dotSize * 5 / 8
                return (
                  <React.Fragment>
                    {/* title */}
                    <div
                      className="absolute"
                      style={{
                        left: `${finalX}px`,
                        top: `${finalY + 5 + stepInfo.dotSize / 2}px`,
                        color: stepInfo.titleColor,
                        fontSize: `${stepInfo.titleFontSize}px`
                      }}
                    >
                      {stepInfo.title}
                    </div>
                
                    {/* pin head */}
                    <div
                      className="absolute"
                      style={{
                        left: `${finalX}px`,
                        top: `${finalY - pinHeight}px`,
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: stepInfo.titleColor,
                        borderRadius: `${pinHeadSize}px`,
                        width: pinHeadSize,
                        height: pinHeadSize
                      }}
                    >
                      {/* pin line */}
                      <div
                        className="absolute"
                        style={{
                          left: '50%',
                          width: '0px',
                          height: `${pinHeight}px`,
                          borderLeft: `${pinLineWidth}px dashed ${stepInfo.pinLineColor}`
                        }}
                      />
  
                      {/* compare line */}
                      <div
                        className="absolute"
                        style={{
                          left: `${(tv.value < progressVal ? 0 : -abs(chartXScale - xScale) / maxX * chartWidth) + pinHeadSize / 2}px`,
                          top: '50%',
                          width: `${abs(chartXScale - xScale) / maxX * chartWidth}px`,
                          height: '0px',
                          borderTop: `${compareLineWidth}px dashed ${stepInfo.compareLineColor}`
                        }}
                      />
  
                      {/* compare icon */}
                      <div
                        className="absolute"
                        style={{
                          left: `${tv.value < progressVal ? 150 : -50}%`,
                          top: '50%',
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        <Icon2
                          type="caret-right"
                          className="center-of-relative pointer"
                          style={{
                            color: stepInfo.titleColor,
                            transform: `translate(-50%, -50%) rotate(${tv.value < progressVal ? 180 : 0}deg)`,
                            fontSize: progressDotSize * 2 / 3
                          }}
                        />
                      </div>
                      
                      {/* compare title */}
                      <div
                        className="absolute elli"
                        style={{
                          left: `${tv.value < progressVal ? -compareTitleWidth / 2 - 5 : compareTitleWidth / 2 + pinHeadSize + 5}px`,
                          top: '50%',
                          color: stepInfo.compareColor,
                          fontSize: stepInfo.compareFontSize,
                          lineHeight: `${stepInfo.compareLineHeight}px`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        {compareTitle}
                      </div>
                    </div>
                    
                    {/* step dot */}
                    <div
                      className="absolute"
                      style={{
                        left: `${finalX}px`,
                        top: `${finalY}px`,
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: tv.chartProgress === 1 ? stepInfo.fullDotColor : stepInfo.notFullDotColor,
                        borderRadius: `${stepInfo.dotSize}px`,
                        width: stepInfo.dotSize,
                        height: stepInfo.dotSize
                      }}
                    />
                  </React.Fragment>
                )
              })}
              
              {/* progress indicator */}
              <div
                className="absolute"
                style={{
                  left: `${chartWidth * chartXScale / maxX}px`,
                  top: `${progressDotTop}px`,
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: progressDotColor,
                  borderRadius: `${progressDotSize}px`,
                  width: progressDotSize,
                  height: progressDotSize
                }}
              >
                {iconType === 'antd'
                  ? (
                    <Icon2
                      type={iconSrc}
                      className="center-of-relative pointer"
                      style={{
                        color: '#fff',
                        transform: `translate(-50%, -50%) rotate(${-getRotateBySlope(mathFunction, chartXScale) || 0}deg)`,
                        fontSize: progressDotSize * 2 / 3
                      }}
                    />
                  ) : (
                    <img
                      className="center-of-relative pointer"
                      style={{
                        transform: `translate(-50%, -50%) rotate(${-getRotateBySlope(mathFunction, chartXScale) || 0}deg)`,
                        width: progressDotSize * 2 / 3,
                        height: progressDotSize * 2 / 3
                      }}
                      src={iconSrc}
                      alt=""
                    />
                  )}
              </div>
              
              {/* progress pin */}
              <div
                className="absolute"
                style={{
                  left: `${chartWidth * chartXScale / maxX}px`,
                  top: `${lastTargetCompareTitleLineHeight / 2}px`,
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: progressDotColor,
                  borderRadius: `${progressDotSize * 5 / 8}px`,
                  width: progressDotSize * 5 / 8,
                  height: progressDotSize * 5 / 8
                }}
              >
                <div
                  className="absolute"
                  style={{
                    left: '50%',
                    width: '0px',
                    height: `${progressDotTop - lastTargetCompareTitleLineHeight / 2}px`,
                    borderLeft: `${progressPinLineWidth}px solid ${progressDotColor}`
                  }}
                />
              </div>
            </div>
          )
        }}
      </SizeProvider>
    </div>
  )
}

StepProgress.propTypes = {
  style: PropTypes.object,
  isLoading: PropTypes.bool,
  dimensions: PropTypes.array,
  metrics: PropTypes.array,
  translationDict: PropTypes.object,
  metricsFormatDict: PropTypes.object,
  data: PropTypes.array,
  isThumbnail: PropTypes.bool
}

StepProgress.defaultProps = {
  metricsFormatDict: {}
}
