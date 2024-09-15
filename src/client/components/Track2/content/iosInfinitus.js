import _ from 'lodash'
import {
  getIOSPosition,
  getIOSViewPath,
  getVisibleViews
} from '../trackOpertion2'
import {
  APP_TYPE,
  EVENT_DIV_STYLE,
  BORDER_WIDTH
} from '../constants'
import NodesDiv from './nodesDivs'

/**
 *
 * 
 * @export
 * @param {any} snapshot
 * @param {any} deviceInfo 设备信息
 * @param {any} currentActivity 页面容器
 * @param {any} editEventInfo 修改的事件
 * @param {any} trackEventMap 事件列表
 * @param {any} viewMapTmp 页面集合
 * @param {any} iosMainView
 * @param {any} getDevice 获取设备信息事件
 * @param {any} showEditEvent 点击事件
 * @param {any} iosViewMap
 * @param {any} currentUrl 页面url
 * @param {any} similarEventMap 同类
 * @param {any} crossPageEventArr 全局
 * @returns 
 */
export default function IosInfinitus({
  snapshot,
  deviceInfo,
  currentActivity,
  editEventInfo,
  trackEventMap,
  iosMainView,
  showEditEvent,
  iosViewMap,
  currentUrl,
  similarEventMap,
  crossPageEventArr
}) {
  let divs
  let divWidth
  let webView
  let contentTitle
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

  if (snapshot && snapshot.serialized_objects) {
    let win = iosViewMap[snapshot.serialized_objects.rootObject]
    let screenshotWidth = _.get(win, 'properties.bounds.values[0].value.Width')
    divWidth = `${screenshotWidth}px`
    let rootCtlId = _.get(win, 'properties.rootViewController.values[0].value')
    if (!rootCtlId) {
      return
    }
    let rootCtl = iosViewMap[rootCtlId]
    let UINavigationController
    if (_.findKey(rootCtl.class, p => p === 'UINavigationController')) {
      UINavigationController = rootCtl
    }
    if (!iosMainView) {
      return
    }
    let tmpViews = [iosMainView]
    getVisibleViews(iosMainView, iosViewMap, tmpViews)
    divs = (
      tmpViews.map((view, idx) => {
        let clickable = false
        let userInteractionEnabled = _.get(view, 'properties.userInteractionEnabled.values[0].value', true)
        if (userInteractionEnabled === true) {
          let classes = view.class
          for (let key in classes) {
            let classz = classes[key]
            if (classz === 'UIControl' || classz === 'UIWebView' || classz === 'WKWebView') {
              clickable = true
              break
            }
            if (classz === 'UITableView') {
              let selectors = view.delegate.selectors
              for (let key in selectors) {
                if (selectors[key] === 'tableView:didSelectRowAtIndexPath:') {
                  clickable = true
                  break
                }
              }
              break
            }
          }
        }
        let frame = view.properties.frame
        if (clickable === true && frame) {
          let pos = _.get(frame, 'values[0].value')
          let position = {}
          position.top = pos.Y
          position.left = pos.X
          position = getIOSPosition(view, iosViewMap, position, iosMainView)
          position.width = pos.Width
          position.height = pos.Height
          position.screenshotWidth = screenshotWidth
          if (view.htmlPage) {
            view.position = position
            view.sys_type = APP_TYPE.ios
            var topLayoutNumber = 0
            if (view.UIViewController) {
              let topLayout = _.get(view, 'UIViewController.properties.topLayoutGuide.values[0].value')
              if (topLayout.substring(0, 1) === '$') {
                let layoutGuide = iosViewMap[topLayout]
                topLayoutNumber = layoutGuide.properties.frame.values[0].value.Height
              } else {
                topLayoutNumber = parseFloat(topLayout)
              }
            }
            position.top = position.top + topLayoutNumber

            if (view.properties.translatesAutoresizingMaskIntoConstraints.values[0].value === false
              && UINavigationController.properties.isNavigationBarHidden.values[0].value === true) {
              position.top = position.top - topLayoutNumber
            }
            webView = view
            return ''
          }
          var eventPath = getIOSViewPath(view.id, iosViewMap, currentActivity, iosMainView, 0)
          let className = [EVENT_DIV_STYLE.default]

          if (editEventInfo && editEventInfo.dim_mode && editEventInfo.dim_mode === true) {
            if (editEventInfo.dim_binding) {
              let dim_name = _.find(editEventInfo.dim_binding, p => p.path === JSON.stringify(eventPath))
              if (dim_name) className.push(EVENT_DIV_STYLE.dimBind)
            }
            return (
              <div key={'div-' + idx} id={view.id}
                className={className.join(' ')}
                style={{
                  top: position.top - BORDER_WIDTH,
                  left: position.left - BORDER_WIDTH,
                  width: position.width + BORDER_WIDTH * 2,
                  height: position.height + BORDER_WIDTH * 2
                }}
              />
            )
          }

          if (editEventInfo && eventPath === editEventInfo.event_path) {
            className.push(EVENT_DIV_STYLE.click)
          } else {
            let eventKey = currentActivity + '::' + eventPath
            let ev = _.get(trackEventMap, [eventKey], false)
            if (ev) {
              className.push(EVENT_DIV_STYLE.bind)
            }
          }

          return (<div
            key={'div-' + idx} id={view.id}
            className={className.join(' ')}
            onClick={() => { showEditEvent(view.id, position, APP_TYPE.ios) }}
            style={{
              top: position.top - BORDER_WIDTH,
              left: position.left - BORDER_WIDTH,
              width: position.width + BORDER_WIDTH * 2,
              height: position.height + BORDER_WIDTH * 2
            }}
          >
          </div>)
        }
      })
    )
    let nodesDiv = []
    if (webView) {
      nodesDiv = NodesDiv(webView, editEventInfo, trackEventMap, currentActivity,
        currentUrl, similarEventMap, crossPageEventArr, showEditEvent)
    }
    const mainContent = (<div>
      {divs}
      {nodesDiv}
    </div>)

    return {
      title: contentTitle,
      content: mainContent,
      divWidth: divWidth
    }
  } else {
    return null
  }
}
