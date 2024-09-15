const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/market-brain/nissan.controller',
  class: '智能营销',
  group: '自动化营销中心'
}

const routes = [
  {
    path: '/userlist/:executeId',
    title: '查询用户列表',
    method: 'get',
    func: 'getUserList'
  },
  {
    path: '/customerlist/:userid',
    title: '查询外部联系人表',
    method: 'get',
    func: 'getCustomerList'
  },
  {
    path: '/get-staff-by-id/:userid',
    title: '查询外部联系人表',
    method: 'get',
    func: 'getStaffById'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/nissan-market-execution'
}
