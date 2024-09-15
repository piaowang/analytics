
import _ from 'lodash'
import { utils } from 'next-reader'
import { APP_TYPE, iOS_RENDERER } from '../constants'
import {
  getIOSViewController,
  associationController,
  getIOSViewsMap,
  getAndroidViewMap
} from '../trackOpertion2'
import iOSContent from '../iosContent'
import { Action as BuriedAction } from './view-model'
import { CONTROLL_TYPE, SKD_TRACKING_VERSION } from '../constants'
import zlib from 'zlib'
import testPng from '../test/test.png'
const testJson = require('../test/test.json')

const Action = {
  init: utils.short_id(),
  getDeviceInfo: utils.short_id(),
  testEvent: utils.short_id(),
  closeTest: utils.short_id()
}

const def = {
}

const sdkGetSnapshotInterval = sugo.sdkGetSnapshotInterval || 1000
const Actions = {
  getDeviceInfo: (store, done) => {
    store.WsClient.send(JSON.stringify({ type: 'device_info_request' }))
  },
  testEvent: (store, done) => {
    store.WsClient.send(JSON.stringify({ type: 'binding_test_request' }))
    store.WsClient.send(JSON.stringify({ type: 'track_message_request' }))
    done({})
  },
  close: (store, done) => {
    store.WsClient.send(JSON.stringify({ type: 'closeWebConn' }))
    done({})
  },
  closeTest: (store, done) => {
    store.WsClient.send(JSON.stringify({ type: 'close_test_request' }))
    done({})
  }
}

/**
 * @param {ViewModel} state
 * @param {Object} action
 * @param {Function} done
 * @return {Object}
 * @this {Store}
 */
function scheduler(state, action, done) {
  switch (action.type) {
    case Action.getDeviceInfo:
      return Actions.getDeviceInfo(this.store, done)
    case Action.testEvent:
      return Actions.testEvent(this.store, done)
    case Action.close:
      return Actions.close(this.store, done)
    case Action.closeTest:
      return Actions.closeTest(this.store, done)
    default:
      return state
  }
}

export default {
  name: 'ws',
  scheduler,
  state: { ...def }
}


const initSocket = (token, secretKey, store) => {
  //创建连接
  let WsClient = new WebSocket(`${window.sugo.sdk_ws_url}/webconn/${token}/${secretKey}`)
  WsClient.onopen = createSocket(WsClient, secretKey)
  //连接关闭方法
  WsClient.onclose = () => {
    console.log('===========>关闭连接web端ws')
  }

  if (window.sugo.env !== 'production') {
    window.testTrack = () => {
      window.isTest = true
      snapshotResponseHandle(testJson, store)
    }
  }

  WsClient.onmessage = function (evt) {
    let rs = JSON.parse(evt.data)
    let { type, payload } = rs

    //多连接判断
    if (payload.secretKey === secretKey && !window.trackStop) {
      switch (type) {
        case 'snapshot_response'://获取APP上报数据
          snapshotResponseHandle(payload, store)
          break
        case 'track_message_response':
          getTrackMessageResponseHandle(payload, store)
          break
        case 'device_info_response'://获取设备信息
          getDeviceInfoResponseHandle(payload, store)
          break
        case 'binding_test_response':
          bindingTestResponseHandel(payload, store)
          break
        case 'error':
          errorHandel(payload, store)
          break
        default:
          console.log('连接处理错误')
          break
      }
    }
  }
  return WsClient
}

const createSocket = (WsClient) => {
  setTimeout(() => {
    console.log('===========>检查ws状态:', WsClient.readyState)
    if (WsClient && WsClient.readyState === WebSocket.OPEN) {
      console.log('===========>连接已建立,等待移动设备接入')
    }
  }, sdkGetSnapshotInterval)
}
const snapshotResponseHandle = async (payload, store) => {
  let newPayload = _.cloneDeep(payload)
  const VmAction = BuriedAction
  // store.dispatchAsyn({
  //   type: VmAction.change,
  //   payload: { viewMap: {} }
  // })
  let snapshot = newPayload.snapshot
  let { appType, pageMap, deviceInfo, editPageInfo: oldPageInfo } = store.state.vm
  const compressedSerializedObjects = appType === APP_TYPE.ios
    ? _.get(newPayload, 'snapshot.compressed_serialized_objects', null)
    : _.get(newPayload, 'snapshot.activities[0].compressed_serialized_objects', null)
  if (compressedSerializedObjects) {
    const buffer = Buffer.from(compressedSerializedObjects, 'base64');
    const newSerializedObjects = await zlib.unzipSync(buffer).toString()
    _.set(snapshot, appType === APP_TYPE.ios ? 'serialized_objects' : 'activities[0].serialized_objects', JSON.parse(newSerializedObjects))
  }
  let newImageHash = newPayload.image_hash
  if (window.sugo.env !== 'production') {
    console.log('============>ImageHash:', newImageHash, 'time:', Date.now())
  }
  let { currentImageHash } = store.state.vm
  if (newImageHash === currentImageHash) {
    return
  }
  window.trackSnapshotResponse = _.omit(newPayload, 'snapshot.screenshot')
  let changeState = {}
  if (appType === APP_TYPE.android) {
    changeState = handleStateAndroid(snapshot, store.state)
  } else if (appType === APP_TYPE.ios
    && window.sugo.iOS_renderer === iOS_RENDERER.Infinitus
    && window[SKD_TRACKING_VERSION] < 1
  ) {
    changeState = handleStateIosInfinitus(snapshot)
  } else {
    changeState = handleStateIosStandard(deviceInfo, snapshot, store.state)
  }
  if (changeState) {
    let currPage = changeState.currentUrl ? changeState.currentUrl : changeState.currentActivity
    if (oldPageInfo.page !== currPage) {
      let pageInfo = _.get(pageMap, [currPage])
      let pageData = {
        page: currPage,
        isH5: !!changeState.currentUrl,
        page_name: _.get(pageInfo, 'page_name', ''),
        xwalkScreenshots: changeState.xwalkScreenshots
      }
      changeState.editPageInfo = pageData
      changeState.editEventInfo = {}
    }
    if (window.isTest && window.sugo.env !== 'production') {
      changeState.imgUrl = testPng
    } else {
      changeState.imgUrl = `data:image/png;base64,${changeState.img}`
    }
    changeState = _.omit(changeState, ['defaultPageName', 'img'])
    changeState.snapshot = snapshot
    changeState.currentImageHash = newImageHash
    store.dispatchAsyn({
      type: VmAction.change,
      payload: changeState
    })
  }
  // setTimeout(() => { 
  //   store.WsClient.send(JSON.stringify({ type: 'snapshot_request', payload: {} }))
  // }, sdkGetSnapshotInterval)
}

const getTrackMessageResponseHandle = (payload, store) => {
  let { testMessage = [] } = store.state.vm
  const VmAction = BuriedAction
  var msgs = payload.msg.map(p => {
    return _.get(JSON.parse(p), 'payload.events[0]', {})
  })
  msgs = _.orderBy(msgs, ['properties.event_time'], ['desc'])
  testMessage.unshift(...msgs)
  testMessage.splice(500, testMessage.length)
  //发送获取app截图信息请求
  setTimeout(() => {
    store.WsClient.send(JSON.stringify({ type: 'track_message_request' }))
  }, sdkGetSnapshotInterval * (1))
  store.dispatchAsyn({
    type: VmAction.change,
    payload: { testMessage }
  })
}


//获取设备信息
const getDeviceInfoResponseHandle = (payload, store) => {
  let appVersion
  let result = payload.device
  const VmAction = BuriedAction
  if (result.system_name && result.system_name === 'iOS') {
    appVersion = result.app_release
    window[SKD_TRACKING_VERSION] = parseInt(_.get(payload, 'device.tracking_version', 0))
  } else if (result.device_type && result.device_type === 'Android') {
    appVersion = result.$android_app_version
  }
  if (!appVersion || !appVersion.trim().length) {
    console.log('app版本为空!!')
    store.dispatchAsyn({
      type: VmAction.change,
      payload: {
        deviceInfo: null,
        appVersion: null
      }
    })
    return
  }
  //收到设备信息后 开始请求页面信息
  console.log('===========>收到设备信息，请求设备界面信息')
  //设备信息写入State
  store.dispatchAsyn([{
    type: VmAction.change,
    payload: {
      deviceInfo: result,
      appVersion
    }
  }])
  //获取页面信息和分类信息
  if (_.isEmpty(store.state.vm.TrackEventMap)) {
    console.log('===========>收到设备信息，请求已埋点事件信息')
    store.dispatchAsyn({
      type: VmAction.getTrackEvents
    })
  }
}

const errorHandel = async (payload, store) => {
  let message = payload.message
  const VmAction = BuriedAction
  await store.dispatchAsyn({
    type: VmAction.change,
    payload: { message: { type: 'error', message: message } }
  })
  await store.dispatchAsyn({
    type: VmAction.change,
    payload: { message: null }
  })
}

const bindingTestResponseHandel = (payload, store) => {
  if (payload.state === 'success') {
    const VmAction = BuriedAction
    store.dispatchAsyn({
      type: VmAction.change,
      payload: { testMode: true, testTitle: '测试就绪，请点击已埋点的按钮' }
    })
  }
}

//处理上传的数据
const handleStateIosInfinitus = function (snapshot) {
  if (!snapshot || !snapshot.serialized_objects) return
  let views = snapshot.serialized_objects.objects
  let viewMapTmp = getIOSViewsMap(views)
  associationController(views, viewMapTmp)
  let screenshot = snapshot.screenshot
  let win = viewMapTmp[snapshot.serialized_objects.rootObject]
  let windowSubviews = win.properties.subviews.values[0].value
  let mainView = viewMapTmp[windowSubviews[windowSubviews.length - 1]]
  const htmlCol = _.values(viewMapTmp).find(p => p.htmlPage)
  let currentUrl = _.get(htmlCol, 'htmlPage.url', '')
  let PageName = _.get(htmlCol, 'htmlPage.title', '')
  let ctlTmp = getIOSViewController(mainView, viewMapTmp)
  if (!ctlTmp) {
    return
  }
  let currentActivity
  if (ctlTmp && ctlTmp.class[0]) {
    currentActivity = ctlTmp.class[0]
  }
  let img = `${screenshot}`
  return {
    iosViewMap: viewMapTmp,
    iosMainView: mainView,
    currentActivity,
    img,
    currentUrl,
    defaultPageName: PageName,
    snapshot
  }
}
const handleStateIosStandard = function (deviceInfo, snapshot, state) {
  if (!snapshot || _.isEmpty(snapshot)) return
  const begin = Date.now()
  const content = new iOSContent(deviceInfo, snapshot)
  const screenshot = snapshot.screenshot
  const img = `${screenshot}`
  let currentActivity = content.currentActivity//content.classNameOf(content.objectOf(currentIdOfUIViewController)

  let appMultiViews = [{ hashCode: "", currentUrl: currentActivity, isH5: false }]
  const xwalkScreenshots = {}
  snapshot.serialized_objects.objects.filter(p => p.htmlPage && p.htmlPage.url).forEach(p => {
    appMultiViews.push({ hashCode: p.id, pageName: p.htmlPage.title, currentUrl: p.htmlPage.url, isH5: true })
  })
  let lastView = appMultiViews.find(p => p.hashCode.toString() === state.vm.webViewHashCode.toString())
  lastView = state.vm.appMultiViews.length === appMultiViews.length && lastView ? lastView : _.last(appMultiViews)
  const h5ControlClass = getPathClassMap(_.filter(_.get(snapshot, 'serialized_objects.objects'), p => p.htmlPage).map(p => _.get(p, 'htmlPage.nodes')))
  if (window.sugo.env !== 'production') {
    console.log('============>解析用时:', Date.now() - begin)
  }
  return {
    iosContent: content,
    currentActivity,
    img,
    snapshot,
    h5ControlClass,
    appMultiViews,
    currentUrl: lastView.isH5 ? lastView.currentUrl : "",
    webViewHashCode: lastView.hashCode.toString(),
    xwalkScreenshots
  }
}

// 获取h5控件的样式map
const getPathClassMap = function (htmlNodes) {
  let h5ContrrolPathClassMap = {}
  htmlNodes.forEach(n => {
    if (n) {
      const node = JSON.parse(n)
      node.forEach(p => {
        const classListType = typeof (p.classList)
        if (classListType === 'object') {
          h5ContrrolPathClassMap[p.path] = '.' + _.values(p.classList).join('.')
        } else if (classListType === 'string') {
          h5ContrrolPathClassMap[p.path] = '.' + _.trim(p.classList).replace(/ /g, '.')
        }
      })
    }
  })
  return h5ContrrolPathClassMap
}

//根据app上传数据 计算属性
const handleStateAndroid = function (snapshot, state) {
  let snap = _.get(snapshot, 'activities', [])
  if (!snap.length) return
  let activity = snap[0]
  let views = activity.serialized_objects.objects
  let screenshot = activity.screenshot
  let img = `${screenshot}`
  let currentActivity = activity.activity
  let appMultiViews = [{ hashCode: "", currentUrl: currentActivity, isH5: false }]
  const xwalkScreenshots = {}
  _.filter(views, p => p.htmlPage && p.htmlPage.url).forEach(p => {
    appMultiViews.push({ hashCode: p.hashCode, pageName: p.htmlPage.title, currentUrl: p.htmlPage.url, isH5: true })
    if (p.htmlPage.screenshot) {
      let xwalkImgUrl = `data:image/png;base64,${p.htmlPage.screenshot}`
      xwalkScreenshots[p.hashCode] = { xwalkImgUrl }
    }
  })
  const viewMap = getAndroidViewMap(views, activity.scale)
  let lastView = appMultiViews.find(p => p.hashCode.toString() === state.vm.webViewHashCode.toString())
  lastView = state.vm.appMultiViews.length === appMultiViews.length && lastView ? lastView : _.last(appMultiViews)
  const h5ControlClass = getPathClassMap(_.filter(views, p => p.htmlPage).map(p => _.get(p, 'htmlPage.nodes')))
  return {
    viewMap,
    currentActivity,
    img,
    appMultiViews,
    snapshot,
    currentUrl: lastView.isH5 ? lastView.currentUrl : "",
    webViewHashCode: lastView.hashCode.toString(),
    h5ControlClass,
    xwalkScreenshots
  }
}

export {
  Action,
  initSocket
}
