/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-18 14:45:56
 * @description [description]
 */

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/marketing/task.controller',
  class: '智能营销',
  group: '自动化营销中心',
  menusCate: ['产品实验室', '智能营销', '发送任务管理']
}

const routes = [
  {
    path: '/list',
    title: '查询任务列表',
    method: 'get',
    func: 'getList'
  },
  {
    path: '/get-one-details/:id',
    title: '下载明细表',
    method: 'get',
    func: 'getOneDetails'
  },
  {
    path: '/get-executions/:task_id',
    title: '获取任务执行记录',
    method: 'get',
    func: 'getExecutions'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/marketing-task'
}
