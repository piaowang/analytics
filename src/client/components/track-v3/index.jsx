/**
 * created by xujun create at 2020/07/09
 * 可视化埋点主界面
 */
import React from 'react'
import { LogoutOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons'
import { Card, Col, Row, Button, Popconfirm, Alert, Spin, Tabs, Tag } from 'antd'
import Bread from 'client/components/Common/bread'
import { browserHistory } from 'react-router'
import _ from 'lodash'
import uuid from 'node-uuid'
import { generateEventKey, getTrackEventInfo, APP_TYPE, APP_TRACK_TYPE } from './constants'
import EventEditForm from './event/event-edit'
import PageEditForm from './page/page-edit'
import EventList from './event/event-list'
import HiddenList from './event/hidden-list'
import CopyEventModal from './copy-event-modal'
import WebSocketManager from './parsing/webscoket-manager'
import { dataBindsToDimBinding, dimBindingToDataBinds, getScreenShot } from './operation/track-opertion'
import getContentInfo from './content/index'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import TrackEventV3, { namespace } from './model'
import { connect } from 'react-redux'
import TestMessageModal from './test-modal'
import AutoTrackEventEdit from './event/auto-track-event-edit'
import './track.styl'
import APP_NO_OPEN from '../../images/track/app_cannot_open.png'

const TabPane = Tabs.TabPane

@connect(state => {
  return { ...state[namespace] }
})
@withRuntimeSagaModel(TrackEventV3)
export default class Track extends React.Component {

  state = {
    websocketStatus: '',  // webSocket 连接状态
    currentEventInfo: {}, // 当前修改的事件属性
    currentPageInfo: {},  // 当前选中页面属性
    controls: {},      // 上报的组件信息div可圈选的内容
    classAttrs: {},       // 组件关联属性的map 对象 例如： {text：['id', 'style']}
    imgUrl: '',           // 当前显示的图片内容
    imgHeight: 0,         // 埋点图片的高度
    imgWidth: 0,          // 埋点图片的宽度
    deviceInfo: {},       // 设备基础信息
    token: '',            // 埋点token信息
    appType: 'android',   // 埋点类型
    hiddenList: [],       // 隐藏的控件列表
    showTrackEvent: false,// 是否显示当前页面埋点事件 
    appMultiViews: [],    // 页面集合 原生和h5 
    currentEvevntTabKey: 'eventEdit',// eventpanel激活的tab
    isReportData: false,    //高级上报模式
    currentPageView: {},    //当前选中的页面信息 { hashcode：'', isH5: fasle, path: '', title: ''}      
    appVersion: '',          //当前可视化埋点版本号
    testTrackVisible: false,//显示测试埋点框
    scale: 1, //压缩比例
    currentEventId: '',
    testMessage: [], //测试信息
    xwalkScreenshots: [],
    h5ControlClass: {},
    trackType: APP_TRACK_TYPE.track //可视化类型
  }

  showTrackEvent = {} // 埋点信息截图缓存
  secretKey = '' // 每次socket的唯一id 用于多用户同时埋点
  webscoketManager = null
  screenShotMap = {} // 节点信息

  componentDidMount() {
    const token = this.props.params.token
    const { type: appType, trackType } = this.props.location.query
    this.secretKey = uuid.v4()
    // 初始化websocket连接信息
    this.webscoketManager = new WebSocketManager(
      this.websocketChangeState,
      token,
      this.secretKey,
      { appType, isHeatMap: false }
    )
    this.setState({ appType })
    if (trackType === APP_TRACK_TYPE.autoTrack) {
      this.setState({ trackType })
      return
    }
    this.dispatchHandler('getAppVersionList')
    this.dispatchHandler('getDimensions')
  }
  /**
   * sagamodel数据交互方法
   * @param {*} type 
   * @param {*} payload 
   */
  dispatchHandler = (type, payload = {}, callback) => {
    const { dispatch } = this.props
    const token = this.props.params.token
    const { appVersion } = this.state
    dispatch({ type: `${namespace}/${type}`, payload: { token, appVersion, ...payload }, callback })
  }

  /**
   * 修改sagamodel state
   * @param {*} type 
   * @param {*} payload 
   */
  changeState = (payload = {}) => {
    const { dispatch } = this.props
    dispatch({ type: `${namespace}/changeState`, payload })
  }

  /**
   * websocket 修改界面state
   * @param {*} obj 修改的属性对象
   */
  websocketChangeState = (obj) => {
    const { pageMap } = this.props
    const { currentPageView, currentEventInfo } = this.state
    const { trackType } = this.props.location.query
    const { appMultiViews, deviceInfo } = obj
    // 加载设备新信息
    if (!_.isEmpty(deviceInfo)) {
      const appVersion = _.get(obj, 'deviceInfo.appVersion')
      if (trackType === APP_TRACK_TYPE.autoTrack) {
        this.dispatchHandler('getAutoTrackEventList', {})
      } else {
        this.dispatchHandler('getTrackEventList', { appVersion, showEventCopy: true })
        this.dispatchHandler('getPageList', { appVersion })
      }
      this.setState(obj)
      return
    }

    if (_.isEmpty(appMultiViews)) {
      this.setState(obj)
      return
    }

    const firstView = _.first(appMultiViews)
    const defaultPageInfo = {
      code: '',
      is_submit_point: false,
      page_name: _.get(firstView, 'title', ''),
      page: _.get(firstView, 'path', '')
    }

    // // 第一次进入界面
    // if (_.isEmpty(currentPageView)) {
    //   this.setState({ ...obj, currentPageView: firstView, currentEventInfo: _.get(pageMap, firstView.path, '') })
    //   return
    // }
    // 判断接界面是否跳转切换 如果是同一界面则不切换currentPageInfo 如果是新页面则切换成最新页面集合的第一个页面
    const hasCurrentPage = _.isEmpty(currentPageView) ? false : _.some(appMultiViews, p => p.path === currentPageView.path)
    let pageInfo = {}
    if (!hasCurrentPage) {
      pageInfo = {
        currentPageView: firstView,
        currentPageInfo: {
          ...defaultPageInfo,
          ..._.get(pageMap, firstView.path, {})
        },
        currentEventInfo: {},
        currentEventId: '',
        isReportData: false
      }
    }
    this.setState({ ...obj, ...pageInfo })
  }

  // 获取点击元素的属性
  showEditEvent = (view) => {
    const { trackEventMap } = this.props
    const { currentEventInfo, isReportData } = this.state
    const {
      sugo_autotrack_content,
      sugo_autotrack_path,
      sugo_autotrack_position,
      hashCode,
      event_path_type,
    } = view
    //如果是选择上报数据模式 就添加dim_binding中属性
    if (isReportData) {
      if (_.some(currentEventInfo?.dim_binding,
        p => p.path === sugo_autotrack_path || p.sugo_autotrack_path === sugo_autotrack_path)
      ) {
        return
      }
      let dimBinding = event_path_type === APP_TYPE.h5
        ? {
          dimension: '',
          similar: currentEventInfo.similar,
          path: sugo_autotrack_path
        }
        : {
          dimension: '',
          sugo_autotrack_path,
          sugo_autotrack_position
        }
      this.setState({
        currentEventInfo: {
          ...currentEventInfo,
          dim_binding: [
            ..._.get(currentEventInfo, 'dim_binding', []),
            dimBinding
          ]
        }
      })
      return
    }
    // 同一事件不触发更新
    if (currentEventInfo.currentEventId === hashCode) {
      return
    }

    let editEventInfo = {
      ..._.pick(view, [
        'position',
        'sugo_autotrack_path',
        'sugo_autotrack_page_path',
        'event_path_type',
        'sugo_autotrack_position',
        'sugo_autotrack_content',
        'hashCode',
        'event_id',
        'eventClass'
      ]),
      event_name: sugo_autotrack_content,
    }
    // 获取已埋点的事件的属性
    const event = getTrackEventInfo(editEventInfo, trackEventMap)
    if (!event) {
      this.setState({
        isReportData: false,
        currentEventInfo: {
          ...editEventInfo,
          code: '',
          advance: false,
          similar: false,
          cross_page: false,
          tags: [],
          dim_binding: [],
          similar_path: ''
        },
        currentEventId: editEventInfo.hashCode,
        currentEvevntTabKey: 'eventEdit'
      })
      return
    }

    // 已保存的事件信息信息
    this.setState({
      currentEventInfo: {
        ...editEventInfo,
        ..._.pick(event, [
          'id',
          'event_id',
          'class_attr',
          'event_name',
          'code',
          'advance',
          'similar',
          'cross_page',
          'event_type',
          'extend_value',
          'screenshot_id',
          'event_memo'
        ]),
        dim_binding: dataBindsToDimBinding(event, event_path_type),
        similar_path: event.similar_path || ''
      },
      isReportData: false,
      currentEventId: editEventInfo.hashCode,
      currentEvevntTabKey: 'eventEdit'
    })
  }

  /**
   * 退出可视化埋点 关闭websocket连接
   */
  closeWebSocket = () => {
    this.webscoketManager.closeWebConn()
    browserHistory.goBack()
  }
  /**
   * 事件列表选中
   */
  onEventListSelect = (event) => {
    const { currentPageView, controls, currentEventInfo } = this.state
    // 获取已埋点的事件的属性
    if (currentPageView?.isH5) {
      let eventPath = ''
      try {
        eventPath = JSON.parse(event.event_path).path
      } catch (error) {
        eventPath = event.event_path || event?.sugo_autotrack_path
      }
      this.setState({
        currentEventInfo: {
          ...event,
          event_path: eventPath,
          dim_binding: dataBindsToDimBinding(event, event?.event_path_type),
          similar_path: ''
        },
        isReportData: false,
        currentEventId: eventPath,
        currentEvevntTabKey: 'eventEdit'
      })
      return
    }
    const control = controls.find(p => {
      return p.sugo_autotrack_page_path === event?.sugo_autotrack_page_path
        || p.event_id === event?.event_id
    })
    // 同一事件不触发更新
    if (!control
      || (currentEventInfo.currentEventId
        && (currentEventInfo.currentEventId === control.hashCode
          || currentEventInfo.currentEventId === control.id)
      )
    ) {
      return
    }

    this.setState({
      currentEventInfo: {
        ...event,
        dim_binding: dataBindsToDimBinding(event, event?.event_path_type),
        eventClass: control.class,
        similar_path: ''
      },
      isReportData: false,
      currentEventId: control.id || control.hashCode,
      currentEvevntTabKey: 'eventEdit'
    })
  }

  /**
   * 修改选中事件的属性
   * @param {*} path 属性路径
   * @param {*} value 属性值
   */
  changeTrackEventProp = (path, value) => {
    const { currentEventInfo } = this.props
    let newEventInfo = immutateUpdate(currentEventInfo, path, () => value)
    this.setState({ currentEventInfo: newEventInfo })
  }

  /**
   * 生成二维码
   *
   * @returns
   * @memberof BusinessDbList
   */
  renderQrCode = () => {
    const { trackType } = this.state
    let token = this.props.params.token
    let qrCodeImgUrl = `/app/sdk/qrCode?token=${token}&redirectPage=track&secretKey=${this.secretKey}`
    let msg = (
      <span>
        请扫描二维码进入App进行{trackType === APP_TRACK_TYPE.autoTrack ? '全埋点' : '可视化'}埋点。<br />
        扫码前请确保手机上已安装需埋点的App，并已植入最新版的SDK。
      </span>
    )
    const mainContent = (
      <div>
        <img src={qrCodeImgUrl} />
        <Alert message={msg} type="success" />
      </div>
    )
    return (
      <Card>
        <div className="guide_header" >SDK使用流程</div>
        <div className="tipUse">
          {/* 左侧图片 */}
          <div className="container">
            <div className="title"> <span>1</span>扫码器扫描二维码</div>
            <img src={qrCodeImgUrl} />
          </div>
          {/* 右侧手机打开 */}
          <div className="container">
            <div className="title"> <span>2</span>点击sugoAPP打开APP</div>
            <img style={{ height: 500 }} src={APP_NO_OPEN} />
          </div>
        </div>
        <div className="guide_footer">{msg}</div>
      </Card>
    )
  }

  startTest = () => {
    this.webscoketManager.sendTestRequest()
    this.setState({ testTrackVisible: true })
  }

  closeTest = () => {
    this.webscoketManager.sendStopTestRequest()
    this.setState({ testTrackVisible: false })
  }

  // 导航栏按钮
  renderBread = () => {
    let { imgUrl, trackType } = this.state
    if (trackType === APP_TRACK_TYPE.autoTrack) {
      return (
        <Bread path={[{ name: '埋点项目', path: '/console/project' }, { name: '可视化埋点' }]}>
          <Popconfirm
            title="退出埋点界面，埋点连接将会关闭，确定？"
            onConfirm={this.closeWebSocket}
            placement="bottomRight"
            okText="是"
            cancelText="否"
          >
            <Button className="mg1l" type="primary" icon={<LogoutOutlined />} >退出</Button>
          </Popconfirm>
        </Bread>)
    }
    return (
      <Bread path={[{ name: '埋点项目', path: '/console/project' }, { name: '可视化埋点' }]}>
        {
          imgUrl && (
            <Popconfirm
              title="执行测试埋点?"
              onConfirm={this.startTest}
              okText="是"
              cancelText="否"
              placement="bottomRight"
            >
              <Button type="primary">测试埋点</Button>
            </Popconfirm>)
        }
        {
          imgUrl && (
            <Popconfirm
              title="部署后配置立即生效，确认部署？"
              placement="bottomRight"
              onConfirm={() => this.dispatchHandler('deployTrackEvent', {})}
              okText="是"
              cancelText="否"
            >
              <Button className="mg1l" type="danger" >部署埋点</Button>
            </Popconfirm>
          )
        }
        <Popconfirm
          title="退出埋点界面，埋点连接将会关闭，确定？"
          onConfirm={this.closeWebSocket}
          placement="bottomRight"
          okText="是"
          cancelText="否"
        >
          <Button className="mg1l" type="primary" icon={<LogoutOutlined />} >退出</Button>
        </Popconfirm>
      </Bread>
    )
  }

  chagePagePath = (view) => {
    const { pageMap = {} } = this.props
    const currentPageInfo = {
      code: '',
      is_submit_point: false,
      page_name: _.get(view, 'title', ''),
      page: _.get(view, 'path', ''),
      ..._.get(pageMap, view.path, {}),
      id: _.get(view, 'id', ''),
    }

    this.setState({
      currentPageView: view,
      currentEventInfo: {},
      currentEventId: '',
      isReportData: false,
      currentPageInfo
    })
  }

  deletePageInfo = () => {
    const { currentPageView } = this.state
    const { pageMap = {} } = this.props
    this.dispatchHandler('deletePage', { pageInfoId: _.get(pageMap, [currentPageView.path, 'id'], '') })
  }

  //左侧修改界面
  renderLeftPanel = () => {
    const { pageMap = {}, pageLoading = false } = this.props
    const { currentPageInfo, appMultiViews, currentPageView } = this.state
    let canDeletePage = !!_.get(pageMap, [currentPageView.path])
    return (
      <div>
        <PageEditForm
          editPageInfo={currentPageInfo}
          deletePageInfo={this.deletePageInfo}
          savePageInfo={(pageInfo) => this.dispatchHandler('savePage', { pageInfos: [pageInfo] })}
          loading={pageLoading}
          canDelete={canDeletePage}
          panelHeight="calc(100vh - 165px)"
          appMultiViews={appMultiViews}
          chagePagePath={this.chagePagePath}
          currentPageView={currentPageView}
        />
      </div>
    )
  }

  /**
   * 渲染当前websocke连接状态
   */
  renderConnectStatus = () => {
    const { websocketStatus } = this.state
    if (websocketStatus?.type === 0) {
      return (<Tag icon={<SyncOutlined spin />} color="error">{websocketStatus?.text}</Tag>)
    }
    if (websocketStatus?.type === 1) {
      return (<Tag icon={<SyncOutlined spin />} color="processing">{websocketStatus?.text}</Tag>)
    }
    if (websocketStatus?.type === 2) {
      return (<Tag icon={<CheckCircleOutlined />} color="success">{websocketStatus?.text}</Tag>)
    }
  }

  /**
   * 显示设备基础信息
   */
  rederDeviceInfo = () => {
    const { deviceInfo } = this.state
    return (
      <div>
        App版本：{deviceInfo.appVersion}
          设备：{deviceInfo.deviceName}&nbsp;
          系统：{deviceInfo.deviceType}&nbsp;{deviceInfo.osVersion}
        <div className="mg2l fright">
          {this.renderConnectStatus()}
        </div>
      </div>
    )
  }

  //埋点主界面
  renderContent = () => {
    let {
      currentEventInfo,
      controls,
      imgUrl,
      appType,
      hiddenList,
      appMultiViews,
      showTrackEvent,
      imgHeight,
      imgWidth,
      currentPageView,
      isReportData,
      scale,
      h5ControlClass
    } = this.state
    const { trackEventMap, similarEventMap, crossPageEventArr } = this.props

    let mainContent = getContentInfo({
      imgHeight,
      imgWidth,
      controls,
      editEventInfo: currentEventInfo,
      trackEventMap,
      showEditEvent: this.showEditEvent,
      similarEventMap,
      crossPageEventArr,
      showTrackEvent,
      hiddenList,
      appType,
      appMultiViews,
      currentPageView,
      scale,
      isReportData,
      h5ControlClass
    })

    if (!mainContent) {
      console.error('========> 界面没有可点击元素')
    }
    return (
      <Card className="bg-ec mg1x" title={this.rederDeviceInfo()} bodyStyle={{ padding: '5px' }}>
        <div style={{ width: '100%', height: 'calc(100vh - 185px)', overflowY: 'auto' }}>
          <div style={{ width: `${imgWidth}px`, margin: 'auto' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '0px' }}>
                <img style={{ width: imgWidth }} src={imgUrl} key={`img-${imgWidth}`} />
              </div>
              {mainContent}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  /**
   * 隐藏事件
   * @param {*} path 事件路径
   * @param {*} title 事件文本信息
   */
  changeEventVisible = async (path, title) => {
    const { hiddenList = [], currentEventInfo, imgUrl, controls, imgHeight, imgWidth, xwalkScreenshots } = this.state
    const hasData = _.some(hiddenList, p => p.path === path)
    if (!this.screenShotMap[path]) {
      let img = await getScreenShot(imgUrl, currentEventInfo, xwalkScreenshots, controls, imgHeight, imgWidth)
      this.screenShotMap[path] = img
    }
    if (hasData) {
      return this.setState({ hiddenList: hiddenList.filter(p => p.path !== path) })
    }
    return this.setState({ hiddenList: [...hiddenList, { path, title }] })
  }

  /**
   * 显示事件
   */
  displayEvent = (path) => {
    const { hiddenList = [] } = this.state
    this.setState({ hiddenList: hiddenList.filter(p => p.path !== path) })
  }

  deleteEvent = () => {
    const { currentEventInfo } = this.state
    this.dispatchHandler('deleteEvent',
      { event: currentEventInfo },
      () => {
        this.setState({ currentEventId: '', currentEventInfo: {} })
      })
  }

  /**保存事件 */
  saveEvent = async (event) => {
    const { imgUrl, xwalkScreenshots, controls, imgHeight, imgWidth } = this.state
    const newEvent = _.clone(event)
    if (!newEvent.event_name || newEvent.event_name.trim() === '') {
      return
    }

    if (!newEvent.similar) {
      newEvent.similar_path = ''
    }
    //原生app 没有全局有效选项
    if (newEvent.event_path_type === APP_TYPE.h5) {
      newEvent.event_path = JSON.stringify({ path: newEvent.sugo_autotrack_path })
      newEvent.page = newEvent.sugo_autotrack_page_path
      if (newEvent.advance) {
        newEvent.binds = dimBindingToDataBinds(newEvent.dim_binding, newEvent.event_path_type)
      }
    } else {
      // 原生app，将页面的page修改为当前页面的路径
      newEvent.page = newEvent.sugo_autotrack_page_path
      newEvent.cross_page = null
      newEvent.event_path = ''
      newEvent.dim_mode = false
      if (newEvent.advance) {
        newEvent.code = JSON.stringify(dimBindingToDataBinds(newEvent.dim_binding, newEvent.event_path_type))
      }
    }
    const { eventKey } = generateEventKey(newEvent)
    if (!this.screenShotMap[eventKey]) {
      let img = await getScreenShot(imgUrl, newEvent, xwalkScreenshots, controls, imgHeight, imgWidth)
      this.screenShotMap[eventKey] = img
    }
    newEvent.screenshot = this.screenShotMap[eventKey] || null

    const events = [{ ...newEvent, opt: event.id ? 'update' : 'insert' }]

    this.dispatchHandler('saveEvent',
      { events },
      () => {
        this.setState({ currentEventId: '', currentEventInfo: {} })
      })
  }

  /**保存全埋点事件 */
  saveAutoTrackEvent = async (event) => {
    const { imgUrl, xwalkScreenshots, controls, imgHeight, imgWidth, currentEventInfo } = this.state
    const newEvent = _.clone(event)
    if (!newEvent.event_name || newEvent.event_name.trim() === '') {
      return
    }

    const { eventKey } = generateEventKey(newEvent)
    if (!this.screenShotMap[eventKey]) {
      let img = await getScreenShot(imgUrl, currentEventInfo, xwalkScreenshots, controls, imgHeight, imgWidth)
      this.screenShotMap[eventKey] = img
    }
    newEvent.screenshot = this.screenShotMap[eventKey] || null
    newEvent.id = _.get(currentEventInfo, 'id', '')
    newEvent.sugo_autotrack_path = _.get(currentEventInfo, 'sugo_autotrack_path', '')
    newEvent.event_path_type = _.get(currentEventInfo, 'event_path_type', '')
    const events = [{ ...newEvent, opt: event.id ? 'update' : 'insert' }]
    this.dispatchHandler('saveAutoEvent',
      { events },
      () => {
        this.setState({ currentEventId: '', currentEventInfo: {} })
      })
  }

  deleteAutoEvent = () => {
    const { currentEventInfo } = this.state
    this.dispatchHandler('deleteAutoEvent',
      { event: currentEventInfo },
      () => {
        this.setState({ currentEventId: '', currentEventInfo: {} })
      })
  }

  /**
   * 获取截图信息保存至全局变量
   * @param {*} screenshotId 截图id
   * @param {*} eventKey 事件路径
   */
  getScreenShot = (screenshotId, eventKey) => {
    const hasScreen = _.has(this.screenShotMap, eventKey)
    if (!hasScreen) {
      this.dispatchHandler('getEventSreenshot',
        { screenshotId },
        (data) => _.set(this.screenShotMap, [eventKey], data)
      )
    }
  }

  // 右侧事件操作
  renderRightPanel = () => {
    const {
      showTrackEvent,
      currentEvevntTabKey,
      classAttrs,
      currentEventInfo,
      currentPageView,
      hiddenList,
      appType,
      isReportData,
      currentEventId,
      h5ControlClass
    } = this.state
    const { dimensions, trackEventMap, eventLoading } = this.props
    const { eventKey } = generateEventKey(currentEventInfo)
    let canDeleteEvent = !!getTrackEventInfo(currentEventInfo, trackEventMap)
    let canDisplayEvent = _.some(hiddenList, p => p.path === eventKey)
    let height = `${(window.innerHeight || document.documentElement.clientHeight) - 173}px`
    const eventClassAttr = _.get(classAttrs, currentEventInfo.eventClass, '').split(',').filter(p => p)
    // if (editEventInfo.event_path_type === APP_TYPE.android) {
    //   const extraTag = _.get(editEventInfo, 'ExtraTag', '').split(',').filter(p => p).map(p => `ExtraTag.${p}`)
    //   eventClassAttr = _.concat(eventClassAttr, extraTag)
    // }
    return (
      <Tabs
        activeKey={currentEvevntTabKey}
        className="border left-event-panel bg-white pd2t"
        onChange={(key) => this.setState({ currentEvevntTabKey: key })}
      >
        <TabPane
          key="eventEdit"
          tab="事件设置"
          className="pd2x"
          style={{ height: height, overflowY: 'auto' }}
        >
          <EventEditForm
            eventClassAttr={eventClassAttr}
            dimensions={dimensions}
            editEventInfo={currentEventInfo}
            canDelete={canDeleteEvent}
            deleteEvent={this.deleteEvent}
            saveEvent={this.saveEvent}
            loading={eventLoading}
            changeEventVisible={() => this.changeEventVisible(eventKey, currentEventInfo?.sugo_autotrack_content)}
            canDisplayEvent={canDisplayEvent}
            appType={appType}
            onChange={(obj) => this.setState(obj)}
            changeTrackEventProp={this.changeTrackEventProp}
            isReportData={isReportData}
            currentEventId={currentEventId}
            h5ControlClass={h5ControlClass}
          />
        </TabPane>
        <TabPane key="eventList" tab="事件列表" className="pd2x" style={{ height: height }}>
          <EventList
            trackEventMap={trackEventMap}
            currentPageView={currentPageView}
            deleteEvent={(event) => this.dispatchHandler('deleteEvent', { event })}
            showTrackEvent={showTrackEvent}
            screenShotMap={this.screenShotMap}
            onChange={(obj) => this.setState(obj)}
            getScreenShot={this.getScreenShot}
            onEventListSelect={this.onEventListSelect}
          />
        </TabPane>
        <TabPane key="hiddenList" tab="隐藏列表" className="pd2x" style={{ height: height }}>
          <HiddenList
            trackEventMap={trackEventMap}
            hiddenList={hiddenList}
            displayEvent={this.displayEvent}
            screenShotMap={this.showTrackEvent}
            currentPageView={currentPageView}
            screenShotMap={this.screenShotMap}
          />
        </TabPane>
      </Tabs>
    )
  }

  copyEvents = (version) => {
    this.dispatchHandler('copyAppVersion', { copyVersion: version })
  }

  // 复制面板
  renderCopyEventPanel() {
    const { eventCopyModalVisible, appVersions } = this.props
    return (<CopyEventModal
      changeState={(obj) => this.changeState(obj)}
      eventCopyModalVisible={eventCopyModalVisible}
      appVersions={appVersions}
      copyEvents={this.copyEvents}
    />)
  }

  /**
   * 渲染全埋点右侧
   */
  renderAutoTrackEventEdit = () => {
    const { dsId } = this.props.location.query
    const { currentEventInfo, appMultiViews, currentPageView, currentEvevntTabKey, showTrackEvent, hiddenList } = this.state
    const { trackEventMap } = this.props
    let { token } = this.props.params
    const { eventKey } = generateEventKey(currentEventInfo)
    let height = `${(window.innerHeight || document.documentElement.clientHeight) - 173}px`
    let canDisplayEvent = _.some(hiddenList, p => p.path === eventKey)
    return (
      <Tabs
        activeKey={currentEvevntTabKey}
        className="border left-event-panel bg-white pd2t"
        onChange={(key) => this.setState({ currentEvevntTabKey: key })}
      >
        <TabPane
          key="eventEdit"
          tab="事件设置"
          className="pd2x"
          style={{ height: height, overflowY: 'auto' }}
        >
          <AutoTrackEventEdit
            editEventInfo={currentEventInfo}
            canDelete={_.has(trackEventMap, eventKey)}
            deleteEvent={this.deleteAutoEvent}
            saveEvent={(event) => this.saveAutoTrackEvent(event)}
            dsId={dsId}
            token={token}
            appMultiViews={appMultiViews}
            chagePagePath={this.chagePagePath}
            currentPageView={currentPageView}
            changeEventVisible={() => this.changeEventVisible(eventKey, currentEventInfo?.sugo_autotrack_content)}
            canDisplayEvent={canDisplayEvent}
          />
        </TabPane>
        <TabPane key="eventList" tab="事件列表" className="pd2x" style={{ height: height }}>
          <EventList
            trackEventMap={trackEventMap}
            currentPageView={currentPageView}
            deleteEvent={(event) => this.dispatchHandler('deleteAutoEvent', { event })}
            showTrackEvent={showTrackEvent}
            screenShotMap={this.screenShotMap}
            onChange={(obj) => this.setState(obj)}
            getScreenShot={this.getScreenShot}
            onEventListSelect={this.onEventListSelect}
          />
        </TabPane>
        <TabPane key="hiddenList" tab="隐藏列表" className="pd2x" style={{ height: height }}>
          <HiddenList
            trackEventMap={trackEventMap}
            hiddenList={hiddenList}
            displayEvent={this.displayEvent}
            screenShotMap={this.showTrackEvent}
            currentPageView={currentPageView}
            screenShotMap={this.screenShotMap}
          />
        </TabPane>
      </Tabs>
    )
  }

  render() {
    const { loading } = this.props
    const { imgUrl, testMessage, testTrackVisible, trackType } = this.state
    if (trackType === APP_TRACK_TYPE.autoTrack) {
      return (
        <div className="height-100 sdk-track">
          {this.renderBread()}
          <div className="bg-ec pd1">
            <Spin
              spinning={loading}
              size="large"
            >
              {
                _.isEmpty(imgUrl)
                  ? this.renderQrCode()
                  : (
                    <Row>
                      <Col span="17">
                        {this.renderContent()}
                      </Col>
                      <Col span="7">
                        {this.renderAutoTrackEventEdit()}
                      </Col>
                    </Row>
                  )
              }
            </Spin>
          </div>
        </div>
      )
    }
    return (
      <div className="height-100 sdk-track">
        {this.renderBread()}
        <div className="bg-ec pd1">
          <Spin
            spinning={loading}
            size="large"
          >
            {
              _.isEmpty(imgUrl)
                ? this.renderQrCode()
                : (
                  <Row>
                    <Col span="7">
                      {this.renderLeftPanel()}
                    </Col>
                    <Col span="10">
                      {this.renderContent()}
                    </Col>
                    <Col span="7">
                      {this.renderRightPanel()}
                      <TestMessageModal
                        testMessage={testMessage}
                        testTrackVisible={testTrackVisible}
                        sendStopTestRequest={this.closeTest}
                      />
                      {this.renderCopyEventPanel()}
                    </Col>
                  </Row>
                )
            }
          </Spin>
        </div>
      </div>
    )
  }
}
