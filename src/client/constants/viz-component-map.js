import BarChart from '../components/Charts/BarChart'
import StackedBarChart from '../components/Charts/BarChart/stacked-bars'
import HorizontalBarChart from '../components/Charts/BarChart/horizontal-bars'
import PieChart from '../components/Charts/PieChart'
import TreemapChart from '../components/Charts/Treemap'
import LineChart from '../components/Charts/LineChart'
import TwoDimBarChart from '../components/Charts/BarChart/two-dim-bar-chart'
import TwoDimLineChart from '../components/Charts/LineChart/two-dim-line-chart'
import {sliceTableChart, analyticTableChart} from '../components/Charts/TableChart'
import {sliceFlatTableChart, analyticFlatTableChart} from '../components/Charts/TableChart/flat-table'
import BigNumberChart from '../components/Charts/BigNumberChart'
import InputNumberChart from '../components/Charts/InputNumberChart'
import BigNumberChartLift from '../components/Charts/BigNumberChart/add-lifting-prompt'
import Progress from '../components/Charts/Progress'
import BulletChart from '../components/Charts/Progress/bulletChart'
import MapChart from '../components/Charts/MapChart'
import ScatterMapChart from '../components/Charts/MapChart/scatter-map'
import MigrationMapChart from '../components/Charts/MapChart/migration-map'
import HeatMap from '../components/Charts/HeatMap'
import BubbleChart from '../components/Charts/BubbleChart'
import StackedLine from '../components/Charts/LineChart/stacked-line'
import BalanceBar from '../components/Charts/BarChart/balance-bars'
import RatioBar from '../components/Charts/BarChart/ratio-bars'
import PictorialBar from '../components/Charts/BarChart/pictorial-bars'
import RatioLine from '../components/Charts/LineChart/ratio-line'
import BarAndLine from '../components/Charts/MixChart/bar-and-line-chart'
import IframeBox from '../components/Charts/IframeBox'
import SdkHeatMap from '../components/Charts/HeatMap/sdkHeatMap'
import LiquidFill from '../components/Charts/LiquidFill'
import WordCloud from '../components/Charts/WordCloud'
import Gauge from '../components/Charts/Gauge'
import Gauge_1 from '../components/Charts/Gauge/gauge_1'
import BeautyGauge from '../components/Charts/Gauge/beauty-gauge'
import Radar from '../components/Charts/Radar'
import Chord from '../components/Charts/Chord'
import LinkChart from '../components/Charts/Link'
import _ from 'lodash'
import StaticImageChart from '../components/Charts/StaticImageChart'
import SugoFunnelSlice from '../components/Charts/CustomChart/sugo-funnel-slice'
import SugoRetentionSlice from '../components/Charts/CustomChart/sugo-retention-slice'
import SugoPathAnalysisSlice from '../components/Charts/CustomChart/sugo-path-analysis-slice'
import TreeChart from '../components/Charts/TreeChart'
import RelationChart from '../components/Charts/RelationChart'
import StepProgress from '../components/Charts/Progress/step-progress'
import RichTextList from '../components/Charts/BraftEditor'
import SmartRichTextList from '../components/Charts/BraftEditor/smart'
import Arcgis from '../components/Charts/Arcgis'
import TableTransfer from '../components/Charts/TableTransferChart'

export const vizTypeChartComponentMap = {
  number: BigNumberChart,
  input_number: InputNumberChart,
  number_lift: BigNumberChartLift,
  progress_bar:Progress,
  bullet: BulletChart,
  table: sliceTableChart,
  table_flat: sliceFlatTableChart,
  pie: PieChart,
  tree_map: TreemapChart,
  dist_bar: BarChart,
  line: LineChart,
  map: MapChart,
  arcgis: Arcgis,
  scatter_map: ScatterMapChart,
  horizontal_bar: HorizontalBarChart,
  balance_bar: BalanceBar,
  pictorial_bar: PictorialBar,
  bubble: BubbleChart,
  multi_dim_bar: TwoDimBarChart,
  multi_dim_line: TwoDimLineChart,
  multi_dim_stacked_bar: StackedBarChart,
  heat_map: HeatMap,
  multi_dim_stacked_line: StackedLine,
  multi_dim_ratio_bar: RatioBar,
  multi_dim_ratio_line: RatioLine,
  bar_and_line: BarAndLine,
  tree: TreeChart,
  force: RelationChart,
  image: StaticImageChart,
  sdk_heat_map: SdkHeatMap,
  sugo_funnel: SugoFunnelSlice,
  sugo_retention: SugoRetentionSlice,
  sugo_path_analysis: SugoPathAnalysisSlice,
  IframeBox: IframeBox,
  liquidFill: LiquidFill,
  wordCloud: WordCloud,
  gauge: Gauge,
  gauge_1: Gauge_1,
  beauty_gauge: BeautyGauge,
  radar: Radar,
  chord: Chord,
  link: LinkChart,
  migration_map: MigrationMapChart,
  step_progress: StepProgress,
  rich_text_list: RichTextList,
  rich_text_list_for_smart: SmartRichTextList,
  table_transfer: TableTransfer
}


// TODO 反向逻辑
export const analyticVizTypeChartComponentMap = {
  ..._.omit(vizTypeChartComponentMap, [
    'progress_bar', 'number_lift', 'beauty_gauge', 'image', 'IframeBox', 'sdk_heat_map', 'sugo_funnel',
    'sugo_retention', 'sugo_path_analysis', 'link', 'step_progress', 'rich_text_list', 'progress_bar',
    'gauge_1', 'bullet', 'tree_map', 'migration_map', 'table_transfer', 'pictorial_bar', 'input_number',
    'arcgis','rich_text_list_for_smart'
  ]),
  table: analyticTableChart,
  table_flat: analyticFlatTableChart
}

export const vizTypeNameMap = {
  number: '总计',
  input_number: '可输入总计',
  number_lift: '升降提示',
  progress_bar:'进度条',
  bullet: '子弹图',
  table: '树状表格',
  table_flat: '表格',
  pie: '饼图',
  tree_map: '矩形树图',
  dist_bar: '一维柱图',
  line: '一维线图',
  multi_dim_bar: '二维柱图',
  multi_dim_line: '二维线图',
  map: '地图',
  arcgis: 'Arcgis地图',
  scatter_map: '散点地图',
  multi_dim_stacked_bar: '堆积柱图',
  horizontal_bar: '横向柱图',
  pictorial_bar: '象形柱图',
  heat_map: '热力图',
  bubble: '气泡图',
  multi_dim_stacked_line: '堆积线图',
  balance_bar: '交错柱图',
  multi_dim_ratio_bar: '比例堆积柱图',
  multi_dim_ratio_line: '比例堆积线图',
  bar_and_line: '柱状折线图',
  tree: '树图',
  force: '力导图',
  image: '静态图片',
  sdk_heat_map: 'sdk热图',
  sugo_funnel: '漏斗',
  sugo_retention: '留存',
  sugo_path_analysis: '路径分析',
  liquidFill: '水泡图',
  wordCloud: '词云图',
  gauge: '仪表盘',
  gauge_1: '进度仪表盘',
  beauty_gauge: '双轴仪表盘',
  radar: '雷达图',
  chord: '和弦图',
  link: '链接',
  IframeBox: 'Iframe',
  migration_map: '迁徙地图',
  step_progress: '阶梯图',
  rich_text_list: '富文本列表',
  rich_text_list_for_smart: '智能富文本列表',
  table_transfer: '穿梭框'
}

export const vizTypeIconMap = {
  number: 'sugo-chart-number',
  input_number: 'sugo-chart-number',
  number_lift: 'sugo-chart-number_lift',
  progress_bar: '',
  bullet: '',
  table: 'sugo-chart-table_flat',
  table_flat: 'sugo-chart-table_flat',
  pie: 'pie-chart',
  tree_map: '',
  dist_bar: 'sugo-chart-dist_bar',
  line: 'sugo-chart-line',
  bar_and_line: 'sugo-chart-bar_and_line',
  map: 'sugo-chart-map',
  arcgis: '',
  scatter_map: 'sugo-chart-scatter_map',
  migration_map: 'sugo-chart-migration_map',
  step_progress: 'area-chart',
  horizontal_bar: 'sugo-chart-horizontal_bar',
  balance_bar: 'sugo-chart-balance_bar',
  pictorial_bar: '',
  bubble: 'dot-chart',
  multi_dim_bar: 'sugo-chart-multi_dim_bar',
  multi_dim_line: 'sugo-chart-multi_dim_line',
  multi_dim_stacked_bar: 'sugo-chart-multi_dim_stacked_bar',
  heat_map: 'sugo-chart-heat_map',
  multi_dim_stacked_line: 'sugo-chart-multi_dim_stacked_line',
  multi_dim_ratio_bar: 'sugo-chart-multi_dim_ratio_bar',
  multi_dim_ratio_line: 'sugo-chart-multi_dim_ratio_line',
  tree: 'sugo-model',
  force: 'sugo-analysis',
  image: 'picture',
  sdk_heat_map: 'sdk_heat_map',
  sugo_funnel: 'sugo-filter',
  sugo_retention: 'sugo-retention',
  sugo_path_analysis: 'sugo-path',
  IframeBox: 'ie',
  liquidFill: 'sugo-liquidfill',
  wordCloud: 'sugo-wordCloud',
  gauge: 'sugo-gauge',
  gauge_1: 'sugo-gauge',
  beauty_gauge: 'sugo-gauge',
  radar: 'sugo-radar',
  chord: 'sugo-chord',
  link: 'link-chart',
  video: 'sugo-video',
  rich_text_list: '',
  rich_text_list_for_smart: '',
  table_transfer: ''
}

export const vizTypeLimitNameMap = {
  table: '显示条数',
  table_flat: '显示条数',
  number: '',
  input_number: '',
  number_lift: '',
  progress_bar:'',
  bullet: '',
  dist_bar: '显示列数',
  pie: '显示块数',
  tree_map: '显示块数',
  line: '显示条数',
  multi_dim_bar: '显示列数',
  multi_dim_line: '显示列数',
  map: '显示块数',
  arcgis: '显示块数',
  scatter_map: '显示点数',
  multi_dim_stacked_bar: '显示条数',
  horizontal_bar: '显示条数',
  heat_map: '显示块数',
  bubble: '显示系列数',
  multi_dim_stacked_line: '显示条数',
  balance_bar: '显示条数',
  pictorial_bar: '显示条数',
  multi_dim_ratio_bar: '显示列数',
  multi_dim_ratio_line: '显示列数',
  bar_and_line: '显示列数',
  tree: '显示条数',
  force: '显示点数',
  sdk_heat_map: 'SDK热图',
  image: '显示条数',
  sugo_funnel: '显示条数',
  sugo_retention: '显示条数',
  sugo_path_analysis: '显示条数',
  IframeBox: '显示条数',
  liquidFill: '百分比',
  wordCloud: '',
  gauge: '百分比',
  gauge_1: '百分比',
  beauty_gauge: '百分比',
  radar: '显示块数',
  chord: '显示关系',
  link: '链接',
  migration_map:'显示块数',
  step_progress: '显示条数',
  rich_text_list: '显示富文本列表',
  rich_text_list_for_smart: '显示富文本列表',
  table_transfer: ''
}

export const vizTypeHintMap = {
  number: '至少设置一个指标，无需设置维度',
  input_number: '至少设置一个指标，无需设置维度',
  number_lift: '至少设置一个指标，无需设置维度',
  progress_bar:'至少设置一个指标，无需设置维度',
  bullet: '至少设置三个指标，无需设置维度',
  table: '至少设置一个指标',
  table_flat: '至少设置一个指标/维度，不能同时设为空',
  pie: '需要设置一个指标，一个维度',
  tree_map: '需要设置一个指标，一个维度',
  dist_bar: '至少设置一个指标，最多设置一个维度',
  line: '至少设置一个指标，并且设置一个维度',
  multi_dim_bar: '需要设置一个指标，两个维度；第一维度为对比维度，第二个维度作为 X 轴',
  multi_dim_line: '需要设置一个指标，两个维度；第一维度为对比维度，第二个维度作为 X 轴',
  map: '需要设置一个指标，并且设置省份作为维度',
  arcgis: '需要设置一个指标，并且设置省份作为维度',
  scatter_map: '需要设置一个指标，并且设置城市或省份与城市作为维度',
  migration_map: '需要设置一个指标，并且设置两个城市或省份与城市作为维度',
  multi_dim_stacked_bar: '需要设置一个指标，两个维度；第一维度为堆积维度，第二个维度作为 X 轴',
  horizontal_bar: '至少设置一个指标，最多设置一个维度',
  pictorial_bar: '需要设置一个指标，一个维度',
  heat_map: '需要设置一个指标，两个维度；第一维度为 X 轴，第二个维度作为 Y 轴',
  bubble: '需要设置 2～3 个指标，1～2 个维度',
  multi_dim_stacked_line: '需要设置一个指标，两个维度；第一维度为堆积维度，第二个维度作为 X 轴',
  balance_bar: '需要设置一个指标，一个维度',
  multi_dim_ratio_bar: '需要设置一个指标，两个维度；第一维度为比例堆积维度，第二个维度作为 X 轴',
  multi_dim_ratio_line: '需要设置一个指标，两个维度；第一维度为比例堆积维度，第二个维度作为 X 轴',
  bar_and_line: '至少设置一个指标，一个维度，最后一个指标将以线条展示',
  tree: '需要设置一个指标，至少设置两个维度',
  force: '需要设置一个指标，至少设置一个维度',
  image: '无限制',
  sdk_heat_map: '至少设置一个指标',
  sugo_funnel: '无限制',
  sugo_retention: '无限制',
  sugo_path_analysis: '无限制',
  IframeBox: '需要一个URL',
  liquidFill: '需要设置至少一个指标',
  wordCloud: '需要设置一个指标,一个维度',
  gauge: '需要设置一个指标',
  gauge_1: '需要设置一个指标',
  beauty_gauge: '需要设置一个维度和一个指标',
  radar: '需要至少三个指标,一个维度',
  chord: '需要两个维度',
  link: '无限制',
  step_progress: '至少设置一个指标，无需设置维度',
  rich_text_list: '需要至少一个指标,一个维度',
  rich_text_list_for_smart: '无限制',
  table_transfer: '至少设置一个指标/维度，不能同时设为空'
}

export const vizTypeHintMapForUserAction = _.mapValues(vizTypeHintMap, (val, key) => {
  return val.replace(/指标/g, '事件项').replace(/维度/g, '属性项')
})

const lenLt = n => arr => arr.length < n
const lenLte = n => arr => arr.length <= n
const lenEq = n => arr => arr.length === n
const lenGt = n => arr => n < arr.length
const lenGte = n => arr => n <= arr.length

const vizTypeEnableCheckerDict = {
  number: { metrics: lenGt(0), dimensions: lenEq(0) },
  input_number: { metrics: lenGt(0), dimensions: lenEq(0) },
  number_lift: { metrics: lenGt(0), dimensions: lenEq(0) },
  progress_bar:{ metrics: lenGt(0), dimensions: lenEq(0) },
  bullet: { metrics: lenGte(3) },
  table: { metrics: lenGt(0) },
  // table_flat 允许不带指标，即查询源数据；但是不带指标时至少要带一个维度
  table_flat: { dimensions: (dims, params) => !_.isEmpty(params.metrics) || !_.isEmpty(dims) },
  pie: { metrics: lenEq(1), dimensions: lenEq(1)},
  tree_map: { metrics: lenEq(1), dimensions: lenEq(1)},
  dist_bar: { metrics: lenGte(1), dimensions: lenLte(1) },
  line: { metrics: lenGte(1), dimensions: lenEq(1) },
  multi_dim_bar: { metrics: lenEq(1), dimensions: lenEq(2) },
  multi_dim_line: { metrics: lenEq(1), dimensions: lenEq(2) },
  map: { metrics: lenEq(1), dimensions: lenEq(1)},
  arcgis: { metrics: lenEq(1), dimensions: lenEq(1)},
  scatter_map: { metrics: lenEq(1), dimensions: arr => lenEq(1)(arr) || lenEq(2)(arr)},
  migration_map: { metrics: lenEq(1), dimensions: arr => lenEq(2)(arr)},
  multi_dim_stacked_bar: { metrics: lenEq(1), dimensions: lenEq(2)},
  horizontal_bar: { metrics: lenGte(1), dimensions: lenEq(1)},
  heat_map: { metrics: lenEq(1), dimensions: lenEq(2) },
  bubble: { metrics: arr => lenGte(2)(arr) && lenLte(3)(arr), dimensions: arr => lenEq(2)(arr) || lenEq(1)(arr) },
  multi_dim_stacked_line: { metrics: lenEq(1), dimensions: lenEq(2)},
  balance_bar: { metrics: lenEq(1), dimensions: lenEq(1)},
  pictorial_bar: { metrics: lenEq(1), dimensions: lenEq(1)},
  multi_dim_ratio_bar: { metrics: lenEq(1), dimensions: lenEq(2) },
  multi_dim_ratio_line: { metrics: lenEq(1), dimensions: lenEq(2) },
  bar_and_line: { metrics: lenGte(1), dimensions: lenEq(1) },
  tree: { metrics: lenEq(1), dimensions: lenGte(2) },
  force: { metrics: lenEq(1), dimensions: lenGte(1) },
  sdk_heat_map: { metrics: lenGt(0) },
  liquidFill: { metrics: lenGte(1), dimensions: lenEq(0) },
  wordCloud: { metrics: lenEq(1), dimensions: lenEq(1) },
  gauge: { metrics: lenEq(1), dimensions: lenEq(0) },
  gauge_1: { metrics: lenEq(1), dimensions: lenEq(0) },
  beauty_gauge: { metrics: lenEq(1), dimensions: lenEq(1) },
  radar: { metrics: lenGte(3), dimensions: lenEq(1) },
  chord: { dimensions: lenEq(2) },
  step_progress: {metrics: lenGte(1)},
  rich_text_list: { metrics: lenGte(0), dimensions: lenLte(1) },
  // rich_text_list_for_smart: { metrics: lenGte(0)},
  table_transfer: { dimensions: (dims, params) => !_.isEmpty(params.metrics) || !_.isEmpty(dims) },
}

export function checkVizTypeEnable(vizType, params) {
  let checker = vizTypeEnableCheckerDict[vizType]
  if (!checker) {
    return true
  }
  return _.every(Object.keys(checker), prop => checker[prop](params[prop], params))
}
