const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-task-v3.contorller',
  menusCate: ['数据开发中心', '数据开发中心', '数据开发']
}

const groupLib = 'controllers/sugo-task-group-v3.controller'
const publishLib = 'controllers/sugo-task-indices-publish.contorller'

const routes = [
  {
    method: 'get',
    path: '/task-schedule-v3/manager',
    title: '查看项目所有的树节点信息',
    func: 'proxyMiddleware'
  },
  {
    method: 'post',
    path: '/task-schedule-v3/manager',
    title: '更新树状目录/创建任务,带有外部项目关联/删除项目树分类(不是任务)/删除项目树任务(即叶子节点)',
    func: 'proxyMiddleware'
  },
  {
    method: 'get',
    path: '/task-schedule-v3/realtime',
    title: '查看项目所有的树节点信息',
    func: 'proxyMiddleware'
  },
  {
    method: 'post',
    path: '/task-schedule-v3/realtime',
    title: '更新树状目录/创建任务,带有外部项目关联/删除项目树分类(不是任务)/删除项目树任务(即叶子节点)',
    func: 'proxyMiddleware'
  },
  {
    method: 'get',
    path: '/task-schedule-v3/meta',
    title: '转发meta',
    func: 'proxyMiddleware'
  },
  {
    method: 'post',
    path: '/task-schedule-v3/meta',
    title: '转发meta',
    func: 'proxyMiddleware'
  },
  {
    method: 'post',
    path: '/task-schedule-v3/type',
    title: ' 添加分类（目录）',
    func: 'proxyMiddleware'
  },
  {
    method: 'get',
    path: '/task-schedule-v3/schedule',
    title: '查看调度任务列表',
    func: 'getSchedules'
  },
  {
    method: 'post',
    path: '/task-schedule-v3/schedule',
    title: '查看调度任务列表',
    func: 'delSchedules'
  },
  {
    method: 'get',
    path: '/task-schedule-v3/history',
    title: '保存调度任务列表排序',
    func: 'getHistory'
  },
  {
    method: 'post',
    path: '/task-schedule-v3/executor',
    title: '调度任务(正在执行&已经结束)',
    func: 'executor'
  },
  {
    method: 'post',
    path: '/task-v3/handleExecutor',
    title: '手动执行',
    func: 'handleExecutor'
  },
  {
    method: 'get',
    path: '/task-schedule-v3/executors',
    title: '查询执行器',
    func: 'executors'
  },
  {
    method: 'post',
    path: '/task-schedule-v3/executors',
    title: '查询执行器post',
    func: 'executors'
  },
  {
    method: 'get',
    path: '/task-schedule-v3/executor',
    title: '获取任务日志',
    func: 'executorLog'
  },
  {
    method: 'get',
    path: '/task-schedule-v3/realtime',
    title: 'realtime的get请求',
    func: 'proxyMiddleware'
  },
  {
    method: 'post',
    path: '/task-schedule-v3/realtime',
    title: 'realtime的post请求',
    func: 'proxyMiddleware'
  },
  {
    method: 'get',
    path: '/task-schedule-v3/dataBase',
    title: '数据库管理操作',
    func: 'proxyMiddleware'
  },
  {
    method: 'post',
    path: '/task-schedule-v3/catalogType',
    title: '数据库管理',
    func: 'proxyMiddleware'
  },
  {
    method: 'get',
    path: '/task-schedule-v3/catalogType',
    title: '数据库管理操作',
    func: 'proxyMiddleware'
  },
  {
    method: 'get',
    path: '/task-schedule-v3/dataSource',
    title: '数据库管理',
    func: 'proxyMiddleware'
  },
  {
    method: 'get',
    path: '/task-schedule-v3/flink',
    title: '获取脚本模板',
    func: 'proxyMiddleware'
  },
  {
    method: 'post',
    path: '/task-schedule-v3/dataBase',
    title: '数据库管理',
    func: 'proxyMiddleware'
  },
  {
    path: '/task-schedule-v3/get-all-task',
    title: '获取项目列表',
    method: 'get',
    func: 'getAllTaskId'
  },
  {
    path: '/task-schedule-v3/get-all-group-task',
    title: '获取项目列表',
    lib: groupLib,
    method: 'get',
    func: 'getAllGroupTaskId'
  },
  {
    path: '/task-schedule-v3/get-project',
    title: '获取项目列表',
    method: 'get',
    func: 'getProject'
  },
  {
    method: 'get',
    path: '/task-v3/getAuthorize',
    title: '获取授权项目列表',
    func: 'getAuthorize'
  },
  {
    method: 'post',
    path: '/task-v3/updateAuthorize',
    title: '更新授权项目列表',
    func: 'updateAuthorize'
  },
  {
    method: 'post',
    path: '/task-schedule-v3/dataBase',
    title: '数据库管理操作',
    func: 'proxyMiddleware'
  },
  {
    method: 'get',
    path: '/task-schedule-v3/dataBase',
    title: '数据库管理操作',
    func: 'proxyMiddleware'
  },
  {
    method: 'get',
    path: '/task-v3/getCheckDB',
    title: '获取连接的数据库',
    func: 'getCheckDB'
  },
  {
    method: 'post',
    path: '/task-v3/updateCheckDB',
    title: '更新连接的数据库',
    func: 'updateCheckDB'
  },
  {
    method: 'post',
    path: '/task-v3/createAndUseDB',
    title: '创建并连接数据库',
    func: 'createAndUseDB',
    requirePermission: true
  },
  {
    method: 'post',
    path: '/task-v3/delCheckDB',
    title: '删除连接的数据库',
    func: 'delCheckDB',
    requirePermission: true
  },
  {
    path: '/task-v3/create-project',
    title: '创建项目',
    method: 'post',
    func: 'createProject'
  },
  {
    path: '/task-v3/editor-project',
    title: '修改项目',
    method: 'post',
    func: 'editorProject'
  },
  {
    path: '/task-v3/delete-project',
    title: '删除项目',
    method: 'post',
    func: 'deleteProject'
  },
  {
    path: '/task-v3/get-task-mapping',
    title: '获取映射关系',
    method: 'get',
    func: 'getTaskMapping'
  },
  {
    path: '/task-v3/task-mapping-user',
    title: '添加映射关系',
    method: 'post',
    func: 'projectAddUser'
  },
  {
    path: '/task-v3/edit-task-project-user',
    title: '修改项目用户属性',
    method: 'post',
    func: 'editProjectUser'
  },
  {
    path: '/task-v3/task-delete-mapping',
    title: '删除映射关系',
    method: 'post',
    func: 'projectDeleteUser'
  },
  {
    path: '/task-v3/get-project-task',
    title: '获取项目下的工作流信息',
    method: 'get',
    func: 'getTaskByProjectId'
  },
  {
    path: '/task-v3/get-all-tasks-projectId',
    title: '获取项目下的所有工作流以及工作流组',
    method: 'get',
    func: 'getAllTasksByProjectId'
  },

  {
    path: '/task-v3/save-project-task',
    title: '添加工作流',
    method: 'post',
    func: 'saveTask'
  },
  {
    path: '/task-v3/del-project-task',
    title: '删除工作流',
    method: 'post',
    func: 'deleteTask'
  },
  {
    path: '/task-v3/audit-project-task',
    title: '工作流提审',
    method: 'post',
    func: 'submitAudit'
  },
  {
    path: '/task-v3/cancel-project-task',
    title: '取消工作流提审',
    method: 'post',
    func: 'cancelAudit'
  },
  {
    path: '/task-schedule-v3/manager',
    title: '任务流管理',
    method: 'get',
    func: 'proxyMiddleware'
  },
  {
    path: '/task-v3/getPermitDB',
    title: '根据项目id获取授权的数据库列表',
    method: 'get',
    func: 'getPermitDB'
  },
  {
    path: '/task-v3/save-task-params',
    title: '保存任务参数',
    method: 'post',
    func: 'saveTaskParams'
  },
  {
    path: '/task-schedule-v3/copyProject',
    title: '复制任务',
    method: 'post',
    func: 'copyProject'
  },
  {
    path: '/task-v3/get-task-publish-list',
    title: '获取发布管理数据列表',
    method: 'post',
    func: 'getTaskPublishList'
  },
  {
    path: '/task-v3/examine-task',
    title: '获取发布管理数据列表',
    method: 'put',
    func: 'examineTask'
  },
  {
    path: '/task-v3/fetchTaskProjectById',
    title: '根据id取一条taskproject记录',
    method: 'get',
    func: 'fetchTaskProjectById'
  },
  {
    path: '/task-v3/fetchTaskById',
    title: '根据id取一条task记录',
    method: 'get',
    func: 'fetchTaskById'
  },
  {
    path: '/task-v3/copy-task',
    title: '复制任务',
    method: 'post',
    func: 'copyTask'
  },
  {
    path: '/task-v3/set-schedule',
    title: '设置定时调度',
    method: 'post',
    func: 'setSchedule'
  },
  {
    path: '/task-v3/handleCategory',
    title: '编辑工作流分类',
    method: 'get',
    func: 'handleCategory'
  },
  {
    path: '/task-v3/getCategory',
    title: '获取工作流分类',
    method: 'get',
    func: 'getCategory'
  },
  {
    path: '/task-v3/orderCategory',
    title: '工作流分类排序',
    method: 'post',
    func: 'orderCategory'
  },
  {
    path: '/task-v3/deleteCategory',
    title: '删除工作流分类',
    method: 'get',
    func: 'deleteCategory'
  },
  {
    path: '/task-v3/get-schedule-task',
    title: '获取所有工作流',
    method: 'get',
    func: 'getScheduleTask'
  },
  {
    path: '/task-v3/bulk-cancel-project-task',
    title: '批量取消工作流',
    method: 'post',
    func: 'bulkCancelProjectTask'
  },
  {
    path: '/task-v3/bulk-pause-project-task',
    title: '批量暂停工作流',
    method: 'post',
    func: 'bulkPauseProjectTask'
  },
  {
    path: '/task-v3/bulk-set-schedule',
    title: '批量设置工作流',
    method: 'post',
    func: 'bulkSetSchedule'
  },
  {
    path: '/task-v3/get-schedule-task-group',
    title: '获取所有工作流',
    method: 'get',
    lib: groupLib,
    func: 'getScheduleTaskGroup'
  },
  {
    path: '/task-v3/bulk-cancel-project-taskgroup',
    title: '批量取消工作流组调度',
    method: 'post',
    lib: groupLib,
    func: 'bulkCancelProjectTaskGroup'
  },
  {
    path: '/task-v3/bulk-pause-project-taskgroup',
    title: '批量暂停工作流组调度',
    method: 'post',
    lib: groupLib,
    func: 'bulkPauseProjectTaskGroup'
  },
  {
    path: '/task-v3/bulk-set-group-schedule',
    title: '批量设置工作流组调度',
    method: 'post',
    lib: groupLib,
    func: 'bulkSetGroupSchedule'
  },
  {
    path: '/task-v3/save-task-group',
    title: '保存任务组',
    method: 'post',
    lib: groupLib,
    func: 'saveTaskGroup'
  },
  {
    path: '/task-v3/save-task-group-simple',
    title: '新增工作流组',
    method: 'post',
    lib: groupLib,
    func: 'addTaskGroup'
  },
  {
    path: '/task-v3/del-project-task-group',
    title: '删除工作流组',
    method: 'post',
    lib: groupLib,
    func: 'deleteTaskGroup'
  },
  {
    path: '/task-v3/set-task-group-schedule',
    title: '启动工作流组调度',
    method: 'post',
    lib: groupLib,
    func: 'setTaskGroupSchedule'
  },
  {
    path: '/task-v3/cancel-group-audit',
    title: '取消工作流组调度',
    method: 'post',
    lib: groupLib,
    func: 'cancelAudit'
  },
  {
    path: '/task-v3/get-project-task-group',
    title: '获取项目下的工作流信息',
    method: 'get',
    lib: groupLib,
    func: 'getTaskGroupByProjectId'
  },
  {
    path: '/task-v3/getGroupCategory',
    title: '获取项目下的工作流组分类信息',
    method: 'get',
    lib: groupLib,
    func: 'getGroupCategory'
  },
  {
    path: '/task-v3/handleGroupCategory',
    title: '获取项目下的工作流组分类信息',
    method: 'get',
    lib: groupLib,
    func: 'handleGroupCategory'
  },
  {
    path: '/task-v3/orderGroupCategory',
    title: '保存工作流组分类排序信息',
    method: 'post',
    lib: groupLib,
    func: 'orderGroupCategory'
  },
  {
    path: '/task-v3/fetch-task-group-by-id',
    title: '根据id取一条任务组记录',
    method: 'get',
    lib: groupLib,
    func: 'fetchTaskGroupById'
  },
  {
    path: '/task-v3/deleteGroupCategory',
    title: '删除工作流组分类',
    method: 'get',
    lib: groupLib,
    func: 'deleteGroupCategory'
  },
  {
    path: '/task-v3/get-task-props',
    title: '获取全局属性配置',
    method: 'get',
    func: 'getTaskGlobalProps'
  },
  {
    path: '/task-v3/save-task-props',
    title: '保存全局属性配置',
    method: 'post',
    func: 'saveTaskGlobalProps'
  },
  {
    path: '/task-v3/get-yarn-log-path',
    title: '获取yarn日志的路径',
    method: 'post',
    func: 'getTaskYarnLogsPath'
  },
  {
    path: '/task-v3/get-yarn-log-info',
    title: '获取yarn日志详细内容',
    method: 'post',
    func: 'getTaskYarnLogsPathInfo'
  },
  {
    path: '/task-v3/create-clone-package',
    title: '创建克隆包',
    method: 'post',
    func: 'createClonePackage'
  },
  {
    path: '/task-v3/get-clone-packages',
    title: '获取克隆包列表',
    method: 'get',
    func: 'getClonePackages'
  },
  {
    path: '/task-v3/delete-clone-packages',
    title: '删除克隆包',
    method: 'get',
    func: 'deleteClonePackage'
  },
  {
    path: '/task-v3/get-all-tasks',
    title: '不区分项目，获取所有任务流',
    method: 'get',
    func: 'getAllTasks'
  },
  {
    path: '/task-v3/import-clone-package',
    title: '导入克隆包',
    method: 'post',
    func: 'importClonePackage'
  },
  {
    path: '/task-v3/upload-clone-package',
    title: '上传克隆包',
    method: 'post',
    func: 'uploadClonePackage'
  },
  {
    path: '/task-v3/download-clone-package',
    title: '下载克隆包',
    method: 'get',
    func: 'downloadClone'
  },
  {
    method: 'post',
    path: '/task-schedule-v3/preview',
    title: '获取Option',
    func: 'proxyMiddleware'
  },
  {
    path: '/task-v3/save-real-time-collect',
    title: '保存实时采集',
    method: 'post',
    func: 'saveRealTimeCollectTask'
  },
  {
    method: 'post',
    path: '/task-v3/indices/publish',
    title: '发布创建任务组',
    lib: publishLib,
    func: 'publish'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app'
}
