/**
 * android渲染可圈选div界面
 */
import _ from 'lodash'
import { APP_TYPE, EVENT_DIV_STYLE, BORDER_WIDTH, generateEventKey, getTrackEventInfo } from '../constants'
import NodesDiv from './h5-divs'
import { equalAndroidAndIosSimilarNode } from '../operation/similar'

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
 * @param {any} isReportData 高级上报模式
 * @returns 组件
 */
export default function renderContent(params) {
  const {
    imgHeight,
    imgWidth,
    controls = [],
    isHeatMap = false,
    previewHeatMap = false
  } = params

  // 无组件信息直接返回空
  if (_.isEmpty(controls) || !_.isArray(controls)) {
    return null
  }

  // 热图预览模式返回设备信息和img大小
  if (previewHeatMap) {
    return null
  }

  let bindableDivs = []
  // 热图模式
  if (isHeatMap) {
    bindableDivs = getHeatMapDiv({ ...params, imgWidth, imgHeight })
  } else { // 可视化埋点模式
    bindableDivs = getBuriedDiv({ ...params, imgWidth, imgHeight })
  }
  return bindableDivs
}

/**
 * 获取需要渲染的div边框 
 * @param {*} params 
 */
function renderDiv(params) {
  const {
    index,
    view,
    className,
    showEditEvent,
    showHeatEvent,
    path,
    imgWidth,
    imgHeight,
    scale,
    appType = APP_TYPE.android
  } = params
  // 获得控件实际渲染大小
  let { y: top, x: left, height, width } = view || {}
  top = top * scale
  height = height * scale
  left = left * scale
  width = width * scale
  // 判断超出屏幕外的元素不显示
  if (top > imgHeight || top + imgHeight <= 0 || left > imgWidth || left + imgWidth <= 0 || !width || !height) {
    return null
  }
  // 裁剪组件显示大小
  // 裁剪组件显示大小
  if (top < 0) {
    height = height < imgHeight ? height + top : imgHeight + top
    top = 0
  } else if (top + height > imgHeight) {
    height = imgHeight - top
  }

  if (left < 0) {
    width = width < imgWidth ? width + top : imgWidth + left
    left = 0
  } else if (left + width > imgWidth) {
    width = imgWidth - left
  }

  const info = {
    position: { top, left, height, width },
    event_path_type: appType,
    hashCode: view.hashCode || view.id,
    eventClass: view.class,
    ..._.pick(view, [
      'sugo_autotrack_content',
      'sugo_autotrack_path',
      'sugo_autotrack_page_path',
      'sugo_autotrack_position',
      'event_id'
    ])
  }
  // 返回div边框
  return (
    <div
      key={'divp-' + index}
      id={view.hashCode}
      className={className.join(' ')}
      onClick={() => showEditEvent
        ? showEditEvent(info)
        : showHeatEvent(path, { top: top + (height / 2), left: left + width })}
      style={{
        top: top - BORDER_WIDTH,
        left: left - BORDER_WIDTH,
        width: width + BORDER_WIDTH * 2,
        height: height + BORDER_WIDTH * 2,
        zIndex: index
      }}
    />
  )
}

/**
 * 普通埋点组件遍历
 * @param {*} params 
 */
function getBuriedDiv(params) {
  const {
    controls,
    editEventInfo,
    trackEventMap,
    currentPageView,
    showEditEvent,
    showTrackEvent = true,
    hiddenList = {},
    imgWidth,
    imgHeight,
    isReportData,
    scale,
    appType = APP_TYPE.android,
    // similarEventMap
  } = params

  const currentViewObject = controls.find(p => p.hashCode === currentPageView.hashCode || p.id === currentPageView.hashCode) || {}
  // 判断是否是h5页面
  if (currentPageView?.isH5 && currentViewObject?.htmlPage) {
    let webViewImg = null
    let webView = _.cloneDeep(currentViewObject)
    // 如果html里有界面信息 则渲染html中的图片 兼容Xwalkview框架
    if (webView.htmlPage.screenshot) {
      let xwalkImgUrl = `data:image/png;base64,${webView.htmlPage.screenshot}`
      webViewImg = (
        <div
          key={'div-web-view'}
          id={webView.hashCode}
          style={{
            top: webView.position.top,
            left: webView.position.left,
            width: webView.position.width + BORDER_WIDTH * 2,
            height: webView.position.height + BORDER_WIDTH * 2,
            position: 'absolute',
            zIndex: 2
          }}
        >
          <img
            style={{ width: webView.position.width, height: webView.position.height }}
            src={xwalkImgUrl}
          />
        </div>
      )
    }
    _.set(webView, 'position.imgWidth', imgWidth)
    _.set(webView, 'position.imgHeight', imgHeight)
    _.set(webView, 'sys_type', appType)
    const nodesDiv = NodesDiv({ webView, ...params })
    return [...nodesDiv, webViewImg].filter(_.identity)
  }
  //获取当前页面已设置同类的路径
  // let similarPathArray = _.get(similarEventMap, [currentPageView.path], {})
  // similarPathArray = _.omit(similarPathArray, [editEventInfo.sugo_autotrack_path])

  const similarPath = editEventInfo.similar_path || editEventInfo.event_path
  // 遍历组件
  return controls.map((p, i) => {
    // hashcode 或是h5页面 直接返回
    if (p.htmlPage) {
      return null
    }
    // 非高级圈选模式下 不可点击元素直接过滤
    if (!isReportData && !p.clickable) {
      return null
    }
    const baseParams = {
      index: i,
      view: p,
      className: [EVENT_DIV_STYLE.default],
      showEditEvent,
      imgWidth,
      imgHeight,
      scale
    }
    // 生成事件的唯一key
    const { eventKey } = generateEventKey(p)
    // 隐藏事件直接返回
    if (_.some(hiddenList, h => h.path === eventKey)) {
      return null
    }
    // 高级模式 高亮显示已选控件
    if (isReportData) {
      // 如果是当前选中控件高亮显示
      if (editEventInfo
        && p.sugo_autotrack_page_path === editEventInfo.sugo_autotrack_page_path
        && p.sugo_autotrack_path === editEventInfo.sugo_autotrack_path
        && p.sugo_autotrack_position === editEventInfo.sugo_autotrack_position
      ) {
        return renderDiv({ ...baseParams, className: [EVENT_DIV_STYLE.default, EVENT_DIV_STYLE.click] })
      }
      // 如果高级模式选中内容为空则直接返回默认的可圈选样式
      if (!editEventInfo.dim_binding) {
        return renderDiv(baseParams)
      }
      // 若果当前控件在高级上报集合中则显示已圈选样式
      let inBinding = _.some(editEventInfo.dim_binding, d => {
        return d.sugo_autotrack_path === p.sugo_autotrack_path
          && p.sugo_autotrack_position === d.sugo_autotrack_position
      })
      const className = inBinding
        ? [EVENT_DIV_STYLE.default, EVENT_DIV_STYLE.dimBind]
        : [EVENT_DIV_STYLE.default]
      return renderDiv({ ...baseParams, className })
    }

    // 如果是当前选中控件高亮显示
    if (editEventInfo
      && p.sugo_autotrack_page_path === editEventInfo.sugo_autotrack_page_path
      && p.sugo_autotrack_path === editEventInfo.sugo_autotrack_path
      && p.sugo_autotrack_position === editEventInfo.sugo_autotrack_position
    ) {
      return renderDiv({ ...baseParams, className: [EVENT_DIV_STYLE.default, EVENT_DIV_STYLE.click] })
    }

    // 同类组件高亮显示
    if (editEventInfo?.similar
      && equalAndroidAndIosSimilarNode(similarPath, p.sugo_autotrack_path)
      && p.sugo_autotrack_page_path === editEventInfo.sugo_autotrack_page_path
    ) {
      return renderDiv({ ...baseParams, className: [EVENT_DIV_STYLE.default, EVENT_DIV_STYLE.similar] })
    }

    // 显示已埋点并且已经埋点 显示已埋点样式
    if (showTrackEvent && !!getTrackEventInfo(p, trackEventMap)) {
      return renderDiv({ ...baseParams, className: [EVENT_DIV_STYLE.default, EVENT_DIV_STYLE.bind] })
    }
    // 返回默认可圈选点样式
    return renderDiv({ ...baseParams, className: [EVENT_DIV_STYLE.default] })
  })
    .filter(_.identity)
}

function getHeatMapDiv(params) {
  const {
    changeState,
    viewMap,
    isVisualization,
    imgWidth,
    eventGroups = [],
    pointParams = [],
    pointInfo = {},
    imgHeight,
    currentActivity,
    trackEventMap,
    showHeatEvent,
    selectEventPath,
    appType = APP_TYPE.android
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
          webViewImg = (
            <div
              key={'div-web-view'}
              id={webView.hashCode}
              style={{
                top: webView.position.top,
                left: webView.position.left,
                width: webView.position.width + BORDER_WIDTH * 2,
                height: webView.position.height + BORDER_WIDTH * 2,
                position: 'absolute',
                zIndex: 2
              }}
            >
              <img
                style={{ width: webView.position.width, height: webView.position.height }}
                src={xwalkImgUrl}
              />
            </div>
          )
        }
        _.set(webView, 'position.imgWidth', imgWidth)
        _.set(webView, 'position.imgHeight', imgHeight)
        _.set(webView, 'sys_type', appType)
        const nodesDiv = NodesDiv({ webView, ...params })
        bindableDivs = bindableDivs.concat(nodesDiv)
        bindableDivs.push(webViewImg)
      } else {
        const eventKey = [currentActivity, p.eventPath].join('::')
        const ev = _.get(trackEventMap, [eventKey], false)
          || eventGroups.find(event => event.event_path === p.eventPath)
        let className = [EVENT_DIV_STYLE.default]
        if (selectEventPath === p.eventPath) {
          className.push(EVENT_DIV_STYLE.click)
        } else if (ev) {
          className.push(EVENT_DIV_STYLE.bind)
        }
        p = _.cloneDeep(p)
        const content = renderDiv({
          index: i,
          view: p,
          className,
          showHeatEvent,
          path: p.eventPath,
          imgWidth, imgHeight
        })
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
    return (
      <div
        key={'div-nobur' + i}
        onClick={() => changeState({ pointInfo: p })}
        className={`${EVENT_DIV_STYLE.default} ${EVENT_DIV_STYLE.bind}`}
        style={{ top, left, height, width, zIndex: 1000 + i }}
      />
    )
  })

  if (!_.isEmpty(pointInfo)) {
    const { top, width, height, left } = pointInfo.position
    bindableDivs.push(
      <div
        key="div-nobur-point"
        className={`${EVENT_DIV_STYLE.default} ${EVENT_DIV_STYLE.click}`}
        style={{ top, left, height, width, zIndex: 999 }}
      />
    )
  }
  return bindableDivs
}
