import pie from './pie'
import tree_map from './tree_map'
import map from './map'
import dist_bar from './dist_bar'
import multi_dim_bar from './multi_dim_bar'
import bubble from './bubble'
import line from './line'
import multi_dim_line from './multi_dim_line'
import horizontal_bar from './horizontal_bar'
import line_text from './line_text'
import number from './number'
import input_number from './input_number'
import number_lift from './number_lift'
import progress_bar from './progress_bar'
import frame from './frame'
import gauge from './gauge'
import gauge_1 from './gauge_1'
import beauty_gauge from './beauty_gauge'
import liquidFill from './liquidFill'
import wordCloud from './wordCloud'
import radar from './radar'
import chord from './chord'
import video from './video'
import multi_dim_stacked_bar from './multi_dim_stacked_bar'
import table from './table'
import tree from './tree'
import force from './force'
import iframe from './iframe'
import migration_map from './migration_map'
import bar_and_line from './bar_and_line'
import scatter_map from './scatter_map'
import theme_picker from './theme_picker'
import getDataFilterControl from './data_filter_control'
import StyleItem from '../models/styleItem'
import commonStyleItem from './common'
import _ from 'lodash'
import getDropDownPopoverStyleItem from './drop_down_popover'
import getInspectSliceBtnStyleConfig from './inspect_slice_btn'
import getRichTextListStyleConfig from './rich_text_list'
import getSmartRichTextListStyleConfig from './rich_text_list_for_smart'
import getBackBtn from './back_btn'
import getStepProgress from './step_progress'
import getBullet from './bullet'
import arcgis from './arcgis'
import image from './image'
import getPictorialBar from './pictorial_bar'
import getTableTransfer from './table_transfer'
import { dbMetricAdapter } from '../../../../common/temp-metric.js'


const chartStyleData = {
  pie,
  tree_map,
  dist_bar,
  multi_dim_bar,
  map,
  bubble,
  line,
  multi_dim_line,
  horizontal_bar,
  line_text,
  number,
  input_number,
  number_lift,
  progress_bar,
  frame,
  gauge,
  gauge_1,
  beauty_gauge,
  liquidFill,
  wordCloud,
  radar,
  balance_bar: horizontal_bar,
  pictorial_bar:getPictorialBar,
  multi_dim_stacked_bar,
  bar_and_line,
  multi_dim_ratio_line:line,
  table_flat: table,
  table,
  scatter_map,
  migration_map,
  heat_map: dist_bar,
  chord,
  video,
  tree,
  force,
  IframeBox: iframe,
  theme_picker,
  data_filter_control: getDataFilterControl,
  drop_down_popover: getDropDownPopoverStyleItem,
  inspect_slice_btn: getInspectSliceBtnStyleConfig,
  rich_text_list: getRichTextListStyleConfig,
  rich_text_list_for_smart: getSmartRichTextListStyleConfig,
  back_btn: getBackBtn,
  step_progress: getStepProgress,
  bullet: getBullet,
  arcgis,
  image,
  table_transfer: getTableTransfer
}

//修改图例名称
let chartChangeIndicatorName = [
  'dist_bar',
  'multi_dim_bar',
  'horizontal_bar',
  'balance_bar',
  'multi_dim_stacked_bar',
  'bar_and_line',
  'line',
  'pictorial_bar'
]

let chartChangeDimensionName = [
  //'multi_dim_line',
  'multi_dim_ratio_line',
  'pie',
  'tree_map'
]

export function getStyleItem(type, dimensions, styleConfig, updateFn, metrics, tempMetricDict, measureList, accessData){
  const fn = chartStyleData[type]
  if (!fn) {
    return []
  }
  const styleItems = fn(styleConfig, updateFn, dimensions, metrics, tempMetricDict, measureList, accessData)
  //图例对应数据
  tempMetricDict = _.isEmpty(tempMetricDict) ? {} : tempMetricDict
  metrics=_.isEmpty(metrics) ? [] : metrics
  let newAccessData = _.isEmpty(accessData) ? [] : JSON.parse(accessData)
  let newMeasureList = (measureList || []).filter(item => _.includes(metrics, item.name))
  type === 'radar' && metrics.length === 2 ? chartChangeIndicatorName.push('radar') : chartChangeDimensionName.push('radar')
  let newTempMetricDict =  _.includes(chartChangeIndicatorName, type)
    ?_.concat(newMeasureList,dbMetricAdapter(tempMetricDict))
    : ( _.includes(chartChangeDimensionName, type) 
      ? _.uniqBy(newAccessData.map(item => ({title: item[dimensions[0]]})), 'title')
      : []
    )
    
  return [
    ...(styleItems || []),
    !_.isEmpty(newTempMetricDict) ? new StyleItem({
      title: '指标名称修改',
      name: 'indicatorsChange',
      type: 'editorGroup',
      items: [
        ...(newTempMetricDict.map(item => {
          return new StyleItem({
            title:item.title,
            name:item.title,
            type:'input',
            value: _.get(styleConfig, `indicatorsChange.${item.title}`, ''),
            onChange: function (ev) {
              let {value} = ev.target
              updateFn(`indicatorsChange.${item.title}`, () => value)
            }
          })
        }))  
      ]
    }):[],
    new StyleItem({
      title: '高级模式',
      name: 'advance_mode',
      type: 'editorGroup',
      items: [
        new StyleItem(commonStyleItem.optionsOverWriter, {
          value: _.get(styleConfig, 'optionsOverWriter'),
          onChange(v) {
            updateFn('optionsOverWriter', () => v)
          }
        })
      ]
    })
  ]
}

export default chartStyleData
