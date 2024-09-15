import { immutateUpdates } from '../../../../common/sugo-utils'
import _ from 'lodash'

//目前针对一个指标起作用
let warnFn = (warnList, vizType) => options => {
  return immutateUpdates(options, 'series', (series) => {
    return series.map(s => {
      return {
        ...s,
        data: (s.data || []).map(d => {
          //地图除了类型为map,其他type不处理
          if (vizType === 'map' && s.type !== 'map') return d

          //比较告警值与实际值，得到告警颜色
          let warnColor= ''
          //实际值
          let serieData = _.isPlainObject(d) ? +(d.value) : +d

          if (warnList[0].warnOp === '0' && serieData < warnList[0].warnValue) {
            warnColor = warnList[0].warnColor
          }else if (warnList[0].warnOp === '1' && serieData === warnList[0].warnValue) {
            warnColor = warnList[0].warnColor
          }else if (warnList[0].warnOp === '2' && serieData > warnList[0].warnValue) {
            warnColor = warnList[0].warnColor
          }else{
            warnColor= ''
          }
          //没有得到告警颜色，直接返回
          if (_.isEmpty(warnColor)) return d

          let newdata = ''
          switch (vizType) {
            case 'dist_bar':
            case 'horizontal_bar':
              newdata =  _.isPlainObject(d) 
                ? {
                  ...d,
                  'itemStyle': {
                    ...(d.itemStyle || {}),
                    'normal': {
                      ...(d.itemStyle.normal || {}),
                      'show': true,
                      'color': warnColor
                    }
                  }
                }
                : {
                  value: d,
                  'itemStyle': {
                    'normal': {
                      'show': true,
                      'color': warnColor
                    }
                  }
                }
              break
            case 'map':
              newdata = _.isPlainObject(d) 
                ? {
                  ...d,
                  selected:true,
                  'itemStyle': {
                    ...(d.itemStyle || {}),
                    'emphasis': {
                      'areaColor': warnColor
                    }
                  }
                }
                : {
                  value: d,
                  selected:true,
                  'itemStyle': {
                    'emphasis': {
                      'areaColor': warnColor
                    }
                  }
                }
              break
            default:
              newdata = d
              break
          }
          return newdata
        })
      }
    })
  })   
}

let scatter_map = (warnList, vizType) => options => {
  return immutateUpdates(options, 'series', (series) => {
    let newSeries = _.cloneDeep(series)

    //散点图在data设置的color受visualMap属性的影响，需要在series后添加新的serie对象
    series.map(s => {
      if (s.type !== 'scatter') return s
      
      let serie = {
        ...s,
        data: _.compact((s.data || []).map(d => {
          //比较告警值与实际值，得到告警颜色
          let warnColor= ''
          //实际值
          let serieData = +(d.value[2])

          if (warnList[0].warnOp === '0' && serieData < warnList[0].warnValue) {
            warnColor = warnList[0].warnColor
          }else if (warnList[0].warnOp === '1' && serieData === warnList[0].warnValue) {
            warnColor = warnList[0].warnColor
          }else if (warnList[0].warnOp === '2' && serieData > warnList[0].warnValue) {
            warnColor = warnList[0].warnColor
          }else{
            warnColor= ''
          }
          if (_.isEmpty(warnColor)) return null
          return _.isPlainObject(d) 
            ? {
              ...d,
              'itemStyle': {
                ...(d.itemStyle || {}),
                color: warnColor
              }
            }
            : {
              value: d,
              itemStyle: {
                color: warnColor
              }
            }
        }))
      }
      newSeries.push(serie)
      return s
    })
    return newSeries
  }, 'visualMap.seriesIndex', ()=> [0])   
}


export default {
  
  dist_bar: warnFn,

  horizontal_bar: warnFn,

  map: warnFn,

  scatter_map: scatter_map
}
