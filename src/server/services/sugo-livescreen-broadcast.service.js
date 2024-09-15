/**
 * 大屏控制器的后端 websocket
 * 主要逻辑：
 * 返回单点登录 jwt token 给 frontendClient
 * 将当前状态存在数据库中 SugoLiveScreenControl
 * 根据接入的角色，返回不同的内容
 * 状态变更时，更新数据库，并且通知所有客户端
 */

import db, { Op }from '../models'
import SugoLiveScreenService from './sugo-livescreen.service'
import SocketServiceBase from '../websocket/service.interface'
import _ from 'lodash'
import {ClientTypeEnum} from '../../common/constants'
import {jwtSign} from '../init/jwt-login-middleware'
import {immutateUpdate, immutateUpdates, isDiffByPath} from '../../common/sugo-utils'
import ScreenLiveControlService from './screen-live-control.service'

const clientTypeDict = {} // {sessionId: clientType}
const uidDict = {} // {sessionId: uid}
async function getScreenControllerState(transaction = undefined) {
  let currScreenCtrl = await db.SugoLiveScreenControl.findOne({ raw: true, transaction })
  if (!currScreenCtrl) {
    let createRes = await saveScreenControllerState({}, transaction)
    currScreenCtrl = createRes.get({plain: true})
  }
  const currentThemes = _.get(currScreenCtrl, 'currentThemes', [])
  const currTheme = currentThemes.length > 0 && await db.SugoLiveScreenControlTheme.findAll({
    where: {
      id: { [Op.in]: currentThemes }
    },
    raw: true,
    transaction
  })
  return {
    currScreenCtrl:{
      ...currScreenCtrl,
      current_theme_id: currScreenCtrl.current_theme_id || currentThemes[0]
    },
    currTheme: _.find(currTheme, {id: currentThemes[0]}),
    playTimeInSeconds: 0 // 根据这个来进行轮播与切换主题
  }
}

async function saveScreenControllerState(currScreenCtrlState, transaction = undefined) {
  // 去掉屏幕状态等临时信息
  let removedTempDataState = immutateUpdates(currScreenCtrlState, 'screenInfos.screens', arr => (arr || []).map(si => _.omit(si, 'online')))
  if (removedTempDataState.id) {
    return await db.SugoLiveScreenControl.update(removedTempDataState, {where: {id: removedTempDataState.id}, transaction})
  }
  removedTempDataState.title = 'default'
  return await db.SugoLiveScreenControl.create(removedTempDataState, {transaction})
}

class SugoLivescreenBroadcast extends SocketServiceBase {

  constructor() {
    super()
    this.ws = null
    this.state = null
    this.screenLiveControlService = new ScreenLiveControlService()
  }
  
  async initState() {
    // 暂定每 10 秒变一次，轮播和切换大屏的逻辑
    if (this._timer) {
      return
    }
    await getScreenControllerState().then(res => {
      this.state = res
      // res = {
      //   currScreenCtrl:{
      //     ...currScreenCtrl,
      //     current_theme_id: currScreenCtrl.current_theme_id || currentThemes[0]
      //   },
      //   currTheme: _.find(currTheme, {id: currentThemes[0]}),
      //   currIdx: 0,
      //   playTimeInSeconds: 0 // 根据这个来进行轮播与切换主题
      // }
    })
    
    this._timer = setInterval(async () => {
      if (!this.state || !_.get(this.state, 'currScreenCtrl.current_theme_id')) {
        return
      }
      // 如果没有屏幕在线，则停止计时
      if (!_.some(_.get(this.state, 'currScreenCtrl.screenInfos.screens'), s => s.online)) {
        return
      }
      const { currScreenCtrl, currTheme, playTimeInSeconds } = this.state
      let {timer = 60, currentThemes, current_theme_id} = currScreenCtrl || {}
      let {timer: time_range = 10} = currTheme || {}
      if (_.isEmpty(currentThemes)) {
        return
      }
      const nextPlayTimeInSeconds = playTimeInSeconds + 10
      // 在这里判断，到了需要轮播/切换主题再通知
      // 轮播间隔为 0 表示不切换
      const prevThemeIdx = timer === null || timer === 0 ? 0 : Math.floor(playTimeInSeconds / timer)
      const nextThemeIdx = timer === null || timer === 0 ? 0 : Math.floor(nextPlayTimeInSeconds / timer)
      const prevThemePageIdx = time_range === null || time_range === 0 ? 0 : Math.floor(playTimeInSeconds / time_range)
      const nextThemePageIdx = time_range === null || time_range === 0 ? 0 : Math.floor(nextPlayTimeInSeconds / time_range)
      
      if (prevThemeIdx !== nextThemeIdx) {
        let currThemeIdx = _.findIndex(currentThemes, tId => tId === current_theme_id)
        let nextThemeIdx = (currThemeIdx + 1) % currentThemes.length
        let nextScreenCtrlState = immutateUpdate(this.state.currScreenCtrl, 'current_theme_id', () => currentThemes[nextThemeIdx])
        let nextTheme = await this.screenLiveControlService.getOneTheme(nextScreenCtrlState.current_theme_id)
        await this.updateState({
          playTimeInSeconds: 0,
          currScreenCtrl: nextScreenCtrlState,
          currTheme: nextTheme
        })
        this.notifyStateChange(null)
        return
      }
      if (prevThemePageIdx !== nextThemePageIdx) {
        await this.updateState({playTimeInSeconds: nextPlayTimeInSeconds})
        this.notifyStateChange(null)
        return
      }
      await this.updateState({playTimeInSeconds: nextPlayTimeInSeconds})
      // 每 60 秒同步一次状态，避免有时浏览器断线后没有收到切换主题的信息，如果主题的切换间隔较长，则会很奇怪
      if (playTimeInSeconds % 20 === 0) {
        this.notifyStateChange(null)
      }
    }, 10 * 1000)
  }
  
  async register(sessionId, data, ws) {//新连接注册进来请求服务
    this.ws = this.ws || ws
    await this.initState()
    
    // 服务器重启后恢复屏幕状态等信息
    let socket = ws.getSocketById(sessionId)
    let {uid, client} = socket.handshake.query || {}
    uidDict[sessionId] = uid
    clientTypeDict[sessionId] = client
    if (uid) {
      // 大屏才有 uid
      // 大屏登录时，更新屏幕状态
      this.state = await this.onScreenStateChange(uid, true)
      this.notifyStateChange(sessionId)
      debug('screenInfos change: ', this.state.currScreenCtrl.screenInfos)
    }
  
    debug('room member added: ', uidDict, '\n', clientTypeDict)
    return true
  }

  async cancel(sessId) {//前端注销服务,本服务已无法再发送信息给前端,清理数据
    if (clientTypeDict[sessId] === ClientTypeEnum.broadcastClient) {
      await this.onScreenStateChange(uidDict[sessId], false)
      this.notifyStateChange(sessId)
      debug('screenInfos change: ', this.state.currScreenCtrl.screenInfos)
    }
    delete uidDict[sessId]
    delete clientTypeDict[sessId]
    debug('room member exited: ', uidDict, '\n', clientTypeDict)
  }

  request(data, id) { //处理request,类似一个ajax,前端期待短时间内会返回一个结果,只是请求和返回都是通过socket
    return null
  }
  
  async onScreenStateChange(uid, isOnline) {
    // 大屏下线时，更新屏幕状态
    const screenCtrlState = this.state
    let nextScreenCtrlState = immutateUpdates(screenCtrlState.currScreenCtrl, 'screenInfos.screens', prev => {
      if (!prev) {
        prev = []
      }
      return _.some(prev, si => si.uid === uid)
        ? prev.map(si => si.uid === uid ? {...si, online: isOnline} : si)
        : [...prev, {uid, online: isOnline}]
    })
    return await this.updateState({currScreenCtrl: nextScreenCtrlState})
  }
  
  notifyStateChange(sourceId) {
    Object.keys(clientTypeDict).filter(sessId => sessId !== sourceId).forEach(sessId => {
      this.ws.pushById(sessId, 'stateChange', this.state)
    })
  }
  
  async updateState(newStateObj, transaction = undefined) {
    const oldState = this.state
    this.state = { ...oldState, ...newStateObj }

    // 写入数据库，去掉屏幕状态等信息
    if (isDiffByPath(oldState, this.state, 'currScreenCtrl')) {
      let stateInDb = await saveScreenControllerState(this.state.currScreenCtrl, transaction)
      if (stateInDb.id) {
        this.state.currScreenCtrl.id = stateInDb.id
      }
    }

    if (newStateObj.type === 'all'){
      // let removedTempDataState = immutateUpdates(this.state.currScreenCtrl, 'screenInfos.screens', () => [])
      let removedTempDataState = immutateUpdates(this.state.currScreenCtrl, 'screenInfos.screens', arr => (arr || []).filter(si => si.online))
      removedTempDataState = immutateUpdates(removedTempDataState, 'screenInfos.screens', arr => (arr || []).map(si => _.omit(si, 'online')))
      if (removedTempDataState.id) {
        let stateInDb = await db.SugoLiveScreenControl.update(removedTempDataState, {where: {id: removedTempDataState.id}, transaction})
        if (stateInDb.id) {
          this.state.currScreenCtrl.id = stateInDb.id
        }
      }
    }

    return this.state
  }
}

const sugoLivescreenBroadcast = new SugoLivescreenBroadcast()

async function genJwtSign() {
// 返回单点登录 jwt token 给 frontendClient
  let user = await db.SugoUser.findOne({where: {username: 'admin'}, raw: true})
  const apiScopes = [
    'get#/console/screen-control',
    'get#/app/screenLiveControl/list',
    'get#/app/live-screen-projection/theme/list',
    'get#/app/screenLiveControl/list-logger',
    'post#/app/screenLiveControl/update-screencontrol',
    'post#/app/screenLiveControl/create-theme',
    'post#/app/screenLiveControl/change-contain-timerange',
    'post#/app/screenLiveControl/save-themelist-order',
    'post#/app/screenLiveControl/update-theme',
    'post#/app/screenLiveControl/delete-theme'
    // '*'
  ]
  return jwtSign(user, {
    apiScopes,
    pathScopes: ['/console/screen-control', '/live-screen-broadcast-terminal'],
    expiresIn: '100y'
  })
}

// 初始化
sugoLivescreenBroadcast.on('init', async function (sessionId, data) {
  const { client: clientType, uid } = data
  clientTypeDict[sessionId] = clientType
  uidDict[sessionId] = uid
  
  let screenCtrlState = this.state

  let res = { msg: '初始化成功' }
  if (clientType === ClientTypeEnum.frontendClient) {
    res = {
      ...res,
      jwtSign: await genJwtSign()
    }
  } else if (clientType === ClientTypeEnum.backendClient) {
    res = {
      ...res,
      ...screenCtrlState,
      jwtSign: await genJwtSign()
    }
  } else if (clientType === ClientTypeEnum.broadcastClient) {
    // 返回全部状态，大屏自己会进行初始化
    Object.assign(res, {
      ...screenCtrlState
    })
  }
  this.ws.pushById(sessionId, 'init', res)
})

sugoLivescreenBroadcast.on('deinit', function (sessionId, data) {
})

// 开始投屏（初次投屏/控制器切换大屏主题/删除了离线的屏幕）
sugoLivescreenBroadcast.on('broadcast', async function (sessionId, data) {
  const {currScreenCtrl, username, type} = data
  const { current_theme_id, screenInfos } = currScreenCtrl
  let currTheme = []
  currTheme = current_theme_id 
    ? await this.screenLiveControlService.getOneTheme(current_theme_id)
    : []
  await this.updateState({
    currScreenCtrl: immutateUpdates(this.state.currScreenCtrl,
      'current_theme_id', () => current_theme_id,
      'screenInfos.screens', prevScreens => {
        // 前端只有排序和删掉离线屏幕的功能，总之不能让前端删掉在线屏幕
        let nextScreens = _.get(screenInfos, 'screens', [])
        return _.orderBy(prevScreens, s => _.findIndex(nextScreens, ns => ns.uid === s.uid))
          .filter(s => s.online || _.some(nextScreens, ns => ns.uid === s.uid))
      }
    ),
    currTheme,
    playTimeInSeconds: 0,
    type
  })
  
  // 通知 frontendClient 打开屏幕
  Object.keys(_.pickBy(clientTypeDict, v => v === ClientTypeEnum.frontendClient)).forEach(sessId => {
    this.ws.pushById(sessId, 'launchScreen', this.state)
  })
  this.notifyStateChange(null)

  const logger = {
    content: '切换大屏主题',
    opera_user: username,
    operate: '切换大屏主题'
  }
  await this.screenLiveControlService.createLogger(logger)
})

// 取得状态
sugoLivescreenBroadcast.on('getState', async function (sessionId, data) {
  const screenCtrlState = this.state
  this.ws.pushById(sessionId, 'getStateReturn', screenCtrlState)
})

/**
 * @description
 * 通知服务器端，控制器状态在外部有变更，更新状态
 * @export
 * @param {any} [transaction=undefined] 
 */
export async function notifyLiveScreenCtrlStateChange(transaction = undefined) {
  const { currScreenCtrl, currTheme} = await getScreenControllerState(transaction)
  // console.log('online===',  currScreenCtrl, currTheme)
  // 恢复屏幕状态
  const currScreenCtrlWithOnlineState = immutateUpdate(currScreenCtrl, 'screenInfos.screens', sArr => {
    return (sArr || []).map(s => ({...s, online: !!_.findKey(uidDict, v => v === s.uid)}))
  })
  await sugoLivescreenBroadcast.updateState({
    currScreenCtrl: currScreenCtrlWithOnlineState,
    currTheme
  }, transaction)
  sugoLivescreenBroadcast.notifyStateChange(null)
}

sugoLivescreenBroadcast.on('reloadState', notifyLiveScreenCtrlStateChange)

sugoLivescreenBroadcast.on('getOneScreen', async function (sessionId, data) {
  const {livescreenId} = data
  const liveScreen = await SugoLiveScreenService.getOneScreen(null, null, {id: livescreenId})
  this.ws.pushById(sessionId, 'getOneScreen', { liveScreen })
})

export default sugoLivescreenBroadcast
