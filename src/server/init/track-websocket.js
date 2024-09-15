/**
 * Created by fengxj on 10/31/16.
 */
global.secret_key_map = {}
import * as Redis from '../utils/redis'
import db from '../models'
import conf from '../config'
import _ from 'lodash'
import config from '../config'
import ws from 'nodejs-websocket'
import { getWebTrackEvent } from '../controllers/sugo-sdk-v3.controller'

let ios_snapshot_request = require('../resources/ios-snapshot-request').default
let android_snapshot_request = require('../resources/android-snapshot-request').default

const port = conf.site.sdk_ws_port
const msg_inteval = conf.site.sdkGetSnapshotInterval
const sdkCommonH5 = conf.site.sdkCommonH5 || false // 当前是否将移动端的h5全部放在一个表中

const redis_expire = 10
let server

export function createServer() {
  try {
    const clusterId = process.env.NODE_APP_INSTANCE
    // 仅仅在第一个实例运行，这样就不会出现请求不匹配
    if (clusterId > 0) return
    ws.setMaxBufferLength(conf.sdk_ws_max_buffer_byte || 4 * 1024 * 1024) //4MB
    if (!server) {
      server = ws
        .createServer(conn => {
          handleConn(conn)
        })
        .listen(port)
    }
  } catch (e) {
    console.error(e)
  }
}

async function handleConn(conn) {
  //通过conn.path 获取连接信息
  let connPath = conn.path.split('/')
  let connType = connPath[1] === 'connect' ? 'APP' : 'WEB'
  let token = connPath[2]
  let secretKey = connPath[3] || ''

  console.log('=========>创建连接: token:', token, '    secretKey:', secretKey)
  //创建rediskey
  let redisConnKey = 'sdk_conn_' + secretKey
  let redisTracKey = 'sdk_track_' + secretKey
  let redisExpireKey = 'sdk_expire_' + secretKey
  let redisClient = await Redis.getRedisClient()

  //消息
  conn.on('text', async str => {
    if (str === '') return
    let msgData = JSON.parse(str)
    let msgType = msgData.type
    let connInfo = {}

    //secretKey 为空不查询连接信息
    if (redisConnKey !== 'sdk_conn_') {
      connInfo = await redisClient.hgetall(redisConnKey)
    }

    switch (msgType) {
      //app发送设备信息 存入redis 发送图片请求 并将设备信息 发送到web端
      case 'device_info_response':
        secretKey = appReportedDeviceInfo(token, msgData, conn, redisClient)
        console.log('==========>获取手机的secretKey:', secretKey)
        //修改redisKey
        redisConnKey = 'sdk_conn_' + secretKey
        redisTracKey = 'sdk_track_' + secretKey
        redisExpireKey = 'sdk_expire_' + secretKey
        break
      //app发送图片信息
      case 'snapshot_response':
        appReportedSnapshot(msgData, token, connInfo, conn, redisClient, redisConnKey, secretKey)
        break
      //web端请求redis图片信息
      // case 'snapshot_request':
      //   webSendSnapshotRequest(connInfo, msgData, secretKey, conn, redisClient, redisExpireKey)
      //   break
      //测试信息
      case 'track_message':
        await redisClient.lpush(redisTracKey, str)
        break
      //开启测试
      case 'binding_test_request':
        await redisClient.hset(redisConnKey, 'test_mode', 1)
        conn.sendText(JSON.stringify({ type: 'binding_test_response', payload: { secretKey, state: 'success' } }))
        break
      //关闭测试
      case 'close_test_request':
        await redisClient.hset(redisConnKey, 'test_mode', 0)
        break
      //app发送测试信息
      case 'track_message_request':
        sendTestMessage(redisClient, redisTracKey, secretKey, conn)
        break
      //关闭连接
      case 'closeWebConn':
        console.log('========>服务端关闭web连接')
        conn.close()
        break
    }
  })

  //关闭连接
  conn.on('close', async (code, reason) => {
    console.log('=========>关闭连接：', redisConnKey)
    console.log('=========>关闭信息：', code, reason)
    closeWs(redisClient, redisConnKey, conn, redisExpireKey, redisTracKey, secretKey)
  })

  //异常关闭连接
  conn.on('error', async () => {
    console.log('=========>异常关闭连接：', redisConnKey)
    closeWs(redisClient, redisConnKey, conn, redisExpireKey, secretKey)
  })

  //初始化连接信息
  await initConn(redisClient, redisConnKey, redisTracKey, redisExpireKey, connType, conn)
}

/**
 *  初始化连接
 *
 * @param {object} redisService redis连接
 * @param {string} redisConnKey 连接信息key
 * @param {string} redisTracKey 测试埋点信息key
 * @param {string} redisExpireKey
 * @param {string} connType 连接类型
 * @param {object} conn 当前连接信息
 */
async function initConn(redisService, redisConnKey, redisTracKey, redisExpireKey, connType, conn) {
  //获取连接信息
  let connInfo = await redisService.hgetall(redisConnKey)
  let webconnKey = await redisService.get(redisExpireKey)

  //连接信息写入redis
  connInfo = { webconn: conn.key }
  await redisService.del(redisConnKey)
  await redisService.del(redisTracKey)
  await redisService.setex(redisExpireKey, redis_expire, connInfo.webconn)
  await redisService.hmset(redisConnKey, connInfo)
  await redisService.expire(redisConnKey, 1800)

  if (connType === 'APP') {
    //初始化手机连接时。发送获取设备信息的请求
    conn.sendText(JSON.stringify({ type: 'device_info_request' }))
  } else if (connType === 'WEB') {
    if (webconnKey) {
      //连接已存在发送错误到web端
      console.log('其他浏览器已经打开埋点页面...')
      let res = { type: 'error', payload: { message: '其他浏览器已经打开埋点页面，一个应用同时只能打开一个埋点窗口' } }
      conn.sendText(JSON.stringify(res))
      conn.close()
      return
    }
    console.log('init redis')
  }
}

/**
 * 关闭连接
 *
 * @param {object} redisService redis连接
 * @param {stirng} redisConnKey 连接信息Key
 * @param {object} conn 当前连接
 * @param {string} redisExpireKey
 */
async function closeWs(redisService, redisConnKey, conn, redisExpireKey, redisTracKey, secretKey) {
  // 获取redis连接信息
  let connInfo = await redisService.hgetall(redisConnKey)

  if (connInfo) {
    if (conn.key === connInfo.webconn) {
      //删除连接信息
      await redisService.del(redisConnKey)
      await redisService.del(redisExpireKey)
      await redisService.del(redisTracKey)
      let appConn = server.connections.find(p => p.key === connInfo.conn)
      if (appConn) {
        appConn.close()
      }
    } else if (conn.key === connInfo.conn) {
      //删除app连接信息(连接，设备，图片，图片哈希)
      await redisService.hdel(redisConnKey, 'conn')
      await redisService.hdel(redisConnKey, 'device')
      await redisService.hdel(redisConnKey, 'snapshot')
      await redisService.hdel(redisConnKey, 'image_hash')
      let webConn = server.connections.find(p => p.key === connInfo.webconn)
      if (webConn) {
        webConn.sendText(JSON.stringify({ type: 'app_close_response', payload: { secretKey } }))
      }
    }
    await redisService.del(redisTracKey)
  }
}

/**
 * app上传设备信息
 *
 * @param {string} token appid
 * @param {object} msgData 返回信息
 * @param {object} conn 当前连接
 * @param {object} redisService redis连接
 * @returns {string} 设备上传的 secretKey
 */
function appReportedDeviceInfo(token, msgData, conn, redisService) {
  let device = msgData.payload
  let secretKey = device.secret_key
  //发送获取设备截图请求
  if (device.system_name && device.system_name === 'iOS') {
    ios_snapshot_request.payload.should_compressed = config.sdkShouldCompressed ? 1 : 0
    conn.sendText(JSON.stringify(ios_snapshot_request))
  } else if (device.device_type && device.device_type === 'Android') {
    android_snapshot_request.payload.should_compressed = conf.sdkShouldCompressed ? 1 : 0
    conn.sendText(JSON.stringify(android_snapshot_request))
  }

  //获取设备版本号
  let app_version
  if (device.system_name && device.system_name === 'iOS') {
    app_version = device.app_release
  } else if (device.device_type && device.device_type === 'Android') {
    app_version = device.$android_app_version
  }

  //将连接信息写入readis
  let connInfo = {}
  connInfo.conn = conn.key
  connInfo.app_version = app_version
  connInfo.device = JSON.stringify(device)
  redisService.hmset(`sdk_conn_${secretKey}`, connInfo)

  //发送设备信息到web端
  let conweb = server.connections.find(p => p.path === `/webconn/${token}/${secretKey}`)
  if (connInfo && connInfo.device && conweb) {
    console.log('==========>发送设备信息到web端')
    conweb.sendText(JSON.stringify({ type: 'device_info_response', payload: { secretKey, device } }))
  }
  return secretKey
}

/**
 * app上传获取截图信息
 *
 * @param {any} msgData 消息内容
 * @param {any} token
 * @param {any} connInfo redis存储的连接信息
 * @param {any} conn 当前连接
 * @param {any} redisService redis
 * @param {any} redisConnKey
 * @param {any} secretKey
 */
async function appReportedSnapshot(msgData, token, connInfo, conn, redisService, redisConnKey, secretKey) {
  //接收截图信息，判断前端连接已经断开 直接关闭当前连接
  if (connInfo === null || !connInfo.webconn) {
    // console.log('连接中断..')
    conn.close()
    return
  }

  //获取图片信息 存入redis
  let snapshot = msgData.payload
  let old_image_hash = connInfo.image_hash
  let image_hash
  if (snapshot.activities && snapshot.activities.length > 0) {
    image_hash = snapshot.activities[0].image_hash
  }
  if (snapshot.image_hash) {
    image_hash = snapshot.image_hash
  }
  debug('=============>截图信息 Imagehash:', image_hash)
  let conweb = server.connections.find(p => p.key === connInfo.webconn)
  if (image_hash && old_image_hash !== image_hash && conweb) {
    let resp = { type: 'snapshot_response', payload: { secretKey, image_hash, snapshot } }
    conweb.sendText(JSON.stringify(resp))
    connInfo.image_hash = image_hash
    await redisService.hmset(redisConnKey, connInfo)
  }

  //如果开启测试 发送测试信息
  if (connInfo.test_mode && connInfo.test_mode === '1') {
    serverSendTestInfo(connInfo, token, secretKey, conn, redisService, redisConnKey)
  }

  //发送获取app截图信息请求	
  setTimeout(() => {
    if (conn.readyState === conn.OPEN) {
      let snapshot_request = {
        type: 'snapshot_request',
        payload: { should_compressed: config.sdkShouldCompressed ? 1 : 0 }
      }
      if (image_hash) {
        snapshot_request.payload.image_hash = image_hash
      }
      conn.sendText(JSON.stringify(snapshot_request))
    }
  }, msg_inteval)
}

/**
 * 发送测试信息
 *
 * @param {any} connInfo
 * @param {any} token
 * @param {any} secretKey
 * @param {any} conn
 * @param {any} redisService
 * @param {any} redisConnKey
 */
async function serverSendTestInfo(connInfo, token, secretKey, conn, redisService, redisConnKey) {
  debug('=============>测试信息')
  let app_version = connInfo.app_version
  let rows = []

  //获取移动端共用表的数据
  let findAllSql = ''
  //获取移动端公用表的数据
  if (sdkCommonH5) {
    // 先根据token，找到项目id，在根据项目id去查询数据
    const dim_inst = await db.SugoDataAnalysis.findOne({
      where: {
        id: token
      },
      raw: true
    })
    // 修改查询的参数为project_id
    const rowsH5 = await db.TrackEventMobileH5Draft.findAll({
      where: {
        project_id: dim_inst.project_id
      },
      raw: true,
      attributes: ['event_name', 'event_path', 'event_type', 'page', 'code', 'advance', 'similar', 'binds', 'cross_page', 'similar_path']
    }).catch(err => console.log(err))
    rows = rowsH5.map(row => ({ ...row, event_path_type: 'h5', sugo_autotrack_path: JSON.parse(row.event_path).path }))
  }

  let rowsWithoutH5 = await db.TrackEventDraft.findAll({
    where: {
      appid: token,
      app_version: app_version
    },
    raw: true,
    attributes: [
      'event_id',
      'event_name',
      'event_path',
      'event_path_type',
      'event_type',
      'page',
      'control_event',
      'delegate',
      'code',
      'advance',
      'similar',
      'binds',
      'cross_page',
      'similar_path',
      'class_attr',
      'sugo_autotrack_path',
      'sugo_autotrack_position',
      'sugo_autotrack_page_path'
    ]
  }).catch(err => console.log(err))
  //获取事件信息
  rows.push(...rowsWithoutH5)

  //绑定信息
  let result = { type: 'event_binding_request', payload: {} } //secretKey
  result.payload.events = []
  result.payload.h5_events = []
  result.payload.page_info = []

  //处理原生事件信息
  // 原生事件下发格式转换
  const eventBindings = rows
    .filter(p => p.event_path_type !== 'h5')
    .map(p => {
      let { event_path = '', page, code, advance, class_attr = '', sugo_autotrack_page_path = '', similar, sugo_autotrack_path = '', similar_path } = p

      // 控件附加属性
      class_attr =
        class_attr && class_attr.length
          ? _.reduce(
            _.groupBy(class_attr, p => p.dim),
            (r, v, k) => {
              r[k] = v.map(p => p.cls).join(',')
              return r
            },
            {}
          )
          : {}

      let event = {
        target_activity: page || sugo_autotrack_page_path,
        classAttr: class_attr,
        ..._.pick(p, ['event_id', 'event_name', 'event_type', 'sugo_autotrack_path', 'sugo_autotrack_position', 'similar']),
        sugo_autotrack_path: similar && similar_path ? similar_path : sugo_autotrack_path
      }
      // 圈选关联上报内容
      if (advance && code && event_path) {
        event.attributes = JSON.parse(code)
      }
      if (advance && code && !event_path) {
        event.sugo_autotrack_attributes = JSON.parse(code)
      }
      return event
    })
  // 处理h5事件
  let h5EventBindings = rows
    .filter(p => p.event_path_type === 'h5')
    .map(item => {
      let { event_path, page, code, advance, similar, binds, similar_path, sugo_autotrack_page_path = '' } = item
      let event = {
        target_activity: page || sugo_autotrack_page_path,
        ..._.pick(item, ['cross_page', 'event_id', 'event_name', 'event_type', 'sugo_autotrack_path', 'sugo_autotrack_position', 'sugo_autotrack_page_path'])
      }

      if (advance) {
        event.code = code || ''
        event.binds = binds || {}
      }
      event.path = JSON.parse(event_path)
      event.similar = similar
      event.similar_path = similar && similar_path
        ? JSON.parse(similar_path || event_path).path.replace(/ &/g, '')
        : ''
      return event
    })

  //获取页面信息
  findAllSql = {
    where: {
      appid: token
    },
    attributes: ['page', 'page_name', 'code', 'is_submit_point']
  }
  // 从移动端的共用h5表中找数据，并塞进去
  if (sdkCommonH5) {
    const dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: token }, raw: true })
    const rowsH5 = await db.SugoSDKPageInfoMobileH5Draft.findAll({
      where: {
        project_id: dim_inst.project_id
      },
      attributes: ['page', 'page_name', 'code', 'is_submit_point']
    })
    rows = rowsH5
  }
  rowsWithoutH5 = await db.SugoSDKPageInfoDraft.findAll({
    where: {
      app_version: app_version,
      appid: token
    },
    attributes: ['page', 'page_name', 'code', 'is_submit_point']
  })

  rows.push(...rowsWithoutH5)

  let pageInfos = rows.map(p => {
    let pageInfo = {
      page: p.page.indexOf('::') > 0 ? p.page.substr(p.page.indexOf('::') + 2) : p.page,
      page_name: p.page_name,
      isSubmitPoint: p.is_submit_point
    }
    if (p.code) {
      pageInfo.code = p.code
    }
    return pageInfo
  })

  // 处理下发websdk埋点
  if (conf.sdkMergeH5TrackEvents) {
    const { events, pages } = await getWebTrackEvent(token)
    pageInfos = _.concat(pageInfos, pages)
    h5EventBindings = _.concat(h5EventBindings, events)
  }

  result.payload.page_info = pageInfos
  result.payload.events = eventBindings
  result.payload.h5_events = h5EventBindings
  debug('=======>', result.payload.page_info)
  debug('=============> 测试内容', result)
  conn.sendText(JSON.stringify(result))
  await redisService.hdel(redisConnKey, 'test_mode')
}

/**
 * web端获取测试信息
 *
 * @param {object} redisService
 * @param {string} redisTracKey
 * @param {string} secretKey
 * @param {object} conn
 */
async function sendTestMessage(redisService, redisTracKey, secretKey, conn) {
  const mulit = await redisService.multi([
    ['lrange', redisTracKey, 0, -1],
    ['del', redisTracKey]
  ])

  let msg = await new Promise(function (resolve, reject) {
    mulit.exec(function (err, replies) {
      if (err) reject(err)
      else resolve(replies)
    })
  })
  let res = { type: 'track_message_response', payload: { msg: [] } }
  res.payload.msg = msg[0][1]
  res.payload.secretKey = secretKey
  debug('=============>测试反馈', msg[0][1])
  conn.sendText(JSON.stringify(res))
}

/**
 * WEB端获取图片信息
 *
 * @param {object} connInfo
 * @param {object} msgData
 * @param {string} secretKey
 * @param {object} conn
 * @param {object} redisService
 * @param {string} redisExpireKey
 */
async function webSendSnapshotRequest(connInfo, msgData, secretKey, conn, redisService, redisExpireKey) {
  //发送截图信息请求
  debug('=============>发送截图信息请求')
  if (conn.readyState === conn.OPEN) {
    let connSdk = server.connections.find(p => p.key === connInfo.conn)
    let snapshot_request = {
      type: 'snapshot_request',
      payload: {
        should_compressed: config.sdkShouldCompressed ? 1 : 0
      }
    }
    if (connInfo.image_hash) {
      snapshot_request.payload.image_hash = connInfo.image_hash
    }
    connSdk.sendText(JSON.stringify(snapshot_request))
  }
}
