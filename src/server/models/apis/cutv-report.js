const base = {
  requireLogin: true,
  requirePermission: true,
  lib: 'controllers/cutv-report.controller',
  class: '图表',
  group: '定制报表',
  menusCate: ['产品实验室', '图表', '定制报表']

}

const routes = [
  {
    path: '/list',
    title: '获取设备列表',
    method: 'get',
    requirePermission: false,
    func: 'list'
  }
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : 'app/cutv-report'
}
