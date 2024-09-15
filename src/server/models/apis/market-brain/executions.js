const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/market-brain/executions.controller',
  class: '智能营销',
  group: '自动化营销中心',
  menusCate: ['智能营销', '营销大脑', '触达任务管理']
}

const routes = [
  {
    path: '/list/:executeId',
    title: '查询活动的客户列表',
    method: 'get',
    func: 'getCustomerList'
  },
  {
    path: '/claim-execution/:id',
    title: '认领活动执行记录',
    method: 'post',
    func: 'claimExecution'
  },
  {
    path: '/claim-customer/:id',
    title: '认领活动执行记录',
    method: 'put',
    func: 'claimCustomer'
  },
  {
    path: '/detail-list',
    title: '全部认领了的用户列表',
    method: 'get',
    func: 'detailList'
  },
  {
    path: '/detail-list/:id',
    title: '认领了的用户列表',
    method: 'get',
    func: 'detailList'
  },
  {
    path: '/confirm-contact-user/:id',
    title: '确认联系客户',
    method: 'put',
    func: 'confirmContactUser'
  },
  {
    path: '/get-jssdk-ticket',
    title: '获取jssdk ticket',
    method: 'get',
    func: 'getJssdkTicket'
  },
  {
    path: '/get-corpid',
    title: '获取jssdk ticket',
    method: 'get',
    func: 'getCorpid'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/market-brain-execution'
}
