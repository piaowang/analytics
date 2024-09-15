import _ from 'lodash'
import { APP_TYPE } from '../constants'
import zlib from 'zlib'
import testPng from '../test/test.png'
const testJson = require('../test/test.json')
import { message } from 'antd'
import { paring } from './parsing'
import { WebSocketConnectStatus } from '../constants'
import { getPathClassMap } from '../operation/track-opertion'

const sdkGetSnapshotInterval = window.sugo.sdkGetSnapshotInterval || 1000

const webSocketType = {
  snapshotResponse: 'snapshot_response', // 截图信息响应
  trackMessageResponse: 'track_message_response', // 测试埋点信息响应
  deviceInfoResponse: 'device_info_response', // 设备信息响应
  bindingTestResponse: 'binding_test_response', //
  error: 'error', // 异常信息处理
  bindingTestRequest: 'binding_test_request', // 发送绑定测试请求
  trackMessageRequest: 'track_message_request', // 测试埋点请求
  closeTestRequest: 'close_test_request', // 关闭测试埋点
  closeWebConn: 'closeWebConn', // 关闭 socket连接
  appConnClose: 'app_close_response' // app 主动关闭
}

export default class webSdkManager {
  onChange = null // 修改外部state
  secretKey = '' // 随机id 用于多用户同时埋点
  WsClient = null // websocket实例
  options = {
    // 配置属性
    appType: '', // app类型
    isHeatMap: false // 是否是热图
  }
  // xwalkScreenshots
  lastImageHash = ''
  messages = []
  /**
   *
   * @param {*} onChange websocket和埋点界面数据交互方法
   * @param {*} token appid
   * @param {*} secretKey 每次socket的唯一id 用于多用户同时埋点
   * @param {*} options 其他属性 {appType：类型 isHeatMap：热图模式}
   */
  constructor(onChange, token, secretKey, options) {
    this.onChange = onChange
    this.secretKey = secretKey
    this.options = options
    this.WsClient = this.initSocket(token)
  }

  /**
   * 初始化Socket
   * @param {*} token
   * @param {*} secretKey
   */
  initSocket(token) {
    //创建连接
    let WsClient = new WebSocket(`${window.sugo.sdk_ws_url}/webconn/${token}/${this.secretKey}`)
    WsClient.onopen = this.openSocket(WsClient)
    //连接关闭方法
    WsClient.onclose = () => {
      console.log('===========>关闭连接web端ws')
    }

    if (window.sugo.env !== 'production') {
      window.testTrack = () => {
        window.isTest = true
        this.snapshotResponseHandle(testJson)
      }
    }
    const myThis = this
    // 处理socket信息交互
    WsClient.onmessage = function (evt) {
      let rs = JSON.parse(evt.data)
      let { type, payload } = rs

      //多连接判断
      if (payload.secretKey === myThis.secretKey && !window.trackStop) {
        switch (type) {
          case webSocketType.snapshotResponse: // 获取APP上报数据
            myThis.snapshotResponseHandle(payload)
            break
          case webSocketType.trackMessageResponse:
            myThis.getTrackMessageResponseHandle(payload)
            break
          case webSocketType.deviceInfoResponse: // 获取设备信息
            myThis.getDeviceInfoResponseHandle(payload)
            break
          case webSocketType.bindingTestResponse: // 测试上报
            myThis.bindingTestResponseHandel(payload)
            break
          case webSocketType.error: // 异常信息处理
            myThis.errorHandel(payload)
            break
          case webSocketType.appConnClose:
            myThis.appConnCloseHandel()
            return
          default:
            console.log('连接处理错误')
            break
        }
      }
    }
    return WsClient
  }

  /**
   * 检测webcocket的状态
   * @param {*} WsClient
   */
  openSocket(WsClient) {
    setTimeout(() => {
      this.onChange({ websocketStatus: WebSocketConnectStatus.webConnecting })
      console.log('===========>检查ws状态:', WsClient.readyState)
      if (WsClient && WsClient.readyState === WebSocket.OPEN) {
        this.onChange({ websocketStatus: WebSocketConnectStatus.webConnectSuccess })
        console.log('===========>连接已建立,等待移动设备接入')
      }
    }, sdkGetSnapshotInterval)
  }

  /**
   * ws发送信息到服务端
   * @param {*} params 发送信息
   */
  sendMessageToServer(params) {
    this.WsClient && this.WsClient.send(JSON.stringify(params))
  }

  appConnCloseHandel() {
    this.onChange({ websocketStatus: WebSocketConnectStatus.mobileConnectClose })
  }

  /**
   * 解析数据并更新页面状态
   * @param {*} payload
   */
  async snapshotResponseHandle(payload) {
    const snapshot = payload.snapshot
    // 根据不同的app类型获取对应的数据节点
    const compressedSerializedObjects = _.get(payload, 'snapshot.compressed_serialized_objects', null)
    let objects = null
    // 获取压缩后上报的节点数据解压
    if (compressedSerializedObjects) {
      try {
        const buffer = Buffer.from(compressedSerializedObjects, 'base64')
        const newSerializedObjects = await zlib.unzipSync(buffer).toString()
        objects = JSON.parse(newSerializedObjects)
      } catch (error) {
        console.log('============>上报数据解压报错')
      }
    } else {
      objects = snapshot?.serialized_objects
    }
    // 获取当前上报的imageHash 如果相同则不更新界面信息
    let imageHash = snapshot?.image_hash
    // 生产模式打印imageHash和时间戳
    if (window.sugo.env !== 'production') {
      console.log('============>ImageHash:', imageHash, 'time:', Date.now())
    }
    // 最新的imageHash和上一次上报的hash一致 不触发渲染
    if (imageHash === this.lastImageHash) {
      return
    }
    // 获取截图信息
    const img = _.get(snapshot, 'screenshot', null)
    // 记录最新的Imagehash
    this.lastImageHash = imageHash
    // 将数据写入window对象 方便问题查找
    window.trackSnapshotResponse = {
      ..._.omit(payload, ['snapshot.screenshot', 'snapshot.compressed_serialized_objects']),
      serialized_objects: objects
    }

    // 判断app类型
    let controls = []
    let appMultiViews = []
    let scale = objects.scale || 1
    let imgHeight = (objects.height || 0) * scale
    let imgWidth = (objects.width || 0) * scale
    const xwalkScreenshots = {}
    const htmlControls = _.filter(objects.objects, p => p.htmlPage && p.htmlPage.url)
    let h5ControlClass = getPathClassMap(htmlControls.map(p => _.get(p, 'htmlPage.nodes')))
    controls = paring(objects.objects, objects.activity)
    if (this.options.appType === APP_TYPE.android) {
      htmlControls.forEach(p => {
        appMultiViews.push({
          hashCode: p.hashCode,
          pageName: p.htmlPage.title,
          path: p?.htmlPage?.url || '',
          isH5: true
        })
        if (p.htmlPage.screenshot) {
          let xwalkImgUrl = `data:image/png;base64,${p.htmlPage.screenshot}`
          xwalkScreenshots[p.hashCode] = { xwalkImgUrl }
        }
      })
      appMultiViews.push({ hashCode: '', path: objects.activity, isH5: false })
    } else if (this.options.appType === APP_TYPE.ios) {
      htmlControls.forEach(p => {
        appMultiViews.push({
          hashCode: p.id.toString(),
          pageName: p.htmlPage.title,
          path: p?.htmlPage?.url || '',
          isH5: true
        })
      })
      appMultiViews.push({ hashCode: '', path: objects.activity, isH5: false })
    }

    // 调用外部方法 更新状态
    let changeState = {
      controls,
      appMultiViews,
      xwalkScreenshots,
      imgHeight,
      imgWidth,
      classAttrs: _.get(objects, 'classAttr'),
      h5ControlClass,
      scale
    }
    // 测试模式渲染测试图片
    if (window.isTest && window.sugo.env !== 'production') {
      changeState.imgUrl = testPng
    }
    if (img) {
      changeState.imgUrl = `data:image/png;base64,${img}`
    }
    this.onChange(changeState)
  }

  /**
   * 获取测试埋点的数据信息
   * @param {*} payload
   */
  getTrackMessageResponseHandle(payload) {
    let msgs = payload.msg.map(p => {
      return _.get(JSON.parse(p), 'payload.events[0]', {})
    })
    msgs = _.orderBy(msgs, ['properties.event_time'], ['desc'])
    //发送获取app截图信息请求
    setTimeout(() => {
      this.sendMessageToServer({ type: webSocketType.trackMessageRequest })
    }, sdkGetSnapshotInterval * (this.options.isHeatMap ? 3 : 1))
    const msg = [...msgs, ...this.messages]
    this.messages = _.take(msg, 50)
    this.onChange({ testMessage: this.messages })
  }

  /**
   * 获取设备信息
   * @param {*} payload
   */
  getDeviceInfoResponseHandle(payload) {
    let result = payload.device
    // 获取APP的版本信息
    const appVersion = result.app_release || result.$android_app_version
    // 检测版本信息是否为空
    if (!appVersion || !appVersion.trim().length) {
      message.error('设备信息为空！')
      return
    }
    this.onChange({ websocketStatus: WebSocketConnectStatus.mobileConnectSuccess })
    //收到设备信息后 开始请求页面信息
    console.log('===========>收到设备信息，请求设备界面信息')
    const isAndroid = this.options.appType === APP_TYPE.android
    //设备信息写入State
    this.onChange({
      deviceInfo: {
        appVersion,
        deviceName: _.get(result, 'device_name', ''),
        deviceType: _.get(result, isAndroid ? 'device_type' : 'system_name', ''),
        osVersion: _.get(result, isAndroid ? '$android_os_version' : 'system_version', '')
      },
      appVersion
    })
  }

  /**
   * 异常信息处理
   * @param {*} payload
   */
  async errorHandel(payload) {
    message.error(payload.message)
  }

  /**
   * 测试请求处理
   * @param {*} payload
   * @param {*} store
   */
  bindingTestResponseHandel(payload) {
    if (payload.state === 'success') {
      message.success('测试就绪，请点击已埋点的按钮')
    }
  }
  /**
   * 发送测试请求
   */
  sendTestRequest = () => {
    this.sendMessageToServer({ type: webSocketType.bindingTestRequest })
    this.sendMessageToServer({ type: webSocketType.trackMessageRequest })
  }
  /**
   * 结束测试埋点
   */
  sendStopTestRequest = () => {
    this.sendMessageToServer({ type: webSocketType.closeTestRequest })
  }
  /**
   * 关闭web socket连接 退出埋点
   */
  closeWebConn = () => {
    this.sendMessageToServer({ type: webSocketType.closeWebConn })
  }
}
