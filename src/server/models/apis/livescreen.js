const ctrl = 'controllers/sugo-livescreen.controller'
const roleCtrl = 'controllers/sugo-livescreen-role.controller'

const base = {
  requireLogin: true,
  requirePermission: true,
  lib: ctrl,
  group: '实时大屏',
  class: '图表',
  menusCate: ['智能运营', '数据可视化', '数据大屏', '实时大屏']
}

const routes = [
  {
    path: '/get',
    title: '查询所有大屏实例',
    method: 'get',
    func: 'get',
    requirePermission: false
  },
  {
    path: '/create',
    title: '创建大屏实例',
    method: 'post',
    func: 'create'
  },
  {
    path: '/update',
    title: '更新大屏',
    method: 'post',
    func: 'update'
  },
  {
    path: '/recycle/:livescreenId',
    title: '大屏实例移入回收站',
    method: 'delete',
    func: 'recycleLiveScreen'
  },
  {
    path: '/reduction/:livescreenId',
    title: '大屏实例从回收站还原',
    method: 'put',
    func: 'reductionLiveScreen'
  },
  {
    path: '/delete/:livescreenId',
    title: '删除大屏实例',
    method: 'delete',
    func: 'deleteLiveScreen'
  },
  {
    path: '/copy/:livescreenId',
    title: '复制大屏实例',
    method: 'post',
    func: 'copy'
  },
  {
    path: '/save/livescreenTemplate',
    title: '大屏模板管理',
    method: 'post',
    func: 'saveTemplate'
  },
  {
    path: '/get/role',
    title: '保存大屏权限列表',
    method: 'post',
    func: 'saveTemplate'
  },
  {
    path: '/role/list',
    title: '获取大屏权限列表',
    method: 'get',
    func: 'getRoleList',
    lib: roleCtrl
  },
  {
    path: '/role/authorize',
    title: '保存授权',
    method: 'post',
    func: 'saveAuthorize',
    lib: roleCtrl
  },
  {
    path: '/role/cancelAuthorize',
    title: '取消授权',
    method: 'put',
    func: 'cancelAauthorize',
    lib: roleCtrl
  },
  {
    path: '/getGroupInfo/:id',
    title: '获取大屏分组信息',
    method: 'get',
    func: 'getGroupInfo'
  },
  {
    path: '/moveGroup',
    title: '移动分组',
    method: 'post',
    func: 'moveGroup'
  },
  {
    path: '/cleanRecycle',
    title: '清空回收站',
    method: 'post',
    func: 'cleanRecycle'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/livescreen'
}
