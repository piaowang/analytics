
/**
 * android, ios sdk上报固定维度字段外加100个CS1-CS100的自定义维度
 * [0=维度名称,1=维度别名,2=维度数据类型（如未设置默认string）]
 * 维度类型：0=long,1=double,2=string
 */
export const SDK_DIMENSIONS = [
  ['app_build_number', 'app版本号'],
  ['app_version_string', 'app版本名'],
  ['bluetooth_version', '蓝牙版本'],
  ['brand', '品牌'],
  ['carrier', '运营商'],
  ['from_binding', '是否绑定事件'],
  ['google_play_services', 'google play服务'],
  ['has_nfc', 'nfc功能'],
  ['has_telephone', '电话功能'],
  ['lib_version', 'sdk版本'],
  ['manufacturer', '制造商'],
  ['model', '型号'],
  ['os', '操作系统'],
  ['os_version', '操作系统版本'],
  ['radio', '通信协议'],
  ['screen_dpi', '分辨率'],
  ['screen_height', '屏幕高度'],
  ['screen_width', '屏幕宽度'],
  ['text', '文本'],
  ['wifi', 'wifi功能'],
  ['distinct_id', '用户唯一ID'],
  ['event_id', '事件ID'],
  ['event_name', '事件名称'],
  ['mp_lib', 'sdk类型'],
  ['time', '客户端时间'],
  ['token', '应用ID'],
  ['page', '页面'],
  ['duration', '停留时间', 1],
  ['cell_index', ''],
  ['cell_section', ''],
  ['cell_label', ''],
  ['HEAD_IP', '客户端IP'],
  ['HEAD_HTTPFORWARD', 'X-Forwarded-For'],
  ['HEAD_HTTPREFER', 'Referer'],
  ['HEAD_USERAGENT', '浏览器标识'],

  //**************************web 埋点上报字段 */
  ['browser', '浏览器'],
  ['browser_version', '浏览器版本'],
  ['current_url', '当前请求地址'],
  ['initial_referrer', ''],
  ['initial_referring_domain', ''],
  ['host', 'HOST'],
  ['ce_version', '编辑器版本'],
  ['event_type', '事件类型'],
  ['title', '页面title'],
  ['elements', '事件源html元素'],
  ['el_text', '事件源文本']
]

/** mysql 上报采集事 默认固定维度 */
export const MYSQL_DIMENSIONS = [
  'mysql_event_type', //insert/delete
  'mysql_event_schema',// 
  'mysql_event_table'
]
