const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/log-upload.controller',
  group: '日志上传'
}

const routes = [
  {
    method: 'get',
    path: '/log-collector/:appId',
    title: '下载采集器',
    func: 'downloadLogCollector'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/log-upload'
}
