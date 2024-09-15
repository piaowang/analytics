import _ from 'lodash'
import {
  APP_TYPE,
  EVENT_DIV_STYLE,
  BORDER_WIDTH
} from '../constants'
import { equalSimilarNode } from '../operation/similar'
import { immutateUpdate } from '~/src/common/sugo-utils'

/**
 *  生成h5DIV
 *
 * @export
 * @param {object} webView        webview信息
 * @param {object} editEventInfo  当前修改的事件
 * @param {object} trackEventMap   事件列表
 * @param {object} similarEventMap 同类标签
 * @param {array} crossPageEventArr 全局有效
 * @param {function} showEditEvent 事件
 * @param {array} hiddenList 隐藏的元素列表
 * @param {boolean} showTrackEvent 是否显示当前页面埋点事件
 * @param {function} showHeatEvent 热图点击事件
 * @param {number} imgWidth 截图宽度
 * @param {number} imgHeight 截图高度
 * @param {boolean} isReportData 高级上报模式
 * @param {boolean} isHeatMap  是否是热图模式
 * @param {object} h5ControlClass 
 * @returns div集合
 */
export default function renderNodesDivs(params) {
  const {
    webView,
    editEventInfo,
    trackEventMap,
    similarEventMap,
    crossPageEventArr,
    showEditEvent,
    showTrackEvent = true,
    hiddenList = {},
    h5ControlClass = {},
    isHeatMap = false,
    showHeatEvent,
    imgWidth,
    imgHeight,
    isReportData,
    scale
  } = params

  if (!webView || !webView.htmlPage || !webView.htmlPage.nodes) {
    return null
  }
  let htmlNodes = []
  try {
    // 节点排序
    htmlNodes = JSON.parse(webView.htmlPage.nodes)
    htmlNodes = _.orderBy(htmlNodes, p => _.toNumber(p?.rect?.width) + _.toNumber(p?.rect?.height), ['desc'])
  } catch (error) {
    console.log('----------------error: h5组件信息解析错误')
  }
  let currentPage = webView?.htmlPage?.url || ''

  //获取当前页面已设置同类的路径
  let similarPathArray = _.get(similarEventMap, [currentPage], {})
  similarPathArray = _.omit(similarPathArray, [editEventInfo.sugo_autotrack_path])

  //获取当前选中元素的同类设置
  let currEventSimilar = _.get(editEventInfo, 'similar', false)
  //过滤无效节点  根据控件大小排序 避免遮罩
  let nodesDiv = htmlNodes.map((node, index) => {
    let { top, left, width, height } = node.rect
    let webViewTop = (webView?.y * scale)
    let webViewLeft = (webView?.x * scale)
    // webview 容器高度
    const htmlHeight = imgHeight - webViewTop
    const htmlWidth = imgWidth - webViewLeft
    // 排除没有大小的 和 组件显示超出屏幕外的组件
    if (top > htmlHeight
      || top + htmlHeight <= 0
      || left > htmlWidth
      || left + htmlWidth <= 0
      || width <= 0
      || height <= 0
    ) {
      return null
    }
    // 裁剪组件显示大小
    if (top < 0) {
      height = height < htmlHeight ? height + top : htmlHeight + top
      top = 0
    } else if (top + height > htmlHeight) {
      height = htmlHeight - top
    }

    if (left < 0) {
      width = width < htmlWidth ? width + top : htmlWidth + left
      left = 0
    } else if (left + width > htmlWidth) {
      width = htmlWidth - left
    }

    // 获取组件在屏幕里的大小 避免元素边框样式超出手机截图大小
    const newNode = immutateUpdate(node, 'position', (obj) => {
      return {
        ...obj,
        top: top + webViewTop,
        left: left + webViewLeft,
        width,
        height
      }
    })

    // 获取事件的唯一属性
    let eventKey = [currentPage, newNode.path, '0'].join('::')
    // 获取已埋点信息  TODO hashcode和path 两种映射
    let hasTrackInfo = _.get(trackEventMap, [eventKey], false)
    const baseParams = { isHeatMap, index, showEditEvent, showHeatEvent, node: newNode, webView, className: [EVENT_DIV_STYLE.default] }
    // 高级关联上报模式
    if (isReportData) {
      //当前元素是选中元素
      if (newNode.path === editEventInfo.sugo_autotrack_path) {
        return renderDiv({ ...baseParams, className: [EVENT_DIV_STYLE.default, EVENT_DIV_STYLE.click] })
      }
      // 如果高级模式选中内容为空则直接返回默认的可圈选样式
      if (!editEventInfo.dim_binding) {
        return renderDiv(baseParams)
      }
      // 若果当前控件在高级上报集合中则显示已圈选样式
      let inBinding = _.some(editEventInfo.dim_binding, d => d.path === node.path)
      const className = inBinding ? [EVENT_DIV_STYLE.default, EVENT_DIV_STYLE.dimBind] : [EVENT_DIV_STYLE.default]
      return renderDiv({ isHeatMap, index, className, showEditEvent, showHeatEvent, node: newNode })
    }

    // 埋点模式
    if (!isHeatMap) {
      // 隐藏后直接返回空
      if (_.some(hiddenList, h => h.path === eventKey)) {
        return null
      }
      //当前元素是选中元素
      if (newNode.path === editEventInfo.sugo_autotrack_path) {
        return renderDiv({ ...baseParams, className: [EVENT_DIV_STYLE.default, EVENT_DIV_STYLE.click] })
      }
      const similarPath = editEventInfo.similar_path || JSON.stringify({ path: editEventInfo.sugo_autotrack_path })
      // 显示同类元素
      if (currEventSimilar && equalSimilarNode(similarPath, newNode.path, h5ControlClass)) {
        return renderDiv({ ...baseParams, className: [EVENT_DIV_STYLE.default, EVENT_DIV_STYLE.similar] })
      }

      // 显示已埋点信息 
      if (showTrackEvent && hasTrackInfo) {
        return renderDiv({ ...baseParams, className: [EVENT_DIV_STYLE.default, EVENT_DIV_STYLE.bind] })
      }
      // 显示已所有同类组件信息 
      if (showTrackEvent && equalSimilarNode(similarPathArray, newNode.path, h5ControlClass)) {
        return renderDiv({ ...baseParams, className: [EVENT_DIV_STYLE.default, EVENT_DIV_STYLE.similar] })
      }
      // 显示全局组件信息
      if (_.find(crossPageEventArr, p => p === editEventInfo.sugo_autotrack_path)) {
        return renderDiv({ ...baseParams, className: [EVENT_DIV_STYLE.default, EVENT_DIV_STYLE.corssPage] })
      }
    }

    // 热图当前选中组件显示 
    if (isHeatMap && newNode.path === editEventInfo.sugo_autotrack_path) {
      return renderDiv({ ...baseParams, className: [EVENT_DIV_STYLE.default, EVENT_DIV_STYLE.click] })
    }
    // 热图已埋点组件显示
    if (isHeatMap && hasTrackInfo) {
      return renderDiv({ ...baseParams, className: [EVENT_DIV_STYLE.default, EVENT_DIV_STYLE.bind] })
    }
    return renderDiv(baseParams)
  })
  return nodesDiv
}

/**
 * 获取需要渲染的div边框 
 * @param {*} params 
 */
function renderDiv(params) {
  const { isHeatMap, index, className, showEditEvent, showHeatEvent, path, node, webView } = params
  // 判断超出屏幕外的元素不显示
  const { top, left, height, width } = node?.position || {}
  const info = {
    position: node?.position,
    sugo_autotrack_content: node?.sugo_autotrack_content || '',
    sugo_autotrack_path: node?.path,
    sugo_autotrack_page_path: webView?.htmlPage?.url || '',
    event_path_type: APP_TYPE.h5,
    sugo_autotrack_position: 0,
    hashCode: `h5_${index}`,
    event_id: node?.event_id
  }
  // 返回div边框
  return (
    <div
      key={'div-h5-' + index}
      id={'node-' + index}
      className={className.join(' ')}
      onClick={isHeatMap
        ? () => showHeatEvent(path, { top: top + (height / 2), left: left + width })
        : () => showEditEvent(info)}
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
