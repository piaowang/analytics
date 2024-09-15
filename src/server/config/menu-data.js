/*
 * @Author: your name
 * @Date: 2020-04-24 19:47:21
 * @LastEditTime: 2020-09-03 14:14:46
 * @LastEditors: your name
 * @Description: In User Settings Edit
 * @FilePath: \sugo-analytics\src\server\config\menu-data.js
 */
const allMenus = [
  {
    title: '图表',
    children: [
      /*{
        path: '/console/overview',
        title: '概览',
        icon: 'pushpin-o',
        chunkName: 'overview' // src/client/routes/index.js 菜单路由分割对应的chunkName
      },*/ {
        path: '/console/subscribe',
        title: '我的订阅',
        icon: 'star-o',
        chunkName: 'subscribe' // src/client/routes/index.js 菜单路由分割对应的chunkName
      },
      {
        path: '/console/dashboards',
        title: '数据看板',
        icon: 'picture',
        chunkName: 'dashboards'
      },
      {
        title: '实时大屏',
        icon: 'desktop',
        path: '/console/livescreen',
        chunkName: 'livescreen'
      },
      {
        title: '授权管理',
        icon: 'desktop',
        path: '/console/role-livescreen',
        chunkName: 'role-livescreen-manager'
      },
      {
        title: '审核管理',
        icon: 'desktop',
        path: '/console/examine-livescreen',
        chunkName: 'examine-livescreen-manager'
      },
      {
        title: '大屏投影',
        icon: 'aliyun',
        path: '/console/screen-control',
        chunkName: 'screen-control'
      },
      {
        title: '定制报表',
        icon: 'desktop',
        path: '/console/custom-made-reportform',
        chunkName: 'custom-made-reportform'
      },
      {
        title: '大屏案例',
        icon: 'appstore-o',
        path: '/console/live-screen-case',
        chunkName: 'live-screen-case'
      },
      {
        title: '审核流配置',
        icon: 'sugo-model',
        path: '/console/examine-config',
        chunkName: 'examine-config'
      },
      {
        title: '分享管理',
        icon: 'share-alt',
        path: '/console/share-manager',
        chunkName: 'share-manager'
      }
      /*{
        title: '场景分析',
        icon: 'desktop',
        path: '/console/scenes',
        chunkName: 'scenes',
        children: [
          {
            title: '运营分析',
            icon: '',
            path: '/console/scenes',
            chunkName: 'scenes'
          },
          {
            title: '业务分析',
            icon: '',
            children: [
              {
                title: '理财/存款',
                path: '/console/scenes/financial',
                icon: '',
                chunkName: 'scenes-financial'
              },
              {
                title: '贷款',
                path: '/console/scenes/loan',
                icon: '',
                chunkName: 'scenes-loan'
              }
            ]
          },
          {
            title: '使用分析',
            icon: '',
            path: '/console/scenes/use',
            chunkName: 'scenes-use'
          }
        ]
      }*/
    ]
  },
  {
    title: '多维分析',
    children: [
      {
        path: '/console/analytic',
        title: '多维分析',
        icon: 'eye-o',
        chunkName: 'analytic'
      },
      {
        path: '/console/slices',
        title: '单图',
        icon: 'area-chart',
        hide: true,
        chunkName: 'slices'
      }
    ]
  },
  {
    title: '日志分析',
    children: [
      {
        title: '日志分析',
        path: '/console/source-data-analytic',
        icon: 'sugo-log',
        chunkName: 'source-data-analytic'
      },
      {
        title: '监控告警',
        path: '/console/monitor-alarms',
        icon: 'sugo-alarm',
        activeWhen: 'no',
        chunkName: 'monitor-alarms',
        children: [
          {
            title: '我的告警',
            icon: '',
            authPermission: 'get:/console/monitor-alarms/exceptions/:id',
            chunkName: 'monitor-alarms-exception-list',
            children: [
              {
                // 未处理
                title: 'component:dynamic-menu-title',
                path: '/console/monitor-alarms/exceptions/all?handleState=unhandled',
                componentProps: { countByHandleState: 'unhandled', children: '未处理' },
                icon: ''
              },
              {
                // 处理中
                title: 'component:dynamic-menu-title',
                path: '/console/monitor-alarms/exceptions/all?handleState=handling',
                componentProps: { countByHandleState: 'handling', children: '处理中' },
                icon: ''
              },
              {
                title: '已忽略',
                path: '/console/monitor-alarms/exceptions/all?handleState=ignored',
                icon: ''
              },
              {
                title: '已处理',
                path: '/console/monitor-alarms/exceptions/all?handleState=handled',
                icon: ''
              }
            ]
          },
          {
            title: '配置管理',
            icon: '',
            children: [
              {
                title: '策略配置',
                path: '/console/monitor-alarms',
                activeWhen: 'onlyStrictMatch',
                icon: ''
              },
              {
                title: '通知模版',
                path: '/console/monitor-alarms/notify-templates-management',
                icon: '',
                authPermission: 'get:/console/monitor-alarms/notify-templates-management',
                chunkName: 'monitor-alarms-notify-templates-management'
              },
              {
                title: '通讯录',
                path: '/console/monitor-alarms/contacts-management',
                icon: '',
                authPermission: 'get:/console/monitor-alarms/contacts-management',
                chunkName: 'monitor-alarms-contacts-management'
              }
            ]
          }
        ]
      },
      {
        title: '错误码管理',
        path: '/console/error-code',
        icon: 'code',
        chunkName: 'error-code'
      }
    ]
  },
  {
    title: '用户分群',
    children: [
      {
        title: '用户分群',
        icon: 'sugo-team',
        path: '/console/usergroup',
        chunkName: 'usergroups'
      }
    ]
  },
  {
    title: '行为分析',
    children: [
      {
        title: '用户行为分析',
        type: 'label'
      },
      {
        path: '/console/path-analysis',
        title: '路径分析',
        icon: 'sugo-path',
        chunkName: 'path-analysis'
      },
      {
        path: '/console/retention',
        title: '留存分析',
        icon: 'sugo-retention',
        chunkName: 'retentions'
      },
      {
        path: '/console/funnel',
        title: '漏斗分析',
        icon: 'sugo-filter',
        chunkName: 'funnels'
      },
      {
        path: '/console/user-action-analytics',
        title: '事件分析',
        icon: 'sugo-note',
        chunkName: 'user-action-analytics'
      },
      {
        path: '/console/traffic-analytics',
        title: '流量分析',
        icon: 'sugo-chart',
        chunkName: 'traffic-analytics'
      },
      {
        path: '/console/behavior-analytics',
        title: '行为事件分析',
        icon: 'solution',
        chunkName: 'behavior-analytics'
      },
      {
        title: '热图分析',
        type: 'label'
      },
      {
        path: '/console/web-heat-map',
        title: 'PC热力图分析',
        icon: 'desktop',
        chunkName: 'web-heatmap'
      },
      {
        path: '/console/heat-map',
        title: 'APP热力图分析',
        icon: 'mobile',
        chunkName: 'heat-map'
      },
      {
        title: '智能运营',
        type: 'label'
      },
      {
        path: '/console/loss-predict',
        title: '流失预测',
        icon: 'sugo-loss-predict',
        chunkName: 'loss-predicts'
      },
      {
        path: '/console/segment-expand',
        title: '用户扩群',
        icon: 'sugo-segment-expand',
        chunkName: 'segment-expands'
      },
      {
        path: '/console/rfm',
        title: 'RFM客户细分',
        icon: 'sugo-detail',
        chunkName: 'rfms'
      }
    ]
  },
  {
    title: '用户画像',
    children: [
      {
        path: '/console/tag-macroscopic',
        title: '宏观画像',
        icon: 'area-chart',
        chunkName: 'tag-macroscopic'
      },
      {
        path: '/console/microcosmic-portrait',
        title: '微观画像',
        icon: 'solution',
        chunkName: 'microcosmic-portrait'
      },
      {
        path: '/console/tag-dict',
        title: '标签体系',
        icon: 'tag',
        chunkName: 'tag-dict',
        children: [
          {
            path: '/console/tag-users',
            title: '标签用户列表',
            icon: 'team',
            noAuth: true,
            hide: true,
            chunkName: 'tag-users'
          },
          {
            path: '/console/tag-group',
            title: '组合标签管理',
            icon: 'tags-o',
            noAuth: true,
            hide: true,
            chunkName: 'tag-group'
          }
        ]
      },
      {
        path: '/console/tag-system-manager',
        title: '标签体系管理',
        icon: 'tags-o',
        authPermission: 'get:/console/tag-dict',
        chunkName: 'tag-system-manager'
      },
      {
        path: '/console/tag-data-manage',
        title: '标签数据管理',
        icon: 'schedule',
        authPermission: 'get:/console/tag-dict',
        chunkName: 'tag-data-manage'
      }
      // {
      //   path: '/console/tag-value-enhance',
      //   title: '价值升档',
      //   icon: 'tags',
      //   chunkName: 'tag-value-enhance'
      // }
    ]
  },
  {
    title: '智能运营',
    children: [
      {
        path: '/console/life-cycle',
        title: '生命周期',
        icon: 'solution'
      },
      {
        path: '/console/loss-predict',
        title: '流失预测',
        icon: 'sugo-loss-predict'
      },
      {
        path: '/console/segment-expand',
        title: '用户扩群',
        icon: 'sugo-segment-expand'
      },
      {
        path: '/console/rfm',
        title: 'RFM客户细分',
        icon: 'sugo-detail'
      }
    ]
  },
  {
    title: '智能分析',
    children: [
      {
        path: '/console/pio-projects',
        title: '智能分析',
        icon: 'usb',
        chunkName: 'pio-projs'
      }
    ]
  },
  {
    title: '智能营销',
    children: [
      {
        title: '自动化营销中心',
        type: 'label'
      },
      {
        path: '/console/marketing-models',
        title: '营销模型',
        icon: 'sugo-model',
        style: { paddingLeft: 35 },
        chunkName: 'marketing-models'
      },
      {
        path: '/console/marketing-events',
        title: '营销事件',
        icon: 'sugo-event',
        style: { paddingLeft: 35 },
        chunkName: 'marketing-events'
      },
      {
        title: '活动营销中心',
        type: 'label'
      },
      {
        path: '/console/marketing-act-groups',
        title: '活动分组',
        icon: 'sugo-active-group',
        style: { paddingLeft: 35 },
        chunkName: 'marketing-act-groups'
      },
      {
        path: '/console/marketing-acts',
        title: '活动管理',
        icon: 'sugo-active',
        style: { paddingLeft: 35 },
        chunkName: 'marketing-act-groups'
      },
      {
        path: '/console/marketing-tasks',
        title: '发送任务管理',
        icon: 'sugo-task',
        chunkName: 'marketing-tasks'
      },
      {
        path: '/console/marketing-pushs',
        title: 'push落地页管理',
        icon: 'sugo-push',
        chunkName: 'marketing-pushs'
      }
    ]
  },
  {
    title: '营销大脑',
    children: [
      {
        title: '营销策略中心',
        type: 'label'
      },
      {
        path: '/console/market-brain-models',
        title: '营销模型',
        icon: 'sugo-model',
        style: { paddingLeft: 35 }
      },
      {
        path: '/console/market-brain-events',
        title: '营销策略',
        icon: 'sugo-event',
        style: { paddingLeft: 35 }
      },
      {
        title: '活动管理中心',
        type: 'label'
      },
      {
        path: '/console/market-brain-acts',
        title: '活动管理',
        icon: 'sugo-active',
        style: { paddingLeft: 35 }
      },
      {
        path: '/console/market-brain-tasks',
        title: '触达任务管理',
        icon: 'sugo-task',
        style: { paddingLeft: 35 }
      },
      {
        path: '/console/market-brain-acts/result',
        title: '效果查看',
        icon: 'sugo-task',
        hide: true
      }
      // {
      //   path: '/console/market-brain-pushs',
      //   title: 'push落地页管理',
      //   icon: 'sugo-push'
      // },
    ]
  },
  {
    title: '数据管理',
    children: [
      {
        path: '/console/project',
        title: '项目管理',
        icon: 'sugo-projects',
        chunkName: 'projects'
      },
      //      {
      //        path: '/console/datasource',
      //        title: '数据源列表',
      //        chunkName: 'datasource'
      //      },
      {
        path: '/console/dimension',
        title: '维度管理',
        icon: 'sugo-dimension',
        chunkName: 'dimension'
      },
      {
        path: '/console/dimension/import',
        title: '文件导入维度',
        icon: 'sugo-dimension',
        hide: true,
        chunkName: 'dimension-import'
      },
      {
        path: '/console/measure',
        title: '指标管理',
        icon: 'sugo-measures',
        chunkName: 'measure'
      },
      {
        path: '/console/project/datasource-settings',
        title: '场景数据设置',
        icon: 'appstore',
        chunkName: 'datasource-settings'
      },
      {
        path: '/console/access-tools',
        title: '数据导入工具',
        icon: 'tool',
        chunkName: 'access-tools'
      },
      {
        path: '/console/business-db-setting',
        title: '业务表管理',
        icon: 'database',
        chunkName: 'business-db-setting'
      },
      {
        path: '/console/publish-manager',
        title: '发布管理',
        icon: 'share-alt',
        chunkName: 'publish-manager'
      },
      {
        path: '/console/data-api',
        title: '数据 API',
        icon: 'api',
        chunkName: 'data-api'
      },
      {
        noAuth: true,
        icon: 'search',
        title: 'SQL 查询工具',
        path: '${window.sugo.enableSqlPad ? "/sql-pad/queries/new" : ""}',
        target: '_blank',
        enableURLTemplate: true,
        chunkName: 'sql-search-tools'
      },
      {
        path: '/console/external-data-sources',
        title: '外部数据源管理',
        icon: 'database'
      },
      {
        path: '/console/external-tables',
        title: '外部维表管理',
        icon: 'table'
      }
    ]
  },
  {
    title: '管理中心',
    children: [
      {
        path: '/console/institutions-manager',
        title: '机构管理',
        hide: true,
        icon: 'sugo-user',
        chunkName: 'institutions-manager'
      },
      {
        path: '/console/security/user',
        title: '用户管理',
        hide: true,
        icon: 'sugo-user',
        chunkName: 'user'
      },
      {
        path: '/console/security/role',
        title: '角色管理',
        hide: true,
        icon: 'sugo-team',
        chunkName: 'roles'
      },
      {
        path: '/console/data-checking',
        title: '数据复核',
        hide: true,
        icon: 'sugo-team',
        chunkName: 'data-checking'
      },
      {
        path: '/console/operate-log',
        title: '操作日志查询',
        hide: true,
        icon: 'sugo-team',
        chunkName: 'operate-log'
      }
    ]
  },
  // {
  //   title: '任务调度',
  //   children: [
  //     {
  //       path: '/console/task-schedule-manager',
  //       title: '任务调度',
  //       icon: 'clock-circle-o',
  //       chunkName: 'task-schedule-manager'
  //     }, {
  //       path: '/console/task-schedule-list/scheduling',
  //       title: '调度',
  //       icon: 'flag',
  //       chunkName: 'task-tables'
  //     }, {
  //       path: '/console/task-schedule-list/stream',
  //       title: '正在执行',
  //       icon: 'calculator',
  //       chunkName: 'task-tables'
  //     }, {
  //       path: '/console/task-schedule-list/history',
  //       title: '执行历史',
  //       icon: 'profile',
  //       chunkName: 'task-tables'
  //     },{
  //       path:'/console/task-schedule-list/dbconnectmanager',
  //       title:'数据库连接管理',
  //       icon:'profile',
  //       chunkName: 'task-tables'
  //     }
  //   ]
  // },
  {
    title: '数据开发中心',
    children: [
      {
        path: '/console/new-task-schedule/dbconnectmanager',
        title: '数据源管理',
        icon: 'profile',
        chunkName: 'db-connect-manager'
      },
      // {
      //   path: '/console/new-task-schedule-manager/data-directory-manager',
      //   title: '数据建模', // 原数据目录
      //   icon: 'bars',
      //   chunkName: 'data-directory-manage'
      // },
      /* 注释掉数据开发中心二期菜单
       {
        path: '/console/new-task-schedule-manager/data-collect',
        title: '数据开发',
        icon: 'code',
        chunkName: 'data-collect'
      },
      {
        path: '/console/new-task-schedule-manager/schedule-manager',
        title: '二期发布管理', // 原调度管理，改成发布管理后下级有发布总览、发布审核、调度管理
        icon: 'schedule',
        chunkName: 'schedule-manager'
      },
      {
        path: '/console/new-task-schedule-manager/execute-manager',
        title: '运维管理', // 原调度管理，改成运维管理后下级有发布总览、发布审核、调度管理
        icon: 'dashboard',
        chunkName: 'execute-manager',
        children: [
          {
            path: '/console/new-task-schedule-manager/execute-manager',
            title: '任务执行管理',
            icon: '',
            chunkName: 'execute-manager-id'
          },
          {
            path: '/console/new-task-schedule-manager/executors-manager',
            title: '执行器管理', // 原调度管理，改成运维管理后下级有发布总览、发布审核、调度管理
            icon: '',
            chunkName: 'executors-manager'
          }
        ]
      },
      {
        title: '数据开发三期',
        type: 'label'
      }, */
      {
        path: '/console/task-schedule-v3/task-project',
        title: '数据开发',
        icon: 'code',
        chunkName: 'task-v3-task-project'
      },
      {
        path: '/console/new-task-schedule/publish-manager',
        title: '发布管理',
        icon: 'schedule',
        chunkName: 'new-task-schedule-publish-manager',
        children: [
          {
            path: '/console/new-task-schedule/publish-manager',
            title: '发布审核',
            icon: '',
            chunkName: 'new-task-schedule-publish-manager'
          },
          {
            path: '/console/new-task-schedule/clone-manager',
            title: '项目克隆管理',
            icon: '',
            chunkName: 'new-task-schedule-clone-manager'
          }
        ]
      },
      {
        path: '/console/new-task-schedule-manager/circle-dispatch-manager',
        title: '运维管理', // 原调度管理，改成运维管理后下级有发布总览、发布审核、调度管理
        icon: 'dashboard',
        chunkName: 'circle-dispatch-manager',
        children: [
          {
            path: '/console/new-task-schedule-manager/circle-dispatch-manager',
            title: '周期调度管理',
            icon: '',
            chunkName: 'circle-dispatch-manager'
          },
          {
            path: '/console/task-schedule-v3/execute-manager',
            title: '任务执行管理',
            icon: '',
            chunkName: 'task-v3-execute-manager'
          },
          {
            path: '/console/new-task-schedule-manager/executors-manager',
            title: '执行器管理', // 原调度管理，改成运维管理后下级有发布总览、发布审核、调度管理
            icon: '',
            chunkName: 'executors-manager'
          }
        ]
      },
      {
        title: '数据质量',
        microFrontend: 'sugo-data-quantity',
        path: '/console/data-quantity/data-quality/business-rules',
        icon: 'database',
        chunkName: 'sugo-data-quantity',
        children: [
          {
            noAuth: true,
            path: '/console/data-quantity/data-quality/business-rules',
            title: '业务规则',
            icon: 'flag'
          },
          {
            noAuth: true,
            path: '/console/data-quantity/data-quality/technology-rules',
            title: '技术规则',
            icon: 'area-chart'
          },
          {
            noAuth: true,
            title: '任务组管理',
            path: '/console/data-quantity/data-quality/check-task',
            icon: 'area-chart'
          },
          {
            noAuth: true,
            title: '检核任务日志',
            path: '/console/data-quantity/data-quality/task-log',
            icon: 'cloud-o'
          },
          {
            noAuth: true,
            title: '质量报告',
            path: '/console/data-quantity/data-quality/report',
            icon: 'sugo-task'
          },
          {
            noAuth: true,
            title: '维度大类',
            path: '/console/data-quantity/data-quality/category-manager',
            icon: 'sugo-active-group'
          },
          {
            noAuth: true,
            title: '维度小类',
            path: '/console/data-quantity/data-quality/sub-category-manager',
            icon: 'sugo-model'
          },
          {
            noAuth: true,
            hide: true,
            title: '任务日志详情',
            path: '/console/data-quantity/data-quality/log-detail',
            icon: 'sugo-model'
          }
        ]
      }
    ]
  },
  //  {
  //   title: '数据质量',
  //   microFrontend: 'sugo-data-quantity',
  //   children: [
  //     {
  //       noAuth: true,
  //       path: '/console/data-quantity/data-quality/business-rules',
  //       title: '业务规则',
  //       icon: 'flag'
  //     },
  //     {
  //       noAuth: true,
  //       path: '/console/data-quantity/data-quality/technology-rules',
  //       title: '技术规则',
  //       icon: 'area-chart'
  //     },
  //     {
  //       noAuth: true,
  //       title: '检核任务组管理',
  //       path: '/console/data-quantity/data-quality/check-task',
  //       icon: 'area-chart'
  //     },
  //     {
  //       noAuth: true,
  //       title: '检核任务日志',
  //       path: '/console/data-quantity/data-quality/task-log',
  //       icon: 'area-chart'
  //     },
  //     {
  //       noAuth: true,
  //       title: '质量报告',
  //       path: '/console/data-quantity/data-quality/report',
  //       icon: 'area-chart'
  //     },
  //     {
  //       noAuth: true,
  //       title: '维度大类',
  //       path: '/console/data-quantity/data-quality/category-manager',
  //       icon: 'area-chart'
  //     },
  //     {
  //       noAuth: true,
  //       title: '维度小类',
  //       path: '/console/data-quantity/data-quality/sub-category-manager',
  //       icon: 'area-chart'
  //     }
  //   ]
  // },
  // {
  //   title: '指标管理',
  //   children: [
  //     {
  //       title: '指标管理二期',
  //       type: 'label'
  //     },
  //     {
  //       path: '/console/offline-calc/indices',
  //       title: '指标库',
  //       icon: 'area-chart',
  //       chunkName: 'offline-calc-indices-manager'
  //     },
  //     {
  //       path: '/console/offline-calc/indices-manager-byhand',
  //       title: '手工指标管理',
  //       icon: 'bar-chart',
  //       hide: true,
  //       chunkName: 'manager-byhand'
  //     },
  //     {
  //       path: '/console/offline-calc/models',
  //       title: '指标模型管理',
  //       icon: 'cloud-o',
  //       chunkName: 'offline-calc-models'
  //     },
  //     {
  //       path: '/console/offline-calc/models/logs',
  //       title: '指标模型执行日志',
  //       icon: 'cloud-o',
  //       hide: true,
  //       chunkName: 'offline-calc-models-logs'
  //     },
  //     {
  //       path: '/console/offline-calc/models/execute',
  //       title: '指标模型任务执行记录',
  //       icon: 'cloud-o',
  //       hide: true,
  //       chunkName: 'offline-calc-models-execute'
  //     },
  //     {
  //       path: '/console/offline-calc/tables',
  //       title: '维表管理',
  //       icon: 'table',
  //       chunkName: 'offline-calc-tables-manager'
  //     },
  //     {
  //       path: '/console/business-dimension-manager',
  //       title: '业务维度管理',
  //       icon: 'book',
  //       chunkName: 'business-dimension-manager'
  //     },
  //     {
  //       path: '/console/offline-calc/data-sources',
  //       title: '数据源管理',
  //       icon: 'database',
  //       chunkName: 'offline-calc-data-source-manager'
  //     },
  //     {
  //       path: '/console/offline-calc/models-running-histories',
  //       title: '指标模型执行历史',
  //       icon: 'profile',
  //       hide: true,
  //       chunkName: 'offline-calc-running-histories'
  //     },
  //     {
  //       path: '/console/offline-calc/review-manager',
  //       title: '审核管理',
  //       icon: 'flag',
  //       chunkName: 'review-manager'
  //     },
  //     {
  //       path: '/console/offline-calc/version-manager',
  //       title: '版本管理',
  //       icon: 'clock-circle-o',
  //       chunkName: 'version-manager'
  //     },
  //     {
  //       path: '/console/offline-calc/settings',
  //       title: '基础设置',
  //       icon: 'setting',
  //       chunkName: 'offline-calc-settings'
  //     },
  //     {
  //       path: '/console/offline-calc/import-tables',
  //       title: '导入维表',
  //       icon: 'table',
  //       chunkName: 'import-tables'
  //     },
  //     {
  //       path: '/console/offline-calc/business-line-management',
  //       title: '业务线条管理',
  //       icon: 'setting',
  //       chunkName: 'business-line-management'
  //     },
  //     {
  //       path: '/console/offline-calc/relation-trace',
  //       authPermission: 'get:/console/offline-calc/relation-trace/:id',
  //       title: '血缘追溯',
  //       hide: true,
  //       icon: 'bar-chart',
  //       chunkName: 'offline-calc-relation-trace'
  //     },
  //     {
  //       path: '/console/offline-calc/release-version',
  //       authPermission: 'get:/console/offline-calc/release-version/:id',
  //       title: '提交审核',
  //       hide: true,
  //       icon: 'bar-chart',
  //       chunkName: 'offline-calc-release-version'
  //     }
  //   ]
  // },
  {
    title: '指标管理',
    microFrontend: 'sugo-indices-dev',
    children: [
      {
        noAuth: true,
        path: '/console/indices-dev/workflow',
        title: '我的任务',
        icon: 'flag'
      },
      {
        noAuth: true,
        path: '/console/indices-dev/indices',
        title: '指标管理',
        icon: 'area-chart'
      },
      {
        noAuth: true,
        title: '指标开发',
        children: [
          {
            noAuth: true,
            path: '/console/indices-dev/data-sources',
            title: '数据源管理',
            icon: 'database'
          },
          {
            noAuth: true,
            path: '/console/indices-dev/dimensions',
            title: '维度管理',
            icon: 'table'
          },
          {
            noAuth: true,
            path: '/console/indices-dev/index-models',
            title: '模型管理',
            icon: 'codepen'
          }
        ]
      }
    ]
  },
  {
    title: '应用门户',
    children: [
      {
        path: '/console/navigation-start',
        title: '应用门户',
        hide: true,
        icon: '',
        chunkName: 'navigation-start'
      }
    ]
  }
  //微前端菜单的例子，子应用的 base 配置成 /console/indices-dev
  /*
  {
    title: '指标管理',
    microFrontend: 'sugo-indices-dev',
    children: [
      {
        noAuth: true,
        path: '/console/indices-dev/workflow',
        title: '我的任务',
        icon: 'flag'
      },
      {
        noAuth: true,
        path: '/console/indices-dev/indices',
        title: '指标管理',
        icon: 'area-chart'
      },
      {
        noAuth: true,
        title: '指标开发',
        children: [
          {
            noAuth: true,
            path: '/console/indices-dev/data-sources',
            title: '数据源管理',
            icon: 'database'
          },
          {
            noAuth: true,
            path: '/console/indices-dev/dimensions',
            title: '维度管理',
            icon: 'table'
          },
          {
            noAuth: true,
            path: '/console/indices-dev/index-models',
            title: '模型管理',
            icon: 'codepen'
          }
        ]
      }
    ]
  }
*/
]

module.exports = exports.default = allMenus
