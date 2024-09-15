exports.default = {
  // // site 站点设置，所有站点设置在浏览器控制台通过 `window.sugo` 可以查看
  // // * 通常无需特别配置 - 一般情况下无需指定，请勿在ambri和config.js里配置，除非在特定调试需求下
  // // ** 通常由扩展包决定 - 由扩展包配置决定，请勿在ambri和config.js里配置
  // // *** 需要根据环境配置 - 需要根据部署环境配置，比如ip，数据库等等，需要在ambri或者config.js指定配置

  site: {
    //   //* 通常无需特别配置，环境变量，由运行程序决定，
    //   env: process.env.NODE_ENV || 'development',
    //   //** 通常由扩展包决定，帮助网站链接
    //   docUrl: 'http://docs.sugo.io',
    //   //** 通常由扩展包决定，版权信息，为空则不显示
    //   copyrightText: '© 广东数果',
    //   //** 通常由扩展包决定，登录页版权信息
    //   copyrightTextLogin: '© 2016 ~ 2017 广东数果科技',
    //   //** 通常由扩展包决定，看板单图数量限制
    //   dashboardSliceLimit: 20,
    //   //** 通常由扩展包决定，siteName
    //   siteName: '数果智能',
    //   //** 通常由扩展包决定，网站图标，例子 favicon: 'static/images/temp-wxj-favicon.ico', 空白favicon请使用 '_bc/sugo-analytics-static/assets/images/favicon.ico'
    //   favicon: 'favicon.ico',
    //   //** 通常由扩展包决定，登录页面logo文件名字, 空白logo请使用 '/_bc/sugo-analytics-static/assets/images/logo-empty.png',
    //   loginLogoName: '/_bc/sugo-analytics-static/assets/images/logo.png',
    //   //** 通常由扩展包决定，左侧菜单logo名字, 空白logo请使用 '/_bc/sugo-analytics-static/assets/images/logo-empty.svg',
    //   mainLogoName: '/_bc/sugo-analytics-static/assets/images/logo.svg',
    //   //** 通常由扩展包决定，csv上传限制, 默认10g
    //   csvUploadLimit: 1024 * 1024 * 1024 * 10,
    //   //** 通常由扩展包决定，菜单定义
    //   menus: null,
    //   //** 通常由扩展包决定，显示注册按钮
    //   showRegLink: false,
    //   //*** 需要根据环境配置，数据采集网关，csv上传和sdk数据上传的地址
    //   collectGateway: 'http://collect.sugo.io',
    //   //*** 需要根据环境配置， sdk 静态资源地址，通常要使用ip端口或者域名以供对外访问
    //   websdk_app_host: 'localhost:8080',
    //   //*** 需要根据环境配置 websocket 端口（埋点使用）
    //   sdk_ws_port: 8887,
    //   //* 通常无需特别配置，cdn网站静态资源url，例如 `http://cdn.sugo.io`, 默认不使用
    //   //cdn: ,
    //   //websdk相关
    //   //* 通常无需特别配置，sdk数据上报地址，如果不配置 默认使用collectGateway
    //   websdk_api_host: '@{site.collectGateway#getHost}',
    //   //* 通常无需特别配置，可视化埋点接口地址，如果为空，则使用 `websdk_app_host`
    //   websdk_decide_host: '@{site.websdk_app_host}',
    //   //* 通常无需特别配置 web_sdk cdn配置，如果为空，则使用 site.cdn || site.websdk_app_host
    //   //, modifier cdnOrWebsdkAppHost 参考 src/server/config/config-template-parser.js
    //   websdk_js_cdn: '@{#cdnOrWebsdkAppHost}',
    //   //* 通常无需特别配置 进入自助分析后首先根据 maxTime 查询数据
    //   show_newest_data_at_first: true,
    //   // 相对时间类型 工具型 tool 业务型 business
    //   // 不同之处在于：业务型的相对时间转成绝对时间后，终止时间不会超过当前时刻
    //   relativeTimeType: 'business',
    //   //* 通常无需特别配置  需要部署这个才能使用文件上传：https://github.com/Datafruit/sugo-file-server
    //   // 部署之后需要到文件服务那里的 config.js 加一个 token 和 secret
    //   // 文件服务器
    //   file_server_url: 'http://192.168.0.212:8765',
    //   //* 通常无需特别配置  文件服务器 token
    //   file_server_token: 'S13KK_9Ex',
    //   //* 通常无需特别配置  文件服务器 secret
    //   file_server_secret: 'SkaU588Eg',
    //   //* 通常无需特别配置  自助分析惰性加载数据，开启之后需要手动加载数据
    //   analytics_manual_load_chart_data: true,
    //   //* 通常无需特别配置  iOS可视化埋点渲染器, 可选项有'Standard', 'Infinitus'等
    //   iOS_renderer: 'Standard',
    //   //* 通常无需特别配置 sdk埋点用到的 websocket url，默认使用 websdk_app_host和sdk_ws_port端口自动生成配置
    //   //modifier noPort 参考 src/server/config/config-template-parser.js
    //   sdk_ws_url: 'ws://@{site.websdk_app_host#noPort}:@{site.sdk_ws_port}',
    //   //** 通常由扩展包决定 允许管理企业, 默认关闭
    //   companyManage: false,
    //   //** 通常由扩展包决定 隐藏某些图表类型，图表类型记录在 viz-component-map.js
    //   // 例子：'table,map'
    //   hide_viz_types: '',
    //   //** 通常由扩展包决定 自助分析源数据查询限制
    //   downloadLimit: '100,500',
    //   //** 通常由扩展包决定 批量下载限制
    //   batchDownloadLimit: '100,500,1000',
    //   //** 通常由扩展包决定 if true, 把用户管理和用户组管理放到用户下拉菜单
    //   // --- 将被去掉
    //   hideCompanyManage: true,
    //   //** 通常由扩展包决定 用户分群列表模式，`table`为旧版列表模式 `thumb` 为缩略图模式
    //   usergroupList: 'thumb',
    //   //** 通常由扩展包决定 自助分析默认时间，只能填相对时间 '-1 day', '-15 min' 等
    //   analyticDefaultTime: '-1 day',
    //   //** 通常由扩展包决定 页面末尾统一加载js代码
    //   footerJs: '',
    //   //** 通常由扩展包决定 qq客服链接 没有则不显示
    //   qqCustomerServiceUrl: '',
    //   //** 通常由扩展包决定 客服电话号码 没有则不显示
    //   customerServicePhoneNumber: '',
    //   //** 通常由扩展包决定 动态帮助图标，默认不显示
    //   showHelpLink: false,
    //   //** 通常由扩展包决定 额外顶部菜单 ，格式 {text: '链接标题', href='链接url', target='_blank'}
    //   extraLinks: [],
    //   //** 通常由扩展包决定  自助分析 filter 的 UI 策略：lite（只有高级搜索功能，不查询 druid）/ normal（有普通和高级搜索功能）
    //   analyticFilterStrategy: 'normal',
    //   //** 通常由扩展包决定  自助分析 filter 的 添加 策略：distinct（不允许维度重复）/ normal（允许维度重复）
    //   analyticFilterAddStrategy: 'distinct',
    //   //** 通常由扩展包决定  自助分析书签功能
    //   analyticBookmarkEnable: false,
    //   //** 通常由扩展包决定  自助分析普通表格维度数最大限制
    //   analyticNormalTableMaxDimensionCount: 6,
    //   //** 通常由扩展包决定  源数据分析每次子查询查询的时间范围
    //   sourceDataAnalyticTimeQueryUnit: 'PT5M',
    //   //** 通常由扩展包决定 源数据分析列表行 Text 维度查询时的截取长度
    //   sourceDataAnalyticTextDimPreviewLen: 500,
    //   //** 通常由扩展包决定 源数据分析瀑布流加载策略，格式：初始加载行数+每步加载行数，例如 '20+20'
    //   sourceDataAnalyticFlowStrategy: '20+20',
    //   //** 通常由扩展包决定 源数据分析数据加载策略，格式： auto / manual
    //   sourceDataAnalyticLoadStrategy: 'auto',
    //   //** 通常由扩展包决定 是否增强保存单图功能。启用后，路径分析，留存，漏斗可以保存成单图
    //   enableSaveSliceEnhance: false,
    //   //** 通常由扩展包决定 是否隐藏左侧菜单和顶部导航，默认false
    //   hideMenu: false,
    //   //** 通常由扩展包决定 维度 distinct 下拉框的查询限制
    //   distinctDropDownFirstNLimit: 10
    //   //** 通常由扩展包决定 是否允许跨项目查询用户群
    //   allowUserGroupCrossProject: false,
    //   // *** 需要根据环境配置，是否启用 sqlPad
    //   enableSqlPad: true,
    //   //** 通常由扩展包决定
    //   // 开启 mysql 数据库接入功能
    //   enableMySQLAccess: false,
    //   //** 通常由扩展包决定
    //   // 开启微信小程序接入功能
    //   enableWechatAppAccess: false
    //   // 静态看板图片加载路径，例如指定 'public/image-dashboard'，则会加载此目录下的全部文件夹，作为看板，看板内的图片，作为该看板内的静态单图
    //   staticDashboardScanPath: ''
    //   // 视频播放组件默认地址
    //   demoVideoSource: 'http://192.168.0.223:81/sugo_yum/SG/centos6/1.0/astro_pic/video/4k.webm',
    //   // 是否启用看板导出 excel 文件功能
    //   allowDashboardExportXlsx: true
    //   //** 通常由扩展包决定，离线计算指标的默认前缀
    //   offlineCalcIndicesDefaultPrefix: 'SI'
    //   //** 通常由扩展包决定，额外样式路径，例子 /_bc/sugo-analytics-extend-zuolin/assets/extra.css
    //   extraCssAsset: ''
    //   //** 微前端服务地址
    //   microFrontendUrlMap: {
    //     // 'sugo-indices-dev': '//localhost:8000/console/indices-dev',
    // 'sugo-data-quantity': '//localhost:8000/console/data-quantity'
    //   }
    //   // 超链接是否禁用打开新窗口，可选项 no（不禁止）| inIframe（在 iframe 内则禁止）| always（总是禁止）
    //   anchorCustomForbidNewTab: 'no'
  }

  // //*** 前端查询参数加密算法，一般根据环境配置，建议不要放到扩展包，可用算法参考 https://cryptojs.gitbook.io/docs/
  // urlQueryEncryptAlgorithm: 'AES',
  //
  // //*** 前端查询参数加密 secret，一般根据环境配置，建议不要放到扩展包
  // urlQuerySecret: '4743118544657601',

  //   // jwt 单点登录 secret
  //   jwtSecret: '2079942783392339',

  // // *** 为 SDK 项目创建默认单图
  // createDefaultDashboardForSDKProject: true,

  // // *** 需要根据环境配置，sql pad 服务地址
  // sqlPad: {
  //   serviceUrl: 'http://localhost:3000',
  //   defaultUserName: 'admin@sugo.io',
  //   defaultPassword: '123456'
  // },

  // //*** 需要根据环境配置 程序运行监听的地址，如果在nginx反向代理后面，可以只监听localhost
  // host: '0.0.0.0',

  // //*** 需要根据环境配置 程序运行监听的端口
  // port: process.env.PORT || 8000,

  // //*** 需要根据环境配置 redis配置，用于共享session等
  // redis: {
  //   host: '192.168.0.212',
  //   port: 6379
  // },

  // // postgres数据库配置
  // //*** 需要根据环境配置, 请仅仅配置 host,database,username,password,port
  // //
  // db: {
  //   dialect: 'postgres',
  //   host: '192.168.0.210',
  //   database: 'dev_sugo_astro',
  //   username: 'postgres',
  //   password: '123456',
  //   pool: {
  //     max: 5,
  //     min: 0,
  //     idle: 10000
  //   },
  //   port: 5432,
  //   define: {
  //     charset: 'utf8',
  //     timestamps: false // true by default
  //   }
  // },

  // 标签数据库配置
  //*** 需要根据环境配置，具体配置项参考db配置项，如果设置为null，则表示不需要开启
  // tagsDb: '@{db}',

  // //*** 需要根据环境配置 druid查询配置
  // //请仅仅配置 host, supervisorHost, lookupHost
  // //ipLibSpec要看实际情况是否需要
  // druid: {
  //   host: '192.168.0.212:8082',
  //   engine: 'sugoDruid',
  //   timeout: 60000, // 默认一分钟，减小后端队列
  //   retry: 2,
  //   verbose: '',
  //   concurrent: 2,
  //   exactResultsOnly: true, // 精准查询，group by
  //   groupByStrategy: 'v2',
  //   firstN: true, // 默认用firstN查询替换topN查询
  //   supervisorHost: 'http://192.168.0.212:8090',
  //   lookupHost: 'http://192.168.0.212:8081',
  //   scanQuery: false, // 启用scanQuery替换selectQuery查看原始数据
  //   ipLibSpec: 'none'//是否启用ip库解析默认为none=不启用，ip=启用
  // },

  // //*** 需要根据环境配置 kafka配置
  // kafka: {
  //   zookeeperHost: '192.168.0.216:2181/kafka',
  //   kafkaServerHost: '192.168.0.214:9092,192.168.0.216:9092'
  // },

  // //* 通常无需特别配置 默认使用redis配置
  // dataConfig: {
  //   hostAndPorts: '@{#getRedisConfig}',
  //   clusterMode: false,
  //   password: '@{#getRedisPassword}',
  //   type: 'redis'
  // },

  // //** 通常由扩展包决定 资源限制
  // resourceLimit: {
  //   trial: {
  //     slice: 20, //per-company
  //     dashboard: 10, //per-company
  //     usergroup: 2, //per-company
  //     retention: 2,
  //     funnel: 2,
  //     dimension: 30, //per-company
  //     measure: 20, //per-company
  //     user: 5, //per-company
  //     role: 3, //per-company
  //     datasource: 2 //per-company
  //   },
  //   payed: {
  //     slice: 2000,
  //     dashboard: 2000,
  //     usergroup: 1000,
  //     retention: 1000,
  //     funnel: 1000,
  //     dimension: 30000,
  //     measure: 20000,
  //     user: 500,
  //     role: 30,
  //     datasource: 30
  //   }
  // },

  // //** 通常由扩展包决定
  // //是否开启测试模式，默认开启
  // //开启测试模式发送短信和邮件都是模拟发送
  // test: true,

  // //** 通常由扩展包决定 发短信相关配置
  // aliyunAccessKey: '',
  // aliyunAccessSecret: '',

  // //** 通常由扩展包决定 发微信通知相关配置
  // wechat: {
  //   corpId: '',
  //   agentId: '', // 企业应用的id
  //   secret: ''
  // },

  // //** 通常由扩展包决定 短信签名
  // aliyunSmsSignName: {
  //   main: '广东数果科技'
  // },

  // //** 通常由扩展包决定 短信模板
  // aliyunSmsTemplateCode: {
  //   code: '',
  //   monitorAlarm: ''
  // },

  // //** 通常由扩展包决定 邮件服务的发邮件地址
  // aliyunEmailAddr: '',

  // //* 通常无需特别配置 验证码过期时间1hour
  // cellcodeExpireTime: 60 * 60 * 1000,

  // //* 通常无需特别配置 后端请求超时时间 15秒默认
  // timeout: 15000,

  // //** 通常由扩展包决定 是否记录访问日志到数据库。默认不记录
  // log2db: false,

  // //** 通常由扩展包决定 记录访问日志的 method 限制
  // log2dbByMethod: 'post,put,patch,delete',

  // //** 通常由扩展包决定 记录访问日志的路径限制，默认为 'others'，即全部允许
  // //** 东呈配置参考： '/app/(tag-type-tree|user|role|overview|dashboards|dimension|tag-group)(.*),/app/slices/(create|update|delete)(.*),/app/tag-hql/data-import/(.*),/app/download/batchtags,/app/user-tag-update-tasks/:id,/app/user-tag-update-tasks,/app/tag-dict/(create|update|delete|authorize|sync|use-tag)(.*)'
  // log2dbByPath: 'others', // '/app/tag-type-tree/(.*),others',

  // //** 通常由扩展包决定 升级数据库时候是否自动备份数据库，如果要手动备份数据库，可以设为false
  // autoBackup: false,

  // //** 通常由扩展包决定 redis缓存过期时间 默认60秒
  // redisExpire: 60,

  // //** 通常由扩展包决定 heat redis缓存过期时间 默认1天
  // heatRedisExpire: 1 * 24 * 60 * 60,

  // //** 通常由扩展包决定 heat 过去３天的events记录
  // heatEventPastDays: 3,

  // //** 通常由扩展包决定 druid查询缓存时间 默认六十分钟
  // druidCacheTime: 60 * 60,

  // //** 通常由扩展包决定 全局关闭redis缓存
  // disableCache: false,

  // //*** 需要根据环境配置
  // //但是没有智能分析/路径分析/用户扩群的配置是用不到的
  // //智能分析/用户扩群/路径分析接口
  // pioUrl: 'http://192.168.0.211:6060',

  // //*** 需要根据环境配置
  // // 新版分群、用户群计算标签功能 需要用到这个配置，同时兼容 路径分析接口
  // pioUserGroupUrl: 'http://192.168.0.225:6061',

  // //* 通常无需特别配置
  // //sdk 缓存大小
  // sdk_ws_max_buffer_byte: 4 * 1024 * 1024,

  // //** 通常由扩展包决定 监控预警检查任务间隔时间
  // monitorLoopInterval: 10 * 60 * 1000,

  // //*** 需要根据环境配置
  // //激活的扩展模块列表，逗号分隔 'sugo-analytics-extend-wxj,sugo-analytics-extend-xtc'
  // activeExtendModules: '',

  // //** 通常由扩展包决定 额外配置的路径
  // extraConfigPath: '',

  // //** 通常由扩展包决定 产品初始化就建立自埋点web sdk项目，默认不建立
  // shouldInitSugoSDKProject: false,

  // //** 通常由扩展包决定 产品初始化就建立自埋点web sdk项目名称
  // initSugoSDKProjectName: '数果智能行为项目',

  // //** 通常由扩展包决定
  // //项目容量，druid可以支持的项目数量(集群允许运行的最大任务数)
  // projectCapacity: 10,

  // //** 通常由扩展包决定 是否启用license验证，默认false
  // enableLicense: false,

  // //* 通常无需特别配置 开发人员使用 happyPack 使用的 cpu 个数，设为 0 则禁用
  // devCPUCount: os.cpus().length,

  // //* 通常无需特别配置 包信息
  // pkg: require('./package'),

  // //* 通常无需特别配置 开发人员使用 port for webpack
  // devPort: 8080,

  // enableWebPty: false,

  // //** 通常由扩展包决定 额外的 router 和 service listener
  // app: {
  //   filter: [],
  //   listener: []
  // },

  // //* 需要根据环境配置
  // // 任务调度服务器，用于 任务调度 功能
  // taskScheduleHost: 'http://192.168.0.223:8081'
}
