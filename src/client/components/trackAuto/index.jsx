import React from 'react'
import {
  Card, Col, Row, Popover, Button, Popconfirm, Modal,
  message, Timeline, Spin
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
import getAndroidContent from './content/android'
import getIosInfinitusContent from './content/iosInfinitus'
import getIosStandardContent from './content/iosStandard'
import { ClockCircleOutlined } from '@ant-design/icons'
import './track.styl'
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
    let qrCodeImgUrl = `/app/sdk-auto-track/qrCode?token=${token}&redirectPage=track&secretKey=${SECRETKEY}`
    let msg = (
      <span>
        请扫描二维码进入App进行全埋点。<br />
        扫码前请确保手机上已安装需埋点的App，并已植入最新版的SDK。
      </span>
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
            <img style={{height:600}} src={'data:image/png;base64,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'} />
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
            (<Popconfirm
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
          >
            退出
          </Button>
        </Popconfirm>
      </Bread>
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

    if (!mainContent) return null
    return (
      <Card title={mainContent.title} className="mg1x">
        <div style={{ width: '100%', height: 'calc(100vh - 233px)', overflow: 'auto' }}>
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
    const { trackEventMap = {}, editEventInfo, token, loading } = this.state.vm
    const { dsId } =  this.props.location.query
    const { eventLoading = false } = loading
    let canDeleteEvent = !!_.get(trackEventMap, [`${editEventInfo.page}::${editEventInfo.event_path}`])
    return (
      // <Tabs
      //   tabPosition="left"
      //   activeKey={leftPanelSelect || 'eventList'}
      //   className="border radius left-event-panel"
      //   style={{ backgroundColor: 'white', paddingTop: '12px' }}
      //   onChange={(key) => {
      //     this.store.changeState({ leftPanelSelect: key })
      //   }}
      // >
      //   <TabPane
      //     key="eventEdit"
      //     tab={<AimOutlined />}
      //     style={{
      //       height: height,
      //       overflowY: 'auto'
      //     }}
      //   >
      <div style={{ height: 'calc(100vh - 130px)' }}>
        <EventEditForm
          editEventInfo={editEventInfo}
          datasourceId={dsId}
          eventLoading={eventLoading}
          deleteEvent={this.store.deleteEventInfo}
          saveEvent={this.store.saveEventInfo}
          canDelete={canDeleteEvent}
          changeState={this.store.changeState}
          token={token}
        />
      </div>
      //   </TabPane>
      // </Tabs>
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
        dot={<ClockCircleOutlined className="font16"/>}
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
                    <Col span="18">
                      {this.renderContent()}
                    </Col>
                    <Col span="6">
                      {this.renderRightPanel()}
                      {this.renderTestMessageModal()}
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
