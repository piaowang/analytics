import React, {useEffect, useState, useMemo} from 'react'
import * as d3 from 'd3'
import _ from 'lodash'

export default function FunctionPlot(props) {
  let {
    mathFunction, width, height, data = _.range(width), domainX = [-1, 1], domainY = [-1, 1],
    lineWidth, lineFill = '#fff100', ...rest
  } = props
  
  let scaleX = d3.scaleLinear()
    .domain([0, width])
    .range(domainX)

  let rScaleY = d3.scaleLinear()
    .domain(domainY)
    .range([height, 0])
  
  let path = useMemo(() => {
    // Xpx -> scale -> call func -> y -> unScale -> Ypx
    let borderLineData = _(data)
      .map(xPx => ({x: xPx, y: rScaleY(mathFunction(scaleX(xPx)))}))
      .thru(lineDotArr => {
        let yOffset = lineWidth / 2
        return [
          ...lineDotArr.map(p => ({...p, y: p.y + yOffset})),
          ...[...lineDotArr].reverse().map(p => ({...p, y: p.y - yOffset}))
        ]
      })
      .value()
    let line = d3.line()
      .x(d => d.x)
      .y(d => d.y)
      .curve(d3.curveCatmullRom.alpha(0.5))
    
    return line(borderLineData)
  }, [mathFunction, width, height, domainX, domainY])
  
  return (
    <svg width={width} height={height} {...rest}>
      <g>
        <path d={path} stroke="transparent" fill={lineFill} />
      </g>
    </svg>
  )}
