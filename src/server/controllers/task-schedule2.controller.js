/*
 * @Author: xuxinjiang
 * @Date: 2020-07-10 12:19:45
 * @LastEditors: your name
 * @LastEditTime: 2020-07-14 10:01:16
 * @Description: file content
 */ 
import proxy from 'http-proxy-middleware'
import c2k from 'koa2-connect'
import conf from '../config'
import FetchKit from '../utils/fetch-kit'
import { Response } from '../utils/Response'
import db from '../models'
import _ from 'lodash'
import { getTaskScheduleHostAsync } from './sugo-task-v3.contorller'

let proxyMiddleware = async (ctx) => {
  const target = await getTaskScheduleHostAsync()
  
  return c2k(proxy({
    target: `${target}`,
    changeOrigin: true,
    pathRewrite: {
      '^/app/new-task-schedule': '/api2' // rewrite path
    }
  }))(ctx)
}

const getServerStatistics = async ctx => {
  const { host, port } = ctx.q
  try {
    let res = await FetchKit.get(`http://${host}:${port}/serverStatistics?ajax=resourceInfo`)
    res = res ? JSON.parse(res) : {}
    return ctx.body = Response.ok(res) 
  } catch (error) {
    return ctx.body = Response.fail('获取执行器信息失败.请检查host配置!')
  }
}


export default {
  proxyMiddleware: proxyMiddleware,
  executor: proxyMiddleware,
  executors: proxyMiddleware,
  execLog: proxyMiddleware,
  executorLog: proxyMiddleware,
  getSchedules: proxyMiddleware,
  delSchedules: proxyMiddleware,
  getHistory: proxyMiddleware,
  getServerStatistics: getServerStatistics
}
