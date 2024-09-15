import React from 'react'
import getSocket from '../../common/websocket'
import _ from 'lodash'
import Chart from '../LiveScreen/chart'
import {ClientTypeEnum, UploadedFileType} from '../../../common/constants'
import {parseQuery} from '../../../common/sugo-utils'
import {renderPageTitle} from '../Common/bread'
import UploadedFileFetcher from '../Fetcher/uploaded-files-fetcher'
import {connect} from 'react-redux'
/** @jsx jsx */
import { jsx, css } from '@emotion/core'
import {getProjectList} from '../LiveScreen/actions/workbench'

const serviceName = 'sugo_livescreen_broadcast'
let background_image_id = null

@connect(state => {
  return {
    runtimeState: _.get(state, 'livescreen_workbench.runtimeState', {})
  }
})
export default class LiveScreenBroadCastTerminal extends React.Component {
  state = {
    liveScreen: {},
    myScreenIdx: null
  }
  
  socket = null
  
  getUid() {
    let {uid} = parseQuery()
    console.log('uid: ', uid)
    return uid
  }
  
  componentDidMount() {
    this.initSocket()
    window.addEventListener('resize', this.onWindowResize)
    this.onWindowResize()
    
    // 取得项目信息，MySQL 项目不使用排队查询逻辑
    getProjectList()()
  }

  /**
   * 投屏终端主要逻辑
   * 取得此屏幕的当前大屏的状态，否则显示空白/显示数字（dev）
   * @returns {Promise<void>}
   */
  async initSocket() {
    // 将 id 等信息设置到 query 以便重连时重新绑定
    const uid = this.getUid()
    let socket = await getSocket({query: {uid, client: ClientTypeEnum.broadcastClient, room: serviceName}})
    this.socket = socket
    socket.register(serviceName)
    socket.on(serviceName, 'init', this.onSocketInit)
    socket.on(serviceName, 'stateChange', this.onBroadcastStateChange)
    socket.on(serviceName, 'getOneScreen', this.onGetOneScreenReturn)
    socket.sendTo(serviceName, 'init', {
      client: ClientTypeEnum.broadcastClient,
      uid: uid
    })
    
    window.testSocket = () => {
      socket.sendTo(serviceName, 'getState', {})
    }
  }
  
  componentWillUnmount() {
    window.removeEventListener('resize', this.onWindowResize)
    let {socket} = this
    if (socket) {
      socket.off(serviceName, 'init', this.onSocketInit)
      socket.off(serviceName, 'stateChange', this.onBroadcastStateChange)
      socket.off(serviceName, 'getOneScreen', this.onGetOneScreenReturn)
      socket.sendTo(serviceName, 'deinit', {
        client: ClientTypeEnum.broadcastClient,
        uid: this.getUid()
      })
    }
  }
  
  onSocketInit = data => {
    console.log(data.msg)
    // background_image_id = _.get(data, 'initLiveScreen.background_image_id', null)
    // this.setState({
    //   liveScreen: _.get(data, 'initLiveScreen', null)
    // })
    this.onBroadcastStateChange(data)
  }
  onBroadcastStateChange = data => {
    let {currScreenCtrl, currTheme, playTimeInSeconds} = data
    const uid = this.getUid()
    if (_.isEmpty(currTheme)) {
      let screens = _.get(currScreenCtrl, 'screenInfos.screens', [])
      let myScreenIdx = _.findIndex(screens, s => s.uid === uid)
      this.setState({liveScreen: null, myScreenIdx})
      return
    }
    // 取得自身要播放的大屏，切换主题的逻辑在后端做
    let screens = _.get(currScreenCtrl, 'screenInfos.screens', [])
    let myScreenIdx = _.findIndex(screens, s => s.uid === uid)
    const themePageCount = _.size(_.get(currTheme, 'contains'))
    if (myScreenIdx === -1 || themePageCount === 0) {
      return
    }
    // 轮播间隔为 0 表示不切换
    let timer = _.get(currTheme, 'timer')
    const themePagePlayIntervalInSeconds = timer === 0 || timer === null ? 0 : timer
    const themePageIdx = themePagePlayIntervalInSeconds === 0 ? 0 : Math.floor(playTimeInSeconds / themePagePlayIntervalInSeconds) % themePageCount
    const currLiveScreenId = _.get(currTheme, `contains[${themePageIdx}][${myScreenIdx}]`)
    if (currLiveScreenId) {
      this.socket.sendTo(serviceName, 'getOneScreen', { livescreenId: currLiveScreenId})
      this.setState({myScreenIdx})
    } else {
      this.setState({liveScreen: null, myScreenIdx})
    }
  }
  
  onGetOneScreenReturn = data => {
    const { liveScreen } = data
    let {liveScreen: oldLiveScreen} = this.state
    if (_.isEqual(oldLiveScreen, liveScreen)) {
      return
    }
    this.setState({liveScreen})
  }

  onWindowResize = () => {
    const { liveScreen } = this.state
    const { screen_width = '', screen_height = '' } = liveScreen
    const { clientWidth, clientHeight } = document.documentElement
    // const { width, height } = window.screen
    const mountNode = this.props.mountTo
    if (mountNode) {
      const style = {
        transform: `scale(${clientWidth / screen_width}, ${clientHeight / screen_height})`,
        'transform-origin': 'left top 0px',
        // background: 'url("/static/images/livefeed-template-bg.jpg") 0% 0% / 100% 100%',
        width: `${screen_width}px`,
        height: `${screen_height}px`,
        overflow: 'hidden'
      }
      Object.assign(mountNode.style, style)
    }
  }

  generateComponentDom = (component) => {
    const { left, top, width, height, z_index, offset = 0 } = component
    const comStyle = {
      left,
      top,
      width,
      height,
      zIndex: z_index + offset
    }
    const wraperStyle = {
      width,
      height
    }
    const componentMap = {
      id: 'id',
      viz_type: 'type',
      style_config: 'style_config',
      data_source_config: 'params',
      width: 'width',
      height: 'height',
      left: 'left',
      top: 'top',
      z_index: 'zIndex'
    }
    const screenComponent =  _.reduce(
      _.pick(component, Object.keys(componentMap)),
      (result, value, key) => {
        result[componentMap[key]] = value
        return result
      },
      {}
    )

    return (
      <div key={z_index} className="-screen-com" style={comStyle}>
        <div className="-screen-wraper" style={wraperStyle}>
          <Chart {...screenComponent} />
        </div>
      </div>
    )
  }
  
  render() {
    const {runtimeState} = this.props
    const { liveScreen, myScreenIdx } = this.state
    const { components = [] } = liveScreen || {}
    const bgImageId = _.get(liveScreen, 'background_image_id')
    return (
      <UploadedFileFetcher
        fileId={bgImageId || 'missing'}
        type={UploadedFileType.Image}
      >
        {({isFetching, data, fetch, deleteUploadedFile, createUploadedFile}) => {
          const bgFile = bgImageId ? _.get(data, [0]) : null
          // const pageTitle = `${_.isNil(myScreenIdx) ? '' : `${myScreenIdx + 1}号屏投影中 - `}${!_.isEmpty(liveScreen) ? liveScreen.title : '等待开始投影'}`
          const pageTitle = `${`${myScreenIdx + 1}号屏投影中 - `}${!_.isEmpty(liveScreen) ? liveScreen.title : ''}`
          return (
            <div
              className="screen-layout"
              css={{
                background: bgFile
                  ? `url("${bgFile.path}") 0% 0% / 100% 100%`
                  : '#373d43',
                ...(_.get(runtimeState, 'theme.screenCss') || {})
              }}
            >
              {renderPageTitle(pageTitle)}
              {components.map(component => this.generateComponentDom(component))}
            </div>
          )
        }}
      </UploadedFileFetcher>
    )
  }
}
