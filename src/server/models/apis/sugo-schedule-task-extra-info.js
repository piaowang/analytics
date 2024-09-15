const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-schedule-task-extra-infos.controller',
  class: '任务调度',
  group: '任务调度'
}

const routes = [
  {
    method: 'get',
    path: '/:id?',
    title: '查询调度任务额外信息',
    func: 'getScheduleTaskExtraInfos'
  }, {
    method: 'post',
    path: '/',
    title: '创建调度任务额外信息',
    func: 'createScheduleTaskExtraInfos'
  }, {
    method: 'put',
    path: '/:id',
    title: '更新调度任务额外信息',
    func: 'updateScheduleTaskExtraInfos'
  }, {
    method: 'delete',
    path: '/:id?',
    title: '删除更新调度任务额外信息',
    func: 'deleteScheduleTaskExtraInfos'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/sugo-schedule-task-extra-infos'
}
