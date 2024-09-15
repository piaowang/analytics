const base = {
  requireLogin: true,
  requirePermission: true,
  lib: 'controllers/live-screen-projection.controller',
  class: '图表',
  group: '大屏投影',
  menusCate: ['智能运营', '数据可视化', '数据大屏', '大屏投影']
}

const routes = [
  {
    path: '/get',
    title: '查询大屏投影设置',
    method: 'get',
    func: 'getControl'
  },
  {
    path: '/save',
    title: '修改大屏投影设置',
    method: 'post',
    func: 'saveControl'
  },
  {
    path: '/theme/view/:id',
    title: '预览大屏投影',
    method: 'get',
    func: 'viewTheme'
  },
  // {
  //   path: '/list-logger',
  //   title: '查询大屏投影操作日志',
  //   method: 'get',
  //   func: 'listLogger'
  // },
  // {
  //   path: '/create-logger',
  //   title: '创建大屏投影操作日志',
  //   method: 'post',
  //   func: 'createLogger',
  //   requirePermission: false
  // },
  {
    path: '/theme/create',
    title: '创建大屏投影主题',
    method: 'post',
    func: 'saveTheme'
  },
  {
    path: '/theme/update',
    title: '修改大屏投影主题',
    method: 'post',
    func: 'saveTheme'
  },
  {
    path: '/list-theme',
    title: '查询正在的投影主题',
    method: 'get',
    func: 'getThemes'
  },
  {
    path: '/theme/list',
    title: '查询所有投影主题',
    method: 'get',
    func: 'getThemes'
  },
  {
    path: '/theme/:id',
    title: '查询单条投影主题信息',
    method: 'get',
    func: 'findOneTheme'
  },
  {
    path: '/theme/:id',
    title: '删除大屏投影主题',
    method: 'delete',
    func: 'deleteTheme'
  }
  // {
  //   path: '/save-themelist-order',
  //   title: '修改主题列表顺序',
  //   method: 'post',
  //   func: 'updateScreenLiveControl'
  // }
  // {
  //   path: '/change-contain-timerange',
  //   title: '修改主题轮播时间',
  //   method: 'post',
  //   func: 'updateScreenLiveControl'
  // },
  // {
  //   path: '/update-play-config',
  //   title: '更新實時投影配置',
  //   method: 'post',
  //   func: 'updatePlayConfig'
  // }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/live-screen-projection'
}
