import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import _ from 'lodash'

export default function getArcgis(styleConfig, updateFn) {
  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      show3D: true,
      showSearch: true,
      showBasemapGallery: true,
      ToggleBasemap: true,
      selectBasemap: 'bf024b8d0b4b48f5a486070214e87c5f',
      centerLat: 38,
      centerLon: 110,
      zoom: 5
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }
  return [
    new StyleItem({
      title: '地图设置',
      name: 'mapconfig',
      type: 'editorGroup',
      items: [
        new StyleItem({
          title: '3D/2D切换显示',
          name:'show3D',
          type: 'checkbox',
          value: _.get(styleConfig, 'show3D', true),
          onChange(e) {
            var checked = e.target.checked
            updateFn('show3D', () => checked ? true : false)
          }
        }),
        new StyleItem({
          title: '地址查找显示',
          name:'showSearch',
          type: 'checkbox',
          value: _.get(styleConfig, 'showSearch', true),
          onChange(e) {
            var checked = e.target.checked
            updateFn('showSearch', () => checked ? true : false)
          }
        }),  
        new StyleItem({
          title: '地图选择',
          name: 'selectBasemap',
          type: 'select',
          value: _.get(styleConfig, 'selectBasemap', 'bf024b8d0b4b48f5a486070214e87c5f'),
          onChange(v) {
            updateFn('selectBasemap', () => v)
          },
          options: [
            { key: '5cd32b831bfb43d08e5ee75e7b40d53d', value: '中国地图彩色版'},
            { key: '0c539fdb47d34b17bd1452f6b9f49e97', value: '中国地图彩色英文版（含POI）'},
            { key: '05752f4682ba43ac8745528b4d9ffe4d', value: '中国地图暖色版'},
            { key: '74e992f4fce3450aaf57a9a0df0007c3', value: '中国地图灰色版'},
            { key: 'bf024b8d0b4b48f5a486070214e87c5f', value: '中国地图蓝黑版'}
          ]
        }),
        new StyleItem({
          title: '地图中心位置经度',
          name: 'centerLon',
          type: 'number',
          value: _.get(styleConfig, 'centerLon', 110),
          onChange(v) {
            updateFn('centerLon', () => v)
          }
        }),
        new StyleItem({
          title: '地图中心位置纬度',
          name: 'centerLat',
          type: 'number',
          value: _.get(styleConfig, 'centerLat', 38),
          onChange(v) {
            updateFn('centerLat', () => v)
          }
        }),
        new StyleItem({
          title: '地图大小',
          name: 'zoom',
          type: 'number',
          min: 0,
          value: _.get(styleConfig, 'zoom', 5),
          onChange(v) {
            updateFn('zoom', () => v)
          }
        })
      ]
    })
  ]
}
