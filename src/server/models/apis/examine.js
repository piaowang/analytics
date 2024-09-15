const ctrl = 'controllers/sugo-examine.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  group: '实时大屏',
  class: '审核管理'
}

const routes = [
  {
    path: '/create',
    title: '提交审核信息',
    method: 'post',
    func: 'create'
  }, {
    path: '/cancel',
    title: '取消审核',
    method: 'post',
    func: 'cancel'
  }, {
    path: '/get',
    title: '获取审核信息',
    method: 'post',
    func: 'getExamineInfo'
  }, {
    path: '/getSendList',
    title: '获取我申请列表',
    method: 'get',
    func: 'getSendList' 
  },{
    path: '/getExamineList',
    title: '获取我审核的大屏',
    method: 'get',
    func: 'getExamineList'
  }, {
    path: '/examine',
    title: '审核',
    method: 'post',
    func: 'examine'
  }, {
    path: '/delete',
    title: '删除审核',
    method: 'post',
    func: 'delete'
  }
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : 'app/examine'
}
