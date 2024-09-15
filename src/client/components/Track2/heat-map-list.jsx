import React from 'react'
import PropTypes from 'prop-types'
import { CloseOutlined, EditOutlined } from '@ant-design/icons';
import { Card, Popover, Popconfirm, Input, Checkbox, Modal } from 'antd';
import _ from 'lodash'
import shortid from 'shortid'

const Search = Input.Search

export default class HeatMapList extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      searchKey: ''
    }
  }

  componentWillUpdate (preProps) {
    const { editPageInfo, changeState } = this.props
    if(preProps.editPageInfo !== editPageInfo) {
      changeState({ pointParams: [], eventGroups: [], selectHeatMapKey: '' })
    }
  }

  convertHeatInfoToEdit = (item) => {
    const { changeState, selectHeatMapKey } = this.props
    if (selectHeatMapKey === item.id) {
      changeState({ pointParams: [], eventGroups: [], selectHeatMapKey: '', heatMapInfo: {} })
      return
    }
    let { points: pointParams, event_groups: eventGroups } = item
    eventGroups = eventGroups.map(p => {
      return { ...p, id: shortid() }
    })
    pointParams = pointParams.map(p => {
      return { ...p, id: shortid() }
    })
    changeState({ pointParams, eventGroups, selectHeatMapKey: item.id, heatMapInfo: item, previewHeatMap: false, showPointGroup: false })
  }

  renderHeatMapDiv = (item, index) => {
    const { removeHeatMap, heatMapList, selectHeatMapKey, changeState } = this.props
    return (
      <div key={'event_div-' + item.id}>
        <Card
          bodyStyle={{ padding: 10, backgroundColor: selectHeatMapKey === item.id ? '#6969d7' : '#fff', color: selectHeatMapKey === item.id ? '#fff' : 'rgba(0, 0, 0, 0.65)' }}
          style={{ width: '100%', marginTop: 5 }}
        >
          {item.name}
          <span style={{ position: 'absolute', right: 5 }}>
            <EditOutlined className="mg1r" onClick={() => this.convertHeatInfoToEdit(item)} />
            <Popconfirm
              title={`确定热图 "${item.name}" 么？`}
              placement="topLeft"
              onConfirm={() => {
                removeHeatMap(item.id)
                changeState({ heatMapList: heatMapList.filter(p => p.id !== item.id) })
              }}
            >
              <CloseOutlined className="color-red font14 item-del" />
            </Popconfirm>
          </span>
        </Card>
      </div>
    );
  }

  renderHeatMapDivs() {
    const { heatMapList, appMultiViews, webViewHashCode, currentActivity } = this.props
    const { searchKey } = this.state
    let page = ''
    if (appMultiViews.length) {
      const currentView = _.find(appMultiViews, p => p.hashCode.toString() === webViewHashCode)
      page = currentView.isH5 ? currentView.currentUrl : currentActivity
    } else {
      page = currentUrl ?  currentUrl : currentActivity
    }
    let heatMapData = _.values(heatMapList).filter(v => v.page_path === page && (!searchKey || (searchKey && v.name.includes(searchKey))))
    heatMapData = heatMapData.map(this.renderHeatMapDiv)
    return heatMapData
  }

  render() {
    let heatMapData = this.renderHeatMapDivs()
    let height = `${(window.innerHeight || document.documentElement.clientHeight) - 284}px`
    return (
      <div>
        <div style={{ height: height, position: 'relative', overflow: 'auto' }}>
          <div className="mg1t mg1b">
            <Search
              placeholder="输入热图名称搜索"
              style={{ width: '100%' }}
              onSearch={value => this.setState({ searchKey: value })}
              onChange={e => this.setState({ searchKey: e.target.value })}
            />
          </div>
          <div>
            {
              heatMapData.length
                ? <div className="mg1t">{heatMapData}</div>
                : null
            }
          </div>
        </div>
      </div>)
  }
}
