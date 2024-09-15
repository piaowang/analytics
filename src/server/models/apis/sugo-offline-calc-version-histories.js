
const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-offline-calc-version-histories.controller',
  class: '指标管理',
  group: '版本管理'
}

const routes = [
  {
    method: 'get',
    path: '/app/offline-calc/version-histories',
    title: '查询版本与历史版本',
    func: 'query'
  },
  {
    method: 'post',
    path: '/app/offline-calc/version-histories',
    title: '创建版本',
    func: 'create'
  },
  {
    method: 'post',
    path: '/app/offline-calc/preview',
    title: '确认通过审核前预览信息',
    func: 'preview'
  },
  {
    method: 'post',
    path: '/app/offline-calc/confirm-review',
    title: '处理审核结果',
    func: 'confirmReview'
  },
  {
    method: 'post',
    path: '/app/offline-calc/cancel-review',
    title: '取消审核',
    func: 'cancelReview'
  },
  {
    method: 'get',
    path: '/app/offline-calc/get-history-byid',
    title: '查询历史版本',
    func: 'getHistoryById'
  },
  {
    method: 'post',
    path: '/app/offline-calc/review-del/:id',
    title: '提交删除审核',
    func: 'reviewDel'
  },
  {
    method: 'post',
    path: '/app/offline-calc/handle-review-del',
    title: '审核删除',
    func: 'handleDelReview'
  },
  {
    method: 'get',
    path: '/app/offline-calc/get-version-tree',
    title: '获取版本树',
    func: 'getVersionTree'
  },
  {
    method: 'get',
    path: '/app/offline-calc/get-version-list',
    title: '获取版本列表',
    func: 'getVersionList'
  },
  {
    method: 'get',
    path: '/app/offline-calc/get-relationship',
    title: '获取血缘关系',
    func: 'getRelationShip'
  },
  {
    method: 'get',
    path: '/app/offline-calc/get-influenceship',
    title: '获取初始影响关系',
    func: 'getInfluenceShip'
  },
  {
    method: 'get',
    path: '/app/offline-calc/get-influencesList',
    title: '获取影响关系',
    func: 'getInfluenceList'
  },
  {
    method: 'get',
    path: '/app/offline-calc/can-review',
    title: '检测是否能体测',
    func: 'checkCanReview'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: ''
}
