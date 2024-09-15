// POSTGRES_ENV_POSTGRES_USER=postgres
// POSTGRES_PORT=tcp://172.17.0.2:5432
// REDIS_ENV_REDIS_DOWNLOAD_URL=http://download.redis.io/releases/redis-3.2.11.tar.gz
// REDIS_PORT_6379_TCP_PROTO=tcp
// POSTGRES_ENV_POSTGRES_PASSWORD=123456
// HOSTNAME=cce8ad43634e
// TERM=xterm
// POSTGRES_ENV_LANG=en_US.utf8
// REDIS_NAME=/analytics/redis
// POSTGRES_ENV_GOSU_VERSION=1.10
// REDIS_PORT_6379_TCP_ADDR=172.17.0.3
// POSTGRES_ENV_PG_MAJOR=9.6
// LS_COLORS=rs=0:di=01;34:ln=01;36:mh=00:pi=40;33:so=01;35:do=01;35:bd=40;33;01:cd=40;33;01:or=40;31;01:mi=00:su=37;41:sg=30;43:ca=30;41:tw=30;42:ow=34;42:st=37;44:ex=01;32:*.tar=01;31:*.tgz=01;31:*.arc=01;31:*.arj=01;31:*.taz=01;31:*.lha=01;31:*.lz4=01;31:*.lzh=01;31:*.lzma=01;31:*.tlz=01;31:*.txz=01;31:*.tzo=01;31:*.t7z=01;31:*.zip=01;31:*.z=01;31:*.Z=01;31:*.dz=01;31:*.gz=01;31:*.lrz=01;31:*.lz=01;31:*.lzo=01;31:*.xz=01;31:*.bz2=01;31:*.bz=01;31:*.tbz=01;31:*.tbz2=01;31:*.tz=01;31:*.deb=01;31:*.rpm=01;31:*.jar=01;31:*.war=01;31:*.ear=01;31:*.sar=01;31:*.rar=01;31:*.alz=01;31:*.ace=01;31:*.zoo=01;31:*.cpio=01;31:*.7z=01;31:*.rz=01;31:*.cab=01;31:*.jpg=01;35:*.jpeg=01;35:*.gif=01;35:*.bmp=01;35:*.pbm=01;35:*.pgm=01;35:*.ppm=01;35:*.tga=01;35:*.xbm=01;35:*.xpm=01;35:*.tif=01;35:*.tiff=01;35:*.png=01;35:*.svg=01;35:*.svgz=01;35:*.mng=01;35:*.pcx=01;35:*.mov=01;35:*.mpg=01;35:*.mpeg=01;35:*.m2v=01;35:*.mkv=01;35:*.webm=01;35:*.ogm=01;35:*.mp4=01;35:*.m4v=01;35:*.mp4v=01;35:*.vob=01;35:*.qt=01;35:*.nuv=01;35:*.wmv=01;35:*.asf=01;35:*.rm=01;35:*.rmvb=01;35:*.flc=01;35:*.avi=01;35:*.fli=01;35:*.flv=01;35:*.gl=01;35:*.dl=01;35:*.xcf=01;35:*.xwd=01;35:*.yuv=01;35:*.cgm=01;35:*.emf=01;35:*.ogv=01;35:*.ogx=01;35:*.aac=00;36:*.au=00;36:*.flac=00;36:*.m4a=00;36:*.mid=00;36:*.midi=00;36:*.mka=00;36:*.mp3=00;36:*.mpc=00;36:*.ogg=00;36:*.ra=00;36:*.wav=00;36:*.oga=00;36:*.opus=00;36:*.spx=00;36:*.xspf=00;36:
// POSTGRES_PORT_5432_TCP_PORT=5432
// WORKDIR=/opt
// POSTGRES_PORT_5432_TCP_ADDR=172.17.0.2
// REDIS_ENV_REDIS_DOWNLOAD_SHA=31ae927cab09f90c9ca5954aab7aeecc3bb4da6087d3d12ba0a929ceb54081b5
// REDIS_PORT_6379_TCP_PORT=6379
// REDIS_ENV_GOSU_VERSION=1.10
// PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
// POSTGRES_ENV_POSTGRES_DB=sugo
// POSTGRES_ENV_PGDATA=/var/lib/postgresql/data
// PWD=/opt/sugo/sugo-analytics
// REDIS_PORT_6379_TCP=tcp://172.17.0.3:6379
// POSTGRES_NAME=/analytics/postgres
// SHLVL=1
// HOME=/root
// REDIS_PORT=tcp://172.17.0.3:6379
// REDIS_ENV_REDIS_VERSION=3.2.11
// LESSOPEN=| /usr/bin/lesspipe %s
// POSTGRES_PORT_5432_TCP=tcp://172.17.0.2:5432
// POSTGRES_PORT_5432_TCP_PROTO=tcp
// LESSCLOSE=/usr/bin/lesspipe %s %s
// POSTGRES_ENV_PG_VERSION=9.6.6-1.pgdg80+1
// _=/usr/bin/env
// OLDPWD=/

const url = require('url')
const env = process.env
const redis = url.parse(env.REDIS_PORT)
const postgres = url.parse(env.POSTGRES_PORT)

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

    //   //** 通常由扩展包决定，网站图标，例子 favicon: 'static/images/temp-wxj-favicon.ico',
    //   favicon: 'favicon.ico',

    //   //** 通常由扩展包决定，登录页面logo文件名字,
    //   loginLogoName: '/_bc/sugo-analytics-static/assets/images/logo.png',

    //   //** 通常由扩展包决定，左侧菜单logo名字
    //   mainLogoName: '/_bc/sugo-analytics-static/assets/images/logo.svg',

    //   //** 通常由扩展包决定，csv上传限制, 默认10g
    //   csvUploadLimit: 1024 * 1024 * 1024 * 10,

    //   //** 通常由扩展包决定，菜单定义
    //   menus: null,

    //   //** 通常由扩展包决定，显示注册按钮
    //   showRegLink: false,

    //   //*** 需要根据环境配置，数据采集网关，csv上传和sdk数据上传的地址
    collectGateway: 'http://collect.sugo.io',

    //   //*** 需要根据环境配置， sdk 静态资源地址，通常要使用ip端口或者域名以供对外访问
    websdk_app_host: 'localhost:8080',

    //   //*** 需要根据环境配置 websocket 端口（埋点使用）
    sdk_ws_port: 8887,

    //   //* 通常无需特别配置，cdn网站静态资源url，例如 `http://cdn.sugo.io`, 默认不使用
    //   //cdn: ,

    //   //websdk相关
    //   //* 通常无需特别配置，sdk数据上报地址，如果不配置 默认使用collectGateway
    websdk_api_host: '@{site.collectGateway#getHost}',


    //   //* 通常无需特别配置，可视化埋点接口地址，如果为空，则使用 `websdk_app_host`
    websdk_decide_host: '@{site.websdk_app_host}',

    //   //* 通常无需特别配置 web_sdk cdn配置，如果为空，则使用 site.cdn || site.websdk_app_host
    //   //, modifier cdnOrWebsdkAppHost 参考 src/server/config/config-template-parser.js
    websdk_js_cdn: '@{#cdnOrWebsdkAppHost}',

    //   //* 通常无需特别配置 进入自助分析后首先根据 maxTime 查询数据
    show_newest_data_at_first: true,

    //   // 相对时间类型 工具型 tool 业务型 business
    //   // 不同之处在于：业务型的相对时间转成绝对时间后，终止时间不会超过当前时刻
    relativeTimeType: 'business',

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
    sdk_ws_url: 'ws://@{site.websdk_app_host#noPort}:@{site.sdk_ws_port}',

    //   //** 通常由扩展包决定 允许管理企业, 默认关闭
    //   companyManage: false,

    //   //** 通常由扩展包决定 隐藏某些图表类型，图表类型记录在 viz-component-map.js
    //   // 例子：'table,map'
    //   hide_viz_types: '',

    //   //** 通常由扩展包决定 自助分析下载限制
    downloadLimit: '100,500',

    //   //** 通常由扩展包决定 批量下载限制
    batchDownloadLimit: '100,500,1000',

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

    //   //** 通常由扩展包决定  源数据分析每次子查询查询的时间范围
    //   sourceDataAnalyticTimeQueryUnit: 'PT5M',

    //   //** 通常由扩展包决定 源数据分析列表行 Text 维度查询时的截取长度
    //   sourceDataAnalyticTextDimPreviewLen: 500,

    //   //** 通常由扩展包决定 源数据分析瀑布流加载策略，格式：初始加载行数+每步加载行数，例如 '20+20'
    //   sourceDataAnalyticFlowStrategy: '20+20',

    //   //** 通常由扩展包决定 是否隐藏左侧菜单和顶部导航，默认false
    //   hideMenu: false,

    //   //** 通常由扩展包决定 维度 distinct 下拉框的查询限制
    //   distinctDropDownFirstNLimit: 10

    //   //** 通常由扩展包决定 是否允许跨项目查询用户群
    //   allowUserGroupCrossProject: false
  },

  // //*** 需要根据环境配置 程序运行监听的地址，如果在nginx反向代理后面，可以只监听localhost
  host: '0.0.0.0',

  // //*** 需要根据环境配置 程序运行监听的端口
  port: process.env.PORT || 8000,

  // //*** 需要根据环境配置 redis配置，用于共享session等
  redis: {
    host: redis.hostname,
    port: redis.port
  },
  // // postgres数据库配置
  // //*** 需要根据环境配置, 请仅仅配置 host,database,username,password,port
  // //
  db: {
    dialect: 'postgres',
    host: postgres.hostname,
    database: env.POSTGRES_ENV_POSTGRES_DB,
    username: env.POSTGRES_ENV_POSTGRES_USER,
    password: env.POSTGRES_ENV_POSTGRES_PASSWORD,
    pool: {
      max: 5,
      min: 0,
      idle: 10000
    },
    port: postgres.port,
    define: {
      charset: 'utf8',
      timestamps: false // true by default
    }
  },

  // //*** 需要根据环境配置 druid查询配置
  // //请仅仅配置 host, supervisorHost, lookupHost
  // //ipLibSpec要看实际情况是否需要
  druid: false,

  // //*** 需要根据环境配置 kafka配置
  kafka: {
    zookeeperHost: '192.168.0.216:2181/kafka',
    kafkaServerHost: '192.168.0.214:9092,192.168.0.216:9092'
  },

  // //* 通常无需特别配置 默认使用redis配置
  dataConfig: {
    hostAndPorts: '@{#getRedisConfig}',
    clusterMode: false,
    password: '@{#getRedisPassword}',
    type: 'redis'
  },

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

  // //* 通常无需特别配置
  // //sdk 缓存大小
  // sdk_ws_max_buffer_byte: 4 * 1024 * 1024,

  // //** 通常由扩展包决定 监控预警检查任务间隔时间
  // monitorLoopInterval: 10 * 60 * 1000,

  // //*** 需要根据环境配置
  // //激活的扩展模块列表，逗号分隔 'sugo-analytics-extend-wxj,sugo-analytics-extend-xtc'
  activeExtendModules: 'sugo-analytics-extend-gx',

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
  devPort: 8080,
  app: {
    filter: [
      {
        path: 'sugo-analytics-extend-nh/dist/filter.js',
        param: {}
      }
    ],
    listener: [
      {
        path: 'sugo-analytics-extend-nh/dist/listener.js'
      }
    ]
  }
}
