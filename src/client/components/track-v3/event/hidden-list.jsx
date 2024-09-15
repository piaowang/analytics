/**
 * creteby xujun on 2020/7/4
 * 隐藏事件列表
 */
import React from 'react'
import PropTypes from 'prop-types'
import { CloseOutlined } from '@ant-design/icons'
import { Card, Popconfirm, Input, Popover } from 'antd'
import _ from 'lodash'

const Search = Input.Search

export default class EventList extends React.Component {

  static propTypes = {
    trackEventMap: PropTypes.object.isRequired,           //事件map
    displayEvent: PropTypes.func.isRequired,               //显示事件方法
    screenShotMap: PropTypes.object.isRequired,           //截图信息
    hiddenList: PropTypes.array.isRequired,                //隐藏的事件列表
    currentPageView: PropTypes.object.isRequired           //当前选择的页面
  }

  state = {
    showEventDtlModal: false,   //显示埋点明细信息
    searchKey: '',              //过滤的关键字
    showEventDtlPop: false,
    selectEvent: {}             // 选中的事件信息
  }

  /**
   * 埋点信息列表的item渲染
   * @param {*} event 
   * @param {*} index 
   * @param {*} hasEdit 
   */
  renderEventListItem = (event, index) => {
    const { displayEvent, screenShotMap } = this.props
    const content = (<img src={`data:image/png;base64,${_.get(screenShotMap, event.path)}`} />)
    return (
      <div key={'event_div-' + index} className="mg1r">
        <Card bodyStyle={{ padding: 10 }} className="width-100 mg1t">
          <Popover content={content} title="事件截图" trigger="hover" placement="left">
            <div className="width-80 elli iblock">{event.title || '无'}</div>
          </Popover>
          <span className="fright">
            <Popconfirm title="移除隐藏列表" onConfirm={() => displayEvent(event.path)}>
              <CloseOutlined className=" iblock" />
            </Popconfirm>
          </span>
        </Card>
      </div >
    )
  }

  /**
   * 渲染事件列表的
   */
  renderEventList() {
    const { currentPageView, hiddenList } = this.props
    return hiddenList
      .filter(p => _.startsWith(p.path, currentPageView.path))
      .map((p, i) => this.renderEventListItem(p, i))
  }

  render() {
    let otherEvents = this.renderEventList()
    return (
      <div>
        <div style={{ height: 'calc(100% - 186px)', position: 'relative', overflow: 'auto' }}>
          <div className="mg1t mg1b">
            <Search
              placeholder="输入事件名称搜索"
              className="width-100"
              onSearch={value => this.setState({ searchKey: value })}
            />
          </div>
          <div>
            {otherEvents}
          </div>
        </div>
      </div>)
  }
}
