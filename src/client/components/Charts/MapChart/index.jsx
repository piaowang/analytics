import Base from './base'
import ReactEcharts from '../ReactEchartsEnhance'
import _ from 'lodash'
import baseOptions from '../../../common/echart-base-options'
import Alert from '../../Common/alert'
import echarts from 'echarts'
import metricFormatterFactory, {axisFormatterFactory} from '../../../common/metric-formatter-factory'
import Fetch from '../../../common/fetch-final'
import {buildUrl, defaultMapName} from './common'
import { chartLightTheme,chartDarkTHeme } from '../../../common/echartThemes'

let mapNameDict = {}

export default class EchartsMap extends Base {

  initData = async () => {
    this.setState({
      loading: true
    })
    let {mapName = defaultMapName} = this.props.settings || {}
    let data = await Fetch.get(
      buildUrl(mapName)
    )
    if (!mapNameDict[mapName]) {
      mapNameDict[mapName] = data
      echarts.registerMap(mapName, data)
    }
    this.setState({
      loading: false
    })
  }

  onEvents = () => {
    return {}
  }

  dataAdaptToMap(groupName, data, substitutions) {
    // 找出 geoZoneTitles 中，最相似的值，并替换 data 原来到值
    let twoWordTree = _.groupBy(substitutions, v => v.substr(0, 2))
    return data.map(d => {
      let groupVal = d[groupName]
      if (!groupVal) {
        return null
      }
      let subsArr = twoWordTree[groupVal.toString().substr(0, 2)]
      return subsArr && subsArr.length === 1 ? {...d, [groupName]: subsArr[0]} : null
    }).filter(_.identity)
  }

  render() {
    let {data, dimensions, metrics, translationDict, metricsFormatDict, isThumbnail, showLegend,theme='light', ...rest} = this.props
    let targetTheme = theme === 'light'?chartLightTheme:chartDarkTHeme
    if (dimensions.length !== 1) {
      return <Alert msg={'请为地图选择一个省份维度'} {...rest} />
    }

    let {loading} = this.state
    let {mapName = defaultMapName} = this.props.settings || {}
    if (loading) {
      return (
        <div className="aligncenter pd3">载入中...</div>
      )
    }
    // if (!mapName) {
    //   return (
    //     <Select
    //       dropdownMatchSelectWidth={false}
    //       showSearch
    //       style={{width: 200, display: 'block', margin: '0 auto'}}
    //       value={mapName}
    //       placeholder="选择地图类型"
    //       optionFilterProp="children"
    //       onChange={value => {
    //         this.setState({mapName: value})
    //       }}
    //       notFoundContent="没有内容"
    //     >
    //       <Select.Option value="china">中国地图</Select.Option>
    //     </Select>
    //   )
    // }

    if (!data || data.length === 0) {
      return <Alert msg={'查无数据，请为地图选择一个省份维度'} {...rest} />
    }

    let xAxisName = dimensions[0]
    let yAxisNames = _.take(metrics, 1)
    let features = _.get(mapNameDict, `${mapName}.features`) || []
    data = this.dataAdaptToMap(xAxisName, data, features.map(f => f.properties.name))

    if (!data || data.length === 0) {
      return <Alert msg={'查无数据，请为地图选择一个省份维度'} {...rest} />
    }

    let array = data.map(d => d[yAxisNames[0]])

    let min = array.length && _.min(array) || 0
    let max = Math.max(min + 1, array.length && _.max(array) || 1)

    let valFormatter = metricFormatterFactory(metricsFormatDict[yAxisNames[0]])

    let axisFormatter = axisFormatterFactory(metricsFormatDict[yAxisNames[0]])
    let option = {
      ...baseOptions,
      tooltip: {
        confine: true,
        trigger: 'item',
        formatter: (params) => {
          let row = data[params.dataIndex]
          if (!row) {
            return '无数据'
          }
          return `${row[xAxisName]} : ${valFormatter(params.value)}`
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        top: '20px',
        bottom: '10px'
      },
      // visualMap: {
      //   type: 'continuous',
      //   min: min,
      //   max: max,
      //   left: 'left',
      //   top: 'bottom',
      //   text: ['高', '低'],
      //   calculable: false,
      //   formatter: axisFormatter,
      //   // inRange: {
      //   //   color: ['#fbb5b4', '#ec5255']
      //   // }
      // },
      visualMap: _.defaultsDeep({
        type: 'continuous',
        min: min,
        max: max,
        left: 'left',
        top: 'bottom',
        text: ['高', '低'],
        calculable: false,
        formatter: axisFormatter,
        // inRange: {
        //   color: ['#fbb5b4', '#ec5255']
        // }
      },targetTheme.visualMap),
      title: {
        show: false
      },
      legend: {
        show: showLegend && yAxisNames.length <= 7,
        data: yAxisNames.map(yAxisName => translationDict[yAxisName] || yAxisName)
      },
      itemStyle:{},
      series: yAxisNames.map(yAxisName => {
        return {
          name: translationDict[yAxisName] || yAxisName,
          type: 'map',
          mapType: mapName,
          roam: false,
          zoom: 1.2,
          label: {
            normal: {
              show: !isThumbnail
            },
            emphasis: {
              show: true
            }
          },
          // itemStyle: {
          //   emphasis: {
          //     areaColor: '#479cdf'
          //   }
          // },
          itemStyle:targetTheme.map.itemStyle,
          data: data.map(d => ({name: d[xAxisName], value: d[yAxisName] === undefined ? 0 : d[yAxisName]}))
        }
      })
    }

    // 开启了 notMerge 后更改查询条件的话地图的 bar 不正常
    return (
      <div className="relative map-chart-wrap" style={
        _.pick(rest, ['width', 'height'])
      }
      >
        {this.renderReturnBtn()}
        <ReactEcharts
          theme={this.props.theme}
          {...rest}
          option={option}
          onEvents={this.onEvents()}
        />
      </div>
    )
  }
}
