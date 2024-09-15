import React, {Component} from 'react'
import PropTypes from 'prop-types'

import ReactEcharts from '../ReactEchartsEnhance'
import _ from 'lodash'
import baseOptions from '../../../common/echart-base-options'
//import {Select} from 'antd'
import Alert from '../../Common/alert'
//import cityGeoData from './city-position.json'
import { isEqualWithFunc } from '../../../../common/sugo-utils'
import metricFormatterFactory, { axisFormatterFactory } from '../../../common/metric-formatter-factory'
import { defaultDimensionColumnFormatterGen } from '../../../common/echarts-option-generator'
import { symbolSizeFunGen } from '../BubbleChart/index'
import Fetch from '../../../common/fetch-final'
import echarts from 'echarts'
import nameMap, { reflect } from './map-province'
import { Button2 } from '../../Common/sugo-icon'
import { buildUrl, defaultMapName } from './common'
import setStatePromise from '../../../common/set-state-promise'
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
    simpifyCityGeoData = _.mergeWith(..._.values(cityGeoData), _.mapValues(cityGeoData, (v, k) => v[_.keys(v)[0]]))
    let { mapName = defaultMapName } = this.props.settings
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



  loadMap = async (mapName) => {
    await this.setStatePromise({
      loading: true
    })
    if (!mapNameDict[mapName]) {
      let data = await Fetch.get(
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

  back = () => {
    this.loadMap('china')
  }


  convertData = function (data) {
    return data.map(dataItem => {
      var fromCoord = simpifyCityGeoData[dataItem[0].name]
      var toCoord = simpifyCityGeoData[dataItem[1].name]
      return [{
        coord: fromCoord,
        value: dataItem[0].value
      }, {
        coord: toCoord,
      }]
    })
  }

  render() {
    let { data, dimensions, metrics, translationDict, metricsFormatDict, isThumbnail, showLegend, ...rest } = this.props
    if (dimensions.length !== 2) {
      return <Alert msg={'请为地图选择两个城市维度'} {...rest} />
    }


    let { loading } = this.state
    let { mapName = defaultMapName } = this.props.settings
    if (loading) {
      return (
        <div className="aligncenter pd3">载入中...</div>
      )
    }

    if (!data || data.length === 0) {
      return <Alert msg={'查无数据，请为地图选择两个城市维度'} {...rest} />
    }
    let newData = _.groupBy(data, p => _.get(p, dimensions[0], ''))
    newData = _.map(_.keys(newData), p => {
      return [p, _.map(newData[p], v => [{ name: p }, { name: _.get(v, dimensions[1]), value: _.get(v, metrics[0]) }])]
    })


    let series = []
    _.forEach(newData, (item, i) => {
      series.push({
        type: 'lines',
        zlevel: 2,
        effect: {
          show: true,
          period: 4, //箭头指向速度，值越小速度越快
          trailLength: 0.02, //特效尾迹长度[0,1]值越大，尾迹越长重
          symbol: 'arrow', //箭头图标
          symbolSize: 5, //图标大小
        },
        lineStyle: {
          normal: {
            width: 1, //尾迹线条宽度
            opacity: 1, //尾迹线条透明度
            curveness: .3 //尾迹线条曲直度
          }
        },
        data: this.convertData(item[1])
      }, {
          type: 'effectScatter',
          coordinateSystem: 'geo',
          zlevel: 2,
          rippleEffect: {
            brushType: 'stroke'
          },
          label: {
            normal: {
              show: true,
              position: 'right',
              formatter: '{b}'
            }
          },
          symbolSize: function (val) {
            return val[2] / 8;
          },
          // itemStyle: {
          //   normal: {
          //     color: color[0]
          //   }
          // },
          data: item[1].map((dataItem) => {
            return {
              name: dataItem[0].name,
              value: simpifyCityGeoData[dataItem[1].name].concat([dataItem[1].value])
            }
          })
        })
    })

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
      title: {
        show: false
      },
      // legend: {
      //   show: showLegend && yAxisNames.length <= 7,
      //   data: yAxisNames.map(yAxisName => translationDict[yAxisName] || yAxisName)
      // },
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
        itemStyle: {
          normal: {
            areaColor: '#eee',
            borderColor: '#111'
          },
          emphasis: {
            // areaColor: '#479cdf',
            areaColor: 'transparent'
          }
        }
      },
      series
    }

    this.option = option

    // 开启了 notMerge 后更改查询条件的话地图的 bar 不正常
    return (
      <div className="relative map-chart-wrap" style={_.pick(rest, ['width', 'height'])}
      >
        <ReactEcharts {...rest} option={option} />
      </div>
    )
  }
}
