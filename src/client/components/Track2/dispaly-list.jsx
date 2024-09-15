import React from 'react'
import PropTypes from 'prop-types'
import { CloseOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { Card, Popover, Input, Modal } from 'antd'
import _ from 'lodash'

const Search = Input.Search

export default class DisplayList extends React.Component {

  static propTypes = {
    currentActivity: PropTypes.string.isRequired,         //页面容器
    currentUrl: PropTypes.string.isRequired,              //页面url
    displayEvent: PropTypes.func.isRequired,               //删除事件
    getEventScreenshot: PropTypes.func.isRequired,        //获取当前选中明细
    changeState: PropTypes.func.isRequired               //修改state
  }

  constructor(props) {
    super(props)
  }

  onEventDivMouseEnter = (e, event) => {
    let { getEventScreenshot } = this.props
    let rect = e.target.getBoundingClientRect()
    let eventImgPanelStyle = {}
    eventImgPanelStyle.left = rect.left
    eventImgPanelStyle.top = rect.top
    eventImgPanelStyle.width = rect.width
    eventImgPanelStyle.height = rect.height
    eventImgPanelStyle.display = 'block'
    eventImgPanelStyle.visible = true
    getEventScreenshot(eventImgPanelStyle, event)
  }

  onEventDivMouseLeave = () => {
    let { changeState } = this.props
    let eventImgPanelStyle = {}
    eventImgPanelStyle.display = 'none'
    eventImgPanelStyle.visible = false
    changeState({ eventImgPanelStyle })
  }

  renderEventDiv = (event, index) => {
    const { displayEvent } = this.props
    return (
      <div
        onMouseEnter={(e) => this.onEventDivMouseEnter(e, event)}
        onMouseLeave={() => this.onEventDivMouseLeave()}
        key={'event_div-' + index}
        className="mg1r"
      >
        <Card
          bodyStyle={{ padding: 10 }}
          style={{ width: '100%', marginTop: 5 }}
        >
          {event.event_name}
          <span style={{ position: 'absolute', right: 30 }}>
            <InfoCircleOutlined onClick={() => this.showPanelPath(event)} />
          </span>
          <span style={{ position: 'absolute', right: 5 }}>
            <CloseOutlined
              onClick={() => {
                this.onEventDivMouseLeave()
                displayEvent([event.page, event.event_path].join('::'))
              }}
            />
          </span>
        </Card>
      </div>
    )
  }

  renderEventDivs() {
    const { displayList, currentActivity, currentUrl, searchEvent, appMultiViews, webViewHashCode } = this.props
    let eventData = _.values(displayList).filter(v => {
      if (searchEvent && !v.name.includes(searchEvent)) {
        return false
      }
      return true
    })
    let page = ''
    if (appMultiViews.length) {
      const currentView = _.find(appMultiViews, p => p.hashCode.toString() === webViewHashCode)
      page = currentView.isH5 ? [currentActivity, currentView.currentUrl].join('::') : currentActivity
    } else {
      page = currentUrl ? [currentActivity, currentUrl].join('::') : currentActivity
    } 
    let currentEvents = eventData
      .filter(p => p.page === page)
      .map(this.renderEventDiv)
    let otherEvents = eventData
      .filter(p => p.page !== page)
      .map(this.renderEventDiv)
    return [currentEvents, otherEvents]
  }

  /**
   * 事件快照
   * 
   * @returns 
   * @memberof EventList
   */
  renderEventImgPanel() {
    let { eventImgPanelStyle, currentTrackEventDetail } = this.props
    const title = (<div>快照</div>)
    let content = (<img src={currentTrackEventDetail['currentImageUrl']} />)
    return (
      <Popover
        placement="leftBottom"
        title={title}
        content={content}
        visible={eventImgPanelStyle.visible}
      >
        <div
          style={{
            zIndex: -1000,
            display: eventImgPanelStyle.display,
            position: 'fixed',
            top: eventImgPanelStyle.top,
            left: eventImgPanelStyle.left,
            width: eventImgPanelStyle.width,
            height: eventImgPanelStyle.height
          }}
        />
      </Popover>
    )
  }

  showPanelPath() {
    this.props.changeState({
      showEventModal: true,
      eventImgPanelStyle: { display: 'none', visible: false }
    })
  }

  handleCancel = () => {
    this.props.changeState({
      showEventModal: false
    })
  }

  renderTrackEventDraftModal() {
    let { showEventModal } = this.props
    return (
      <Modal
        visible={showEventModal}
        onCancel={this.handleCancel}
        footer={null}
      >
        {this.renderTrackEventDraft()}
      </Modal>
    )
  }

  renderTrackEventDraft() {
    let { currentTrackEventDetail } = this.props
    let wordWrapStyle = { 'wordWrap': 'break-word' }
    return (
      currentTrackEventDetail
        ? (
          <div>
            <div style={wordWrapStyle}>页面 : {currentTrackEventDetail['currentPage']} </div>
            <div style={wordWrapStyle}>事件名 ：{currentTrackEventDetail['currentEventName']} </div>
            {
              !currentTrackEventDetail['currentFullEventPath']
                ? <div style={wordWrapStyle}>元素 ：{currentTrackEventDetail['currentEventPath']} </div>
                : (
                  <Popover
                    overlayStyle={{ width: '40%' }}
                    placement="top"
                    content={currentTrackEventDetail['currentFullEventPath']}
                  >
                    <div style={wordWrapStyle}>元素 ：{currentTrackEventDetail['currentEventPath']} </div>
                  </Popover>
                )
            }
            <div className="aligncenter"><img src={currentTrackEventDetail['currentImageUrl']} /></div>
          </div>
        )
        : null
    )
  }

  render() {
    let { changeState, leftPanelSelect } = this.props
    let [currentEvents, otherEvents] = this.renderEventDivs()
    let eventImgPanel = leftPanelSelect === 'displayList' ? this.renderEventImgPanel() : null
    let height = `${(window.innerHeight || document.documentElement.clientHeight) - 229}px`
    return (
      <div>
        <div style={{ height: height, position: 'relative', overflow: 'auto' }}>
          <div className="mg1t mg1b">
            <Search
              placeholder="输入隐藏控件名称搜索"
              style={{ width: '100%' }}
              onSearch={value => changeState({ searchEvent: value })}
              onChange={e => changeState({ searchEvent: e.target.value })}
            />
          </div>
          <div>
            {
              currentEvents.length
                ? <div className="mg1t">
                  {currentEvents}
                </div>
                : null
            }
            {
              otherEvents.length
                ? <div className="mg1t">
                  <b className="mg1">其他隐藏控件：</b>
                  {otherEvents}
                </div>
                : null
            }
            <div style={{ position: 'absolute', top: 0, left: 0 }}>
              {eventImgPanel}
            </div>
          </div>
        </div>
        {this.renderTrackEventDraftModal()}
      </div>)
  }
}
