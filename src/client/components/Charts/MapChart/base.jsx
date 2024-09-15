import { Component } from 'react'
import PropTypes from 'prop-types'

import ReactEcharts from '../ReactEchartsEnhance'
import _ from 'lodash'
import baseOptions from '../../../common/echart-base-options'
//import {Select} from 'antd'
import Alert from '../../Common/alert'
//import cityGeoData from './city-position.json'
import {isEqualWithFunc} from '../../../../common/sugo-utils'
import metricFormatterFactory, {axisFormatterFactory} from '../../../common/metric-formatter-factory'
import {defaultDimensionColumnFormatterGen} from '../../../common/echarts-option-generator'
import {symbolSizeFunGen} from '../BubbleChart/index'
import Fetch from '../../../common/fetch-final'
import echarts from 'echarts'
import nameMap, { reflect } from './map-province'
import { Button2 } from '../../Common/sugo-icon'
import {buildUrl, defaultMapName} from './common'
import setStatePromise from '../../../common/set-state-promise'
import {chartLightTheme,chartDarkTHeme } from '../../../common/echartThemes'

let cityGeoData
let simpifyCityGeoData
let mapNameDict = {}

@setStatePromise
export default class BaseMap extends Component {
  static propTypes = {
    dimensions: PropTypes.array,
    metrics: PropTypes.array,
    data: PropTypes.array,
    translationDict: PropTypes.object,
    isThumbnail: PropTypes.bool,
    showLegend: PropTypes.bool,
    metricsFormatDict: PropTypes.object,
    dimensionColumnFormatterGen: PropTypes.func,
    optionsOverwriter: PropTypes.func
  }

  static defaultProps = {
    metricsFormatDict: {},
    showLegend: true,
    dimensionColumnFormatterGen: defaultDimensionColumnFormatterGen
  }

  constructor(props) {
    super(props)
    this.state = {
      loading: false
    }
  }

  componentWillMount() {
    this.initData()
  }

  shouldComponentUpdate(nextProps, nextState) {
    return this.props.optionsOverwriter !== nextProps.optionsOverwriter
      || !isEqualWithFunc(nextProps, this.props) || !_.isEqual(nextState, this.state)
  }

  initData = async () => {
    this.setState({
      loading: true
    })
    cityGeoData = await Fetch.get(
      buildUrl('city-position')
    )
    simpifyCityGeoData = _.mergeWith({}, ..._.values(cityGeoData), _.mapValues(cityGeoData, (v, k) => v[_.keys(v)[0]]))
    let {mapName = defaultMapName} = this.props.settings
    if (!mapNameDict[mapName]) {
      let data = await Fetch.get(
        buildUrl(mapName)
      )
      mapNameDict[mapName] = data
      echarts.registerMap(mapName, data)
    }
    if (!mapNameDict[defaultMapName]) {
      let data = await Fetch.get(
        buildUrl(defaultMapName)
      )
      mapNameDict[defaultMapName] = data
      echarts.registerMap(defaultMapName, data)
    }
    this.setState({
      loading: false
    })
  }

  onEvents = () => {
    return {
      click: this.onClick
    }
  }

  onClick = async (params, inst) => {
    let {name} = params
    let province = nameMap[name]
    if (!province) {
      return
    }
    this.inst = inst
    await this.loadMap(province)
  }

  loadMap = async (mapName) => {
    await this.setStatePromise({
      loading: true
    })
    if (!mapNameDict[mapName]) {
      let data = await await Fetch.get(
        buildUrl(mapName)
      )
      mapNameDict[mapName] = data
      echarts.registerMap(mapName, data)
    }
    await this.setStatePromise({
      loading: false
    })
    this.props.onSettingsChange({
      mapName
    })
  }

  fillPosition(groupName, data, cityObj) {
    // 找出 geoZoneTitles 中，最相似的值，并替换 data 原来到值
    let twoWordCityNameCandidates = _.groupBy(Object.keys(cityObj), v => v.substr(0, 2))
    return (data || []).map(d => {
      let groupVal = d[groupName]
      if (!groupVal) {
        return null
      }
      // 修复维度为数值类型以地图展示时查询报错
      let subsArr = twoWordCityNameCandidates[groupVal.toString().substr(0, 2)]
      return subsArr && subsArr.length === 1 ? {...d, __pos: cityObj[subsArr[0]]} : null
    }).filter(_.identity)
  }

  fillPosition2d(provinceDimName, cityDimName, data) {
    let twoWordProvinceNameCandidates = _.groupBy(Object.keys(cityGeoData), v => v.substr(0, 2))
    return data.map(d => {
      let p = d[provinceDimName]
      if (!p) {
        return null
      }

      let [match1, match2] = twoWordProvinceNameCandidates[p.toString().substr(0, 2)] || []
      let cityGroupName = `${cityDimName}_GROUP`
      return match1 && !match2
        ? {...d, [cityGroupName]: this.fillPosition(cityDimName, d[cityGroupName], cityGeoData[match1])}
        : null
    }).filter(_.identity)
  }

  back = () => {
    this.loadMap('china')
  }

  renderReturnBtn = (mapName) => {
    if(mapName === defaultMapName || this.props.isThumbnail) {
      return null
    }
    return (
      <Button2
        type="ghost"
        className="mc-back-to-china"
        onClick={this.back}
      >返回全国地图</Button2>
    )
  }

  render() {
    let {data, dimensions, metrics, translationDict, metricsFormatDict, isThumbnail, showLegend,theme='light', ...rest} = this.props
    let targetTheme = theme === 'light'?chartLightTheme:chartDarkTHeme
    if (dimensions.length !== 1 && dimensions.length !== 2) {
      return <Alert msg={'请为地图选择一个城市维度，或省份与城市维度'} {...rest} />
    }

    let {loading} = this.state
    let {mapName = defaultMapName} = this.props.settings
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
      return <Alert msg={'查无数据，请为地图选择一个城市维度，或省份与城市维度'} {...rest} />
    }

    let xAxisName = dimensions[0]
    let yAxisNames = _.take(metrics, 1)

    if (dimensions.length === 1) {
      // 只有一个城市维度
      data = this.fillPosition(xAxisName, data, simpifyCityGeoData)
    } else if (dimensions.length === 2) {
      // 省份+城市维度
      data = this.fillPosition2d(xAxisName, dimensions[1], data)
      // 打平
      data = _.flatMap(data, d => d[`${dimensions[1]}_GROUP`].map(cd => ({...cd, [xAxisName]: d[xAxisName]})))
    }
    let lastDim = _.last(dimensions)
    if (!data || data.length === 0) {
      return <Alert msg={'查无数据，请为地图选择一个城市维度，或省份+城市维度'} {...rest} />
    }

    let array = data.map(d => d[yAxisNames[0]])

    let min = array.length && _.min(array) || 0
    let max = Math.max(min + 1, array.length && _.max(array) || 1)

    let valFormatter = metricFormatterFactory(metricsFormatDict[yAxisNames[0]])

    let axisFormatter = axisFormatterFactory(metricsFormatDict[yAxisNames[0]])

    if (mapName !== 'china') {
      const provName = reflect[mapName]
      let cityPosDict = cityGeoData[provName]
      data = data.filter(d => (d[lastDim] in cityPosDict) || ((d[lastDim] || '').substr(0, 2) in cityPosDict))
    }
    
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
          return `${row[lastDim]} : ${valFormatter(_.last(params.value))}`
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
      //   inRange: {
      //     color: ['#fbb5b4', '#ec5255']
      //   }
      // },
      visualMap:_.defaultsDeep({
        type: 'continuous',
        min: min,
        max: max,
        left: 'left',
        top: 'bottom',
        text: ['高', '低'],
        calculable: false,
        formatter: axisFormatter,
      },targetTheme.visualMap),
      title: {
        show: false
      },
      legend: {
        ...targetTheme.legend,
        show: showLegend && yAxisNames.length <= 7,
        data: yAxisNames.map(yAxisName => translationDict[yAxisName] || yAxisName)
      },
      geo: {
        map: mapName,
        zoom: 1,
        //center: center || undefined,
        label: {
          emphasis: {
            show: false
          }
        },
        roam: true,
        itemStyle:targetTheme.map.itemStyle,
        // itemStyle: {
        //   normal: {
        //     areaColor: '#eee',
        //     borderColor: '#111'
        //   },
        //   emphasis: {
        //     // areaColor: '#479cdf',
        //     areaColor: 'transparent'
        //   }
        // }
      },
      series: yAxisNames.map(yAxisName => {
        let datum = data.filter(d => '__pos' in d).map(d => {
          let val = d[yAxisName] === undefined ? 0 : d[yAxisName]
          return {
            name: d[lastDim],
            value: [...d.__pos, val]
          }
        })
        return {
          name: translationDict[yAxisName] || yAxisName,
          type: 'scatter',
          coordinateSystem: 'geo',
          data: datum,
          symbolSize: symbolSizeFunGen(datum, d => d.value, 3e3, 25),
          label: {
            normal: {
              formatter: '{b}',
              position: 'right',
              show: !isThumbnail
            },
            emphasis: {
              show: true
            }
          },
          // itemStyle: {
          //   normal: {
          //     color: '#ec5255'
          //   }
          // }
          itemStyle:targetTheme.map.itemStyle,
        }
      })
    }
    this.option = option

    // 开启了 notMerge 后更改查询条件的话地图的 bar 不正常
    return (
      <div className="relative map-chart-wrap" style={
        _.pick(rest, ['width', 'height'])
      }
      >
        {this.renderReturnBtn(mapName)}
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
