import _ from 'lodash'
import db, { initDb } from '../models'
import appInit from './app-init'
import { initDruid, removeProcessContextCacheForPlywood } from '../utils/druid-middleware'
import { checkUpdate } from '../update'
import { initMonitor, initTagHQL, initEventTasks, initActTasks, initApiResultLogTasks, initOfflineModelTasks, initMarketBrainEventTasks, initMarketBrainStaffAndCustomStatistics } from './task-init'
import { checkDbRoleRoute } from '../models/apis'
import CONFIG from '../config'
import initDefaultSDKConfig from './init-default-sdk-info'
import { getMacaddress } from '../utils/helper'
import c2k from 'koa2-connect'
import listener from '../listener'
import proxyMiddleware from 'http-proxy-middleware'
import * as WebSocket from './track-websocket.js'
import websocketInit from '../websocket'
// ## extension
import { install } from '../utils/install'
// TODO 改为通过配置引入
import SDKJavaScript from 'sugo-sdk-js'
import {initTempLookupCleanTask} from '../services/temp-lookups.service'
import {initAutoUpdateUserGroupTask} from '../services/segment.service'
import {initCutvCustomMadeReportTask} from '../services/cutv-report.service'
import { initCleanHqlImportFile } from '../services/sugo-tag-hql-import-file.service'
import LifeCycleService from '../services/life-cycle.service'
import CzbbbService from '../services/czbbb.service'
import SugoUserTagUpdateTaskServ from '../services/sugo-user-tag-update-task.service'
import Router from 'koa-router'
import flatMenusType from '../../common/flatMenus.js'

export default async function init() {
  await getMacaddress() // cache mac address
  await initDb()
  const sql = require('../models').default
  const clusterId = Number(process.env.NODE_APP_INSTANCE || 0)
  if (clusterId === 0 && CONFIG.autoCheckUpdate) { // 集群模式时，只在第一个进程执行升级脚本 && 设置自动更新脚本
    await checkUpdate(sql)
  }

  // 同步数据库放在checkUpdate脚本之后 modiyf by WuQic
  await sql.client.sync()

  await checkDbRoleRoute(sql)
  let extraLocal = {}
  if (CONFIG.shouldInitSugoSDKProject) {
    extraLocal = await initDefaultSDKConfig(sql)
  }
  if (CONFIG.druid) {
    await initDruid()
    // 清除redis中plywood-context缓存标识
    await removeProcessContextCacheForPlywood()
  }
  
  const menus = CONFIG.site.menus
  const { cutvCustomReportScheduleSwitch = false } = CONFIG
  // 没有监控告警不启动task监控
  const menuPaths = CONFIG.site.enableNewMenu ? flatMenusType(CONFIG.site.menus) 
    : _.flatMap(menus, m => _.map(m.children, p => p.path))
  if (menuPaths.includes('/console/monitor-alarms')){
    initMonitor()
  }
  // 没有用户画像不启动task任务
  if (menuPaths.includes('/console/tag-dict')){
    initTagHQL()
    initTempLookupCleanTask()
  }
  if (menuPaths.includes('/console/market-brain-events')) {
    initMarketBrainEventTasks()
    initMarketBrainStaffAndCustomStatistics()
  }
  if (menuPaths.includes('/console/marketing-events')) {
    initEventTasks()
  }
  if (menuPaths.includes('/console/marketing-acts')) {
    initActTasks()
  }
  if (_.includes(menuPaths, '/console/usergroup')) {
    initAutoUpdateUserGroupTask()
  }
  if(_.includes(menuPaths, '/console/offline-calc/models')) {
    initOfflineModelTasks()
  }
  if (_.includes(menuPaths, '/console/tag-data-manage')) {
    SugoUserTagUpdateTaskServ.getInstance().initAutoUpdateUserTagTask()
    initCleanHqlImportFile()
  }
  if (_.includes(menuPaths, '/console/custom-made-reportform') && cutvCustomReportScheduleSwitch) {
    initCutvCustomMadeReportTask()
  }
  if (_.includes(menuPaths, '/console/life-cycle')) {
    new LifeCycleService().initLifeCycleTasks()
  }
  if (CONFIG.activeExtendModules === 'sugo-analytics-extend-czbbb') {
    new CzbbbService().initCzbbbTasks()
  }
  if (_.includes(menuPaths, '/console/data-api')) {
    initApiResultLogTasks()
  }

  let app = await appInit(extraLocal)

  // install extensions
  await install(app, db, CONFIG.site, SDKJavaScript)

  if (_.isString(CONFIG.activeExtendModules) && CONFIG.activeExtendModules.indexOf('sugo-analytics-extend-nh') > -1) {
    await install(app, db, CONFIG.site, require('sugo-analytics-extend-nh').default)
  }

  await listener.trigger()

  return app
}

/**
 *  初始化websocket以及socket.io服务
 * @param {*} app
 */
export const initSocketServer = (app) => {

  // 初始化可视化埋点所需websocket对象
  WebSocket.createServer()

  let proxyUrls = ['/webconn', '/conn', '/taskConn']
  let socket_port = CONFIG.site.sdk_ws_port
  let socketIoServer
  // 如果包含流量分析菜单则需要启动对应依赖的socket.io服务
  const menus = CONFIG.site.enableNewMenu ? flatMenusType(CONFIG.site.menus) 
    : _.flatMap(CONFIG.site.menus, m => _.map(m.children, p => p.path))
  //TODO 何时应初始化一个socket服务器?
  if (menus.includes('/console/traffic-analytics') || menus.includes('/console/screen-control') || menus.includes('/console/livescreen')) {
    socketIoServer = websocketInit(app)
    proxyUrls.push('/socket.io')
    socket_port = (socket_port - 1) || 8886
  }

  // 读取sdk_ws_url协议（ws或者wss，根据环境决定)
  const protocol = CONFIG.site.sdk_ws_url.split(':')[0] || 'ws'
  const sdkTarget = `${protocol}://127.0.0.1:${CONFIG.site.sdk_ws_port}`
  const defaultTarget = `${protocol}://127.0.0.1:${socket_port}`
  const { url: taskWsTarget } = CONFIG.site.taskManagerV3Ws
  // 将socket.io服务端端口代理到主服务端口
  const socketProxy = proxyMiddleware(proxyUrls, {
    target: defaultTarget,
    changeOrigin: true, // needed for virtual hosted sites
    router: (req) => {
      const currUrl = req.url
      if (['/webconn', '/conn'].some(url => currUrl.startsWith(url))) { // sdk可视化埋点websocket
        return sdkTarget
      } else if(currUrl.startsWith('/socket.io')) { // 流量分析socket.io代理
        return defaultTarget
      } else if(currUrl.startsWith('/taskConn')) { // 流量分析socket.io代理
        return taskWsTarget
      }
      // else if(currUrl.startsWith('/sockjs-node')) { // proxy webpack devServer
      //   return `ws://localhost:${CONFIG.devPort}`
      // }
    }
  })

  app.use(c2k(socketProxy))
  socketProxy.socketIoServer = socketIoServer
  return socketProxy
}

/**
 *  初始化web-pty(webshell)
 * @param {*} app
 * @param {*} server 
 */
export const initWebpty = (app, server, ioServer) => {
  // import * as pty from 'web-pty'
  const pty = require('web-pty')
  const ptyStaticRouter = new Router()
  // 设置静态资源路径，同express
  ptyStaticRouter.all('/res/pty/:type', pty.res.koa)
  app
    .use(ptyStaticRouter.routes())
    .use(ptyStaticRouter.allowedMethods())
  pty.mkpty(server, ioServer)
}
