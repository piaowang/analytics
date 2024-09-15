const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/task-schedule2.controller',
  class: '任务调度',
  group: '任务调度'
}

const routes = [
  {
    method: 'get',
    path: '/manager',
    title: '查看项目所有的树节点信息',
    func: 'proxyMiddleware'
  },
  {
    method: 'post',
    path: '/manager',
    title: '更新树状目录/创建任务,带有外部项目关联/删除项目树分类(不是任务)/删除项目树任务(即叶子节点)',
    func: 'proxyMiddleware'
  },
  {
    method: 'post',
    path: '/type',
    title: ' 添加分类（目录）',
    func: 'proxyMiddleware'
  },
  {
    method: 'get',
    path: '/schedule',
    title: '查看调度任务列表',
    func: 'getSchedules'
  },
  {
    method: 'post',
    path: '/schedule',
    title: '查看调度任务列表',
    func: 'delSchedules'
  },
  {
    method: 'get',
    path: '/history',
    title: '保存调度任务列表排序',
    func: 'getHistory'
  },
  {
    method: 'post',
    path: '/executor',
    title: '调度任务(正在执行&已经结束)',
    func: 'executor' 
  },
  {
    method: 'get',
    path: '/executors',
    title: '查询执行器',
    func: 'executors' 
  },
  {
    method: 'post',
    path: '/executors',
    title: '查询执行器post',
    func: 'executors' 
  },
  {
    method: 'get',
    path: '/executor',
    title: '获取任务日志',
    func: 'executorLog' 
  },
  {
    method: 'get',
    path: '/dataBase',
    title: '数据库管理操作',
    func: 'proxyMiddleware' 
  },
  {
    method: 'post',
    path: '/catalogType',
    title: '数据库管理',
    func: 'proxyMiddleware' 
  },
  {
    method: 'get',
    path: '/catalogType',
    title: '数据库管理操作',
    func: 'proxyMiddleware' 
  },
  {
    method: 'post',
    path: '/dataBase',
    title: '数据库管理',
    func: 'proxyMiddleware' 
  },
  {
    method: 'get',
    path: '/getServerStatistics',
    title: '获取执行器资源信息',
    func: 'getServerStatistics' 
  }
  // {
  //   method: 'get',
  //   path: '/getAuthorize',
  //   title: '获取授权项目列表',
  //   func: 'getAuthorize'
  // },   {
  //   method: 'post',
  //   path: '/updateAuthorize',
  //   title: '更新授权项目列表',
  //   func: 'updateAuthorize'
  // }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/new-task-schedule'
}
