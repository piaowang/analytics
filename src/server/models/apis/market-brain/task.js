/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-18 14:45:56
 * @description [description]
 */

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/market-brain/task.controller',
  class: '智能营销',
  group: '自动化营销中心',
  menusCate: ['智能营销', '营销大脑', '触达任务管理']
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
  },
  {
    path: '/get-maxdate-executions',
    title: '获取最新的去重任务执行记录',
    method: 'get',
    func: 'getExecutionsByMaxDate'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/market-brain-task'
}
