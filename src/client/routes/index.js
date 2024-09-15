/* eslint-disable react/display-name */
import React from 'react'
import { browserHistory, Link, Router } from 'react-router'
import Home from '../components/Home'
import Dashboards from '../components/Dashboards'
import Usergroup from '../components/Usergroup'
import SegmentExpand from '../components/SegmentExpand'
import Role from '../components/Role'
import MonitorAlarms from '../components/MonitorAlarms'
import { routePermissionFilter } from '../common/permission-control'
import Exception from '../components/Exception/index'
import _ from 'lodash'
import { RESPONSIVE_PAGE_MAX_WIDTH } from '../../common/constants'
import MicroFrontendAdapter from '../components/MicroFrontendAdapter'
import { recurFind } from '../../common/sugo-utils'

// Use require.context to require routes automatically
// Ref: https://webpack.github.io/docs/context.html
const context = require.context('./', false, /\.js(x)?$/)
const fileNames = context.keys().filter(item => item !== './index.js')
const childRouteFiles = fileNames.reduce((memo, key) => {
  memo[key.match(/([^\\/]+)\.js$/)[1]] = context(key).default
  return memo
}, {})

let commons = []

if (window.sugo.user.type === 'built-in') {
  commons.push({
    path: '/console/company-info',
    getComponent(nextState, cb) {
      require.ensure(
        [],
        require => {
          cb(null, require('../components/Security/company-profile').default)
        },
        'company-info'
      )
    }
  })
}

if (_.get(window.sugo.user, 'company.is_root') && window.sugo.companyManage) {
  commons.push({
    path: '/console/company',
    getComponent(nextState, cb) {
      require.ensure(
        [],
        require => {
          cb(null, require('../components/Company').default)
        },
        'company-index'
      )
    },
    getIndexRoute(nextState, cb) {
      require.ensure([], require => {
        cb(
          null,
          {
            component: require('../components/Company/list').default
          },
          'companies'
        )
      })
    },
    childRoutes: [
      {
        path: '/console/company/new',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Company/new').default)
            },
            'company-new'
          )
        }
      },
      {
        path: '/console/company/:companyId',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Company/single').default)
            },
            'company'
          )
        }
      }
    ]
  })
}

let getChildrens = reducerRegistry =>
  commons.concat(
    routePermissionFilter([
      {
        path: '/console/index',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Index').default)
            },
            'index'
          )
        }
      },
      {
        path: '/console/navigation-start',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Home/navigation-start').default)
            },
            'navigation-start'
          )
        }
      },
      {
        path: '/console/departments',
        // pass: false,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Departments').default)
            },
            'departments'
          )
        }
      },
      {
        path: '/console/slices',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Slices/list').default)
            },
            'slices'
          )
        }
      },
      {
        path: '/console/user-action-analytics',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/UserActionAnalytics').default)
            },
            'user-action-analytics'
          )
        }
      },
      {
        path: '/console/user-action-analytics/:sliceId',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/UserActionAnalytics').default)
            },
            'user-action-analytics-single'
          )
        }
      },
      {
        path: '/console/subscribe',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Subscribe').default)
            },
            'subscribe'
          )
        }
      },
      {
        path: '/console/overview',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Overview').default)
            },
            'overview'
          )
        }
      },
      {
        path: '/console/funnel',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/SugoFunnel').default)
            },
            'funnels'
          )
        }
      },
      {
        path: '/console/funnel/:funnelId',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/SugoFunnel').default)
            },
            'funnel'
          )
        }
      },
      {
        path: '/console/funnel/:funnelId/editing',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/SugoFunnel').default)
            },
            'funnel-edit'
          )
        }
      },
      {
        path: '/console/analytic',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Analytic/index').default)
            },
            'analytic'
          )
        }
      },
      {
        path: '/console/analytic/inspect-source-data',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Analytic/inspect-source-data').default)
            },
            'inspect-source-data'
          )
        }
      },
      {
        path: '/console/source-data-analytic',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/SourceDataAnalytic/index.jsx').default)
            },
            'source-data-analytic'
          )
        }
      },

      //  {
      //    path: '/console/datasource',
      //    getComponent(nextState, cb) {
      //      require.ensure([], (require) => {
      //        cb(null, require('../components/Datasource/datasource-list').default)
      //      }, 'datasource')
      //    }
      //  },
      {
        path: '/console/dimension',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Datasource/common-list').default)
            },
            'dimension'
          )
        }
      },
      {
        path: '/console/dimension/import',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Datasource/import-dimensions-byfile').default)
            },
            'dimension-import'
          )
        }
      },
      {
        path: '/console/measure',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Datasource/common-list').default)
            },
            'measure'
          )
        }
      },
      {
        path: '/console/retention',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Retention/retention').default)
            },
            'retentions'
          )
        }
      },
      {
        path: '/console/retention/:retentionId',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Retention/retention').default)
            },
            'retention'
          )
        }
      },
      {
        path: '/console/segment-expand',
        component: SegmentExpand,
        getIndexRoute(nextState, cb) {
          require.ensure([], require => {
            cb(
              null,
              {
                component: require('../components/SegmentExpand/list').default
              },
              'segment-expands'
            )
          })
        },
        childRoutes: [
          {
            path: '/console/segment-expand/new',
            getComponent(nextState, cb) {
              require.ensure(
                [],
                require => {
                  cb(null, require('../components/SegmentExpand/new').default)
                },
                'segment-expand-new'
              )
            }
          },
          {
            path: '/console/segment-expand/:segmentExpandId',
            pass: true,
            getComponent(nextState, cb) {
              require.ensure(
                [],
                require => {
                  cb(null, require('../components/SegmentExpand/single').default)
                },
                'segment-expand'
              )
            }
          }
        ]
      },
      {
        path: '/console/usergroup',
        component: Usergroup,
        getIndexRoute(nextState, cb) {
          require.ensure([], require => {
            cb(
              null,
              {
                component: require('../components/Usergroup/list').default
              },
              'usergroups'
            )
          })
        },
        childRoutes: [
          {
            path: '/console/usergroup/new',
            pass: true,
            getComponent(nextState, cb) {
              require.ensure(
                [],
                require => {
                  cb(null, require('../components/Usergroup/new').default)
                },
                'usergroup-new'
              )
            }
          },
          {
            path: '/console/usergroup/:usergroupId',
            pass: true,
            getComponent(nextState, cb) {
              require.ensure(
                [],
                require => {
                  cb(null, require('../components/Usergroup/single').default)
                },
                'usergroup'
              )
            }
          },
          {
            path: '/console/usergroup/:ugId/users',
            pass: true,
            getComponent(nextState, cb) {
              require.ensure(
                [],
                require => {
                  cb(null, require('../components/Usergroup/userlist').default)
                },
                'insight-userlist'
              )
            }
          }
        ]
      },
      {
        path: '/console/path-analysis',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/PathAnalysis').default)
            },
            'path-analysis'
          )
        }
      },
      {
        path: '/console/dashboards',
        component: Dashboards,
        getIndexRoute(nextState, cb) {
          require.ensure([], require => {
            cb(
              null,
              {
                component: require('../components/Dashboards/dashboard-index').default
              },
              'dashboards'
            )
          })
        },
        childRoutes: [
          {
            path: '/console/dashboards/new',
            pass: true,
            getComponent(nextState, cb) {
              require.ensure(
                [],
                require => {
                  cb(null, require('../components/Dashboards/new').default)
                },
                'dashboard-new'
              )
            }
          },
          {
            path: '/console/dashboards/overview',
            pass: true,
            getComponent(nextState, cb) {
              require.ensure(
                [],
                require => {
                  cb(null, require('../components/Dashboards/dashboard-index').default)
                },
                'dashboard-overview'
              )
            }
          },
          {
            path: '/console/dashboards/:dashboardId',
            pass: true,
            getComponent(nextState, cb) {
              require.ensure(
                [],
                require => {
                  cb(null, require('../components/Dashboards/dashboard-index').default)
                },
                'dashboard'
              )
            }
          }
        ]
      },
      {
        path: '/console/security/user',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Security/users').default)
            },
            'user'
          )
        }
      },
      {
        path: '/console/institutions-manager',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Institutions').default)
            },
            'institutions-manager'
          )
        }
      },
      {
        path: '/console/institutions-details/:id',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Institutions/details').default)
            },
            'institutions-details'
          )
        },
        pass: true
      },
      {
        path: '/console/security/role',
        component: Role,
        getIndexRoute(nextState, cb) {
          require.ensure([], require => {
            cb(
              null,
              {
                component: require('../components/Role/list').default
              },
              'roles'
            )
          })
        },
        childRoutes: [
          {
            path: '/console/security/role/new',
            getComponent(nextState, cb) {
              require.ensure(
                [],
                require => {
                  if (reducerRegistry) {
                    reducerRegistry.model(require('../components/Role/app-authorize/models').default)
                  }
                  cb(null, require('../components/Role/new').default)
                },
                'role-new'
              )
            }
          },
          {
            path: '/console/security/role/:roleId',
            pass: true,
            getComponent(nextState, cb) {
              if (reducerRegistry) {
                reducerRegistry.model(require('../components/Role/app-authorize/models').default)
              }
              require.ensure(
                [],
                require => {
                  cb(null, require('../components/Role/single').default)
                },
                'role'
              )
            }
          }
        ]
      },
      {
        path: '/console/compare-page',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/ComparePage').default)
            },
            'compare-page'
          )
        }
      },
      {
        // TODO remove
        path: '/console/insight',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Insight/insight').default)
            },
            'insight'
          )
        }
      },
      {
        path: '/console/profile',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Security/profile').default)
            },
            'profile'
          )
        }
      },
      {
        path: '/console/business-dimension-manager',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/BusinessDimension/list').default)
            },
            'business-dimension-manager'
          )
        }
      },
      {
        path: '/console/project/datasource-settings',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Project/scene-data').default)
            },
            'datasource-settings'
          )
        }
      },
      {
        path: '/console/track/:token',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/track-v3/index').default)
            },
            'track-token'
          )
        }
      },
      {
        path: '/console/trackAuto/:token',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/track-v3/index').default)
            },
            'track-token'
          )
        }
      },
      {
        path: '/console/track/heat-map/:token',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Track2/heat-map').default)
            },
            'heat-map-track'
          )
        }
      },
      {
        path: '/console/track/choose-website-track/:token',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Track/choose-website-track').default)
            },
            'website-track-token'
          )
        }
      },
      {
        path: '/console/heat-entry/:token',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Track/heat-entry').default)
            },
            'heat-entry'
          )
        }
      },
      {
        path: '/console/project',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Project/index').default)
            },
            'projects'
          )
        }
      },
      {
        path: '/console/project/create',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Project/create/index').default)
            },
            'projects-create'
          )
        }
      },
      {
        path: '/console/project/:id',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Project/access/index').default)
            },
            'project'
          )
        }
      },
      {
        path: '/console/tag-data-manage',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/TagDataMgr').default)
            },
            'tag-data-manage'
          )
        }
      },
      {
        path: '/console/access-tools',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/AccessTools/index').default)
            },
            'access-tools'
          )
        }
      },
      {
        path: '/console/access-tools/create/:id',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/AccessTools/create').default)
            },
            'access-tools-create'
          )
        }
      },
      {
        path: '/console/access-tools/edit/:id',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/AccessTools/edit').default)
            },
            'access-tools-edit'
          )
        }
      },
      {
        path: '/console/pio-projects',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/PioProjects/list').default)
            },
            'pio-projs'
          )
        }
      },
      {
        path: '/console/pio-tool',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/pioTool/index').default)
            },
            'pio-tool'
          )
        }
      },
      {
        path: '/console/pio-chart',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/PioChart/index').default)
            },
            'pio-chart'
          )
        }
      },
      {
        path: '/console/pio-projects/new',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/PioProjects/new').default)
            },
            'pio-projs-new'
          )
        }
      },
      {
        path: '/console/pio-projects/:projectId',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/PioProjects/single').default)
            },
            'pio-projs-single'
          )
        }
      },
      {
        path: '/console/loss-predict',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/LossPredict').default)
            },
            'loss-predicts'
          )
        }
      },
      {
        path: '/console/loss-predict/file-histories',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/LossPredict/file-history').default)
            },
            'loss-predict-files'
          )
        }
      },
      {
        path: '/console/loss-predict/file-histories/:fileId',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/LossPredict/file-detail').default)
            },
            'loss-predict-file'
          )
        }
      },
      {
        path: '/console/loss-predict/:modelId',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/LossPredict/model-result').default)
            },
            'loss-predict'
          )
        }
      },
      {
        path: '/console/loss-predict/:modelId/predictions',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/LossPredict/predict-history').default)
            },
            'predictions'
          )
        }
      },
      {
        path: '/console/loss-predict/:modelId/predictions/:predictionId',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/LossPredict/predict-result').default)
            },
            'prediction'
          )
        }
      },
      {
        path: '/console/loss-predict/:modelId/begin-training',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/LossPredict/BeginTraining/begin-training').default)
            },
            'begin-training'
          )
        }
      },
      {
        path: '/console/loss-predict/:modelId/begin-predict',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/LossPredict/BeginPredict/begin-predict').default)
            },
            'begin-predict'
          )
        }
      },
      {
        path: '/console/monitor-alarms/notify-templates-management',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/MonitorAlarms/notify-templates-management').default)
            },
            'monitor-alarms-notify-templates-management'
          )
        }
      },
      {
        path: '/console/monitor-alarms/contacts-management',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/MonitorAlarms/contacts-management').default)
            },
            'monitor-alarms-contacts-management'
          )
        }
      },
      {
        path: '/console/monitor-alarms',
        component: MonitorAlarms,
        getIndexRoute(nextState, cb) {
          require.ensure([], require => {
            cb(
              null,
              {
                component: require('../components/MonitorAlarms/list').default
              },
              'monitor-alarms'
            )
          })
        },
        childRoutes: [
          {
            path: '/console/monitor-alarms/create',
            pass: true,
            getComponent(nextState, cb) {
              require.ensure(
                [],
                require => {
                  cb(null, require('../components/MonitorAlarms/form').default)
                },
                'monitor-alarms-create'
              )
            }
          },
          {
            path: '/console/monitor-alarms/update/:id',
            pass: true,
            getComponent(nextState, cb) {
              require.ensure(
                [],
                require => {
                  cb(null, require('../components/MonitorAlarms/form').default)
                },
                'monitor-alarms-update'
              )
            }
          },
          {
            path: '/console/monitor-alarms/exceptions/:id',
            getComponent(nextState, cb) {
              require.ensure(
                [],
                require => {
                  cb(null, require('../components/MonitorAlarms/exception-list').default)
                },
                'monitor-alarms-exception-list'
              )
            }
          }
        ]
      },
      {
        path: '/console/operate-log',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OperateLog/index').default)
            },
            'operate-log'
          )
        }
      },
      {
        path: '/console/rfm',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/RFM/index').default)
            },
            'rfms'
          )
        }
      },
      {
        path: '/console/rfm/:projectId/:id/info',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/RFM/rfm-info').default)
            },
            'rfm'
          )
        }
      },
      {
        path: '/console/rfm/:id/new',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/RFM/new-rfm').default)
            },
            'rfm-new'
          )
        }
      },
      {
        path: '/console/traffic-analytics',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/TrafficAnalytics').default)
            },
            'traffic-analytics'
          )
        }
      },
      {
        path: '/console/traffic-analytics/new',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/TrafficAnalytics').default)
            },
            'traffic-analytics-new'
          )
        }
      },
      {
        path: '/console/traffic-analytics/:modelId',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/TrafficAnalytics').default)
            },
            'traffic-analytic'
          )
        }
      },
      {
        path: '/console/traffic-analytics/:modelId/editing',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/TrafficAnalytics').default)
            },
            'traffic-analytic-edit'
          )
        }
      },
      {
        path: '/console/traffic-sdk-analytics',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/TrafficAnalytics/sdk-traffic').default)
            },
            'traffic-sdk-analytics'
          )
        }
      },
      {
        path: '/console/behavior-analytics',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/BehaviorAnalytics/index.jsx').default)
            },
            'behavior-analytics'
          )
        }
      },
      {
        path: '/console/behavior-analytics/:modelId',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/BehaviorAnalytics/index.jsx').default)
            },
            'behavior-analytic'
          )
        }
      },
      {
        path: '/console/livescreen',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              if (reducerRegistry) {
                reducerRegistry.register({ livescreen: require('../components/LiveScreen/reducers').default })
              }
              cb(null, require('../components/LiveScreen').default)
            },
            'livescreen'
          )
        }
      },
      {
        path: '/console/livescreen/:id',
        pass: true,
        getComponent(nextState, cb) {
          if (reducerRegistry) {
            reducerRegistry.register({ livescreen_workbench: require('../components/LiveScreen/reducers/workbench').default })
          }
          require.ensure(
            [],
            require => {
              cb(null, require('../components/LiveScreen/workbench').default)
            },
            'livescreen-workbench'
          )
        }
      },
      {
        path: '/console/business-db-setting',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/BusinessDb/index.jsx').default)
            },
            'business-db-setting'
          )
        }
      },
      {
        path: '/console/publish-manager',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Publish/list.jsx').default)
            },
            'publish-manager'
          )
        }
      },
      {
        path: '/console/data-api',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/DataAPI/index').default)
            },
            'data-api'
          )
        }
      },
      {
        path: '/console/tag-dict',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/TagManager/index.jsx').default)
            },
            'tag-dict'
          )
        }
      },
      {
        path: '/console/tag-users',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/TagManager/user-list.jsx').default)
            },
            'tag-users'
          )
        }
      },
      {
        path: '/console/inspect-user/:id',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/TagManager/single-user.jsx').default)
            },
            'inspect-user'
          )
        }
      },
      {
        path: '/console/tag-users/:id',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/TagManager/single-user.jsx').default)
            },
            'tag-user'
          )
        }
      },
      {
        path: '/console/tag-group',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/TagManager/index.jsx').default)
            },
            'tag-group'
          )
        }
      },
      {
        path: '/console/tag-value-enhance',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/TagVauleEnhance/index').default)
            },
            'tag-value-enhance'
          )
        }
      },
      {
        path: '/console/error-code',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/ErrorCode').default)
            },
            'error-code'
          )
        }
      },
      {
        path: '/console/tag-system-manager',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Datasource/tag-system-manager/index').default)
            },
            'tag-system-manager'
          )
        }
      },
      {
        path: '/console/microcosmic-portrait/:id',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/TagManager/microcosmic-portrait/index.jsx').default)
            },
            'microcosmic-portrait-details'
          )
        }
      },
      {
        path: '/console/microcosmic-portrait',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/TagManager/microcosmic-portrait/index.jsx').default)
            },
            'microcosmic-portrait'
          )
        }
      },
      {
        path: '/console/tag-macroscopic',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/TagMacroscopic/tag-macroscopic').default)
            },
            'tag-macroscopic'
          )
        }
      },
      {
        path: '/console/scenes',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/ScenesAnalytics').default)
            },
            'scenes'
          )
        }
      },
      {
        path: '/console/scenes/financial',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/ScenesAnalytics/financial').default)
            },
            'scenes-financial'
          )
        }
      },
      {
        path: '/console/scenes/loan',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/ScenesAnalytics/loan').default)
            },
            'scenes-loan'
          )
        }
      },
      {
        path: '/console/scenes/use',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/ScenesAnalytics/use').default)
            },
            'scenes-use'
          )
        }
      },
      {
        path: '/console/heat-map',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              if (reducerRegistry) {
                // 动态注入saga-model
                reducerRegistry.model(require('../components/HeatMap/model').default)
              }
              cb(null, require('../components/HeatMap/index.jsx').default)
            },
            'heat-map'
          )
        }
      },
      {
        path: '/console/heat-map/:id',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              if (reducerRegistry) {
                // 动态注入saga-model
                reducerRegistry.model(require('../components/HeatMap/info-model').default)
              }
              cb(null, require('../components/HeatMap/info.jsx').default)
            },
            'heat-map-info'
          )
        }
      },
      {
        path: '/console/web-heat-map',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              if (reducerRegistry) {
                // 动态注入saga-model
                reducerRegistry.model(require('../components/HeatMap/web/store/model').default)
              }
              cb(null, require('../components/HeatMap/web/index.jsx').default)
            },
            'web-heatmap'
          )
        }
      },
      {
        path: '/console/web-heat-map/:id',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              if (reducerRegistry) {
                // 动态注入saga-model
                reducerRegistry.model(require('../components/HeatMap/web/store/model').default)
              }
              cb(null, require('../components/HeatMap/web/index.jsx').default)
            },
            'web-heatmap-details'
          )
        }
      },
      {
        path: '/console/screen-control',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              if (reducerRegistry) {
                // 动态注入saga-model
                reducerRegistry.model(require('../components/LivescreenControl/store/model').default)
              }
              cb(null, require('../components/LivescreenControl/index.jsx').default)
            },
            'screen-control'
          )
        }
      },
      {
        path: '/console/custom-made-reportform',
        // pass: false,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/CustomMadeReportForm/index.jsx').default)
            },
            'custom-made-reportform'
          )
        }
      },
      {
        path: '/console/live-screen-case',
        // pass: false,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/LiveScreen/case/index').default)
            },
            'live-screen-case'
          )
        }
      },
      {
        path: '/console/examine-config',
        // pass: false,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Examine/ExamineConfig/index').default)
            },
            'examine-config'
          )
        }
      },
      {
        path: '/console/share-manager',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/LiveScreen/shareManager/index').default)
            },
            'share-manager'
          )
        }
      },
      {
        path: '/console/live-screen-case/:id',
        pass: true,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/LiveScreen/case/details').default)
            },
            'live-screen-case-dtl'
          )
        }
      },
      {
        path: '/console/offline-calc/data-sources',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/data-sources-list').default)
            },
            'offline-calc-data-source-manager'
          )
        }
      },
      {
        path: '/console/offline-calc/data-sources/:id',
        pass: false,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/data-source-edit').default)
            },
            'offline-calc-data-source-edit'
          )
        }
      },
      {
        path: '/console/offline-calc/tables',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/tables-list').default)
            },
            'offline-calc-tables-manager'
          )
        }
      },
      {
        path: '/console/offline-calc/tables/:id',
        pass: false,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/tables-edit').default)
            },
            'offline-calc-tables-edit'
          )
        }
      },
      {
        path: '/console/offline-calc/indices',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/indices-list').default)
            },
            'offline-calc-indices-manager'
          )
        }
      },
      {
        path: '/console/offline-calc/indices/:id',
        pass: false,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/indices-edit').default)
            },
            'offline-calc-indices-edit'
          )
        }
      },
      {
        path: '/console/offline-calc/indices-manager-byhand',
        // pass: false,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/manager-byhand').default)
            },
            'manager-byhand'
          )
        }
      },
      {
        path: '/console/offline-calc/models',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/models-list').default)
            },
            'offline-calc-models'
          )
        }
      },
      {
        path: '/console/offline-calc/models/:id',
        pass: false,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/models-edit2').default)
            },
            'offline-calc-models-edit'
          )
        }
      },
      {
        path: '/console/offline-calc/models/logs/:id',
        pass: false,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/models-logs').default)
            },
            'offline-calc-models-logs'
          )
        }
      },
      {
        path: '/console/offline-calc/models/execute/:taskId',
        pass: false,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/models-execute').default)
            },
            'offline-calc-models-execute'
          )
        }
      },
      {
        path: '/console/offline-calc/models-running-histories', // ?modelId=xxx
        // pass: false,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/running-histories-list').default)
            },
            'offline-calc-running-histories'
          )
        }
      },
      {
        path: '/console/offline-calc/review-manager',
        // pass: false,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/review-manager').default)
            },
            'review-manager'
          )
        }
      },
      {
        path: '/console/offline-calc/version-manager',
        // pass: false,
        getComponent(nextState, cb) {
          if (reducerRegistry) {
            // 动态注入saga-model
            reducerRegistry.model(require('../components/OfflineCalc/store/version-manager').default)
          }
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/version-manager').default)
            },
            'version-manager'
          )
        }
      },
      {
        path: '/console/offline-calc/import-tables',
        // pass: false,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/import-tables').default)
            },
            'import-tables'
          )
        }
      },
      {
        path: '/console/offline-calc/settings',
        // pass: false,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/settings').default)
            },
            'offline-calc-settings'
          )
        }
      },
      {
        path: '/console/offline-calc/business-line-management',
        // pass: false,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/business-line-management').default)
            },
            'business-line-management'
          )
        }
      },
      {
        path: '/console/offline-calc/release-version/:id',
        getComponent(nextState, cb) {
          if (reducerRegistry) {
            // 动态注入saga-model
            reducerRegistry.model(require('../components/OfflineCalc/store/release-version').default)
          }
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/release-version').default)
            },
            'offline-calc-release-version'
          )
        }
      },
      {
        path: '/console/offline-calc/relation-trace/:id',
        getComponent(nextState, cb) {
          if (reducerRegistry) {
            // 动态注入saga-model
            reducerRegistry.model(require('../components/OfflineCalc/store/relation-trace').default)
          }
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/relation-trace').default)
            },
            'offline-calc-relation-trace'
          )
        }
      },
      {
        path: '/console/new-task-schedule/publish-manager',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/task-manager-v3/publishManager/index').default)
            },
            'task-manager-v3-publish-manager'
          )
        }
      },
      {
        path: '/console/new-task-schedule/clone-manager',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/task-manager-v3/cloneManager/index').default)
            },
            'task-manager-v3-clone-manager'
          )
        }
      },
      {
        path: '/console/new-task-schedule-manager/circle-dispatch-manager',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/task-manager-v3/circleDispatchManager/index').default)
            },
            'circle-dispatch-manager'
          )
        }
      },
      {
        path: '/console/task-schedule-v3/overview',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/task-manager-v3/overview').default)
            },
            'task-v3-task-project'
          )
        }
      },
      {
        path: '/console/task-schedule-v3/task-project',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/task-manager-v3').default)
            },
            'task-v3-task-project'
          )
        }
      },
      {
        path: '/console/task-schedule-v3/execute-manager', //------------------
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/task-manager-v3/execute-manage').default)
            },
            'task-v3-execute-manager'
          )
        }
      },
      {
        path: '/console/task-schedule-v3/details-text',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/task-manager-v3/execute-manage/details-text').default)
            },
            'details-text'
          )
        }
      },
      {
        path: '/console/task-schedule-v3/task-edit/:id',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/task-manager-v3/task-edit/index').default)
            },
            'task-v3-task-edit'
          )
        }
      },
      {
        path: '/console/new-task-schedule/dbconnectmanager',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              if (reducerRegistry) {
                // 动态注入saga-model
                reducerRegistry.model(require('../components/TaskScheduleManager2/db-connect/db-connect-model').default)
              }
              cb(null, require('../components/TaskScheduleManager2/db-connect/db-connect-manager.component.jsx').default)
            },
            'db-connect-manager'
          )
        }
      },
      {
        // 数据字典管理，目前只有餐道会用到，直接展示 hive 数据库
        path: '/console/new-task-schedule-manager/data-dictionary-manager',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/TaskScheduleManager2/data-directory-manage/data-directory-manage').default)
            },
            'data-dictionary-manager'
          )
        }
      },
      {
        path: '/console/new-task-schedule-manager/executors-manager',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/TaskScheduleManager2/executors-manager/index.jsx').default)
            },
            'executors-manager'
          )
        }
      },
      {
        path: '/console/new-task-schedule-manager/data-directory-manager',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/TaskScheduleManager2/data-directory-manage/data-directory-manage').default)
            },
            'data-directory-manage'
          )
        }
      },
      {
        path: '/console/external-data-sources',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/data-sources-list').default)
            },
            'external-data-source-manager'
          )
        }
      },
      {
        path: '/console/external-data-sources/:id',
        pass: false,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/data-source-edit').default)
            },
            'external-data-source-edit'
          )
        }
      },
      {
        path: '/console/external-tables',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/tables-list').default)
            },
            'external-tables-manager'
          )
        }
      },
      {
        path: '/console/external-tables/:id',
        pass: false,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/OfflineCalc/tables-edit').default)
            },
            'external-tables-edit'
          )
        }
      },
      {
        path: '/console/examine-livescreen',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/LiveScreen/examine/index.jsx').default)
            },
            'examine-livescreen-manager'
          )
        }
      },
      {
        path: '/console/role-livescreen',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/LiveScreen/authorization-manager/index.jsx').default)
            },
            'role-livescreen-manager'
          )
        }
      },
      {
        path: '/console/marketing-model-settings/:model',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/MarketingModelSettings/index').default)
            },
            'marketing-model-settings'
          )
        }
      },
      {
        path: '/console/mannings-report',
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              if (reducerRegistry) {
                reducerRegistry.model(require('../components/Report/model/model').default)
              }
              cb(null, require('../components/Report/index.jsx').default)
            },
            'mannings-report'
          )
        }
      }
    ])
  )

const getRootRoute = reducerRegistry => {
  if (reducerRegistry) {
    // 动态注入saga-model
    reducerRegistry.model(require('../components/Home/model').default)
  }
  return {
    childRoutes: [
      window.outerWidth < RESPONSIVE_PAGE_MAX_WIDTH
        ? {
            path: '/console/dashboards/:dashboardId',
            pass: true,
            getComponent(nextState, cb) {
              require.ensure(
                [],
                require => {
                  cb(null, require('../components/Dashboards/mobile/dashboard-viewer').default)
                },
                'dashboard-mobile'
              )
            }
          }
        : null,
      {
        path: '/console',
        component: Home,
        getIndexRoute(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, {
                component: require('../components/Overview').default
              })
            },
            'console'
          )
        },
        childRoutes: [
          ...getChildrens(reducerRegistry),

          // 加载其他文件的子路由定义 add by WuQic 2019-03-20
          ..._.flatMap(Object.keys(childRouteFiles).map(k => routePermissionFilter(childRouteFiles[k](reducerRegistry)))),

          {
            // 500
            path: '/console/500',
            component: () => <Exception type='500' />
          },
          {
            // 403
            path: '/console/403',
            component: () => <Exception type='403' />
          },
          {
            // 404
            path: '/console/*',
            component: props => {
              let pathName = props.location.pathname
              const getMicroApps = menus => {
                let objs = (menus || []).map(m => {
                  if (m.microFrontend) {
                    return m
                  }
                  if (m.children) {
                    return getMicroApps(m.children)
                  }
                })
                return _.flatten(objs).filter(_.identity)
              }
              let m = recurFind(
                getMicroApps(window.sugo.menus),
                m => m.children,
                c => _.startsWith(pathName, c.path)
              )
              let microFrontend = m && m.microFrontend

              if (microFrontend) {
                return <MicroFrontendAdapter appName={microFrontend} className='height-100' />
              }

              return <Exception type='404' />
            }
          }
        ]
      },
      {
        // 404
        path: '*',
        // component: () => <Exception type="404" />,
        getComponent(nextState, cb) {
          require.ensure(
            [],
            require => {
              cb(null, require('../components/Portals/portal-pages-adapter').default)
            },
            'portal-pages-adapter'
          )
        }
      }
    ].filter(_.identity)
  }
}
export const configureRoutes = reducerRegistry => {
  return <Router history={browserHistory} routes={getRootRoute(reducerRegistry)} />
}
