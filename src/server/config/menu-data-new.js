const newMenus = [
  {
    title: '数据开发中心',
    children: [
      {
        title: '数据开发中心',
        children: [
          {
            path: '/console/task-schedule-v3/overview',
            title: '概览',
            icon: 'robot',
            chunkName: 'db-overview'
          },
          {
            path: '/console/new-task-schedule/dbconnectmanager',
            title: '数据源管理',
            icon: 'profile',
            chunkName: 'db-connect-manager'
          },
          {
            path: '/console/new-task-schedule-manager/data-directory-manager',
            title: '数据目录',
            icon: 'bars',
            chunkName: 'data-directory-manage'
          },
          {
            path: '/console/task-schedule-v3/task-project',
            title: '数据开发',
            icon: 'code',
            chunkName: 'data-collect'
          },
          {
            title: '发布管理',
            icon: 'schedule',
            children: [
              {
                path: '/console/new-task-schedule/publish-manager',
                title: '发布审核',
                icon: 'schedule',
                chunkName: 'schedule-manager'
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
            title: '运维管理',
            icon: 'dashboard',
            children: [
              {
                path: '/console/new-task-schedule-manager/circle-dispatch-manager',
                title: '周期调度管理',
                icon: 'dashboard',
                chunkName: 'circle-dispatch-manager'
              },
              {
                path: '/console/task-schedule-v3/execute-manager',
                title: '任务执行管理',
                icon: '',
                chunkName: 'execute-manager-id'
              },
              {
                path: '/console/new-task-schedule-manager/executors-manager',
                title: '执行器管理',
                icon: '',
                chunkName: 'executors-manager'
              }
            ]
          }
        ]
      },
      {
        title: '实时数据开发',
        microFrontend: 'RT-data-dev',
        children: [
          {
            title: '任务列表',
            path: '/console/RT-data-dev/task-list',
            icon: 'bars',
            chunkName: ''
          },
          {
            title: '数据源',
            path: '/console/RT-data-dev/data-source',
            icon: 'database',
            chunkName: ''
          },
          {
            title: '质量监控',
            path: '/console/RT-data-dev/quality',
            icon: 'dashboard',
            chunkName: ''
          },
          {
            title: '任务编辑',
            hide: true,
            path: '/console/RT-data-dev/task-edit',
            icon: 'dashboard',
            chunkName: ''
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
          }
        ]
      }
    ]
  },
  {
    title: '数据资产管理中心',
    children: [
      {
        title: '元数据',
        icon: 'appstore',
        microFrontend: 'sugo-data-quantity',
        children: [
          {
            path: '/console/data-quantity/data-dictionary/metadata-harvesting',
            title: '元数据采集',
            icon: 'funnel-plot',
            chunkName: '',
            children: [
              {
                path: '/console/data-quantity/data-dictionary/metadata-harvesting',
                title: '数据采集',
                icon: 'funnel-plot'
              },
              {
                path: '/console/data-quantity/data-dictionary/task-monitoring',
                title: '任务监控',
                icon: 'desktop'
              }
            ]
          },
          {
            path: '/console/data-quantity/data-dictionary/version-comparison',
            title: '元数据管理',
            icon: 'appstore',
            chunkName: '',
            children: [
              {
                path: '/console/data-quantity/data-dictionary/version-comparison',
                title: '元数据目录',
                icon: 'folder-open'
              }
            ]
          },
          {
            path: '/console/data-quantity/data-dictionary/consanguinity-analysis/index',
            title: '元数据应用',
            icon: 'appstore',
            chunkName: '',
            children: [
              {
                path: '/console/data-quantity/data-dictionary/consanguinity-analysis/index',
                title: '血缘分析',
                icon: 'apartment'
              },
              {
                path: '/console/data-quantity/data-dictionary/consanguinity-analysis/affect',
                title: '影响分析',
                icon: 'radar-chart'
              }
            ]
          },
          {
            title: '元模型管理',
            icon: 'block',
            children: [
              {
                path: '/console/data-quantity/meta-data/package',
                title: '包管理',
                icon: 'folder',
                chunkName: ''
              },
              {
                path: '/console/data-quantity/meta-data/datatype',
                title: '数据类型管理',
                icon: 'appstore',
                chunkName: ''
              },
              {
                path: '/console/data-quantity/meta-data/class-manager',
                title: '类管理',
                icon: 'copyright',
                chunkName: ''
              }
            ]
          }
          // 20200622-元数据采集1期演示，暂时屏蔽一下菜单
          // {
          //   title: '系统落地代码管理',
          //   icon: 'flag',
          //   children: [
          //     {
          //       path: '/console/data-quantity/meta-data/landcode',
          //       title: '系统落地代码管理',
          //       icon: 'credit-card',
          //       chunkName: ''
          //     },
          //     {
          //       path: '/console/data-quantity/meta-data/datasource-mapping',
          //       title: 'ETL映射管理',
          //       icon: 'gateway',
          //       chunkName: ''
          //     }
          //   ]
          // },
          // {
          //   title: '元数据分析',
          //   icon: 'hourglass',
          //   children: [
          //     {
          //       path: '/console/data-quantity/meta-analytics/change-ana',
          //       title: '变更分析',
          //       icon: 'area-chart',
          //       chunkName: ''
          //     },
          //     {
          //       path: '/console/data-quantity/meta-analytics/statistics-ana',
          //       title: '统计分析',
          //       icon: 'line-chart',
          //       chunkName: ''
          //     },
          //     {
          //       path: '/console/data-quantity/meta-analytics/table-rank',
          //       title: '表大小排名',
          //       icon: 'ordered-list',
          //       chunkName: ''
          //     }
          //   ]
          // }
        ]
      },
      {
        title: '指标管理',
        microFrontend: 'sugo-indices-dev',
        children: [
          {
            path: '/console/indices-dev/workflow',
            title: '指标申请',
            icon: 'flag'
          },
          {
            path: '/console/indices-dev/indices',
            title: '指标管理',
            icon: 'bar-chart',
            chunkName: 'manager-byhand'
          },
          {
            title: '指标开发',
            icon: 'code',
            children: [
              {
                path: '/console/indices-dev/data-sources',
                title: '数据源管理',
                icon: 'database'
              },
              {
                path: '/console/indices-dev/dimensions',
                title: '维度管理',
                icon: 'table'
              },
              {
                path: '/console/indices-dev/index-models',
                title: '模型管理',
                icon: 'codepen'
              }
            ]
          },
          {
            title: '系统管理',
            icon: 'setting',
            children: [
              {
                path: '/console/indices-dev/approve-setting',
                title: '审批流程配置',
                icon: 'profile'
              }
            ]
          }
        ]
      },
      {
        title: '数据质量',
        microFrontend: 'sugo-data-quantity',
        children: [
          {
            path: '/console/data-quantity/data-quality/business-rules',
            title: '业务规则',
            icon: 'branches',
            chunkName: ''
          },
          {
            path: '/console/data-quantity/data-quality/technology-rules',
            title: '技术规则',
            icon: 'paper-clip',
            chunkName: ''
          },
          {
            path: '/console/data-quantity/data-quality/check-task',
            title: '检核任务组管理',
            icon: 'safety',
            chunkName: ''
          },
          {
            path: '/console/data-quantity/data-quality/task-log',
            title: '检核任务日志',
            icon: 'thunderbolt',
            chunkName: ''
          },
          {
            path: '/console/data-quantity/data-quality/report',
            title: '质量报告',
            icon: 'reconciliation',
            chunkName: ''
          },
          {
            path: '/console/data-quantity/data-quality/category-manager',
            title: '维度大类',
            icon: 'sugo-active-group',
            chunkName: ''
          },
          {
            path: '/console/data-quantity/data-quality/sub-category-manager',
            title: '维度小类',
            icon: 'sugo-model',
            chunkName: ''
          },
          {
            hide: true,
            title: '任务日志详情',
            path: '/console/data-quantity/data-quality/log-detail',
            icon: 'sugo-model'
          }
        ]
      },
      {
        title: '数据地图',
        icon: 'folder',
        microFrontend: 'sugo-data-quantity',
        children: [
          {
            path: '/console/data-quantity/asset-catalog/catalog',
            title: '数据目录',
            icon: 'profile',
            chunkName: 'data-directory-manage'
          },
          {
            path: '/console/data-quantity/asset-catalog/catalog-manager',
            title: '目录管理',
            icon: 'book',
            chunkName: ''
          }
        ]
      }
    ]
  },
  {
    title: '数据服务中心',
    children: [
      {
        title: '统一数据服务',
        microFrontend: 'sugo-data-service',
        children: [
          {
            path: '/console/data-service/operational/indicators',
            title: '概览',
            icon: 'project',
            chunkName: ''
          },
          {
            path: '/console/data-service/data-source/index',
            title: '数据管理',
            icon: 'profile',
            chunkName: ''
          },
          {
            path: '/console/data-service/sql-manager/index',
            title: 'SQL编辑器',
            icon: 'code',
            chunkName: ''
          },
          {
            path: '/console/data-service/visual-model/index',
            title: '可视化建模',
            icon: 'eye',
            chunkName: ''
          },
          {
            path: '/console/data-service/api-development/api-list',
            title: 'API开发',
            icon: 'api',
            chunkName: ''
          },
          {
            path: '/console/data-service/api-development/api-test',
            title: 'API测试',
            icon: '',
            chunkName: '',
            hide: true
          },
          {
            path: '/console/data-service/api-development/api-form',
            title: '新增编辑API',
            icon: '',
            chunkName: '',
            hide: true
          },
          {
            path: '/console/data-service/api/register',
            title: 'API注册',
            icon: '',
            chunkName: '',
            hide: true
          },
          {
            title: 'API发布管理',
            children: [
              {
                path: '/console/data-service/api-manager/api-release',
                title: 'API管理',
                icon: 'control',
                chunkName: ''
              },
              {
                path: '/console/data-service/api-manager/api-aplication-auth',
                title: '客户端管理',
                icon: 'appstore',
                chunkName: ''
              }
            ]
          },
          {
            title: 'API运维',
            children: [
              {
                path: '/console/data-service/policy/configuration',
                title: '监控策略配置',
                icon: 'robot',
                chunkName: ''
              },
              {
                path: '/console/data-service/monitoring/alarm',
                title: '监控告警处理',
                icon: 'warning',
                chunkName: ''
              },
              {
                path: '/console/data-service/api-transfer-config/index',
                title: 'API调用配置',
                icon: 'tool',
                chunkName: ''
              },
              {
                path: '/console/data-service/api-transfer-summary/index',
                title: 'API调用次数汇总',
                icon: 'profile',
                chunkName: ''
              }
            ]
          },
          {
            path: '/console/data-service/api-import-export/index',
            title: '导入导出管理',
            icon: 'import',
            chunkName: ''
          },
          {
            path: '/console/data-service/api-import-export/api-import-process',
            title: '导入流程',
            icon: '',
            chunkName: '',
            hide: true
          },
          {
            path: '/console/data-service/global-param/index',
            title: '全局参数配置',
            icon: 'setting',
            chunkName: ''
          }
        ]
      },
      {
        title: '数据服务管理',
        children: [
          {
            path: '/console/data-api',
            title: '数据API',
            icon: 'api',
            chunkName: 'data-api'
          },
          {
            path: '/console/publish-manager',
            title: '发布管理',
            icon: 'share-alt',
            chunkName: 'publish-manager'
          }
        ]
      }
    ]
  },
  {
    title: '智能运营',
    children: [
      {
        title: '数据管理',
        children: [
          {
            path: '/console/project',
            title: '项目管理',
            icon: 'sugo-projects',
            chunkName: 'projects'
          },
          {
            path: '/console/dimension',
            title: '维度管理',
            icon: 'sugo-dimension',
            chunkName: 'dimension'
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
          }
        ]
      },
      {
        title: '数据运营工具',
        children: [
          {
            title: '行为分析',
            children: [
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
              }
            ]
          },
          {
            title: '热图分析',
            children: [
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
                chunkName: 'tag-dict'
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
            ]
          },
          {
            title: '用户分群',
            icon: 'sugo-team',
            path: '/console/usergroup',
            chunkName: 'usergroups'
          },
          {
            path: '/console/monitor-alarms',
            title: '数据监控',
            icon: 'sugo-alarm',
            chunkName: 'monitor-alarms'
          }
        ]
      },
      {
        title: '数据可视化',
        children: [
          {
            path: '/console/subscribe',
            title: '我的订阅',
            icon: 'star-o',
            chunkName: 'subscribe'
          },
          {
            title: '数据大屏',
            icon: 'desktop',
            children: [
              {
                title: '实时大屏',
                icon: 'desktop',
                path: '/console/livescreen',
                chunkName: 'livescreen'
              },
              {
                title: '授权管理',
                icon: '',
                path: '/console/role-livescreen',
                chunkName: ''
              },
              {
                path: '/console/examine-livescreen',
                title: '审核管理',
                icon: 'flag',
                chunkName: 'review-manager'
              },
              {
                title: '大屏投影',
                icon: 'aliyun',
                path: '/console/screen-control',
                chunkName: 'screen-control'
              },
              {
                path: '/console/examine-config',
                title: '审核流配置',
                icon: 'sugo-model',
                chunkName: 'examine-config'
              },
              {
                path: '/console/share-manager',
                title: '分享管理',
                icon: 'share-alt',
                chunkName: 'share-manager'
              }
            ]
          },
          {
            path: '/console/dashboards',
            title: '数据看板',
            icon: 'picture',
            chunkName: 'dashboards'
          },
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
            chunkName: 'slices'
          }
        ]
      },
      {
        title: '数据智能门户',
        children: [
          {
            path: '/console/portals-mgr',
            title: '门户管理',
            icon: 'profile',
            chunkName: 'portals-mgr'
          },
          {
            path: '/console/portal-apps-mgr',
            title: '应用管理',
            icon: 'appstore',
            chunkName: 'portal-apps-mgr'
          }
        ]
      }
    ]
  },
  {
    title: '智能营销',
    children: [
      {
        title: '营销大脑',
        children: [
          {
            path: '/console/market-brain-models',
            title: '营销模型',
            icon: 'sugo-model',
            chunkName: 'marketing-models'
          },
          {
            path: '/console/market-brain-events',
            title: '营销策略',
            icon: 'sugo-event'
          },
          {
            path: '/console/market-brain-acts',
            title: '活动管理',
            icon: 'sugo-active'
          },
          {
            path: '/console/market-brain-tasks',
            title: '触达任务管理',
            icon: 'sugo-task'
          }
        ]
      }
    ]
  },
  {
    title: '智能平台',
    children: [
      {
        title: '算法平台',
        microFrontend: 'sugo-sai-web',
        children: [
          {
            path: '/console/sugo-sai-web/data-source',
            title: '数据源管理',
            icon: 'database',
            chunkName: ''
          },
          {
            title: '模型开发',
            children: [
              {
                path: '/console/sugo-sai-web/visual-model',
                title: '可视化建模',
                icon: 'eye',
                chunkName: ''
              },
              {
                path: '/console/sugo-sai-web/notebook',
                title: 'notebook服务',
                icon: 'book',
                chunkName: ''
              }
            ]
          },
          {
            path: '/console/sugo-sai-web/train-history',
            title: '训练历史',
            icon: 'history',
            chunkName: ''
          },
          {
            path: '/console/sugo-sai-web/deploy-manage',
            title: '部署管理',
            icon: 'deployment-unit',
            chunkName: ''
          },
          {
            title: '配置管理',
            children: [
              {
                path: '/console/sugo-sai-web/mirror-manage',
                title: '运行环境管理',
                icon: 'monitor',
                chunkName: ''
              }
            ]
          },
          {
            path: '/console/sugo-sai-web/visual-model/edit',
            title: '编辑模型',
            icon: 'project',
            chunkName: '',
            hide: true
          },
          {
            path: '/console/sugo-sai-web/train-history/detail',
            title: '训练历史详情',
            icon: 'project',
            chunkName: '',
            hide: true
          },
          {
            path: '/console/sugo-sai-web/train-history/deploy',
            title: '训练历史部署',
            icon: 'project',
            chunkName: '',
            hide: true
          },
          {
            path: '/console/sugo-sai-web/train-history/compare',
            title: '训练历史对比',
            icon: 'project',
            chunkName: '',
            hide: true
          }
        ]
      }
    ]
  },
  {
    title: '产品实验室',
    children: [
      {
        title: '图表',
        children: [
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
          }
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
          },
          {
            path: '/console/pio-tool',
            title: '智能工具',
            icon: 'tool',
            chunkName: 'pio-tool'
          },
          {
            path: '/console/pio-chart',
            title: '智能图表',
            icon: 'pie-chart',
            chunkName: 'pio-chart'
          }
        ]
      },
      {
        title: '智能营销',
        children: [
          {
            path: '/console/marketing-models',
            title: '营销模型',
            icon: 'sugo-model',
            chunkName: 'marketing-models'
          },
          {
            path: '/console/marketing-events',
            title: '营销事件',
            icon: 'sugo-event',
            chunkName: 'marketing-events'
          },
          {
            path: '/console/marketing-act-groups',
            title: '活动分组',
            icon: 'sugo-active-group',
            chunkName: 'marketing-act-groups'
          },
          {
            path: '/console/marketing-acts',
            title: '活动管理',
            icon: 'sugo-active',
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
      }
    ]
  },
  {
    title: '系统管理',
    hide: true,
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
        path: '/console/operate-log',
        title: '操作日志管理',
        hide: true,
        icon: 'sugo-team',
        chunkName: 'operate-log'
      }
    ]
  }
]
module.exports = exports.default = newMenus
