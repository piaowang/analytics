// 左侧图表项
import * as d3 from 'd3'
import Mock from 'mockjs'
import {vizTypeIconMap, vizTypeNameMap} from '../../constants/viz-component-map'
import _ from 'lodash'

export const LiveScreenSliceDataAccessTypeEnum = {
  csv: 'csv',
  json: 'json',
  api: 'api',
  project: 'project',
  external: 'external'
}

export const LiveScreenSliceDataAccessTypeTranslation = {
  csv: 'csv静态数据',
  json: 'json静态数据',
  api: 'API',
  project: '项目接入',
  external: '外部数据'
}

const imgPath = '/_bc/sugo-analytics-static/assets/images/livescreen'
export const chartData = {
  '常规图表': [
    { name: '总计', type: 'number', imgSrc: '' },
    { name: '可交互总计', type: 'input_number', imgSrc: '' },
    { name: '树状表格', type: 'table', imgSrc: '' },
    { name: '表格', type: 'table_flat', imgSrc: '' },
    // { name: '列表', type: 'list', imgSrc: '/static/images/ic_liebiao.svg' },
    { name: '饼图', type: 'pie', imgSrc: '', extraStyle: { marginBottom: '5px', fontSize: '30px' } },
    { name: '一维柱图', type: 'dist_bar', imgSrc: '' },
    { name: '二维柱图', type: 'multi_dim_bar', imgSrc: '' },
    { name: '一维面积图', type: 'line', imgSrc: '' },
    { name: '二维线图', type: 'multi_dim_line', imgSrc: '' },
    { name: '横向柱图', type: 'horizontal_bar', imgSrc: '' },
    { name: '象形柱图', type: 'pictorial_bar', imgSrc: '' },
    { name: '地图', type: 'map', imgSrc: '' },
    { name: '气泡图', type: 'bubble', imgSrc: '' },
    { name: '水泡图', type: 'liquidFill', imgSrc: '' },
    { name: '词云图', type: 'wordCloud', imgSrc: '' },
    { name: '仪表盘', type: 'gauge', imgSrc: '' },
    { name: '雷达图', type: 'radar', imgSrc: '' },
    { name: '和弦图', type: 'chord', imgSrc: '' },
    { name: '视频播放器', type: 'video', imgSrc: '' },
    { name: '树图', type: 'tree', imgSrc: '' },
    { name: '力导图', type: 'force', imgSrc: '' },
    { name: 'iframe', type: 'IframeBox', imgSrc: '' },
    { name: '空白单图', type: 'blank', imgSrc: '', iconType: 'plus-square-o' },
    { name: '阶梯图', type: 'step_progress', imgSrc: '', iconType: 'area-chart' },
    { name: '穿梭框', type: 'table_transfer', imgSrc: '', iconType: 'area-chart'}
  ],
  '辅助图形': [
    { name: '标题', type: 'line_text', imgSrc: '', iconType: 'sugo-text'},
    // { name: '多行文字', type: 'line_text', imgSrc: '/static/images/ic_multi.svg'},
    { name: '边框', type: 'frame', imgSrc: '', iconType: 'sugo-selection' },
    { name: '图片', type: 'image', imgSrc: '', iconType: 'picture' },
    { name: '主题切换', type: 'theme_picker', imgSrc: '', iconType: 'skin' },
    { name: '富文本列表', type: 'rich_text_list', imgSrc: '', iconType: 'sugo-text' },
    { name: '智能富文本列表', type: 'rich_text_list_for_smart', imgSrc: '', iconType: 'sugo-text' },
    { name: '数据筛选联动', type: 'data_filter_control', imgSrc: '', iconType: 'filter' },
    { name: '下拉弹出框', type: 'drop_down_popover', imgSrc: '', iconType: 'bars' },
    { name: '展开单图按钮', type: 'inspect_slice_btn', imgSrc: '', iconType: 'arrows-alt' },
    { name: '返回/跳转按钮', type: 'back_btn', imgSrc: '', iconType: 'poweroff' }
  ]
}

// 边框类型
export const frameStyles = {
  style1: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    borderStyle: 'solid',
    borderWidth: '30px 235px 30px 110px',
    borderImageSource: `url("${imgPath}/frame1.svg")`,
    borderImageSlice: '30 235 30 110',
    borderImageRepeat: 'initial',
    borderImageWidth: 'initial',
    borderImageOutset: 'initial',
    background: 'none'
  },
  style2: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    borderStyle: 'solid',
    borderWidth: '28px 105px 32px 104px',
    borderImageSource: `url("${imgPath}/frame2.svg")`,
    borderImageSlice: '28 105 32 104',
    borderImageRepeat: 'initial',
    borderImageWidth: 'initial',
    borderImageOutset: 'initial',
    background: 'none'
  },
  style3: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    borderStyle: 'solid',
    borderWidth: '24px 27px 24px 58px',
    borderImageSource: `url("${imgPath}/frame3.svg")`,
    borderImageSlice: '24 27 24 58',
    borderImageRepeat: 'initial',
    borderImageWidth: 'initial',
    borderImageOutset: 'initial',
    background: 'none'
  },
  style4: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    borderStyle: 'solid',
    borderWidth: '50px 236px 50px 108px',
    borderImageSource: `url("${imgPath}/frame4.svg")`,
    borderImageSlice: '50 236 50 108',
    borderImageRepeat: 'initial',
    borderImageWidth: 'initial',
    borderImageOutset: 'initial',
    background: 'none'
  },
  style5: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    borderStyle: 'solid',
    borderWidth: '28px 105px 32px 104px',
    borderImageSource: `url("${imgPath}/frame5.svg")`,
    borderImageSlice: '28 105 32 104',
    borderImageRepeat: 'initial',
    borderImageWidth: 'initial',
    borderImageOutset: 'initial',
    background: 'none'
  },
  style6: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    borderStyle: 'solid',
    borderWidth: '24px 27px 24px 58px',
    borderImageSource: `url("${imgPath}/frame6.svg")`,
    borderImageSlice: '24 27 24 58',
    borderImageRepeat: 'initial',
    borderImageWidth: 'initial',
    borderImageOutset: 'initial',
    background: 'none'
  },
  style7: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    borderStyle: 'solid',
    borderWidth: '35px',
    borderImageSource: `url("${imgPath}/livefeed-template-border.png")`,
    borderImageSlice: '35',
    borderImageRepeat: 'initial',
    borderImageWidth: 'initial',
    borderImageOutset: 'initial',
    background: 'none'
  }
}

const randomData = () => {
  return Math.round(Math.random() * 1000)
}

const DimX1 = ['直接访问', '邮件营销', '联盟广告', '视频广告', '搜索引擎', '广告营销', '搜索广告']
const DimX2 = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const MockData = Mock.mock({
  // 属性 list 的值是一个数组，其中含有 1 到 10 个元素
  'list|5': [{
    'id|+1': 1,
    'x1|+1': DimX1,
    'x2|+1': DimX2,
    'y1|1-100': 0,
    'y2|1-100': 0,
    'y3|1-100': 0,
    'y4|1-100': 0,
    'y5|1-100': 0
  }]
})

const CityData = ['新疆','四川','辽宁','海南','上海','北京','重庆','内蒙古','广东','江西','吉林','河北','台湾','天津','江苏','云南','宁夏','福建','黑龙江','广西','青海','河南','甘肃','西藏','香港','浙江','湖南','山东','湖北','陕西','山西','贵州']

const mapJsonData = CityData.map(p => ({ x1: p, y1: randomData() }))

const mapCsvData = d3.csvFormat(mapJsonData)
const migrationMJsonData = Mock.mock({
  // 属性 list 的值是一个数组，其中含有 1 到 10 个元素
  'list|10': [{
    'x1|1': CityData,
    'x2|1': CityData,
    'y1|1-100': 0
  }]
})
const migrationMCsvData = d3.csvFormat(migrationMJsonData.list)
const mapData = { fields: ['x1', 'y1'], csv: mapCsvData, json: mapJsonData }
const migrationMapData = {  fields: ['x1', 'x2', 'y1'], csv: migrationMCsvData, json: migrationMJsonData }
const GetDemoData = (x, y, isDecimal,length) => {
  const arr = [1,2,3,4,5]
  const fields = [..._.take(arr,x).map((p, i) => 'x' + (i + 1)), ..._.take(arr,y).map((p, i) => 'y' + (i + 1))]
  let data = MockData.list
  if(length) {
    data =  _.take(data, length)
  }
  data = data.map(p => _.pick(p, fields))
  if(isDecimal) {
    data = data.map(p => _.mapValues(p, (v, k) => {
      return k.indexOf('y') === 0 ? v /100 : v 
    }))
  }
  return { fields, json: JSON.stringify(data, null, 2), csv: d3.csvFormat(data) }
}

const dimension0_1 = GetDemoData(1, 1)
const dimension1_1 = GetDemoData(1, 1)
const dimension1_2 = GetDemoData(1, 2)
const dimension2_1 = GetDemoData(2, 1)
const dimension2_2 = GetDemoData(2, 2)
const dimension1_5 = GetDemoData(1, 5, true, 3)


// const Text = { fields: ['x1', 'y1'], json:  JSON.stringify([{x1: '今日访问量', y1: 1000}], null, 2) , csv: d3.csvFormat([{x1: '今日访问量', y1: 1000}]) }
const numberVal =  { fields: ['y1'], json: JSON.stringify([{y1: 0.5}], null, 2), csv: d3.csvFormat([{y1: 0.5}]) } 
const numberVal2 =  { fields: ['y1'], json: JSON.stringify([{y1: 0.5}], null, 2), csv: d3.csvFormat([{y1: 0.5, y1: 2}]) } 

export const DisableDataSettingControl = []// ['image', 'video', 'IframeBox']

export const ChartFieldsAndDefaultData = {
  dist_bar: dimension1_1,
  balance_bar: dimension1_1,
  horizontal_bar: dimension1_1,
  pictorial_bar: dimension1_1,
  multi_dim_stacked_bar: dimension2_1,
  bar_and_line: dimension1_2,
  line: dimension1_1,
  multi_dim_line: dimension2_1,
  multi_dim_bar: dimension2_1,
  multi_dim_ratio_line: dimension2_1,
  pie: dimension1_1,
  tree_map:dimension1_1,
  scatter_map: mapData,
  heat_map: dimension2_1,
  bubble: dimension1_2,
  number: numberVal,
  input_number: numberVal,
  number_lift: numberVal,
  progress_bar: numberVal,
  table: dimension2_2,
  table_flat: dimension2_2,
  gauge: numberVal,
  gauge_1: numberVal,
  beauty_gauge: numberVal,
  radar: dimension1_5,
  map: mapData,
  arcgis: mapData,
  IframeBox: [],
  bullet:[1],
  liquidFill:numberVal,
  wordCloud: dimension1_1,
  chord: dimension2_1,
  tree: dimension2_1,
  force:dimension2_1,
  migration_map: migrationMapData,
  data_filter_control: dimension1_1,
  rich_text_list: numberVal2,
  rich_text_list_for_smart: numberVal2,
  step_progress: numberVal,
  table_transfer: dimension2_2
}

export const NewVizTypeNameMap = {
  ...vizTypeNameMap,
  ..._(chartData).values()
    .flatMap(_.identity)
    .keyBy('type')
    .mapValues(v => v.name)
    .value()
}
export const TypeIconDict = {
  ...vizTypeIconMap,
  ..._(chartData).values()
    .flatMap(arr => arr.filter(d => d.iconType))
    .keyBy('type')
    .mapValues(v => v.iconType)
    .value()
}

export const shareType = {
  '1': '加密',
  '2': '公开'
}

export const shareStatus = {
  '0': '失效',
  '1': '生效'
}

export const warnIndextype = [
  {id: '1', name: 'App崩溃次数'},
  {id: '2', name: 'App崩溃用户数'}
]

export const warnOpType = [
  {id: '0', name: '小于'},
  {id: '1', name: '等于'},
  {id: '2', name: '大于'}
]
