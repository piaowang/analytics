/**
 * Created on 09/02/2017.
 */

import { dedent } from './sugo-utils'
import _ from 'lodash'

export const EMPTY_VALUE_OR_NULL = '空字符串 / NULL'

export const EMPTY_STRING = '(空字符串)'

export const NULL_VALUE = '(Null)'

export const RowKeyName = 'uid\u200b' // 特殊字符是为了避免跟真实数据冲突

// 前端增加判断条件，对于数值型标签中，如数值=-99999，标识为未覆盖标签
export const EMPTY_TAG_NUMBER = -99999
// 标签查询 查询未覆盖 区间最小差值
export const TAG_NUMBER_EPSILON = 0.00001

// https://getbootstrap.com/docs/4.0/layout/overview/#responsive-breakpoints
// 暂定小于 992 的使用移动端布局
export const RESPONSIVE_PAGE_MAX_WIDTH = 992

export const ReplaceNullOrEmpty = {
  [NULL_VALUE]: v => _.isNil(v) || v === 'null' || v === 'undefined',
  [EMPTY_STRING]: /^$/
}

// flaot:1 => fix https://github.com/Datafruit/sugo-analytics/issues/1134

/**
 * druid维度类型
 * TODO 此处定义与 /sugo-analytics/src/common/druid-column-type.js 中定义重复,改为同一处定义
 */
export const DIMENSION_TYPES = {
  long: 0,
  float: 1,
  string: 2,
  dateString: 3,
  date: 4,
  int: 5,
  text: 6,
  double: 7,
  bigDecimal: 8,

  // 多值列
  longArray: 100,
  floatArray: 101,
  stringArray: 102,
  dateArray: 104,
  intArray: 105,
  doubleArray: 107
}

/**
 * 前端数据库存储类型与后端类型对应关系
 * 后端类型：int|long|float|date\string
 * dateString => string
 */
export const DIMENSION_MAP = {
  int: 'int',
  long: 'long',
  float: 'float',
  string: 'string',
  dateString: 'string',
  date: 'date',
  text: 'string',
  double: 'float',
  bigDecimal: 'float'
}

/** 数据上报时，数据类型简写 */
export const DIMENSION_TYPES_MINI_MAP = {
  int: 'i',
  long: 'l',
  float: 'f',
  date: 'd',
  string: 's',
  text: 't',
  double: 'p',
  bigdecimal: 'f'
}

/** druid supervisor_spec 支持类型=>（mysql，android，single） */
export const PLATFORM = { MYSQL: 'mysql', MOBILE: 'android', SINGLE: 'single' }

/** 接入数据写入到数据库类型: 0-主分析表, 1-维表 */
export const AccessDataTableType = { Main: 0, Dimension: 1 }

/**
 * 接入数据类型
 * @typedef {Object} AccessDataType
 * @property {Number} File 文件导入
 * @property {Number} SDK 行为sdk导入
 * @property {Number} Log 日志导入
 * @property {Number} Tag 标签导入
 * @property {Number} MySQL 数据库查询
 * @property {Number} OfflineCalc 指标模型接入
 */

/** @type {AccessDataType} */
export const AccessDataType = {
  File: 0,
  SDK: 1,
  Log: 2,
  Tag: 3,
  MySQL: 4,
  OfflineCalc: 5
}

/**
 * 维度数据源类型，标识维度应用于标签数据源还是默认数据源
 * @typedef {Object} DimDatasourceType
 */
export const DimDatasourceType = {
  default: 'default',
  tag: 'tag'
}

/**
 * 数据源类型
 * @typedef {Object} DataSourceType
 * @property {Number} 0 = Tindex(lucene)
 * @property {Number} 1 = 预聚合(druid)
 * @property {Number} 2 = Uindex(update)
 */
export const DataSourceType = {
  Tindex: 0,
  Druid: 1,
  Uindex: 2,
  MySQL: 3
}

/**
 * 数据源类型
 * @typedef {Object} DataSourceTypeMap
 * @property {Number} 0 = Tindex(lucene)
 * @property {Number} 1 = 预聚合(druid)
 * @property {Number} 2 = Uindex(update)
 */
export const DataSourceTypeMap = {
  0: 'tindex',
  1: 'druid',
  2: 'uindex'
}

/** 接入数据来源类型 */
export const AccessDataOriginalType = {
  Android: 0,
  Ios: 1,
  Web: 2,
  Mysql: 3,
  Csv: 4,
  Text: 5,
  Excel: 6,
  Log: 7,
  WxMini: 8,
  Tag: 9
}

export const AccessDataOriginalTypeArr = [
  'Android',
  'Ios',
  'Web',
  'Mysql',
  'Csv',
  'Text',
  'Excel',
  'Log',
  'WxMini',
  'Tag'
]

/** 项目运行状态 */
export const ProjectStatus = { Show: 1, Hide: 0 }
export const ProjectState = { Disable: 0, Activate: 1 }
export const APP_VERSION_STATUS = { Disable: 0, Active: 1 }

/** 数据接入所支持的类型 */
export const ACCESS_TYPES = {
  MYSQL: 'druid_access_mysql',
  TEXT: 'druid_access_text',
  CSV: 'druid_access_csv',
  JSON: 'druid_access_json'
}

/** 场景数据类型 */
export const SceneType = {
  UserBehavior: 0,
  RFM: 1,
  UserType: 2,
  SetMicroPicture: 3,
  MarketBrain: 4
}

/** RFM 记录状态 */
export const RFMState = {
  Normal: 0,
  Deleted: 1
}

// 接入数据task状态
export const ACCESS_DATA_TASK_STATUS = {
  WAITING: 0,
  PENDING: 1,
  RUNNING: 2,
  SUCCESS: 3,
  FAILED: 4
}


const TEMPL_CONFIG = {
  projectName: '${projectName}',
  monitorName: '${monitorName}',
  failureTime: '${failureTime}',
  rules: '${rules}',
  filter: '${filter}',
  level: '${level}'
}

export const DEFAULT_TEMPLATES = {
  error_template: dedent`
    故障状态：发生异常；
    故障名称：项目“${TEMPL_CONFIG.projectName}”的“${TEMPL_CONFIG.monitorName}” 告警；
    故障时间：${TEMPL_CONFIG.failureTime}；
    告警查询范围：${TEMPL_CONFIG.filter}；
    触发告警条件： ${TEMPL_CONFIG.rules}；
    告警等级：${TEMPL_CONFIG.level}，
    现在已触发告警线，请您在收到这条短信后，到平台查看具体报警情况，谢谢！
  `,
  normal_template: dedent`
    故障状态：恢复正常；
    故障名称：项目“${TEMPL_CONFIG.projectName}”的“${TEMPL_CONFIG.monitorName}” 告警；
    恢复时间：${TEMPL_CONFIG.failureTime}；
    告警查询范围：${TEMPL_CONFIG.filter}；
    触发告警条件：${TEMPL_CONFIG.rules}；
    告警等级：${TEMPL_CONFIG.level}，
    现在已不在报警范围内，请知悉，谢谢！
  `
}

/**
 * 系统默认告警接口key
 */
export const SUGO_ALARMS_API_KEYS = {
  SMS: { id: 'sugo_sms_alarm', name: '短信告警', type: 1 },
  EMAIL: { id: 'sugo_email_alarm', name: '邮件告警', type: 0 },
  WECHAT: { id: 'sugo_wechat_alarm', name: '微信告警', type: 2 },
  SHELL: { id: 'sugo_shell_alarm', name: 'shell告警', type: 3 }
}

/**
 * 监控告警-异常告警通知规则
 */
export const ALARM_UNUSUAL_RULES = [
  { key: 'fibonacci', val: '异常以衰减式次数发送通知' },
  { key: 'everyTime', val: '每次检测发生异常均发送通知' },
  { key: 'sameError', val: '检测同一异常只发送一次通知' }
]

/**
 * 数据源存储引擎
 * @typedef {Object} QUERY_ENGINE
 * @property {Number} TINDEX = Tindex(lucene)
 * @property {Number} UINDEX = 预聚合(druid)
 * @property {Number} DRUID = Uindex(update)
 */
export const QUERY_ENGINE = {
  /**
   * 一般为行为数据，不可更新
   */
  TINDEX: 'tindex',
  /**
   * 一般为标签画像，可更新
   */
  UINDEX: 'uindex',
  /**
   * 预聚合，原生druid查询
   */
  DRUID: 'druid',

  /**
   * MySQL 表查询
   */
  MYSQL: 'mysql'
}

/**
 * 默认时区
 */
export const DEFAULT_TIMEZONE = 'Asia/Shanghai'

/**
 * @typedef TagType
 * @property {string} Range 范围类型
 * @property {string} String 离散类型
 */
export const TagType = {
  /**
   * 范围类型
   */
  Range: '1',
  /**
   * 离散类型
   */
  String: '2',
  /**
   * 时间类型
   */
  Time: '3'
}

export const NumberSplitType = {
  range: 'range',
  value: 'value',
  subTag: 'subTag'
}

export const BuiltinUserGroup = {
  newVisitUsers: 'builtin-new-visit-users',
  allLoginUsers: 'builtin-all-login-users',
  newLoginUsers: 'builtin-new-login-users'
}

export const MetricRulesAlarmLevelEnum = {
  info: 10,
  warning: 20,
  fatal: 30
}

export const MetricRulesAlarmLevelTranslation = {
  info: '提醒',
  warning: '警告',
  fatal: '严重'
}

export const dateOptionsGen = () => ({
  natural: [
    {
      title: '今天',
      dateType: '-1 days'
    },
    {
      title: '本周',
      dateType: '-1 weeks'
    },
    {
      title: '本月',
      dateType: '-1 months'
    },
    {
      title: '昨天',
      dateType: ['-1 days startOf day', 'startOf day -1 ms']
    },
    {
      title: '上周',
      dateType: ['-1 weeks startOf week', 'startOf week -1 ms']
    },
    {
      title: '上月',
      dateType: ['-1 months startOf month', 'startOf month -1 ms']
    },
    {
      title: '最近3天',
      dateType: '-3 days'
    },
    {
      title: '最近7天',
      dateType: '-7 days'
    },
    {
      title: '最近10天',
      dateType: '-10 days'
    },
    {
      title: '最近15天',
      dateType: '-15 days'
    },
    {
      title: '最近30天',
      dateType: '-30 days'
    },
    {
      title: '最近90天',
      dateType: '-90 days'
    },
    {
      title: '今年',
      dateType: '-1 years'
    },
    {
      title: '去年',
      dateType: ['-1 year startOf year', '-1 year endOf year']
    },
    {
      //该情况在convertDateType处单独进行了处理
      title: '最近一年',
      dateType: 'lastOneYear'
    }
  ],
  exact: [
    {
      title: '最近5分钟',
      dateType: `-${5 * 60} second`
    },
    {
      title: '最近10分钟',
      dateType: `-${10 * 60} second`
    },
    {
      title: '最近15分钟',
      dateType: `-${15 * 60} second`
    },
    {
      title: '最近30分钟',
      dateType: `-${30 * 60} second`
    },
    {
      title: '最近1小时',
      dateType: `-${60 * 60} second`
    },
    {
      title: '最近3小时',
      dateType: `-${60 * 3 * 60} second`
    },
    {
      title: '最近6小时',
      dateType: `-${60 * 6 * 60} second`
    },
    {
      title: '最近12小时',
      dateType: `-${60 * 12 * 60} second`
    },
    {
      title: '最近24小时',
      dateType: `-${60 * 24 * 60} second`
    }
  ],
  custom: [
    {
      title: '自定义',
      dateType: 'custom'
    }
  ]
})

export const AlarmExceptionHandleState = {
  unhandled: 'unhandled',
  handling: 'handling',
  ignored: 'ignored',
  handled: 'handled'
}

export const BuiltinUserGroupNameDict = {
  [BuiltinUserGroup.newVisitUsers]: '新访问用户',
  [BuiltinUserGroup.allLoginUsers]: '全部登录用户',
  [BuiltinUserGroup.newLoginUsers]: '新登录用户'
}

export const GetBuildInUgs = datasourceCurrent => [BuiltinUserGroup.newVisitUsers, BuiltinUserGroup.allLoginUsers, BuiltinUserGroup.newLoginUsers].map(ugId => ({
  id: ugId,
  title: BuiltinUserGroupNameDict[ugId],
  updated_at: '1970-01-01',
  created_at: '1970-01-01',
  params: {
    groupby: (BuiltinUserGroup.allLoginUsers === ugId || BuiltinUserGroup.newLoginUsers === ugId)
      ? _.get(datasourceCurrent, 'params.loginId')
      : _.get(datasourceCurrent, 'params.commonMetric[0]')
  }
}))

/**
 * 未分类节点key
 */
export const KEY_NONE_TYPE = 'not-typed'

// 未分类树节点信息
export const untypedItem = {
  id: KEY_NONE_TYPE,
  parent_id: '-1',
  value: KEY_NONE_TYPE,
  title: '未分类',
  name: '未分类'
}

// 错误码绑定到 druid 维度时，数据库的枚举值，相关逻辑参见 components/ErrorCode/dimension-binding-btn.jsx
export const ErrorCodeBindingTypeEnum = {
  SystemCode: 'systemCode',
  ModuleCode: 'moduleCode',
  InterfaceCode: 'interfaceCode',
  ErrorCode: 'errorCode'
}

// 用于将 MySQL 的字段类型映射到维度类型
export const MySQLColumnTypeMatchDict = {
  LONG: /bigint/i,
  FLOAT: /float/i,
  STRING: /char|tinytext|blob/i,
  DATE: /date|time/i,
  INT: /int|bool/i,
  TEXT: /text/i,
  DOUBLE: /double/i,
  BIGDECIMAL: /decimal/i
}

export const TagTypeEnum = {
  dimension: 'dimension',
  measure: 'measure',
  track_event: 'track_event',
  user_group: 'user_group',
  slices: 'slices',
  publish: 'publish',
  offline_calc_dimension: 'offline_calc_dimension',
  offline_calc_index: 'offline_calc_index',
  offline_calc_model: 'offline_calc_model',
  portals: 'portals'
}

export const UserGroupBuildInTagEnum = {
  /** Default 没有分组就是默认组 */
  Default: '',
  /** 多维分析结果 */
  AnalyticResultAsUserGroup: 'fromAnalytic',
  /** 行为分析结果 */
  UserActionInspectResultAsUserGroup: 'fromUserActionAnalytic',
  /** 标签圈选结果 */
  UserTagFilteredResultAsUserGroup: 'fromUserTagFiltered',
  /** 标签计算群 */
  UserGroupWithoutLookup: 'withoutLookup',
  /** 营销用户群 */
  UserGroupWithMarketing: 'withMarketing',
  /** 生命周期 */
  UserGroupWithLifeCycle: 'withLifeCycle'
}

export const UserGroupBuildInTags = [
  {
    id: UserGroupBuildInTagEnum.Default,
    name: '默认组'
  },
  /*{
    id: UserGroupBuildInTagEnum.AnalyticResultAsUserGroup,
    allowSelect: false,
    name: '多维分析结果'
  },*/
  {
    id: UserGroupBuildInTagEnum.UserActionInspectResultAsUserGroup,
    allowSelect: false,
    name: '行为分析结果'
  },
  {
    id: UserGroupBuildInTagEnum.UserTagFilteredResultAsUserGroup,
    allowSelect: false,
    name: '标签圈选结果'
  },
  {
    id: UserGroupBuildInTagEnum.UserGroupWithoutLookup,
    name: '标签计算群'
  },
  {
    id: UserGroupBuildInTagEnum.UserGroupWithMarketing,
    name: '营销用户群'
  },
  {
    id: UserGroupBuildInTagEnum.UserGroupWithLifeCycle,
    name: '生命周期群'
  }
].map(o => ({ ...o, type: TagTypeEnum.user_group }))

export const UserGroupFilterTypeEnum = {
  behaviorFilter: 'behaviorFilter',
  userTagFilter: 'userTagFilter',
  userGroupFilter: 'userGroupFilter'
}

export const UserGroupFilterTypeTranslation = {
  behaviorFilter: '行为筛选',
  userTagFilter: '标签筛选',
  userGroupFilter: '用户群筛选'
}

export const UserGroupSetOperationEnum = {
  union: 'or',
  difference: 'exclude',
  intersection: 'and'
}

export const UserGroupSetOperationTranslation = {
  union: '叠加',
  difference: '排除',
  intersection: '相交',
  or: '叠加',
  exclude: '排除',
  and: '相交'
}

export const UsergroupFilterStrategyEnum = {
  byExistingUserGroup: 'byExistingUserGroup',
  byUpload: 'byUpload'
}

export const UsergroupFilterStrategyTranslation = {
  byExistingUserGroup: '选择已有分群',
  byUpload: '上传'
}

export const UsergroupRecomputeStrategyEnum = {
  byHand: 'byHand',
  byInterval: 'byInterval'
}

export const UsergroupRecomputeStrategyTranslation = {
  byHand: '手动更新',
  byInterval: '定时更新'
}

export const UsergroupUpdateStrategyEnum = {
  replace: 'replace',
  append: 'append'
}

export const UsergroupUpdateStrategyTranslation = {
  replace: '更新后替换原有用户群',
  append: '更新后累计至原有用户群'
}

export const UpdateTagSegmentType = {
  Delete: 1,
  Keep: 2
}

export const UserTagUpdateTaskTypeEnum = {
  UpdateByUserGroup: 1
}

export const UserTagUpdateTaskTypeTranslation = {
  UpdateByUserGroup: '用户群定义标签'
}

export const UserTagUpdateTaskUpdateStrategyEnum = {
  Manual: 'manual',
  Interval: 'interval'
}
export const UserTagUpdateTaskUpdateStrategyTranslation = {
  Manual: '手动',
  Interval: '周期'
}

export const adnroidAlias = ['android', 'Android', '安卓']
export const iosAlias = ['ios', 'IOS', 'iOS', 'Ios', 'Objective-C']

/** 代理静态资源访问路径 */
export const staticUrl = '/_bc/extra_pic/'

export const ClientTypeEnum = {
  frontendClient: 'frontendClient',
  backendClient: 'backendClient',
  broadcastClient: 'broadcastClient'
}

export const SharingTypeEnum = {
  Unknown: 0,
  Dashboard: 1,
  LiveScreen: 2,
  LiveScreenPub: 3
}

export const SharingRestrictionsTypeEnum = {
  password: 1,
  institutions: 2
}

/** 营销事件/活动记录使用状态 */
export const MARKETING_EVENT_STATUS = {
  /** 1=营销事件/活动开启 */
  OPEN: 1,
  /** 0=营销事件/活动关闭 */
  CLOSE: 0
}

/** 营销事件-营销时机类型 */
/**
 * @typedef MARKETING_EVENT_TIMER_TYPE
 * @property TIMING 定时
 * @property REALTIME 实时
 */
export const MARKETING_EVENT_TIMER_TYPE = {
  /** 0=定时 */
  TIMING: 0,
  /** 1=实时 */
  REALTIME: 1
}

export const MARKET_BRAIN_EVENT_TIMER_TYPE = {
  /** 0=单次 */
  SINGLE: 0,
  /** 1=多次 */
  MULTI: 1
}

export const MARKET_BRAIN_TOUCH_UP_WAY = {
  /** 0=自动 */
  AUTO: 0,
  /** 1=手动 */
  BYHAND: 1
}

export const MARKET_BRAIN_BELONGS = {
  /** 0=策略 */
  EVENT: 0,
  /** 1=活动 */
  ACTIVE: 1
}

/** 智能营销-任务类型：0=自动化营销;1=活动营销 */
export const MARKETING_TASK_TYPE = {
  /** 0=自动化营销 */
  EVENTS: 0,
  /** 0=活动营销 */
  ACTIVIE: 1
}

/**智能营销-任务状态：0=准备中;1=运行中;2=执行中;3=已暂停;4=已完成 */
export const MARKETING_TASK_STATUS = {
  /** 0=准备中 */
  PREPARING: 0,
  /** 1=运行中 */
  RUNNING: 1,
  /** 2=执行中 */
  EXECUTING: 2,
  /** 3=已暂停 */
  PAUSED: 3,
  /** 4=已完成 */
  DONE: 4,
  /** 5=失败 */
  FAILED: 5
}

/** 发送渠道对应的所需数据维度名 */
export const MARKETING_TYPE_COLUMN = {
  /** push对应的token字段名 */
  PUSH: 's_token',
  /** 短信对应的手机号字段名 */
  SMS: 's_phone'
}

/** 智能营销-发送渠道 */
export const MARKETING_SEND_CHANNEL = {
  /** 0=push渠道 */
  PUSH: 0,
  /** 1=短信渠道 */
  SMS: 1
}

/** 全局排序模块ID标识 */
export const CUSTOM_ORDER_MODULES = {
  /** 智能营销-营销模型排序标识 */
  MARKETING_MODELS: 'sugo-marketing-models-orders'
}

export const MARKETING_SEND_STATUS = {
  UNSENT: 0,
  FAIL: 1,
  SUCCESS: 2
}

export const MARKETING_GROUP_TYPE = {
  SEND: 0,
  CONTRAST: 1
}

export const UploadedFileType = {
  Unknown: 0,
  Image: 1,
  CSV: 2,
  LossPredictTrainingData: 10,
  LossPredictTestData: 11,
  imgSnapshoot: 12
}

export const DataApiClientStatusEnum = {
  Disabled: 0,
  Enabled: 1
}

export const DataApiTypeEnum = {
  Slice: 0,
  UserGroup: 1
}
export const DataApiStatusEnum = {
  Disabled: 0,
  Enabled: 1
}

export const LifeCycleState = {
  pass: '1',
  nopass: '2'
}
// 我们的采集系统暂不支持 Tindex 和 db2
// 请同步修改 OfflineCalc/model-publisher.jsx OfflineCalcDataSourceTypeConvertDict
export const OfflineCalcDataSourceTypeEnum = {
  // Tindex: 0,
  MySQL: 1,
  Oracle: 2,
  Db2: 3,
  SQLServer: 4,
  PostgreSQL: 5,
  Hive: 6
}


// 业务维度枚举值
export const BusinessDimensionTypeEnum = ['INT', 'STRING', 'DOUBLE', 'FLOAT']
export const BusinessDimensionCreateModeEnum = ['全部维度', '公有维度', '私有维度']
export const BusinessDimensionStatusEnum = ['弃用', '启用']

export const OfflineCalcDataSourceDefaultSchema = {
  Oracle: 'SYSTEM',
  Db2: '',
  SQLServer: 'dbo',
  PostgreSQL: 'public'
}

export const OfflineCalcIndicesTypeEnum = {
  BasicIndicator: '基础指标',
  DerivedIndicator: '衍生指标',
  ImportedIndicator: '导入指标'
}

export const OfflineCalcTargetType = {
  Dimension: '0',
  Indices: '1',
  IndicesModel: '2',
  Table: '3',
  Datasource: '4',
  Reviewer: 'r',
  DelReviewer: 'd'
}

export const OfflineCalcTargetTypeName = {
  Indices: '指标',
  IndicesModel: '指标模型'
}

export const indicesDataFormat = ['金额', '数值', '比例']
export const indicesGenerationCycle = ['日', '周', '月']
export const indicesStatisticalType = ['时点', '时期']

export const OfflineCalcVersionStatus = {
  watingForReview: 1,
  pass: 2,
  noPass: 3,
  watingForDel: 4,
  deleted: 5,
  cancel: 6
}

export const OfflineCalcVersionStatusName = {
  watingForReview: '待审核',
  pass: '审核通过',
  noPass: '审核不通过',
  watingForDel: '待删除',
  deleted: '已删除',
  cancel: '发起人取消'
}

export const OfflineCalcVersionReviewStrategy = {
  oneByOne: 0,
  onePassAllPass: 1
}

export const OfflineCalcChartType = {
  relation: '1',
  influence: '2'
}

export const OfflineCalcModelJoinTypeEnum = {
  innerJoin: '内连接',
  leftJoin: '左连接',
  rightJoin: '右连接',
  fullJoin: '全连接'
}

export const OfflineCalcModelRunningHistoriesStatusEnum = {
  0: '失败',
  1: '成功'
}

export const OfflineCalcDimensionExtractableTimePartEnum = {
  SECOND_OF_MINUTE: '秒',
  MINUTE_OF_HOUR: '分钟',
  HOUR_OF_DAY: '小时',
  DAY_OF_WEEK: '周天',
  DAY_OF_MONTH: '日',
  MONTH_OF_YEAR: '月',
  YEAR: '年'
}

export const GlobalConfigKeyEnum = {
  OfflineCalcIndicesUnit: 'offline_calc_indices_unit' // 指标管理系统的指标的单位，数据格式：米|千米|元|万元
}

export const OfflineCalcTableKeyTypeEnum = {
  normal: '普通维',
  id: 'ID 维'
}

export const VisualModelCalcTypeEnum = {
  Select: 'Select',
  GroupBy: 'GroupBy'
}

export const VisualModelCalcTypeTranslation = {
  Select: '大宽表',
  GroupBy: '统计汇总'
}

export const VisualModelOutputTargetTypeEnum = {
  Tindex: 'Tindex',
  MySQL: 'MySQL'
}

export const VisualModelOutputTargetTypeTranslation = {
  Tindex: '加速引擎',
  MySQL: 'MySQL'
}

export const VisualModelUpdateStrategyEnum = {
  Full: '全量',
  Append: '增量'
}

export const LIVE_SCREEN_COVER_MODE = {
  automatic: 1,  // 自动获取
  manual: 2 //手动上传
}

export const EXAMINE_TYPE = {
  liveScreenTemplate: 1, //大屏模板
  liveScreen: 2 //大屏
}

export const EXAMINE_TYPE_TRANSLATE = {
  liveScreenTemplate: '大屏模板',
  liveScreen: '大屏'
}

export const EXAMINE_STATUS = {
  notsubmit: 0,
  wait: 1,
  pass: 2,
  failed: 3
}

export const EXAMINE_STATUS_TRANSLATE = {
  notsubmit: '草稿',
  wait: '待审核',
  pass: '已通过',
  failed: '已驳回'
}

export const LIVE_SCREEN_STATUS = {
  authorize: 1,
  cancel: 0,
  none: -1
}

export const LIVE_SCREEN_STATUS_TRANSLATE = {
  authorize: '授权',
  cancel: '取消授权',
  none: '未授权'
}

export const AUTHORIZATION_TYPE = {
  slice: '1',
  dashboard: '2'
}

export const AUTHORIZATION_PERMISSIONS_TYPE = {
  read: 1,
  write: 2,
  owner: 3
}

export const AUTHORIZATION_PERMISSIONS_TYPE_TRANSLATE = {
  read: '浏览',
  write: '编辑',
  owner: '管理'
}

/** 策略分群模型类型 */
export const MARKETING_MODEL_TYPE = {
  /** RFM模型 */
  RFM: 0,
  /** 用户生命周期模型 */
  LIFE_CYCLE: 1,
  /** 用户价值分层模型 */
  VALUE_SLICE: 2
}

/** 策略分群模型类型接口后缀 */
export const MARKETING_MODEL_TYPES = [
  'rfm',
  'lifeCycle',
  'valueTier'
]

/** 策略分群模型计算状态 */
export const MARKETING_MODEL_STATUS = {
  /** 未开始 */
  DEFAULT: 0,
  /** 计算中 */
  RUNNING: 1,
  /** 计算完成 */
  DONE: 2,
  /** 计算失败 */
  FAILED: 3
}

//调度管理任务状态
export const TASK_SCHEDULE_STATUS = {
  all: 0,
  running: 1,
  pause: 2,
  stop: 3
}

export const TASK_SCHEDULE_STATUS_TRANSLATE = [
  '所有',
  '调度中',
  '已暂停',
  '未调度'
]
