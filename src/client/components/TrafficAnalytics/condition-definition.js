/**
 * 全部可选条件定义
 */

const condition = [
  // {
  //   name: 'area',
  //   title: '来源地域',
  //   dimensions: ['sugo_province'],
  //   dimensionDes: ['省份'],
  //   group: 0
  // },
  {
    name: 'device',
    title: '来源设备',
    dimensions: ['device_brand'],
    dimensionDes: ['设备品牌'],
    group: 0
  },
  {
    name: 'system',
    title: '设备操作系统',
    dimensions: ['system_name'],
    dimensionDes: ['操作系统'],
    group: 0
  },
  {
    name: 'browser',
    title: '浏览器名称',
    dimensions: ['browser'],
    dimensionDes: ['浏览器名称'],
    group: 0
  },
  {
    name: 'network',
    title: '网络类型',
    dimensions: ['network'],
    dimensionDes: ['网络类型'],
    group: 0
  },
  {
    name: 'operator',
    title: '网络运营商',
    dimensions: ['sugo_operator'],
    dimensionDes: ['网络运营商'],
    group: 1
  },
  {
    name: 'carrier',
    title: '手机运营商',
    dimensions: ['carrier'],
    dimensionDes: ['手机运营商'],
    group: 1
  },
  {
    name: 'screen_dpi',
    title: '屏幕分辨率',
    dimensions: ['screen_dpi'],
    dimensionDes: ['屏幕分辨率'],
    group: 1
  },
  {
    name: 'screen_height',
    title: '屏幕高度',
    dimensions: ['screen_height'],
    dimensionDes: ['屏幕高度'],
    group: 1
  },
  {
    name: 'screen_width',
    title: '屏幕宽度',
    dimensions: ['screen_width'],
    dimensionDes: ['屏幕宽度'],
    group: 1
  }
/*  ,{
    name: 'has_bluetooth',
    title: '是否有蓝牙',
    dimensions: ['has_bluetooth'],
    dimensionDes: ['是否有蓝牙'],
    group: 2
  },
  {
    name: 'bluetooth_version',
    title: '蓝牙版本',
    dimensions: ['bluetooth_version'],
    dimensionDes: ['蓝牙版本'],
    group: 2
  },
  {
    name: 'has_nfc',
    title: '是否有NFC',
    dimensions: ['has_nfc'],
    dimensionDes: ['是否有NFC'],
    group: 2
  },
  {
    name: 'has_telephone',
    title: '是否有电话功能',
    dimensions: ['has_telephone'],
    dimensionDes: ['是否有电话功能'],
    group: 2
  },
  {
    name: 'google_play_services',
    title: '是否支持GooglePlay服务',
    dimensions: ['google_play_services'],
    dimensionDes: ['是否支持GooglePlay服务'],
    group: 2
  }*/
]

export default condition
