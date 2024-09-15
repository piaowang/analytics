import _ from 'lodash'
let { id: userId } = window.sugo.user

export const { qqCustomerServiceUrl, customerServicePhoneNumber, showHelpLink } = window.sugo

//使用顶部项目菜单的路径, 逐步加入
//完全匹配使用 '/console'
//startWith 匹配使用  'startWith#/console'
const pathShouldShowProjectMenu = [
  '/console',
  '/console/overview',
  '/console/slices',
  'startwith#/console/dashboards',
  '/console/subscribe',
  'startwith#/console/usergroup',
  '/console/path-analysis',
  'startwith#/console/traffic-analytics',
  '/console/insight',
  'startwith#/console/retention',
  'startwith#/console/segment-expand',
  'startwith#/console/behavior-analytics',
  'startwith#/console/analytic',
  'startwith#/console/funnel',
  '/console/dimension',
  '/console/measure',
  'startwith#/console/user-action-analytics',
  '/console/access-tools',
  'startwith#/console/source-data-analytic',
  '/console/data-monitors',
  '/console/data-monitors/new',
  '/console/project/datasource-settings',
  '/console/business-db-setting',
  '/console/project/datasource-settings',
  'startwith#/console/monitor-alarms',
  'startwith#/console/tag-dict',
  'startwith#/console/tag-group',
  'startwith#/console/tag-users',
  'startwith#/console/inspect-user',
  'startwith#/console/tag-value-enhance',
  'startwith#/console/error-code',
  '/console/tag-data-manage',
  '/console/tag-system-manager',
  'startwith#/console/task-schedule-manager',
  'startwith#/console/task-schedule-list/scheduling',
  'startwith#/console/task-schedule-list/stream',
  'startwith#/console/task-schedule-list/history',
  'startwith#/console/microcosmic-portrait',
  '/console/tag-macroscopic',
  'startwith#/console/scenes',
  'startwith#/console/heat-map',
  'startwith#/console/web-heat-map',
  'startwith#/console/life-cycle',
  // '/console/new-task-schedule/dbconnectmanager',
  // '/console/new-task-schedule-manager/data-collect',
  // '/console/new-task-schedule-manager/schedule-manager',
  // '/console/new-task-schedule-manager/execute-manager',
  // '/console/new-task-schedule-manager/executor-manager',
  // '/console/new-task-schedule-manager/executors-manager',
  // '/console/new-task-schedule-manager/data-directory-manager',
  '/console/offline-calc/business-line-management'
  // '/console/task-schedule-v3/task-project',
  // '/console/new-task-schedule/clone-manager'
]

//可以使用子项目的路径白名单
const pathCanUseChildProject = [
  '/console',
  '/console/overview',
  '/console/slices',
  '/console/dimension',
  '/console/measure',
  'startwith#/console/dashboards',
  '/console/subscribe',
  'startwith#/console/analytic',
  '/console/project/datasource-settings',
  'startwith#/console/source-data-analytic',
  'startwith#/console/tag-',
  'startwith#/console/microcosmic-portrait'
]

//隐藏左侧菜单的url
let menuSouldHideSideNav = [
  'startwith#/console/dashboards',
  'startwith#/console/livescreen/',
  'startwith#/console/analytic',
  'startwith#/console/source-data-analytic',
  '/console/security/user',
  '/console/security/role',
  '/console/operate-log',
  'startwith#/console/web-heat-map',
  'startwith#/console/live-screen-case/',
  '/console/institutions-manager',
  '/console/data-checking',
  '/console/data-checking/detail',
  '/console/index'
]

//作为门户系统时 这三个路由需要侧边栏
if (_.get(window.sugo, 'microFrontendUrlMap.sugo-portal-app')) {
  menuSouldHideSideNav = menuSouldHideSideNav.filter(i => !['/console/institutions-manager', '/console/security/user', '/console/security/role'].includes(i))
}

const getProjListLSId = `sugo_proj_order@${userId}`
const getCurrentProjLSId = `sugo_current_proj_id@${userId}`
const checkPathShouldHideProjectMenu = pathname => {
  return !_.find(pathShouldShowProjectMenu, p => {
    return p.includes('#') ? pathname.includes(p.split('#')[1]) : pathname === p
  })
}
const shouldShowChildProject = pathname => {
  return _.find(pathCanUseChildProject, p => {
    return p.includes('#') ? pathname.includes(p.split('#')[1]) : pathname === p
  })
}
const { docUrl } = window.sugo
const checkMenuSouldHideSideNav = pathname => {
  return _.find(menuSouldHideSideNav, p => {
    return p.includes('#') ? pathname.includes(p.split('#')[1]) : pathname === p
  })
}
export { getProjListLSId, menuSouldHideSideNav, shouldShowChildProject, docUrl, checkMenuSouldHideSideNav, getCurrentProjLSId, checkPathShouldHideProjectMenu }
