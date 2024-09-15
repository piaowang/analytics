import React from 'react'
import { ClockCircleOutlined, LogoutOutlined } from '@ant-design/icons'
import {
  Card,
  Col,
  Row,
  Popover,
  Button,
  Popconfirm,
  Modal,
  Alert,
  message,
  Timeline,
  Spin,
  Tabs
} from 'antd'
import Bread from 'client/components/Common/bread'
import { browserHistory } from 'react-router'
import _ from 'lodash'
import moment from 'moment'
import Store from './store'
import uuid from 'node-uuid'
import CryptoJS from 'crypto-js'
import { APP_TYPE, iOS_RENDERER, SKD_TRACKING_VERSION } from './constants'
import EventEditForm from './eventEdit'
import PageEditForm from './pageEdit'
import EventList from './eventList'
import DisplayList from './dispaly-list'
import getAndroidContent from './content/android'
import getIosInfinitusContent from './content/iosInfinitus'
import getIosStandardContent from './content/iosStandard'
import CopyEventModal from './copy-event-modal'

import APP_NO_OPEN from '../../images/track/app_cannot_open.png'
const TabPane = Tabs.TabPane
let SECRETKEY = ''

export default class Track extends React.Component {
  constructor(props, context) {
    super(props, context)
    this.store = new Store()
    this.store.subscribe(state => this.setState(state))
    this.state = this.store.getState()
  }

  componentWillMount() {
    let token = this.props.params.token
    let appType = this.props.location.query.type
    SECRETKEY = CryptoJS.MD5(uuid.v4()).toString()
    this.store.initModel(token, appType, SECRETKEY)
  }

  async componentWillUnmount() {
    await this.store.exitEdit()
  }

  /**
   * 生成二维码
   *
   * @returns
   * @memberof BusinessDbList
   */
  renderQrCode = () => {
    let { token } = this.state.vm
    let main_content
    let qrCodeImgUrl = `/app/sdk/qrCode?token=${token}&redirectPage=track&secretKey=${SECRETKEY}`
    let msg = (
      <span>
        请扫描二维码进入App进行可视化埋点。<br />
        扫码前请确保手机上已安装需埋点的App，并已植入最新版的SDK。
      </span>
    )
    main_content = (
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
            <div className="title"> <span>21</span>点击sugoAPP打开APP</div>
            <img src={APP_NO_OPEN} />
          </div>
        </div>
        <div className="guide_footer">{msg}</div>
      </Card>
    )
  }

  //导航栏按钮
  renderBread = () => {
    let { imgUrl } = this.state.vm
    return (
      <Bread
        path={[
          { name: '埋点项目', path: '/console/project' },
          { name: '可视化埋点' }]}
      >
        {
          imgUrl ?
            (
              <Popconfirm
                title="测试？"
                onConfirm={this.store.testEvent}
                okText="是"
                cancelText="否"
              >
                <Button type="primary">
                测试埋点
                </Button>
              </Popconfirm>)
            : null
        }
        {
          imgUrl ?
            (
              <Popconfirm
                title="部署后配置立即生效，确认部署？"
                onConfirm={this.store.deployEvent}
                okText="是"
                cancelText="否"
              >
                <Button
                  className="mg1l"
                  type="danger"
                >
                部署埋点
                </Button>
              </Popconfirm>)
            : null
        }

        <Popconfirm
          title="退出埋点界面，埋点连接将会关闭，确定？"
          onConfirm={() => {
            browserHistory.goBack()
          }}
          placement="bottomRight"
          okText="是"
          cancelText="否"
        >
          <Button
            className="mg1l"
            type="primary"
            icon={<LogoutOutlined />}
          >
            退出
          </Button>
        </Popconfirm>
      </Bread>
    )
  }

  //左侧修改界面
  renderLeftPanel = () => {
    const {
      editPageInfo,
      loading,
      pageCategories,
      pageMap,
      appMultiViews,
      webViewHashCode
    } = this.state.vm
    const { pageLoading = false } = loading
    let height = (window.innerHeight || document.documentElement.clientHeight) - 180
    // let pagePanelHeight = '260px'
    let pagePanelHeight = `${height}px`
    let canDeletePage = !!_.get(pageMap, [editPageInfo.page])
    return (
      <div>
        {/* <PageCategories
          pageCategories={pageCategories}
          categotiesLoading={categotiesLoading}
          chagePageCategories={this.store.chagePageCategories}
          delPageCategories={this.store.delPageCategories}
          savePageCategories={this.store.savePageCategories}
          changeState={this.store.changeState}
          addPageCategories={this.store.addPageCategories}
          panelHeight={panelHeight}
        /> */}
        <PageEditForm
          editPageInfo={editPageInfo}
          categories={pageCategories}
          deletePageInfo={this.store.deletePageInfo}
          savePageInfo={this.store.savePageInfo}
          pageLoading={pageLoading}
          canDelete={canDeletePage}
          panelHeight={pagePanelHeight}
          changeState={this.store.changeState}
          appMultiViews={appMultiViews}
          webViewHashCode={webViewHashCode}
          chagePagePath={this.store.chagePagePath}
          editPathString={this.store.editPathString}
        />
      </div>
    )
  }

  //埋点主界面
  renderContent = () => {
    let {
      appType, imgUrl, snapshot, deviceInfo,
      editEventInfo, trackEventMap, currentActivity, viewMap,
      currentUrl, similarEventMap, crossPageEventArr, iosContent,
      viewMapTmp, iosViewMap, iosMainView, showEventBinds,
      webViewHashCode, appMultiViews, displayList,
      h5ControlClass
    } = this.state.vm

    let mainContent = {}
    if (appType === APP_TYPE.ios) {
      if (window.sugo.iOS_renderer === iOS_RENDERER.Infinitus
        && window[SKD_TRACKING_VERSION] < 1) {
        mainContent = getIosInfinitusContent({
          snapshot,
          deviceInfo,
          currentActivity,
          editEventInfo,
          trackEventMap,
          viewMapTmp,
          iosMainView,
          showEditEvent: this.store.showEditEvent,
          iosViewMap,
          currentUrl,
          similarEventMap,
          crossPageEventArr
        })
      } else {
        mainContent = getIosStandardContent({
          snapshot,
          deviceInfo,
          editEventInfo,
          trackEventMap,
          iosContent,
          showEditEvent: this.store.showEditEvent,
          currentActivity,
          currentUrl,
          similarEventMap,
          crossPageEventArr,
          showEventBinds,
          displayList,
          h5ControlClass,
          webViewHashCode,
          appMultiViews
        })
      }
    } else if (appType === APP_TYPE.android) {
      mainContent = getAndroidContent({
        snapshot,
        deviceInfo,
        editEventInfo,
        trackEventMap,
        currentActivity,
        viewMap,
        showEditEvent: this.store.showEditEvent,
        currentUrl,
        similarEventMap,
        crossPageEventArr,
        showEventBinds,
        webViewHashCode,
        appMultiViews,
        displayList,
        h5ControlClass
      })
    }

    let height = `${(window.innerHeight || document.documentElement.clientHeight) - 204}px`
    if (!mainContent) return null
    return (
      <Card title={mainContent.title} className="mg1x">
        <div style={{ width: '100%', height: height, overflow: 'auto' }}>
          <div style={{ width: `${mainContent.divWidth}px`, margin: 'auto' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '0px' }}>
                <img style={{ width: mainContent.divWidth }} src={imgUrl} key={`img-${mainContent.divWidth}`} />
              </div>
              {mainContent.content}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  //事件列表
  renderRightPanel = () => {
    const {
      trackEventMap = {}, currentActivity = {}, currentUrl = '', currentTrackEventDetail, showEventModal,
      eventImgPanelStyle, searchEvent, onlyShowCurrentPageEvent, editEventInfo, loading, dimensions,
      leftPanelSelect = 'eventList', showEventBinds, appMultiViews, webViewHashCode, displayList,
      h5ControlClass, editEventPath, classAttr
    } = this.state.vm
    const { eventLoading = false } = loading
    let canDeleteEvent = !!_.get(trackEventMap, [`${editEventInfo.page}::${editEventInfo.event_path}`])
    let canDisplayEvent = !!_.get(displayList, [`${editEventInfo.page}::${editEventInfo.event_path}`])
    let height = `${(window.innerHeight || document.documentElement.clientHeight) - 173}px`
    return (
      <Tabs
        activeKey={leftPanelSelect || 'eventList'}
        className="border radius left-event-panel"
        style={{ backgroundColor: 'white', paddingTop: '12px' }}
        onChange={(key) => {
          this.store.changeState({ leftPanelSelect: key })
        }}
      >
        <TabPane
          key="eventEdit"
          tab="事件设置"
          className="pd2x"
          style={{
            height: height,
            overflowY: 'auto'
          }}
        >
          <EventEditForm
            editEventInfo={editEventInfo}
            eventLoading={eventLoading}
            deleteEvent={this.store.deleteEventInfo}
            saveEvent={this.store.saveEventInfo}
            canDelete={canDeleteEvent}
            dimensions={dimensions}
            changeState={this.store.changeState}
            canDisplayEvent={canDisplayEvent}
            displayList={displayList}
            h5ControlClass={h5ControlClass}
            displayEvent={this.store.displayEvent}
            editEventPath={editEventPath}
            classAttr={classAttr}
          />
        </TabPane>
        <TabPane
          key="eventList"
          tab="事件列表"
          className="pd2x"
          style={{ height: height }}
        >
          <EventList
            leftPanelSelect={leftPanelSelect}
            trackEventMap={trackEventMap}
            currentActivity={currentActivity}
            currentUrl={currentUrl}
            eventImgPanelStyle={eventImgPanelStyle}
            deleteEvent={this.store.deleteEventInfo}
            updateEventImgPanelStyle={this.store.updateEventImgPanelStyle}
            getEventScreenshot={this.store.getEventScreenshot}
            searchEvent={searchEvent}
            onlyShowCurrentPageEvent={onlyShowCurrentPageEvent}
            currentTrackEventDetail={currentTrackEventDetail}
            changeState={this.store.changeState}
            showEventModal={showEventModal}
            showEventBinds={showEventBinds}
            appMultiViews={appMultiViews}
            webViewHashCode={webViewHashCode}
          />
        </TabPane>
        <TabPane
          key="displayList"
          tab="隐藏列表"
          className="pd2x"
          style={{ height: height }}
        >
          <DisplayList
            leftPanelSelect={leftPanelSelect}
            currentActivity={currentActivity}
            currentUrl={currentUrl}
            eventImgPanelStyle={eventImgPanelStyle}
            updateEventImgPanelStyle={this.store.updateEventImgPanelStyle}
            getEventScreenshot={this.store.getEventScreenshot}
            searchEvent={searchEvent}
            currentTrackEventDetail={currentTrackEventDetail}
            changeState={this.store.changeState}
            appMultiViews={appMultiViews}
            webViewHashCode={webViewHashCode}
            displayList={displayList}
            displayEvent={this.store.displayEvent}
          />
        </TabPane>
      </Tabs>
    )
  }

  //测试窗体
  renderTestMessageModal() {
    let { testMessage, testMode } = this.state.vm
    if (testMode === false) {
      return ''
    }

    const colors = ['red', 'green', 'blue']
    const eventTableData = testMessage.map((event, idx) => {
      let time = moment.unix(event.properties.event_time / 1000).format('YYYY-MM-DD HH:mm:ss')
      let eventKeys = Object.keys(event.properties)
      const properties_items = eventKeys.map((key, idx) => {
        return (<p className="width500" style={{ wordBreak: 'break-word' }} key={'key' + idx}><strong>{key}:</strong>{event.properties[key] + ''}</p>)
      })
      const eventItem = event.event_id ? (<p><strong>event_id:</strong>{event.event_id}</p>) : ''
      let popContent = (<div className="test-message-pop">{eventItem}{properties_items}</div>)

      return (<Timeline.Item
        dot={<ClockCircleOutlined className="font16" />}
        color={colors[(testMessage.length - idx) % colors.length]} key={'tl-' + idx}
              >
        <Popover
          placement="rightBottom"
          title={(<strong>{event.event_name}</strong>)}
          content={popContent}
          trigger="hover"
        >
          <div className="test-message-background">
            <div style={{ width: 200, float: 'left' }}>{event.event_name}</div>
            <span>{time}</span>
          </div>
        </Popover>
      </Timeline.Item>)
    })
    const eventTable = (
      <Timeline>
        {eventTableData}
      </Timeline>
    )

    return (<Modal
      title="测试事件"
      width={500}
      visible={testMode}
      maskClosable={false}
      onCancel={() => {
        this.store.closeTestModel()
      }}
      footer={null}
            >
      <div
        style={{
          overflowY: 'auto',
          width: '100%',
          height: 600,
          padding: 3
        }}
      >
        {eventTable}
      </div>
    </Modal>
    )
  }


  //消息提示
  renderMessage() {
    const { message: vmMessage } = this.state.vm
    if (vmMessage) {
      if (vmMessage.type === 'error') {
        message.error(vmMessage.message, 3)
      } else {
        message.success(vmMessage.message, 2)
      }
    }
  }

  // 复制面板
  renderCopyEventPanel() {
    const { eventCopyPanelVisible, appVersions, selectCopyVersion } = this.state.vm
    const { changeState, copyEvents } = this.store
    return (<CopyEventModal
      changeState={changeState}
      eventCopyPanelVisible={eventCopyPanelVisible}
      appVersions={appVersions}
      selectCopyVersion={selectCopyVersion}
      copyEvents={copyEvents}
    />)
  }

  render() {
    const { loading: { trackLoading = false }, snapshot } = this.state.vm
    this.renderMessage()
    return (
      <div className="height-100">
        {this.renderBread()}
        <div style={{ background: '#ECECEC', padding: '10px' }}>
          <Spin
            spinning={trackLoading}
            size="large"
          >
            {
              _.isEmpty(snapshot)
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
                      {this.renderTestMessageModal()}
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
