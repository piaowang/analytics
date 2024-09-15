import React, { PropTypes } from 'react'
import {
  Card,
  Popover,
  Popconfirm,
  Icon,
  Input,
  Checkbox,
  Modal
} from 'antd'
import _ from 'lodash'
import { APP_TYPE } from './constants'

const Search = Input.Search

export default class EventList extends React.Component {

  static propTypes = {
    trackEventMap: PropTypes.object.isRequired,           //事件map
    currentActivity: PropTypes.string.isRequired,         //页面容器
    currentUrl: PropTypes.string.isRequired,              //页面url
    deleteEvent: PropTypes.func.isRequired,               //删除事件
    onlyShowCurrentPageEvent: PropTypes.bool.isRequired,  //仅显示当前页面事件
    currentTrackEventDetail: PropTypes.object.isRequired, //当前选中事件的明细类容
    getEventScreenshot: PropTypes.func.isRequired,        //获取当前选中明细
    changeState: PropTypes.func.isRequired,               //修改state
    showEventModal: PropTypes.bool
  }

  constructor(props) {
    super(props)
  }

  onEventDivMouseEnter = (e, event) => {
    let { getEventScreenshot } = this.props
    let rect = e.target.getBoundingClientRect()
    let eventImgPanelStyle = {}
    eventImgPanelStyle.display = 'block'
    eventImgPanelStyle.visible = true
    eventImgPanelStyle.left = rect.left
    eventImgPanelStyle.top = rect.top
    eventImgPanelStyle.width = rect.width
    eventImgPanelStyle.height = rect.height
    getEventScreenshot(eventImgPanelStyle, event)
  }

  onEventDivMouseLeave = () => {
    let { changeState } = this.props
    let eventImgPanelStyle = {}
    eventImgPanelStyle.display = 'none'
    eventImgPanelStyle.visible = false
    changeState({ eventImgPanelStyle })
  }

  renderEventDiv = (hasEdit) => (event, index) => {
    const { deleteEvent, changeState } = this.props
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
          <div className="width-80 elli iblock">{event.event_name}</div>
          <span style={{ position: 'absolute', right: 5 }}>
            {
              hasEdit && event.event_path_type === APP_TYPE.h5 && _.get(JSON.parse(event.event_path || '{}'), 'type', '')
                ? <Icon type="edit" className="mg1r iblock" onClick={() => {
                  changeState({ editEventInfo: { ...event, component: JSON.parse(event.event_path).path }, editEventPath: false, leftPanelSelect: 'eventEdit' })
                }} />
                : null
            }
            <Icon
              onClick={() => this.showPanelPath(event)}
              type="info-circle"
              className="mg1r iblock"
            />
            <Popconfirm
              title="确定删除事件？"
              onConfirm={() => deleteEvent([event.page, event.event_path].join('::'))}
            >
              <Icon type="close" className=" iblock" />
            </Popconfirm>
          </span>
        </Card>
      </div>
    )
  }

  renderEventDivs() {
    const { trackEventMap, currentActivity, currentUrl, searchEvent, appMultiViews, webViewHashCode } = this.props
    let eventData = _.values(trackEventMap).filter(v => {
      if (searchEvent && !v.event_name.includes(searchEvent)) {
        return false
      }
      return true
    })
    let page = ""
    if (appMultiViews.length) {
      const currentView = _.find(appMultiViews, p => p.hashCode.toString() === webViewHashCode)
      page = currentView.isH5 ? [currentActivity, currentView.currentUrl].join('::') : currentActivity
    } else {
      page = currentUrl ? [currentActivity, currentUrl].join('::') : currentActivity
    }
    let currentEvents = eventData
      .filter(p => p.page === page)
      .map(this.renderEventDiv(true))
    let otherEvents = eventData
      .filter(p => p.page !== page)
      .map(this.renderEventDiv(false))
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
                : <Popover
                  overlayStyle={{ width: "40%" }}
                  placement="top"
                  content={currentTrackEventDetail['currentFullEventPath']}
                >
                  <div style={wordWrapStyle}>元素 ：{currentTrackEventDetail['currentEventPath']} </div>
                </Popover>
            }
            <div className="aligncenter"><img src={currentTrackEventDetail['currentImageUrl']} /></div>
          </div>
        )
        : null
    )
  }

  render() {
    let { changeState, showEventBinds, leftPanelSelect } = this.props
    let [currentEvents, otherEvents] = this.renderEventDivs()
    let eventImgPanel = leftPanelSelect === 'eventList' ? this.renderEventImgPanel() : null
    let height = `${(window.innerHeight || document.documentElement.clientHeight) - 186}px`
    return (
      <div>
        <div style={{ height: height, position: 'relative', overflow: 'auto' }}>
          <div className="mg1t mg1b">
            <Search
              placeholder="输入事件名称搜索"
              style={{ width: '100%' }}
              onSearch={value => changeState({ searchEvent: value })}
              onChange={e => changeState({ searchEvent: e.target.value })}
            />
          </div>
          <div>
            {
              currentEvents.length
                ? <div className="mg1t">
                  <b className="mg1">当前页面事件：
                    <Checkbox
                      className="fright"
                      checked={showEventBinds}
                      onChange={check => changeState({ showEventBinds: check.target.checked })}
                    >
                      显示已埋点事件
                    </Checkbox>
                  </b>
                  {currentEvents}
                </div>
                : null
            }
            {
              otherEvents.length
                ? <div className="mg1t">
                  <b className="mg1">其他事件：</b>
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
