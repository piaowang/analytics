const os = require('os')
const extend = require('recursive-assign')
const { moduleExtend } = require('sugo-analytics-common-tools/lib/file-extend-all')
let extraConfig = {}
let extraConfigPath = './extra-config'

try {
  extraConfigPath = require('./config').default.extraConfigPath || extraConfigPath
} catch (e) {
  console.log('no extra config path, but it is ok')
}
console.log('extraConfigPath:', extraConfigPath)
try {
  extraConfig = require(extraConfigPath)
} catch (e) {
  console.log('no extra config, but it is ok')
}

let config = {
  // site 站点设置，所有站点设置在浏览器控制台通过 `window.sugo` 可以查看
  // * 通常无需特别配置 - 一般情况下无需指定，请勿在ambri和config.js里配置，除非在特定调试需求下
  // ** 通常由扩展包决定 - 由扩展包配置决定，请勿在ambri和config.js里配置
  // *** 需要根据环境配置 - 需要根据部署环境配置，比如ip，数据库等等，需要在ambri或者config.js指定配置

  site: {
    //万宁报告视图权限控制
    enableReportView: false,

    //jupyter服务地址
    jubyterHost: 'http://192.168.0.212:5162',
    jubyterToken: '4f370e4d776d78eb085fb4da724e68ae66b80884d6aa8b34',

    // 农商行审核开关
    enableDataChecking: false,

    // 是否关闭用户信息下拉菜单
    hideRightMenu: false,
    //* 通常无需特别配置，环境变量，由运行程序决定，
    env: process.env.NODE_ENV || 'development',

    //** 通常由扩展包决定，帮助网站链接
    docUrl: 'http://docs.sugo.io',

    //** 通常由扩展包决定，版权信息，为空则不显示
    copyrightText: '© 广东数果',

    //** 通常由扩展包决定，登录页版权信息
    copyrightTextLogin: '© 2016 ~ 2017 广东数果科技',

    //** 通常由扩展包决定，看板单图数量限制
    dashboardSliceLimit: 20,

    //** 通常由扩展包决定，siteName
    siteName: '数果智能',

    //** 通常由扩展包决定，网站图标，例子 favicon: 'static/images/temp-wxj-favicon.ico',
    favicon: 'favicon.ico',

    //** 通常由扩展包决定，登录页面logo文件名字,
    loginLogoName: '/_bc/sugo-analytics-static/assets/images/logo.png',

    //** 通常由扩展包决定，左侧菜单logo名字
    mainLogoName: '/_bc/sugo-analytics-static/assets/images/logo.svg',

    //** 通常由扩展包决定，csv上传限制, 默认10g
    csvUploadLimit: 1024 * 1024 * 1024 * 10,

    //** 通常由扩展包决定，菜单定义
    menus: null,
    //** 是否启用新版导航菜单
    enableNewMenu: true,
    //** 通常由扩展包决定，显示注册按钮
    showRegLink: false,

    //*** 需要根据环境配置，数据采集网关，csv上传和sdk数据上传的地址
    collectGateway: 'http://collect.sugo.io',

    //*** 需要根据环境配置， sdk 静态资源地址，通常要使用ip端口或者域名以供对外访问
    websdk_app_host: 'localhost:8080',

    //*** sdk默认异常上报topic名称 不设置则不上报
    websdk_exception_topic: '',

    //*** 需要根据环境配置 websocket 端口（埋点使用）
    sdk_ws_port: 8887,

    //* 通常无需特别配置，cdn网站静态资源url，例如 `http://cdn.sugo.io`, 默认不使用
    //cdn: ,

    //websdk相关
    //* 通常无需特别配置，sdk数据上报地址，如果不配置 默认使用collectGateway
    websdk_api_host: '@{site.collectGateway#getHost}',

    //* 通常无需特别配置，可视化埋点接口地址，如果为空，则使用 `websdk_app_host`
    websdk_decide_host: '@{site.websdk_app_host}',

    //* 通常无需特别配置 web_sdk cdn配置，如果为空，则使用 site.cdn || site.websdk_app_host
    //, modifier cdnOrWebsdkAppHost 参考 src/server/config/config-template-parser.js
    websdk_js_cdn: '@{#cdnOrWebsdkAppHost}',

    //* 通常无需特别配置 进入自助分析后首先根据 maxTime 查询数据
    show_newest_data_at_first: true,

    // 相对时间类型 工具型 tool 业务型 business
    // 不同之处在于：业务型的相对时间转成绝对时间后，终止时间不会超过当前时刻
    relativeTimeType: 'business',

    //* 通常无需特别配置  需要部署这个才能使用文件上传：https://github.com/Datafruit/sugo-file-server
    // 部署之后需要到文件服务那里的 config.js 加一个 token 和 secret
    // 文件服务器
    file_server_url: 'http://192.168.0.212:8765',

    //* 通常无需特别配置  文件服务器 token
    file_server_token: 'S13KK_9Ex',

    //* 通常无需特别配置  文件服务器 secret
    file_server_secret: 'SkaU588Eg',

    //* 通常无需特别配置  自助分析惰性加载数据，开启之后需要手动加载数据
    analytics_manual_load_chart_data: true,

    //* 通常无需特别配置  iOS可视化埋点渲染器, 可选项有'Standard', 'Infinitus'等
    iOS_renderer: 'Standard',

    //* 通常无需特别配置 sdk埋点用到的 websocket url，默认使用 websdk_app_host和sdk_ws_port端口自动生成配置
    //modifier noPort 参考 src/server/config/config-template-parser.js
    sdk_ws_url: 'ws://@{site.websdk_app_host}',

    //** 通常由扩展包决定 允许管理企业, 默认关闭
    companyManage: false,

    //** 通常由扩展包决定 隐藏某些图表类型，图表类型记录在 viz-component-map.js
    // 例子：'table,map'
    hide_viz_types: '',

    //** 通常由扩展包决定 自助分析源数据查询限制
    downloadLimit: '100,500',

    //** 通常由扩展包决定 批量下载限制
    batchDownloadLimit: '100,500,1000',

    //** 通常由扩展包决定 if true, 把用户管理和用户组管理放到用户下拉菜单
    // --- 将被去掉
    hideCompanyManage: true,

    //** 通常由扩展包决定 if true, 把部门管理放到用户下拉菜单
    hideDepartmentManage: true,

    //** 通常由扩展包决定 用户分群列表模式，`table`为旧版列表模式 `thumb` 为缩略图模式
    usergroupList: 'thumb',

    //** 通常由扩展包决定 自助分析默认时间，只能填相对时间 '-1 day', '-15 min' 等
    analyticDefaultTime: '-1 day',

    //** 通常由扩展包决定 页面末尾统一加载js代码
    footerJs: '',

    //** 通常由扩展包决定  antd 输出包名，默认是`antd`, 当使用多语言时候，可以选择 `antd-with-locales`
    antdName: 'antd',

    //** 通常由扩展包决定 qq客服链接 没有则不显示
    qqCustomerServiceUrl: '',

    //** 通常由扩展包决定 客服电话号码 没有则不显示
    customerServicePhoneNumber: '',

    //** 通常由扩展包决定 动态帮助图标，默认不显示
    showHelpLink: false,

    //** 通常由扩展包决定 额外顶部菜单 ，格式 {text: '链接标题', href='链接url', target='_blank'}
    extraLinks: [],

    //** 通常由扩展包决定  自助分析 filter 的 UI 策略：lite（只有高级搜索功能，不查询 druid）/ normal（有普通和高级搜索功能）
    analyticFilterStrategy: 'normal',

    //** 通常由扩展包决定  自助分析 filter 的 添加 策略：distinct（不允许维度重复）/ normal（允许维度重复）
    analyticFilterAddStrategy: 'distinct',

    //** 通常由扩展包决定  自助分析书签功能
    analyticBookmarkEnable: false,

    //** 通常由扩展包决定  自助分析普通表格维度数最大限制
    analyticNormalTableMaxDimensionCount: 6,

    //** 通常由扩展包决定 多维分析表格最大分组限制
    analyticNormalTableMaxGroupByLimit: 100,

    //** 通常由扩展包决定  源数据分析每次子查询查询的时间范围
    sourceDataAnalyticTimeQueryUnit: 'PT5M',

    //** 通常由扩展包决定 源数据分析列表行 Text 维度查询时的截取长度
    sourceDataAnalyticTextDimPreviewLen: 500,

    //** 通常由扩展包决定 源数据分析瀑布流加载策略，格式：初始加载行数+每步加载行数，例如 '20+20'
    sourceDataAnalyticFlowStrategy: '20+20',

    //** 通常由扩展包决定 源数据分析数据加载策略，格式： auto / manual
    sourceDataAnalyticLoadStrategy: 'auto',

    //** 通常由扩展包决定 是否增强保存单图功能。启用后，路径分析，留存，漏斗可以保存成单图
    enableSaveSliceEnhance: false,

    //** 通常由扩展包决定 是否隐藏左侧菜单和顶部导航，默认false
    hideMenu: false,

    //** 通常由扩展包决定 维度 distinct 下拉框的查询限制
    distinctDropDownFirstNLimit: 10,

    //** 通常由扩展包决定 是否允许跨项目查询用户群
    allowUserGroupCrossProject: false,

    // *** 需要根据环境配置，是否启用 sqlPad
    enableSqlPad: false,

    // *** 通常由扩展包决定隐藏页面非谷歌浏览器的红条提示
    enableBrowserAlert: true,

    //** 通常由扩展包决定
    // 开启 mysql 数据库接入功能
    enableMySQLAccess: false,

    //** 通常由扩展包决定
    // 开启微信小程序接入功能
    enableWechatAppAccess: true,
    //** 通常由扩展包决定  显示所有SDK项目下发配置排除经纬度按钮控制
    enableSdkDecideGlobalConfig: false,
    //** 通常由扩展包决定  微观画像搜索条件
    microcosmicPortraitFilter: 'distinct_id,s_phone,s_email,s_weibo,s_weichat',
    //** 通常由扩展包决定  SDK单页应用 埋点 path去掉第一个控件
    removeSdkFirstIdPath: false,
    //** 通常由扩展包决定  SDK拉取截取信息事件间隔(毫秒)
    sdkGetSnapshotInterval: 1000,
    //** 通常由扩展包决定 登录默认显示页面
    firstMenuPath: '',
    //** 通常由扩展包决定  SDK流量分析默认查询项目个数
    sdkTrafficLimit: 5,
    //** 通常由扩展包决定  静态看板图片加载路径，例如指定 'public/image-dashboard'，则会加载此目录下的全部文件夹，作为看板，看板内的图片，作为该看板内的静态单图
    staticDashboardScanPath: '',
    //** 通常由扩展包决定  默认实时大屏显示南航大屏demo（一般全量包或者南航包才显示）
    chinaSouthernLiveScreen: true,
    //** 通常由扩展包决定  概览默认选中项目
    defaultDatasourceName: '',
    //** 通常由扩展包决定  是否开启扩展功能
    enableTrackEventProps: false,
    //** 通常由扩展包决定  是否开启控件属性功能
    enableTrackEventControlProps: false,
    // 视频播放组件默认地址 跟staticProxyUrl配置对应 /_bc/extra_pic => http://192.168.0.223:81/sugo_yum/SG/centos6/1.0/astro_pic
    demoVideoSource: '/_bc/extra_pic/video/4k.webm',
    //** 通常由扩展包决定  看板分类 看板大于设置条数 收缩
    defaultOpenDashboardCategoryLength: 10,
    //** 通常由扩展包决定  是否显示概览看板
    disableOverview: true,
    //** 通常由扩展包决定  创建SDK项目是否显示自定义token
    disableSdkProjectCustomToken: false,
    //** 通常由扩展包决定  创建SDK项目时,是否在kafka中做重复检测
    diySdkCheckKafka: true,
    //** 通常由扩展包决定 cutv定制化功能开关 暂时只用于用户分群查看自定义列
    // cutvUserListDiyDimName: {
    // 'mobile': '手机号'
    // }
    //
    //cutvUserListDiyDemandDimName: 'distinct_id'
    cutvUserListDiyDimName: false,
    //** 通常由扩展包决定  是否启用看板导出 excel 文件功能
    allowDashboardExportXlsx: true,
    //** 通常由扩展包决定  看板分类展开设置
    defaultOpenDashboardCategory: false,
    //** 通常由扩展包决定 数据质量
    dqMonitor: {
      datasource: 'tindex_SJLnjowGe_project_d6mkNIIqm'
    },

    //** 通常由扩展包决定 是否启用标签导入数据保存文件及是否显示上报历史
    enableTagUploadHistory: true,
    //** 通常由扩展包决定 开启项目列表 => 数据接入菜单
    enableProjectAccessMenu: true,
    //** 通常由扩展包决定 切换项目菜单改为右侧抽屉面板
    enableProjectSelectDrawer: true,

    //** 通常由扩展包决定，离线计算指标的默认前缀
    offlineCalcIndicesDefaultPrefix: 'SI-',

    // 禁用用户群行为分群开关 东呈用 东呈没有行为分析菜单 该分支的修改也没有去给行为分析的入口加这个开关
    userGroupsClustering: false,

    //** 通常由扩展包决定，额外样式路径，例子 /_bc/sugo-analytics-extend-zuolin/assets/extra.css
    extraCssAsset: '',

    //** 通常由扩展包决定，是否启用用户库
    enableUserDB: true,
    //** 通常由扩展包决定，是否允许配置项目的 supervisor
    enableSupervisorConfig: true,

    //** 通常根据环境决定，可视化建模生成 spec 时所设置的 hive baseDir 的前缀
    visualModelHiveBaseDirPrefixForTindexSpec: '/user/hive/warehouse',

    //** 通常由扩展包决定，数据开发中心，默认使用的 hive 节点的代理用户
    dataDevHiveScriptProxyUser: 'root',

    // 数据开发中心，默认使用的 hive 节点的代理用户配套密码（需要解密）
    dataDevHiveScriptProxyPassword: '',

    //** 通常由扩展包决定，路径分析采用一级路径分析（for广州地铁）
    pathAnalysisWebPage: false,
    // 外部数据源机构数据过滤
    enableExternalDataSourcesInstitutions: false,

    // 单图列表默认是按列表(table)或卡片(thumb) 展示
    sliceListMode: 'table',
    //由扩展包决定 营销大脑，生成任务明细时是否需要手机号脱敏 需要的话还要在扩展包里实现一个约定的方法
    marketBrainMobileNeedDesensitize: false,

    //由扩展包决定 营销大脑，员工端完成任务时是否需要生成微信推送链接，需要的话在扩展包的此处写个方法,最终用eval执行
    marketBrainNeedShare: false,

    //** 数据开发是否启用审核功能
    taskManagerV3ShouldExamine: false,

    //** 数据开发中心，执行脚本时连接的地址
    taskManagerV3Ws: {
      url: 'ws://192.168.0.217:12322',
      token: '1y0HKmixzRIps75wd'
    },

    //** 微前端服务地址配置
    microFrontendUrlMap: {
      // 'sugo-indices-dev': {
      //   base: '/console/indices-dev',
      //   publicPath: '/static-apps/indices-dev/'
      // },
      // 'sugo-data-quantity': {
      //   base: '/console/data-quantity',
      //   publicPath: '/static-apps/data-quantity/'
      // },
      // 'sugo-portal-app': {
      //   base: '/console/portal',
      //   publicPath: '/static-apps/portal/'
      // },
      // 'RT-data-dev': {
      //   base: '/console/RT-data-dev',
      //   publicPath: '/static-apps/RT-data-dev/'
      // },
      // 'sugo-data-service': {
      //   base: '/#/console/data-service/',
      //   publicPath: '/static-apps/data-service/'
      // }
    },
    liveScreenFormatter: {
      commaFormatterParam: ',',
      decimalFormatterParam: ',.2f',
      int02FormatterParam: '02,d'
    },

    auditUserRoleInstitution: true,

    //*** 营销大脑相关的配置参数 建议放到扩展包*/
    marketBrain: {
      //** 特性 这是给哪个客户的定制版 */
      feature: 'common',
      /** 是否需要进行场景数据设置 */
      shouldSetGlobalSceneParams: true,
      // 员工表 是否需要维护contactme字段（企业微信 联系我二维码链接)
      shouldUpdateContactMe: false,
      nissan: {
        smsConfig: {
          //文档 https://daas.chebaba.com/workbench/my-apps
          appid: 'cbbVs3WxjJFdxohLehzCp59YgHRthIfyZ4B',
          secret: 'ZTNmZWFmNTlmNzlhMGQ5YmMxYTg5Nzc5OWE5MGVjZWI',
          template_code: 'MSG000109',
          msgUrl: 'https://open.chebaba.com/v1/api/sms/sendmess'
        }
      }
    },
    // 默认空 数据库密码采用明文处理，如果不为空则为国密解密处理
    keyComp1: '',
    kitPrefix: '',
    // 统一数据服务路径前缀配置
    dataServiceUrlPrefix: '',

    // 工作流重跑的时间和次数
    taskReRun: {
      backoff: 120, //默认重跑的时间间隔，单位为s
      retries: 2 //默认重跑的次数
    },

    // 系统首页配置 为空则为 /console/index
    defaultPage: '',

    // 超链接是否禁用打开新窗口，可选项 no（不禁止）| inIframe（在 iframe 内则禁止）| always（总是禁止）
    anchorCustomForbidNewTab: 'no',

    // 数据开发中心里，是否显示 实时开发 tab
    showRealTimeTaskTabInDataDev: true,

    // 数据开发中心里，是否显示 实时计算 tab
    showRealTimeCalculateTabInDataDev: false
  },

  //*** 前端查询参数加密算法，一般根据环境配置，建议不要放到扩展包，可用算法参考 https://cryptojs.gitbook.io/docs/
  urlQueryEncryptAlgorithm: 'AES',

  //*** 前端查询参数加密 secret，一般根据环境配置，建议不要放到扩展包
  urlQuerySecret: '4743118544657601',

  // jwt 单点登录 secret，一般根据环境配置，建议不要放到扩展包
  jwtSecret: '2079942783392339',

  //*** 无限极开放接口IP白名单 如'127.0.0.1,127.0.0.2'*/
  ipWhiteList: '',

  // *** 静态目录路径 代理到 /_bc/extra_pic目录
  staticProxyUrl: 'http://192.168.0.223:81/sugo_yum/SG/centos6/1.0/astro_pic/',

  // *** 为 SDK 项目创建默认单图
  createDefaultDashboardForSDKProject: true,

  // *** 需要根据环境配置，sql pad 服务地址
  sqlPad: {
    serviceUrl: 'http://localhost:3000',
    defaultUserName: 'admin@sugo.io',
    defaultPassword: '123456'
  },

  //*** 需要根据环境配置 程序运行监听的地址，如果在nginx反向代理后面，可以只监听localhost
  host: '0.0.0.0',

  //*** 需要根据环境配置 程序运行监听的端口
  port: process.env.PORT || 8000,
  dbmHost: 'http://192.168.0.230:31889',

  //*** 需要根据环境配置 redis配置，用于共享session等
  redis: {
    host: '192.168.0.212',
    port: 6379
    // sentinels: '' // 哨兵模式
    // name: '' // 哨兵模式masterName
  },

  // postgres数据库配置
  //*** 需要根据环境配置, 请仅仅配置 host,database,username,password,port
  //
  db: {
    dialect: 'mysql',
    host: '192.168.0.198',
    database: 'test_mysql',
    username: 'root',
    password: 'sugo123',
    // verbose: false, // 停用 postgreSQL 控制台打印日志
    pool: {
      max: 5,
      min: 0,
      idle: 10000
    },
    port: 3306,
    define: {
      charset: 'utf8',
      timestamps: false // true by default
    }
  },

  // 标签数据库配置
  //*** 需要根据环境配置，具体配置项参考db配置项，如果设置为null，则表示不需要开启
  tagsDb: '@{db}',

  //*** 需要根据环境配置 druid查询配置
  //请仅仅配置 host, supervisorHost, lookupHostHost
  //ipLibSpec要看实际情况是否需要
  druid: {
    host: '192.168.0.220:8082',
    engine: 'sugoDruid',
    timeout: 60000, // 默认一分钟，减小后端队列
    retry: 2,
    verbose: true, // 显示druid原生查询json
    concurrent: 2,
    exactResultsOnly: true, // 精准查询，group by
    groupByStrategy: 'v2',
    firstN: true, // 默认用firstN查询替换topN查询
    supervisorHost: 'http://192.168.0.212:8090',
    lookupHost: 'http://192.168.0.212:8081',
    lookupListenHost: 'http://192.168.0.222:8083',
    scanBatchSize: 100, // scanQuery每批数据量
    scanQuery: false, // 启用scanQuery替换selectQuery查看原始数据
    ipLibSpec: 'none', //是否启用ip库解析默认为none=不启用，ip=启用
    maxCardinality: 10000, // 数值分组最大基数设置（默认是10000）
    rowLimit: 1000000, // 业务表最大记录数 创建lookupjdbc使用
    excludeHead: false // 数据接入=>排除接入多余维度： sugo_user_agent,sugo_http_refer,sugo_http_refer,sugo_http_refer,sugo_args
  },

  //*** 需要根据环境配置 标签查询服务器配置
  uindex: {
    host: '192.168.0.217:8082',
    engine: 'sugoDruid',
    timeout: 60000, // 默认一分钟，减小后端队列
    retry: 2,
    verbose: true, // 显示druid原生查询json
    concurrent: 2,
    hmaster: 'http://192.168.0.225:8086',
    hproxy: 'http://192.168.0.225:8088', // uindex 数据导入，支持逗号分隔
    lookupHost: 'http://192.168.0.217:8086',
    lookupListenHost: 'http://192.168.0.217:8087',
    exactResultsOnly: true, // 精准查询，group by
    groupByStrategy: 'v2',
    taskSpec: {
      // uindex 建表参数
      dimension: 'distinct_id', // uindex表 默认主键列名称
      partitions: 5,
      partitionNum: -1,
      columnDelimiter: '\u0001'
    }
  },

  //*** 需要根据环境配置 kafka配置
  kafka: {
    zookeeperHost: '192.168.0.216:2181/kafka',
    kafkaServerHost: '192.168.0.214:9092,192.168.0.216:9092'
  },

  //* 通常无需特别配置 默认使用redis配置
  dataConfig: {
    hostAndPorts: '@{#getRedisConfig}',
    clusterMode: '@{#getRedisClusterMode}', // 集群模式
    sentinelMode: '@{#getRedisSentinelMode}', // 哨兵模式
    masterName: '@{#getRedisMasterName}', // 哨兵模式集群master name
    password: '@{#getRedisPassword}',
    type: 'redis'
  },

  //** 通常由扩展包决定 资源限制
  resourceLimit: {
    trial: {
      slice: 20, //per-company
      dashboard: 10, //per-company
      usergroup: 2, //per-company
      retention: 2,
      funnel: 2,
      dimension: 30, //per-company
      measure: 20, //per-company
      user: 5, //per-company
      role: 3, //per-company
      datasource: 2, //per-company
      businessdimension: 5 //业务表关联维度数量
    },
    payed: {
      slice: 2000,
      dashboard: 2000,
      usergroup: 1000,
      retention: 1000,
      funnel: 1000,
      dimension: 30000,
      measure: 20000,
      user: 500,
      role: 30,
      datasource: 30,
      businessdimension: 10
    }
  },

  //** 通常由扩展包决定
  //是否开启测试模式，默认开启
  //开启测试模式发送短信和邮件都是模拟发送
  test: true,

  //** 通常由扩展包决定 发短信相关配置
  aliyunAccessKey: '',
  aliyunAccessSecret: '',

  //** 通常由扩展包决定 发微信通知相关配置
  wechat: {
    corpId: 'wwa25c34e72785b96d',
    agentId: '1000004', // 企业应用的id
    secret: 'HLoNtghXK2Rka3_fKBKPnQmzLijdY6c6QUqweYafQKU'
  },

  //** 通常由扩展包决定 短信签名
  aliyunSmsSignName: {
    main: '广东数果科技'
  },

  //** 通常由扩展包决定 短信模板
  aliyunSmsTemplateCode: {
    code: '',
    monitorAlarm: '',
    errorAlarms: '', // 异常告警模板: SMS_91810006
    normalAlarms: '' // 正常告警模板: SMS_91990006
  },

  //** 通常由扩展包决定 邮件服务的发邮件地址
  aliyunEmailAddr: '',

  //* 通常无需特别配置 验证码过期时间1hour
  cellcodeExpireTime: 60 * 60 * 1000,

  //* 通常无需特别配置 后端请求超时时间 15秒默认
  timeout: 15000,

  //签名验证有效时间 30分钟默认
  tokenExpire: 1000 * 60 * 30,

  //** 通常由扩展包决定 是否记录访问日志到数据库。默认不记录
  log2db: false,

  //** 通常由扩展包决定 是否记将错误日志写入数据库。默认不记录
  errorLog2db: false,

  //** 通常由扩展包决定 记录访问日志的 method 限制
  log2dbByMethod: 'post,put,patch,delete',

  //** 通常由扩展包决定 记录访问日志的路径限制，默认为 'others'，即全部允许
  //** 东呈配置参考： '/app/(tag-type-tree|user|role|overview|dashboards|dimension|tag-group)(.*),/app/slices/(create|update|delete)(.*),/app/tag-hql/data-import/(.*),/app/download/batchtags,/app/user-tag-update-tasks/:id,/app/user-tag-update-tasks,/app/tag-dict/(create|update|delete|authorize|sync|use-tag)(.*)'
  //** 如果想绕过 log2dbByMethod 和 log2dbByPath 的限制，总是记录日志：可以配置 alwaysLogging: true 到 api
  log2dbByPath: 'others', // '/app/tag-type-tree/(.*),others',

  //** 通常由扩展包决定 升级数据库时候是否自动备份数据库，如果要手动备份数据库，可以设为false
  autoBackup: false,

  //** 通常由扩展包决定 redis缓存过期时间 默认60秒
  redisExpire: 60,

  //** 通常由扩展包决定 heat redis缓存过期时间 默认1天
  heatRedisExpire: 1 * 24 * 60 * 60,

  //** 通常由扩展包决定 heat 过去３天的events记录
  heatEventPastDays: 3,

  //** 通常由扩展包决定 druid查询缓存时间 默认六十分钟
  druidCacheTime: 60 * 60,

  //** 通常由扩展包决定 全局关闭redis缓存
  disableCache: false,

  //*** 需要根据环境配置
  //但是没有智能分析/路径分析/用户扩群的配置是用不到的
  //智能分析/用户扩群/路径分析接口
  pioUrl: 'http://192.168.0.211:6060',

  //智能分析发部api Ip地址
  pioApiService: 'http://192.168.0.226:7060',

  //*** 需要根据环境配置
  // 新版分群、用户群计算标签功能 需要用到这个配置，同时兼容 路径分析接口
  pioUserGroupUrl: 'http://192.168.0.225:6061',

  //*** 需要根据环境配置 标签：智能画像使用的接口地址 默认不开启
  //标签：智能画像使用的接口地址，如果为空就不显示智能画像功
  //样例 tagAIUrl: 'http://192.168.0.212:8888'
  tagAIUrl: '',

  //* 通常无需特别配置
  //sdk 缓存大小
  sdk_ws_max_buffer_byte: 4 * 1024 * 1024,

  //** 通常由扩展包决定 监控预警检查任务间隔时间
  monitorLoopInterval: 10 * 60 * 1000,

  //*** 需要根据环境配置
  //激活的扩展模块列表，逗号分隔 'sugo-analytics-extend-wxj,sugo-analytics-extend-xtc'
  activeExtendModules: '',

  //** 通常由扩展包决定 额外配置的路径
  extraConfigPath: '',

  //** 通常由扩展包决定 产品初始化就建立自埋点web sdk项目，默认不建立
  shouldInitSugoSDKProject: false,

  //** 通常由扩展包决定 产品初始化就建立自埋点web sdk项目名称
  initSugoSDKProjectName: '数果智能行为项目',

  //** 通常由扩展包决定
  //项目容量，druid可以支持的项目数量(集群允许运行的最大任务数)
  projectCapacity: 10,

  //** 通常由扩展包决定 是否启用license验证，默认false
  enableLicense: false,

  //* 通常无需特别配置 sdk拉取配置等接口是允许用跨域请求 默认true（特殊情况下如果代理层设置了则不需要再设置跨域header)
  sdkApiCrossHeader: true,

  // 静态资源是否可以跨域访问，设置为ture时，将会为静态资源添加 Access-Control-Allow-Origin 响应头
  allowStaticResourceCROS: true,

  //* 通常无需特别配置 开发人员使用 happyPack 使用的 cpu 个数，设为 0 则禁用
  devCPUCount: os.cpus().length - 1,

  //* 通常无需特别配置 包信息
  pkg: require('./package'),

  //* 通常无需特别配置 开发人员使用 port for webpack
  devPort: 8080,

  //** 通常由扩展包决定 额外的 router 和 service listener
  app: {
    filter: [],
    listener: []
  },

  //*** 需要根据环境配置
  hive: {
    // *** 需要根据环境配置，hiveServer-java提供的restFulApi
    apiHost: '@{pioUserGroupUrl}',
    url: 'jdbc:hive2://192.168.0.223:10000/default',
    drivername: 'org.apache.hive.jdbc.HiveDriver',
    minpoolsize: 1,
    maxpoolsize: 100,
    properties: {
      user: 'hive',
      password: ''
    },
    metastoreHost: '192.168.0.222', //hive metadata server ip
    metastorePort: 9083 //hive metadata server port
  },

  //* 需要根据环境配置
  // 任务调度服务器，用于 任务调度 功能
  taskScheduleHost: 'http://192.168.0.53:12320', // schedule
  //** 通常由客户环境决定，需要客户提供标准的CAS服务
  CAS: {
    // 测试地址：http://cas.test.studyo.cn
    // 测试账号：admin、116001、190317
    // 密码：123456
    // CAS服务认证中心地址
    server: '',
    // 新增CAS账号默默密码（CAS账号密码不符合平台验证规则时生效）
    defaultPwd: 'sugo123456'
  },
  // 是否压缩sdk上报的节点信息
  sdkShouldCompressed: false,
  // 启用 webPty，启用后可通过 /web-pty 访问 shell 登录页
  enableWebPty: false,
  /**cutv定制报表,预爬数据配置, 定时任务开关 */
  //预拉取数据(防止初次执行没有任何数据)时间长度,默认0 当天 小于0 则不执行预查询
  preQueryLength: -1,
  //cutv定制报表定时任务配置开关
  cutvCustomReportScheduleSwitch: false,
  //cutv用户列表查询手机号的mysql配置
  cutv: {
    mysqlHost: '192.168.0.201',
    mysqlPort: 3306,
    mysqlUserName: 'root',
    mysqlPwd: '123456',
    cellphoneDatabase: 'cutv_test',
    pkName: 'uid',
    tableName: 'users'
  },

  //开放接口是否启用请求头加密
  //* 摘要签名开关
  tokenSwitch: true,
  tokenKey: 'sugo_api_token',
  tokenSn: '_api_auth_sugo',
  //设置是否自动更新脚本
  autoCheckUpdate: true,

  //掌上车店诊断系统单点登录secret
  czbbbSecret: 'czbbb783392339',
  //数据 API 访问标识码有效时间
  data_api_access_token_expire: 2,
  //设置智能模型每天定时创建时间
  autoGenerateOfflineModelsTime: '23:30',
  // 大屏外部数据源group最大条数
  externalDataSourcesLimit: 1000,

  //数据 API 返回的时间格式 没有ddd就不返回星期信息
  dataApiTimePattern: {
    patternY: 'YYYY年',
    patternYM: 'YYYY年MM月',
    patternYMd: 'YYYY年MM月DD日 ddd',
    patternYMdH: 'YYYY年MM月DD日 ddd HH时',
    patternYMdHm: 'YYYY年MM月DD日 ddd HH:mm',
    patternFull: 'YYYY/MM/DD ddd HH:mm:ss'
  },

  // ** 通常由扩展包决定，经传商品推荐排除用户群id
  recommendApiConfig: {
    resultKeyPrefix: 'sugo-recommend-result-uid:',
    usergroupSetKey: 'sugo-recommend-usergroup-sets',
    groupReadConfig: {
      pageIndex: 0,
      pageSize: 1000000
    },
    // 分群id（如活跃用户群id，需提前建好）
    usergroupId: 'usergroup_NnNWuREzY'
  },

  //数据 API 返回时间时，是否需要格式化时间 富力的需求 其他人不一定要
  dataApiTimeShouldFormat: false,

  // koa-body post请求内容长度限制
  defaultRequestbodyLimit: {
    jsonLimit: '2mb',
    textLimit: '56kb',
    formLimit: '56kb'
  },

  //企业微信 接收事件服务器 配置
  marketbrainWechatReceiveEventServer: {
    token: 'RexHLzpwA',
    encodingAESKey: 'zyg3yJKBZ7Zf4M5dnYiuxzero96fKBVNEyD3JuDdYBc'
  },
  // *** 需要根据客户环境配置
  JPush: {
    appKey: '662408d7a47380eb4433b60e',
    masterSecret: '6dc667a205b57ab4a217fe24',
    isDebug: false
  },

  //外网地址
  externalAddress: '127.0.0.1:8080',
  // task yarn日志地址
  taskYarnLogsUrls: {
    stateUrl: 'http://192.168.0.223:8088',
    runningExecutorsUrl: 'http://192.168.0.225:18083',
    finishExecutorsUrl: 'http://192.168.0.223:18080'
  },

  // ** 微前端应用HOST代理配置 */
  microFrontendApps: {
    // 'sugo-data-quantity': 'http://172.16.0.118:9000',
    // 'sugo-indices-dev': 'http://172.16.0.118:9001'
    //  'sugo-portal-app': 'http://localhost:9000'
    // 'RT-data-dev': 'http://192.168.0.212:18000/',
    // 'sugo-data-service': 'http://172.16.0.118:9000',
  },

  //*** 通常由环境决定，配置扩展nodejs端路由转发 */
  proxy: {
    // '/api3/(.*)|/api-v2/(.*)': { // 匹配多个可以用'|'分割
    //   target: 'http://localhost:8002', // this is option of http-proxy-middleware
    //   changeOrigin: true
    // }
  },
  // sdk移动端h5埋点配置合并下发
  sdkMergeH5TrackEvents: false
}

exports.default = config
moduleExtend(__filename)
extend(exports.default, extraConfig)
