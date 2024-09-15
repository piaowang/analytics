import _ from 'lodash'
import {
  APP_TYPE,
  EVENT_DIV_STYLE,
  BORDER_WIDTH
} from '../constants'
import NodesDiv from './nodesDivs'
import { Tooltip } from 'antd'

/**
 *
 * 
 * @export
 * @param {any} snapshot
 * @param {any} deviceInfo 设备信息
 * @param {any} editEventInfo 修改事件
 * @param {any} trackEventMap 事件集合
 * @param {any} currentActivity 容器
 * @param {any} viewMap 页面map
 * @param {any} getDevice 获取事件信息方法
 * @param {any} showEditEvent div点击事件
 * @param {any} currentUrl 页面url
 * @param {any} similarEventMap 同类map
 * @param {any} crossPageEventArr 全局
 * @returns 
 */
export default function renderAndroid(params) {
  let contentTitle
  const {
    snapshot,
    deviceInfo,
    isHeatMap = false,
    previewHeatMap = false
  } = params
  //设备信息
  if (deviceInfo) {
    contentTitle = (
      <div>
        App版本：{deviceInfo.$android_app_version}
        <div className="mg2l fright">
          设备：{deviceInfo.device_name}&nbsp;
          系统：{deviceInfo.device_type}&nbsp;
          {deviceInfo.$android_os_version}
        </div>
      </div>
    )
  }
  let bindableDivs = []
  if (!snapshot || !snapshot.activities || !snapshot.activities[0]) {
    return null
  }

  const activity = snapshot.activities[0]
  const views = activity.serialized_objects.objects
  const { scale } = activity
  const screenshotWidth = views[0].width * scale
  const screenshotHeight = views[0].height * scale
  const divWidth = `${screenshotWidth}`
  const divHeight = `${views[0].height * scale}`

  if (previewHeatMap) {
    return {
      title: contentTitle,
      divWidth,
      divHeight
    }
  }
  if (isHeatMap) {
    bindableDivs = getHeatMapDiv({ ...params, screenshotWidth, screenshotHeight })
  } else {
    bindableDivs = getBuriedDiv({ ...params, screenshotWidth, screenshotHeight })
  }

  return {
    title: contentTitle,
    content: bindableDivs,
    divWidth,
    divHeight
  }
}


function renderDiv(params) {
  const { index, view, className, showEditEvent, showHeatEvent, path,screenshotWidth, screenshotHeight } = params
  if (view.position.top > screenshotHeight || view.position.top + screenshotHeight <= 0) return null
  if (view.position.left > screenshotWidth || view.position.left + screenshotWidth <= 0) return null
  return (
    <div
      key={'divp-' + index}
      id={view.hashCode}
      className={className.join(' ')}
      onClick={() => showEditEvent
        ? showEditEvent(view.hashCode, view.position, APP_TYPE.android)
        : showHeatEvent(path, { top: view.position.top + (view.position.height / 2), left: view.position.left + view.position.width })}
      style={{
        top: view.position.top - BORDER_WIDTH,
        left: view.position.left - BORDER_WIDTH,
        width: view.position.width + BORDER_WIDTH * 2,
        height: view.position.height + BORDER_WIDTH * 2,
        zIndex: view.zIndex
      }}
    />
  )
}

function getBuriedDiv(params) {
  const {
    editEventInfo,
    trackEventMap,
    currentActivity,
    viewMap,
    showEditEvent,
    showEventBinds = true,
    webViewHashCode = "",
    appMultiViews = [],
    displayList = {},
    screenshotWidth,
    screenshotHeight
  } = params

  /**
  * For Content
  */

  const currentView = _.find(appMultiViews, p => p.hashCode.toString() === webViewHashCode.toString())
  const currentViewObject = _.get(viewMap, webViewHashCode.toString()) || {}
  if (currentView && currentView.isH5 && currentViewObject.htmlPage) {
    let webViewImg = null
    let webView = currentViewObject
    if (webView.htmlPage.screenshot) {
      let xwalkImgUrl = `data:image/png;base64,${webView.htmlPage.screenshot}`
      webViewImg = <div
        key={'div-web-view'}
        id={webView.hashCode}
        style={{
          top: webView.position.top,
          left: webView.position.left,
          width: webView.position.width + BORDER_WIDTH * 2,
          height: webView.position.height + BORDER_WIDTH * 2,
          position: 'absolute',
          zIndex: 2
        }}>
        <img
          style={{ width: webView.position.width, height: webView.position.height }}
          src={xwalkImgUrl} />
      </div>
    }
    _.set(webView, 'position.screenshotWidth', screenshotWidth)
    _.set(webView, 'position.screenshotHeight', screenshotHeight)
    _.set(webView, 'sys_type', APP_TYPE.android)
    const nodesDiv = NodesDiv({ webView, ...params })
    return [...nodesDiv, webViewImg]
  }
  let similarPath = []
  let similarIndex = -1
  if (editEventInfo.similar && editEventInfo.similar_path) {
    similarPath = JSON.parse(editEventInfo.similar_path).map((p, i) => ({ ...p, idx: i }))
    similarIndex = _.findIndex(similarPath, p => p.index === -1)
  }
  return _.values(viewMap).map((p, i) => {
    if (!p.hashCode || p.htmlPage) {
      return null
    }
    let eventKey = [currentActivity, p.eventPath].join('::')
    if (_.get(displayList, [eventKey], '')) return null
    let className = [EVENT_DIV_STYLE.default]
    p = _.cloneDeep(p)
    _.set(p, 'position.screenshotWidth', screenshotWidth)
    // 高级模式 高亮显示已选控件
    let dimMode = _.get(editEventInfo, 'editEventInfo.dim_mode', false)
    if (dimMode) {
      if (editEventInfo.dim_binding) {
        let dim_name = _.find(editEventInfo.dim_binding, p => p.path === p.eventPath)
        if (dim_name) className.push(EVENT_DIV_STYLE.dimBind)
      }
      return renderDiv({ index: i, view: p, className, showEditEvent,screenshotWidth, screenshotHeight  })
    }
    let eventPathArr = JSON.parse(p.eventPath).map((p, i) => ({ ...p, idx: i }))
    // 如果是当前选中控件高亮显示
    if (editEventInfo && p.eventPath === editEventInfo.event_path) {
      className.push(EVENT_DIV_STYLE.click)
      return renderDiv({ index: i, view: p, className, showEditEvent,screenshotWidth, screenshotHeight })
    } else if (similarPath.length === eventPathArr.length
      && _.differenceWith(eventPathArr, similarPath, _.isEqual).length === 1
      && similarIndex > -1
    ) {
      eventPathArr[similarIndex].index = -1
      if (_.isEqual(eventPathArr, similarPath)) {
        className.push(EVENT_DIV_STYLE.similar)
      }
    }
    if (showEventBinds) {
      // 已绑定事件 高亮显示
      let ev = _.get(trackEventMap, [eventKey], false)
      if (ev) {
        className.push(EVENT_DIV_STYLE.bind)
      }
    }
    return renderDiv({ index: i, view: p, className, showEditEvent,screenshotWidth, screenshotHeight })
  })
}

function getHeatMapDiv(params) {
  const {
    changeState, viewMap, isVisualization,
    screenshotWidth, eventGroups = [], pointParams = [],
    pointInfo = {}, screenshotHeight, currentActivity,
    trackEventMap, showHeatEvent, selectEventPath
  } = params

  /**
  * For Content
  */
  let bindableDivs = []
  if (isVisualization) {
    _.values(viewMap).forEach((p, i) => {
      if (!p.hashCode) return
      let webView = p
      if (webView.htmlPage) {
        let webViewImg = null
        if (webView.htmlPage.screenshot) {
          let xwalkImgUrl = `data:image/png;base64,${webView.htmlPage.screenshot}`
          webViewImg = <div
            key={'div-web-view'}
            id={webView.hashCode}
            style={{
              top: webView.position.top,
              left: webView.position.left,
              width: webView.position.width + BORDER_WIDTH * 2,
              height: webView.position.height + BORDER_WIDTH * 2,
              position: 'absolute',
              zIndex: 2
            }}>
            <img
              style={{ width: webView.position.width, height: webView.position.height }}
              src={xwalkImgUrl} />
          </div>
        }
        _.set(webView, 'position.screenshotWidth', screenshotWidth)
        _.set(webView, 'position.screenshotHeight', screenshotHeight)
        _.set(webView, 'sys_type', APP_TYPE.android)
        const nodesDiv = NodesDiv({ webView, ...params })
        bindableDivs = bindableDivs.concat(nodesDiv)
        bindableDivs.push(webViewImg)
      } else {
        const eventKey = [currentActivity, p.eventPath].join('::')
        const ev = _.get(trackEventMap, [eventKey], false) || eventGroups.find(event => event.event_path === p.eventPath)
        let className = [EVENT_DIV_STYLE.default]
        if (selectEventPath === p.eventPath) {
          className.push(EVENT_DIV_STYLE.click)
        } else if (ev) {
          className.push(EVENT_DIV_STYLE.bind)
        }
        p = _.cloneDeep(p)
        const content = renderDiv({ index: i, view: p, className, showHeatEvent, path: p.eventPath,screenshotWidth, screenshotHeight })
        bindableDivs.push(content)
      }
    })
    return bindableDivs
  }
  bindableDivs = pointParams.map((p, i) => {
    if (_.isEmpty(p)) {
      return false
    }
    const { top, width, height, left } = p.position
    return <div
      key={'div-nobur' + i}
      onClick={() => changeState({ pointInfo: p })}
      className={`${EVENT_DIV_STYLE.default} ${EVENT_DIV_STYLE.bind}`}
      style={{ top, left, height, width, zIndex: 1000 + i }}
    />
  })

  if (!_.isEmpty(pointInfo)) {
    const { top, width, height, left } = pointInfo.position
    bindableDivs.push(<div
      key='div-nobur-point'
      className={`${EVENT_DIV_STYLE.default} ${EVENT_DIV_STYLE.click}`}
      style={{ top, left, height, width, zIndex: 999 }}
    />)
  }
  return bindableDivs
}
