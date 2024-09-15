import {message} from 'antd'
import {immutateUpdate} from 'common/sugo-utils'
import Fetch from '../../../common/fetch-final'
import _ from 'lodash'
import {getJwtSign} from '../../../common/jwt-helper'
import {withExtraQuery} from '../../../common/fetch-utils'

export const namespace = 'LiveScreenControlStore'

const prefix = '/app/live-screen-projection'

export default {
  namespace: namespace,
  state: {
    loading: false,
    logger: [],
    loggerCount: 0,
    themeList: [],
    themeCount:0,
    screenArr: [],
    visiblePopoverKey: '',
    sharingUrl: '',
    jwtSign: '',
    screenOption: {
      id: '',
      current_theme_id: '',
      current_theme_order: []
    },
    //服务端时间
    playTimeInSeconds: 0,
    //大屏播放列表
    playList: [],
    //主题轮播时间
    timer:undefined,
    playId:'',
    screenInfos:{},
    screenControlNum: 0
  },
  reducers: {
    updateState(state, {payload}) {
      return immutateUpdate(state, '', payload)
    },
    getScreenControllerState(state, {payload}) {
      return {
        ...state,
        screenOption: payload.screenOption,
        playTimeInSeconds: payload.playTimeInSeconds
      }
    },
    initScreenArr(state, {screenArr}) {
      return {
        ...state,
        screenArr
      }
    },
    initThemeList(state, {themeList,themeCount}) {
      return {
        ...state,
        themeList,
        themeCount
      }
    },
    changeTheme(state, {theme}) {
      return {
        ...state,
        screenOption: {
          ...state.screenOption,
          current_theme_id: theme
        }
      }
    },
    updateLogger(state, {res}) {
      return {
        ...state,
        loggerCount: res.count,
        logger: res.rows
      }
    },
    setLoading(state, {loading}) {
      return {
        ...state,
        loading
      }
    },
    setJwtSign(state, {payload: jwtSign}) {
      return {
        ...state,
        jwtSign
      }
    },
    updatePlayList(state, {payload}) {
      const {playList} = payload
      return {...state, playList}
    },
    updatePlayConfig(state, {payload}) {
      const {timer,playId,screenInfos} = payload
      if(playId){
        return {...state, timer,playId,screenInfos}
      }else{
        return {...state, timer}
      }
    }
  },
  sagas: {
    * asyncGenSharingUrl({payload}, effects) {
      let jwtSign = yield effects.call(getJwtSign, {apiScopes: ['*'], pathScopes: ['/console/screen-control']})
      const urlWithoutHash = window.location.href.replace(window.location.hash,'')
      let queryParams = {
        hideTopNavigator: 1,
        hideLeftNavigator: 1,
        jwtSign
      }
      const url = withExtraQuery(urlWithoutHash, queryParams)
      yield effects.put({
        type: 'updateState',
        payload: prevState => ({...prevState, sharingUrl: url})
      })
    },
    * asyncFetchScreenControllerState({}, effects) {
      let res = yield effects.call(Fetch.get,`${prefix}/get-screencontroller-state`)
      if (res.success) {
        yield effects.put({
          type: 'getScreenControllerState',
          payload: {
            screenOption: res.result[0]
          }
        })
      }
    },
    * asyncFetchLogger({ payload }, effects) {
      const { page, pageSize } = payload
      yield effects.put({
        type: 'setLoading',
        loading: true
      })
      const res = yield effects.call(Fetch.get, `${prefix}/list-logger`, {
        page,
        pageSize
      })
      if (res.success) {
        yield effects.put({
          type: 'updateLogger',
          res: res.result
        })
      }
      yield effects.put({
        type: 'setLoading',
        loading: false
      })
    },
    //切换大屏主题
    * asyncChangeTheme({payload}, effects) {
      const { theme } = payload
      const id = yield effects.select((state) => state[namespace].screenOption.id)
      const res = yield effects.call(Fetch.post, `${prefix}/update-screencontrol`,{
        id, current_theme_id: theme
      })
      if (res.success) {
        yield effects.put({
          type: 'changeTheme',
          theme
        })
        yield
      }
    },
    * asyncGetLiveScreen({}, effects) {
      const res = yield effects.call(Fetch.get, '/app/livescreen-publish/get')
      yield effects.put({
        type: 'initScreenArr',
        screenArr: res.result.filter(i => i.status !== 0 && !(i.is_template))
      })
    },
    //获取主题列表
    * asyncGetThemeList({payload}, effects) {
      const res = yield effects.call(Fetch.get, `${prefix}/theme/list`, {
        ...payload
      })
      if (res) yield effects.put({
        type: 'initThemeList',
        themeList: res.result.rows,
        themeCount:res.result.count
      })
    },
    * asyncUpdateTheme({payload}, effects) {
      const {id, contain} = payload
      const {username} = window.sugo.user
      const logger = {
        content: '修改主题内大屏内容',
        opera_user: username,
        operate: '修改主题内大屏内容'
      }
      const res = yield effects.call(Fetch.post, `${prefix}/update-theme`, {
        id, contain, logger
      })
      if (res && res.success) {
        message.success('保存成功')
        yield effects.put({
          type: 'asyncGetThemeList'
        })
      }
    },
    * asyncUpdateThemeTitle({ payload }, effects) {
      const { id, title } = payload
      const { username } = window.sugo.user
      const themeList = yield effects.select((state) => state[namespace].themeList)
      const oldtitle = _.get(_.find(themeList,o => o.id === id), 'title')
      const logger = {
        content: `修改主题${oldtitle}标题为${title}`,
        opera_user: username,
        operate: '修改主题'
      }
      const res = yield effects.call(Fetch.post, `${prefix}/update-theme`, {
        id, title, logger
      })
      if(!res.success) {
        return message.error(res.message || '保存失败')
      }
      yield effects.put({
        type: 'asyncGetThemeList'
      })
      message.success('保存成功')
    },
    * asyncChangeThemeTimeRange({ payload }, effects) {
      const { time_range, id } = payload
      const { username } = window.sugo.user
      const themeList = yield effects.select((state) => state[namespace].themeList)
      const title = _.get(_.find(themeList,o => o.id === id), 'title')
      const logger = {
        content: `修改主题${title}内大屏轮播时间为${time_range}分钟`,
        opera_user: username,
        operate: '修改主题'
      }
      const res = yield effects.call(Fetch.post, `${prefix}/update-theme`, { id, time_range, logger })
      if (res) {
        yield effects.put({
          type: 'asyncGetThemeList'
        })
      }
    },
    * asyncDeleteTheme({ payload }, effects) {
      const { themeId ,screenId } = payload
      const { username } = window.sugo.user
      const themeList = yield effects.select((state) => state[namespace].themeList)
      const title = _.get(_.find(themeList,o => o.id === themeId), 'title')
      const logger = {
        content: `删除主题${title}`,
        opera_user: username,
        operate: '删除主题'
      }
      const res = yield effects.call(Fetch.post,`${prefix}/delete-theme`, {id: themeId, screenId, logger})
      if (res) {
        yield effects.put({
          type: 'asyncGetThemeList'
        })
      }
    },
    * asyncSaveThemeListOrder({ payload }, effects) {
      const { themeListOrder, id } = payload
      const res = yield effects.call(Fetch.post, `${prefix}/save-themelist-order`, {
        current_theme_order: themeListOrder, id
      })
      if (res.success) {
        yield effects.put({
          type: 'asyncFetchScreenControllerState'
        })
      }
    },
    * asyncChangeContainTimeRange({payload}, effects) {
      const { theme_time_range, id} = payload
      const res = yield effects.call(Fetch.post, `${prefix}/change-contain-timerange`, {
        id, theme_time_range
      })
      if (res) {
        yield effects.put({
          type: 'asyncFetchScreenControllerState'
        })
      }
    },
    * getPlayList({payload}, effects) {
      const res = yield effects.call(Fetch.get, `${prefix}/get` )
      if (res&&res.result) {
        const {id,currentThemes,timer,screenInfos}=res.result
        yield effects.put({
          type: 'updatePlayConfig',
          payload: {
            playId: id,
            timer,
            screenInfos
          }
        })
        yield effects.put({
          type: 'updatePlayList',
          payload: {
            playList: currentThemes.map(id=>({id}))
          }
        })
      }
    },
    * setPlayList({payload}, effects) {
      let { playList,timer=60,screenInfos,playId, cbErr } = payload
      if (timer % 10 !== 0) return cbErr()
      const currentThemes=playList.filter(({id})=>typeof (id) ==='string').map(({id})=>id)
      const res = yield effects.call(Fetch.post, `${prefix}/save`, {
        currentThemes,timer,screenInfos,id:playId
      })
      if (res) {
        message.success('投屏成功')
        //get latest result
        yield effects.put({
          type: 'getPlayList'
        })
        yield effects.put({
          type: 'asyncGetThemeList'
        })
      }else{
        message.error('投屏失败')
      }
    },
    * getScreenGlobalConfig({payload}, effects) {
      const res = yield effects.call(Fetch.get, '/app/global-config', {
        key: 'screen-control-num'//大屏投影屏幕个数
      })
      if (_.isEmpty(res.result)) {
        return yield effects.put({
          type: 'updateState',
          payload: prevState => ({...prevState, screenControlNum: 4})
        })
      }
      return yield effects.put({
        type: 'updateState',
        payload: prevState => ({...prevState, screenControlNum: _.get(res, 'result.[0].value')})
      })
    },
    * updateScreenGlobalConfig({payload}, effects) {
      const res = yield effects.call(Fetch.get, '/app/global-config', {
        key: 'screen-control-num'//大屏投影屏幕个数
      })
      let result = null
      if (_.isEmpty(res.result)) {
        result = yield effects.call(Fetch.post, '/app/global-config', {
          key: 'screen-control-num',
          value: +payload
        })
      }else {
        result = yield effects.call(Fetch.put, `/app/global-config/${_.get(res, 'result.[0].id')}`, {
          value: +payload//大屏投影屏幕个数
        })
      }
      if(!_.isEmpty(result)) {
        yield effects.put({
          type: 'updateState',
          payload: prevState => ({...prevState, screenControlNum: +payload})
        })
        return message.success('设置成功')
      }
      message.error('设置失败')
    }
  }
}
