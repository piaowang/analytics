
const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-share-manager.controller',
  class: '图表',
  group: '分享管理'
}

const routes = [
  // {
  //   method: 'get',
  //   path: '/app/share-manager/getShareList',
  //   title: '获取大屏的分享列表数据',
  //   func: 'getShareList'
  // }, {
  //   method: 'get',
  //   path: '/app/share-manager/getShareById',
  //   title: '获取Id获取分享配置信息',
  //   func: 'getShareById'
  // }, {
  //   method: 'get',
  //   path: '/app/share-manager/saveShareInfo',
  //   title: '保存分享配置信息',
  //   func: 'saveShareInfo'
  // }, {
  //   method: 'get',
  //   path: '/app/share-manager/cancelShare',
  //   title: '取消分享',
  //   func: 'cancelShare'
  // },
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: ''
}
