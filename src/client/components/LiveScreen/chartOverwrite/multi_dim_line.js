import { immutateUpdates } from '../../../../common/sugo-utils'
import _ from 'lodash'

export default function multi_dim_line(rop, seriesStyle = {}) {
  // if (seriesStyle.seriesDecorate) {
  //   try {
  //     const seriesDecorate = eval(seriesStyle.seriesDecorate)
  //     if (_.isFunction(seriesDecorate)) rop = seriesStyle.seriesDecorate(rop)
  //   } catch (e) {
  //     console.log(e, 'seriesDecorate Error===')
  //   }
  // }
  rop = immutateUpdates(
    rop,'series',
    (series) => {
      let seriesData = series.map((item, idx) => {
        let settingsLine = seriesStyle 
        && seriesStyle[`${item.name}_set`] || {}
        let { lineType = 'solid', lineWidth = 2, lineSmooth = true, areaStyleColor,
          showAreaStyle, lineColor, legendType = 'circle', pointIconSrc, legendIconSrc
        } = settingsLine
        let markPointData= []
        let markPointLable= {}
        let setPointType = ''
        let setPointSize = 20
        let setPointPosition = []
        let setShowLast = false
        let setPointColor = ''
        if (settingsLine) {
          let { showMax = false, showMin = false, showLast =false, maxFontSize = 12, maxColor = '', 
            maxPosition = 'top', pointType = 'circle', pointSize = 16, pointLeft = 0, pointTop = 0,
            pointColor = ''
          } = settingsLine
          markPointData = [
            showMax ? {type : 'max', name : '最大值'} : {},
            showMin ? {type : 'min', name : '最小值'} : {}
          ]
          markPointLable = {
            fontSize: maxFontSize,
            color: maxColor,
            position: maxPosition 
          }
          setPointType = pointType
          setPointSize = pointSize
          setPointPosition = [ pointLeft, pointTop ]
          setShowLast = showLast
          setPointColor = pointColor
        }
        let lastData = {}
        let lastData1 = {}
        if (setShowLast && item.data && _.isArray(item.data)) {
          if (_.isPlainObject(_.last(item.data))) {
            lastData = {
              coord: [item.data.length-1, _.last(item.data).value],
              symbol: 'emptyCircle',
              symbolSize:15,
              symbolOffset: [0, 0]
            }
            lastData1 = {coord: [item.data.length-1, _.last(item.data).value],
              value: _.last(item.data).value}
          }else{
            lastData = {
              coord: [item.data.length-1, _.last(item.data)],
              symbol: 'emptyCircle',
              symbolSize:15,
              symbolOffset: [0, 0]
            }
            lastData1 = {coord: [item.data.length-1, _.last(item.data)], value: _.last(item.data)}
          }
        } 
        return {
          ...item,
          symbol:legendType === 'custom'
            ? 'image://'+legendIconSrc
            : legendType, 
          lineStyle:{
            ...item.lineStyle,
            normal:{
              type: lineType,
              width: lineWidth,
              color: lineColor
            }
          },
          smooth: lineSmooth,
          areaStyle:{
            normal:{
              color: showAreaStyle ? areaStyleColor : 'transparent' 
            }
          },
          markPoint: {
            symbol: setPointType === 'custom' 
              ? 'image://'+pointIconSrc
              : setPointType,
            symbolSize: setPointSize ,
            symbolOffset: setPointPosition,
            data: [
              ...markPointData,
              lastData,//最后一个值，空心圆
              lastData1//最后一个值，选择图形
            ],
            label: markPointLable,
            itemStyle:{
              color: setPointColor
            }
          }       
        }
      })
      return seriesData
    },
    'legend.data',(data) => {
      return data.map(item => {
        let settingsLine = seriesStyle 
        && seriesStyle[`${item.name}_set`] || {}
        let { showLegend = true, legendType = 'circle', legendIconSrc } = settingsLine
        if (_.isPlainObject(item)) {
          return showLegend 
            ? {
              name: item.name,
              icon:legendType === 'custom'
                ? 'image://'+legendIconSrc
                : legendType
            } 
            : {}
        }
        return showLegend 
          ? {name: item, 
            icon: legendType === 'custom'
              ? 'image://'+legendIconSrc
              : legendType
          } 
          : {}
      })
    }
  )
  return rop
}