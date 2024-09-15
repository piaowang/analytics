import React from 'react'
import { SettingOutlined } from '@ant-design/icons';
import { Icon as LegacyIcon } from '@ant-design/compatible';
import { Card, Popover, Button, Alert, message, Spin, Switch, Row, Col } from 'antd';
import { browserHistory } from 'react-router'
import _ from 'lodash'
import Store from './store/heat-map'
import uuid from 'node-uuid'
import CryptoJS from 'crypto-js'
import { APP_TYPE } from './constants'
import getAndroidContent from './content/android'
import HeatMapEventGroup from './heat-map-group'
import getIosStandardContent from './content/iosStandard'
import ReactHeatmap from '../../common/react-heatmap'
import { ContextNameEnum, withContextConsumer } from '../../common/context-helper'
import HeatMapEdit from './heat-map-info'
import { generate } from 'shortid'
import { getPointByPosition, getHeatMapPointsAndPanel, widthCount, heightCount } from '../../common/sdk-calc-point-position'
import './track.styl'
import HeatMapList from './heat-map-list'

let SECRETKEY = ''
const ButtonGroup = Button.Group
const getImgPosition = () => {
  const img = document.querySelector('#main-content > div > div > div > div > div.mg1y > div.ant-row > div.ant-col-20 > div > div.ant-card-body > div:nth-child(2) > div > img')
  return img.getBoundingClientRect()
}

@withContextConsumer(ContextNameEnum.ProjectInfo)
export default class Track extends React.Component {
  constructor(props, context) {
    super(props, context)
    this.store = new Store()
    this.store.subscribe(state => this.setState(state))
    this.state = this.store.getState()
    this.point = {}
  }

  componentWillMount() {
    let token = this.props.params.token
    let { type: appType, dsid, projid } = this.props.location.query
    SECRETKEY = CryptoJS.MD5(uuid.v4()).toString()
    this.store.initHeatMapModel(token, appType, SECRETKEY, dsid, projid)
  }

  async componentWillUnmount() {
    await this.store.exitEdit()
    this.point = {}
  }

  /**
   * 生成二维码
   *
   * @returns
   * @memberof BusinessDbList
   */
  renderQrCode = () => {
    let { token } = this.state.vm
    let { type } = this.props.location.query
    let qrCodeImgUrl = `/app/sdk/qrCode?token=${token}&redirectPage=track&secretKey=${SECRETKEY}`
    let msg = (
      <span>
        请扫描二维码进入App进行可视化热图。<br />
        扫码前请确保手机上已安装需埋点的App，并已植入最新版的SDK。
      </span>
    )
    return (
      <div>
        <div className="heat-map-nav1">
          <div className="alignright">
            <Button className="mg2r" onClick={() => browserHistory.push('/console/heat-map')}>
              返回列表
            </Button>
          </div>
        </div>
        <div style={{ height: 800, width: 500, margin: 'auto', textAlign: 'center' }}>
          <img src={qrCodeImgUrl} className="mg3t" />
          <Alert message={msg} type="success" className="mg2t" />
        </div>
      </div>
    )
  }

  changeHeatMapModel = (val, filters, timeRange) => {
    let { isVisualization, previewHeatMap } = this.state.vm
    let { changeState } = this.store
    if (!previewHeatMap && isVisualization !== val) {
      changeState({ isVisualization: val, selectEventPath: '', pointInfo: {} })
      return
    }
    if (previewHeatMap && isVisualization !== val) {
      this.store.heatMapEventQuery({ isVisualization: val, dimFilters: filters, heatMapQueryTimeRange: timeRange })
    }
  }

  //埋点主界面
  renderContent = () => {
    let {
      previewHeatMap, editPageInfo, showPointGroup, appType,
      viewMap, imgUrl, iosContent, isVisualization, eventGroupPosition, pointParams,
      currentActivity, heatMapData, showDataInHeatPanel, displayList, selectEventPath, selectPoint
    } = this.state.vm

    let { dsid, projid } = this.props.location.query

    const { changeState, setHideList, showHeatEvent } = this.store
    let mainContent = {}
    let contorls = {}
    if (appType === APP_TYPE.ios) {
      mainContent = getIosStandardContent({ ...this.state.vm, isHeatMap: true, changeState, setHideList, showHeatEvent })
      contorls = previewHeatMap
        ? {}
        : _.keyBy(_.values(iosContent.associationOfBindableMap), p => {
          return currentActivity + '::' + (p.page ? p.page + '::' : '') + p.path
        })
    } else if (appType === APP_TYPE.android) {
      mainContent = getAndroidContent({ ...this.state.vm, isHeatMap: true, changeState, setHideList, showHeatEvent })
      if (!previewHeatMap) {
        contorls = _.values(viewMap)
        let webControls = contorls.map(p => {
          if (!p.htmlNodes) return []
          return p.htmlNodes.map(h => ({ ...h, path: `${currentActivity}::${p.htmlPage.url}::{"path":"${h.path}"}` }))
        })
        webControls = _.keyBy(_.flatten(webControls), k => k.path)
        contorls = _.assign(_.keyBy(contorls, p => currentActivity + '::' + p.eventPath), webControls)
      }
    }

    let contentHeight = `${(window.innerHeight || document.documentElement.clientHeight) - 256}px`
    if (!mainContent) return null
    const width = mainContent.divWidth
    const height = mainContent.divHeight
    const { events = [], eventGroups = [], points = [], pointsGroups = [] } = heatMapData
    let config = {}
    let data = {}
    if (previewHeatMap) {
      config = { radius: 10, maxOpacity: 0.5, minOpacity: 0, blur: 0.75 }
      const eventPanel = isVisualization ? _.concat(events, eventGroups) : pointsGroups
      data = (isVisualization || showPointGroup)
        ? getHeatMapPointsAndPanel(eventPanel, showDataInHeatPanel, 'events')
        : getHeatMapPointsAndPanel(points, showDataInHeatPanel, 'heat', width, height)
    } else {
      this.point = { ...this.point, width, height, pointWidth: (width / widthCount).toFixed(2), pointHeight: (height / heightCount).toFixed(2) }
    }
    const { heatPoints = [], heatMapDivs = [] } = data
    const groupProps = _.pick(this.state.vm, ['displayList', 'selectEventPath', 'eventGroups'])
    return (
      <Card
        headStyle={{ background: '#f7f7f7' }}
        bodyStyle={{padding:'0px'}}
        title={<div className="alignleft"><span>页面路径:{editPageInfo.page} 页面名称:{_.get(editPageInfo, 'page_name', '')}</span><span className="fright">{mainContent.title}</span></div>}
        className="mg1x aligncenter heat-map-des"
      >
        <ButtonGroup className="mg2b">
          {
            previewHeatMap && (!isVisualization
              ? <div className="display-point-group">
                显示圈选分组：<Switch size="small" checked={showPointGroup} onChange={(ck) => { this.store.changeState({ showPointGroup: ck }) }} />
              </div>
              : <div className="display-point-group">
                显示数据：<Switch size="small" checked={showDataInHeatPanel} onChange={(ck) => { this.store.changeState({ showDataInHeatPanel: ck }) }} />
              </div>)
          }
        </ButtonGroup>
        <div style={{ width: '100%', height: contentHeight, overflow: 'auto' }}>
          <div
            style={{ position: 'relative', width: `${width}px`, margin: 'auto', height: `${height}px` }}
            className="sdk-img-disable-select"
            onMouseDown={this.onBeginSelect}
            onMouseMove={this.onSelecting}
            onMouseUp={this.onEndSelect}
          >
            {
              heatPoints.length
                ? <div style={{ zIndex: 1, position: 'absolute', top: '0px', width: `${width}px`, height: `${height}px` }}>
                  <ReactHeatmap key={`heratmap-${heatPoints.length}`} configObject={config} max={(_.maxBy(heatPoints, p => p.value) || {}).value} min={0} data={heatPoints} />
                </div>
                : null
            }
            <img style={{ width: width }} className="border" src={imgUrl} key={`img-${mainContent.divWidth}`} />
            {previewHeatMap ? heatMapDivs : mainContent.content}
            <Popover
              placement="right"
              overlayStyle={{ width: 400 }}
              overlayClassName="heat-map-pop"
              title={<div className="color-white"><SettingOutlined className="mg1r" />设置</div>}
              content={<HeatMapEventGroup changeState={changeState} displayList={displayList} setHideList={setHideList} datasourceId={dsid} {...groupProps} />}
              trigger="click"
              visible={!previewHeatMap && !!selectEventPath}
            >
              <div style={{ ...eventGroupPosition, position: 'absolute' }} />
            </Popover>
          </div>
        </div>
      </Card>
    );
  }

  onBeginSelect = (event) => {
    const { isVisualization, previewHeatMap, selectPoint } = this.state.vm
    if (selectPoint) return
    const { top, left } = event.target.getBoundingClientRect()
    const pointBeginX = event.clientX - left
    const pointBeginY = event.clientY - top
    if (isVisualization || previewHeatMap || pointBeginX < 0 || pointBeginY < 0) return
    this.store.changeState({ selectPoint: true })
    this.point = { ...this.point, pointBeginX, pointBeginY, top, left, id: generate() }
  }

  onSelecting = (event) => {
    const { isVisualization, previewHeatMap, selectPoint } = this.state.vm
    if (isVisualization || previewHeatMap) return
    if (selectPoint) {
      const { changeState } = this.store
      const { pointBeginY, pointBeginX, top: rectTop, left: rectLeft, pointWidth, pointHeight, id, width, height } = this.point
      const pointEndX = (event.clientX - rectLeft)
      const pointEndY = (event.clientY - rectTop)
      if (pointEndX > width || pointEndY > height) {
        return
      }
      let { point, position } = getPointByPosition({ pointBeginY, pointEndY, pointBeginX, pointEndX, pointWidth, pointHeight })
      changeState({ pointInfo: { position, point, id }, selectEventPath: '' })
    }
  }

  onEndSelect = (event) => {
    const { isVisualization, previewHeatMap } = this.state.vm
    if (isVisualization || previewHeatMap) return
    this.store.changeState({ selectPoint: false })
  }

  save = (name, params) => {
    const { saveHeatMap } = this.store
    saveHeatMap(name, { ..._.pick(this.point, ['height', 'width']), ...params })
  }

  renderHeatMapList = () => {
    const { heatMapList, editPageInfo, webViewHashCode, currentActivity, appMultiViews, selectHeatMapKey } = this.state.vm
    const { changeState, removeHeatMap } = this.store
    return (<Card headStyle={{ background: '#f7f7f7' }} title={<div className="alignleft">热图列表</div>}>
      <HeatMapList
        heatMapList={heatMapList}
        editPageInfo={editPageInfo}
        appMultiViews={appMultiViews}
        webViewHashCode={webViewHashCode}
        currentActivity={currentActivity}
        changeState={changeState}
        removeHeatMap={removeHeatMap}
        selectHeatMapKey={selectHeatMapKey}
      />
    </Card>)
  }

  render() {
    const {
      loading: { trackLoading = false },
      snapshot,
      displayList,
      selectEventPath,
      isVisualization,
      previewHeatMap,
      pointInfo,
      selectPoint,
      pointParams,
      heatMapList = [],
      selectHeatMapKey,
      editPageInfo,
      appType
    } = this.state.vm
    const { setHideList, changeState, heatMapEventQuery } = this.store
    const heatMapInfo = heatMapList.find(p => p.id === selectHeatMapKey)
    let { dsid, projid } = this.props.location.query
    let { projectList } = this.props
    let popoverPosition = {}
    let content = null
    if (!previewHeatMap && !isVisualization && _.get(pointInfo, 'point', []).length) {
      const imgPosition = getImgPosition()
      popoverPosition = {
        top: pointInfo.position.top + imgPosition.top - 48,
        left: pointInfo.position.left + imgPosition.left,
        height: pointInfo.position.height,
        width: pointInfo.position.width
      }
      content = (<div className="aligncenter" >
        <div className="pd3 mg2 font14">确定保存已选中网格吗?</div>
        <div className="aligncenter pd1b">
          <Button
            className="mg3r pd2x"
            onClick={() => {
              changeState({ pointParams: pointParams.filter(p => p.id !== pointInfo.id), pointInfo: {} })
            }}
            size="small"
          >
            删除
          </Button>
          <Button
            className="pd2x"
            onClick={() => {
              const newPointParams = !_.find(pointParams, p => p.id === pointInfo.id) ? _.concat(pointParams, pointInfo) : pointParams
              changeState({ pointParams: newPointParams, pointInfo: {} })
            }}
            type="primary"
            size="small"
          >
            保存
          </Button>
        </div>
      </div>)
    }
    return (
      <div className="height-100">
        <Spin spinning={trackLoading} size="large">
          {
            _.isEmpty(snapshot)
              ? this.renderQrCode()
              : (<div style={{backgroundColor: '#E4EAEF'}}>
                <HeatMapEdit
                  saveHeatMap={this.save}
                  displayList={displayList}
                  setHideList={setHideList}
                  projectList={projectList}
                  selectEventPath={selectEventPath}
                  projectId={projid}
                  datasourceId={dsid}
                  previewHeatMap={previewHeatMap}
                  changeState={changeState}
                  getHeatMapData={heatMapEventQuery}
                  changeHeatMapModel={this.changeHeatMapModel}
                  isVisualization={isVisualization}
                  heatMapInfo={heatMapInfo}
                  pageName={_.get(editPageInfo, 'page_name', '')}
                  pathName={_.get(editPageInfo, 'page', '')}
                  appType={appType}
                />
                <div className="mg1y">
                  <Row>
                    <Col span={4}>{this.renderHeatMapList()}</Col>
                    <Col span={20}>{this.renderContent()}</Col>
                  </Row>
                  <Popover
                    placement="right"
                    overlayStyle={{ width: 400 }}
                    overlayClassName="heat-map-pop"
                    title={<div className="color-white"><LegacyIcon type={selectEventPath ? 'setting' : 'exclamation-circle-o'} className="mg1r" />设置</div>}
                    content={content}
                    trigger="click"
                    visible={!previewHeatMap && (!_.isEmpty(pointInfo) && !selectPoint) && content}
                  >
                    <div style={{ ...popoverPosition, position: 'absolute' }} />
                  </Popover>
                </div>
              </div>)
          }
        </Spin>
      </div>
    );
  }
}
