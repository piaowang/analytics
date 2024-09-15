import proxy from 'http-proxy-middleware'
import c2k from 'koa2-connect'
import { getTaskScheduleHostAsync } from './sugo-task-v3.contorller'

let proxyMiddleware = async (ctx) => {
  const target = await getTaskScheduleHostAsync()
  return c2k(proxy({
    target: `${target}`,
    changeOrigin: true,
    pathRewrite: {
      '^/app/task-schedule' : '/api' // rewrite path
    }
  }))(ctx)
}

export default {
  proxyMiddleware: proxyMiddleware,
  executor: proxyMiddleware,
  executors: proxyMiddleware,
  execLog: proxyMiddleware,
  executorLog: proxyMiddleware,
  getSchedules: proxyMiddleware,
  delSchedules: proxyMiddleware,
  getHistory: proxyMiddleware
}
