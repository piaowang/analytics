import _ from 'lodash'
import {
} from '../trackOpertion2'
import {
  APP_TYPE,
  EVENT_DIV_STYLE,
  BORDER_WIDTH,
  CONTROLL_PROP,
  CONTROLL_TYPE
} from '../constants'
import NodesDiv from './nodesDivs'
import { Tooltip } from 'antd'

/**
 *
 * 
 * @export
 * @param {any} snapshot
 * @param {any} deviceInfo 设备信息
 * @param {any} editEventInfo 修改的事件
 * @param {any} trackEventMap 事件集合
 * @param {any} iosContent 内容
 * @param {any} getDevice 获取设备信息方法
 * @param {any} showEditEvent 点击事件
 * @param {any} currentActivity 页面容器
 * @param {any} currentUrl 页面url
 * @param {any} similarEventMap 同类
 * @param {any} crossPageEventArr 全局
 * @returns
 */
export default function renderIosStandard(params) {
  const { snapshot, deviceInfo, isHeatMap = false, iosContent, previewHeatMap = false } = params
  let contentTitle
  if (_.isEmpty(snapshot)) {
    return null
  }
  /**
   * For deviceInfo
   */
  if (deviceInfo) {
    contentTitle = (
      <div>
        App版本：{deviceInfo.app_release}
        <div className="mg2l fright">
          设备：{deviceInfo.device_name}&nbsp;
          系统：{deviceInfo.system_name}&nbsp;
          {deviceInfo.system_version}
        </div>
      </div>
    )
  }
  let bindableDivs = []
  const divWidth = `${iosContent.uiScreenWidth}`
  const divHeight = `${iosContent.uiScreenHeight}`

  if (previewHeatMap) {
    return {
      title: contentTitle,
      divWidth,
      divHeight
    }
  }

  if (isHeatMap) {
    bindableDivs = getHeatMapDiv(params)
  } else {
    bindableDivs = getBuriedDiv(params)
  }
  return {
    title: contentTitle,
    content: bindableDivs,
    divWidth,
    divHeight
  }
}

function getBuriedDiv(params) {
  const {
    editEventInfo,
    trackEventMap,
    iosContent,
    showEventBinds = true,
    appMultiViews = [],
    displayList = {},
    webViewHashCode = '',
    showEditEvent
  } = params

  /**
  * For Content
  */
  let contentOfBindable = _.values(iosContent.associationOfBindableMap) //iosContent.idsAssociationOfBindable()
  contentOfBindable = _.orderBy(contentOfBindable, ['position.height', 'position.width'], ['desc', 'desc'])
  let similarReg = ''
  if (editEventInfo.similar && editEventInfo.similar_path) {
    const regstr = editEventInfo.similar_path
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\*/g, '([^/])')
    similarReg = new RegExp(regstr+'$')
  }

  const currentView = appMultiViews.find(p => p.hashCode.toString() === webViewHashCode.toString())
  let bindableDivs = []
  if (currentView && currentView.isH5) {
    let obj = _.get(iosContent.cachedObjects, `${currentView.hashCode}`)// iosContent.objectOf(id)
    bindableDivs = NodesDiv({
      webView: obj,
      ...params
    })
    return bindableDivs
  }
  return contentOfBindable.map((p, index) => {
    if (!p.id || _.get(iosContent.cachedObjects, `${p.id}.htmlPage`)) {
      return null
    }
    let position = {
      zIndex: index,
      top: p.position.y,
      left: p.position.x,
      width: p.position.width,
      height: p.position.height,
      screenshotWidth: iosContent.uiScreenWidth,
      screenshotHeight: iosContent.uiScreenHeight
    }
    let eventPath = p.path
    const eventKey = _.get(iosContent.cachedObjects, `${iosContent.vc.id}.${CONTROLL_PROP.class}[0]`, '') + '::' + eventPath
    let ev = _.get(trackEventMap, [eventKey], false)
    let className = [EVENT_DIV_STYLE.default]
    if (_.get(displayList, [eventKey], '')) return ''
    if (position.top > position.screenshotHeight || position.top + position.screenshotHeight <= 0) return ''
    if (position.left > position.screenshotWidth || position.left + position.screenshotWidth <= 0) return ''
    // For Native
    if (editEventInfo && editEventInfo.dim_mode && editEventInfo.dim_mode === true) {
      if (editEventInfo.dim_binding) {
        let dim_name = _.find(editEventInfo.dim_binding, p => p.path === JSON.stringify(eventPath))
        if (dim_name) className.push(EVENT_DIV_STYLE.dimBind)
      }
    }
    if (editEventInfo && eventPath === editEventInfo.event_path) {
      className.push(EVENT_DIV_STYLE.click)
    } else if (similarReg) {
      if (similarReg.test(eventPath)) className.push(EVENT_DIV_STYLE.similar)
    } else {
      if (showEventBinds) {
        if (ev) {
          className.push(EVENT_DIV_STYLE.bind)
        }
      }
    }
    return createDiv({ id: p.id, className, position, showEditEvent })
  })
}

function getHeatMapDiv(params) {
  const { changeState, pointParams = [], pointInfo = {}, isVisualization, eventGroups = [], trackEventMap, iosContent, showHeatEvent, selectEventPath, displayList } = params
  let bindableDivs = []
  if (isVisualization) {
    let contentOfBindable = _.values(iosContent.associationOfBindableMap)
    contentOfBindable = _.orderBy(contentOfBindable, ['position.height', 'position.width'], ['desc', 'desc'])
    _.values(contentOfBindable).forEach((p, i) => {
      let className = [EVENT_DIV_STYLE.default]
      let obj = _.get(iosContent.cachedObjects, `${p.id}`)
      if (!obj) return

      if (p.position.y > iosContent.uiScreenHeight || p.position.x > iosContent.uiScreenWidth) {
        return
      }
      if (obj.htmlPage) {
        const webViewDiv = NodesDiv({ webView: obj, ...params })
        bindableDivs = bindableDivs.concat(webViewDiv)
      } else {
        const eventPath = p.path
        const eventKey = _.get(iosContent.cachedObjects, `${iosContent.vc.id}.${CONTROLL_PROP.class}[0]`, '') + '::' + eventPath
        const ev = _.get(trackEventMap, [eventKey], false) || eventGroups.find(event => event.event_path === eventPath)
        if (selectEventPath === eventPath) {
          className.push(EVENT_DIV_STYLE.click)
        } else if (ev && !displayList.includes(eventPath)) {
          className.push(EVENT_DIV_STYLE.bind)
        }
        const position = {
          zIndex: i,
          top: p.position.y,
          left: p.position.x,
          width: p.position.width,
          height: p.position.height,
          screenshotWidth: iosContent.uiScreenWidth,
          screenshotHeight: iosContent.uiScreenHeight
        }
        const content = createDiv({ id: p.id, showHeatEvent, path: eventPath, position, className })
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
    return (<div
      key={'div-nobur' + i}
      onClick={() => changeState({ pointInfo: p })}
      className={`${EVENT_DIV_STYLE.default} ${EVENT_DIV_STYLE.bind}`}
      style={{ top, left, height, width, zIndex: 1000 + i }}
            />)
  })

  if (!_.isEmpty(pointInfo)) {
    const { top, width, height, left } = pointInfo.position
    bindableDivs.push(<div
      key="div-nobur-point"
      className={`${EVENT_DIV_STYLE.default} ${EVENT_DIV_STYLE.click}`}
      style={{ top, left, height, width, zIndex: 999 }}
    />)
  }
  return bindableDivs
}

function createDiv(params) {
  const { id, className, position, showEditEvent, showHeatEvent, path } = params
  return (<div key={'div-' + id} id={id} className={className.join(' ')}
    onClick={() => showEditEvent
      ? showEditEvent(id, position, APP_TYPE.ios)
      : showHeatEvent(path, { top: position.top + (position.height / 2), left: position.left + position.width })}
    style={{
      top: position.top - BORDER_WIDTH,
      left: position.left - BORDER_WIDTH,
      width: position.width + BORDER_WIDTH * 2,
      height: position.height + BORDER_WIDTH * 2,
      zIndex: position.zIndex + 1
    }}
          />)
}
