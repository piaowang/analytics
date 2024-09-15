/**
 * creteby xujun on 2020/7/4
 * 已埋点事件列表
 */
import React from 'react'
import PropTypes from 'prop-types'
import { CloseOutlined, EditOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { Card, Popconfirm, Input, Checkbox, Modal } from 'antd'
import _ from 'lodash'

const Search = Input.Search

export default class EventList extends React.Component {

  static propTypes = {
    trackEventMap: PropTypes.object.isRequired,           //事件map
    currentPageView: PropTypes.object.isRequired,         //当前选中的view信息
    deleteEvent: PropTypes.func.isRequired,               //删除事件
    showTrackEvent: PropTypes.bool.isRequired,            //仅显示当前页面事件
    screenShotMap: PropTypes.object.isRequired,           //截图信息
    onChange: PropTypes.func.isRequired,                  //修改父级状态
    getScreenShot: PropTypes.func.isRequired,             //获取截图信息
    onEventListSelect: PropTypes.func.isRequired          //选中事件处理
  }

  state = {
    showEventDtlModal: false,   //显示埋点明细信息
    searchKey: '',              //过滤的关键字
    showEventDtlPop: false,
    selectEvent: {}             // 选中的事件信息
  }

  onViewEvent = (event) => {
    this.setState({ selectEvent: event, showEventDtlModal: true, showEventDtlPop: false })
  }

  onGetScreenShot = (event) => {
    const { getScreenShot } = this.props
    const eventKey = `${event?.sugo_autotrack_page_path || event?.page}::${event?.sugo_autotrack_path || event?.event_path}::${event?.sugo_autotrack_position || '0'}`
    getScreenShot(event.screenshot_id, eventKey)
  }

  /**
   * 埋点信息列表的item渲染
   * @param {*} event 
   * @param {*} index 
   * @param {*} hasEdit 
   */
  renderEventListItem = (event, index, hasEdit) => {
    const { deleteEvent, onEventListSelect } = this.props
    return (
      <div key={'event_div-' + index} className="mg1r">
        <Card bodyStyle={{ padding: 0 }} className="width-100 mg1b">
          <div
            onMouseOver={() => this.onGetScreenShot(event)}
            className="width-70 elli iblock pd1 mg1"
          >
            {event.event_name}
          </div>
          <div className="width-20 iblock pd1 mg1">
            <span className="fright">
              {
                hasEdit && (
                  <EditOutlined
                    className="mg2r iblock"
                    onClick={() => onEventListSelect(event)}
                  />
                )
              }
              <InfoCircleOutlined
                onClick={() => this.onViewEvent(event)}
                className="mg2r iblock"
              />
              <Popconfirm
                title="确定删除事件？"
                onConfirm={() => deleteEvent(event)}
              >
                <CloseOutlined className=" iblock" />
              </Popconfirm>
            </span>
          </div>
        </Card>
      </div>
    )
  }

  /**
   * 渲染事件列表的 
   */
  renderEventList() {
    const { searchKey } = this.state
    const { trackEventMap, currentPageView } = this.props
    let eventData = !searchKey
      ? _.values(trackEventMap)
      : _.values(trackEventMap).filter(v => v.event_name.includes(searchKey))
    // 当前页面事件
    let currentEvents = eventData
      .filter(p => p.sugo_autotrack_page_path === currentPageView.path || p.page === currentPageView.path)
      .map((p, i) => this.renderEventListItem(p, i, true))
    // 其他页面事件
    let otherEvents = eventData
      .filter(p => p.sugo_autotrack_page_path !== currentPageView.path && p.page !== currentPageView.path)
      .map((p, i) => this.renderEventListItem(p, i, false))
    return [currentEvents, otherEvents]
  }

  /**
   * 埋点信息弹框
   */
  renderTrackEventDraftModal() {
    const { showEventDtlModal, selectEvent } = this.state
    const { screenShotMap } = this.props
    const wordWrapStyle = { 'wordWrap': 'break-word' }
    const eventKey = `${selectEvent?.sugo_autotrack_page_path || selectEvent?.page}::${selectEvent?.sugo_autotrack_path || selectEvent?.event_path}::${selectEvent?.sugo_autotrack_position || '0'}`
    return (
      <Modal
        visible={showEventDtlModal}
        onCancel={() => this.setState({ showEventDtlModal: false })}
        footer={null}
      >
        <div>
          <div style={wordWrapStyle}>页面 : {selectEvent?.page || selectEvent?.sugo_autotrack_page_path} </div>
          <div style={wordWrapStyle}>事件名 ：{selectEvent?.event_name} </div>
          <div style={wordWrapStyle}>元素 ：{selectEvent?.event_path || selectEvent?.sugo_autotrack_path} </div>
          <div className="aligncenter">
            <img src={`data:image/png;base64,${_.get(screenShotMap, eventKey)}`} />
          </div>
        </div>
      </Modal>
    )
  }

  render() {
    let { showTrackEvent, onChange } = this.props
    let [currentEvents, otherEvents] = this.renderEventList()
    return (
      <div className="height-100">
        <div
          className="always-display-scrollbar"
          style={{ height: 'calc(100% - 10px)', overflow: 'auto' }}
        >
          <div className="mg1t mg1b mg1r">
            <Search
              placeholder="输入事件名称搜索"
              className="width-100"
              onSearch={value => this.setState({ searchKey: value })}
            />
          </div>
          <div>
            {
              currentEvents.length ? (<div className="mg1t">
                <div className="mg1">
                  当前页面事件：
                  <Checkbox
                    className="fright"
                    checked={showTrackEvent}
                    onChange={check => onChange({ showTrackEvent: check.target.checked })}
                  >
                    显示已埋点事件
                  </Checkbox>
                </div>
                {currentEvents}
              </div>)
                : null
            }
            {
              otherEvents.length
                ? <div className="mg1t">
                  <div className="mg1">其他事件：</div>
                  {otherEvents}
                </div>
                : null
            }
          </div>
        </div>
        {this.renderTrackEventDraftModal()}
      </div>)
  }
}
