const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-sharing.controller',
  class: '数据管理',
  group: '发布分享',
  menusCate: ['智能运营', '数据可视化', '数据大屏', '分享管理']
}

const routes = [
  {
    method: 'get',
    path: '/app/sharing',
    title: '查询发布分享信息',
    func: 'query'
  },
  {
    method: 'get',
    path: '/app/sharing-by-user',
    title: '获取当前用户分享的大屏',
    func: 'getShareLivescreen'
  },
  {
    method: 'post',
    path: '/app/sharing',
    title: '发布分享',
    func: 'create',
    requirePermission: true
  },
  {
    method: 'put',
    path: '/app/sharing/:id',
    title: '修改发布分享配置',
    func: 'update'
  },
  {
    method: 'delete',
    path: '/app/sharing/:id',
    title: '取消发布分享',
    func: 'remove',
    requirePermission: true
  },
  {
    method: 'get',
    path: '/share/:id',
    title: '访问分享内容',
    func: 'accessContent',
    requireLogin: false,
    requirePermission: false
  },
  {
    method: 'get',
    path: '/app/share-manager/getShareList',
    title: '获取分享列表',
    func: 'getShareList'
  },
  {
    method: 'get',
    path: '/app/share-manager/getShareById',
    title: '通过id获取分享记录',
    func: 'getShareById'
  },
  {
    method: 'post',
    path: '/app/share-manager/saveShareInfo',
    title: '保存分享',
    func: 'saveShareInfo'
  },
  {
    method: 'get',
    path: '/app/share-manager/cancelShare',
    title: '取消分享',
    func: 'cancelShare'
  },
  {
    method: 'get',
    path: '/app/share-manager/deleteShare',
    title: '删除分享',
    func: 'deleteShare'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: ''
}
