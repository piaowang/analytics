import _ from 'lodash'
import {
  APP_TYPE,
  EVENT_DIV_STYLE,
  BORDER_WIDTH
} from '../constants'
import { equalSimilarNode } from '../operation/similar'
import { Tooltip } from 'antd'

/**
 *  生成h5DIV
 *
 * @export
 * @param {object} webView 需要生成的信息
 * @param {object} editEventInfo 当前修改的事件
 * @param {array} trackEventMap 事件列表
 * @param {string} currentActivity 当前页面的容器
 * @param {string} currentUrl 页面url
 * @param {map} similarEventMap 同类标签
 * @param {array} crossPageEventArr 全局有效
 * @param {function} showEditEvent 事件
 * @param {object} displayList 隐藏的元素
 * @returns div集合
 */
export default function renderNodesDivs(params) {

  const {
    webView,
    editEventInfo,
    trackEventMap,
    currentActivity,
    currentUrl,
    similarEventMap,
    crossPageEventArr,
    showEditEvent,
    showEventBinds = true,
    displayList = {},
    h5ControlClass = {},
    isHeatMap = false,
    showHeatEvent,
    selectEventPath,
    screenshotWidth,
    screenshotHeight
  } = params

  if (!webView.htmlPage || !webView.htmlPage.nodes) {
    return null
  }

  // 获取缩略比例
  // let initialScale = 1
  // const screenshotWidth = _.get(webView, 'properties.frame.values[0].value.Width')
  // const screenshotHeight = _.get(webView, 'properties.frame.values[0].value.Height')
  // let width =  _.get(webView, 'htmlPage.clientWidth', 0)
  // if (systemType === APP_TYPE.android && webView.htmlPage.viewportContent) {
  //   let viewportContent = webView.htmlPage.viewportContent.split(',')
  //   let scale = _.find(viewportContent, p => _.trim(p).indexOf('initial-scale') === 0)
  //   initialScale = scale ? parseFloat(_.trim(scale).replace('initial-scale=', '')) : 1
  // } 
  // else if (systemType === APP_TYPE.ios && width) {
  //   initialScale = (screenshotWidth / width).toFixed(2)
  // }

  // let positionTop = 0
  // let clientHeight = webView.htmlPage.clientHeight
  // if ( systemType === APP_TYPE.ios) {
  //   positionTop = screenshotHeight - (clientHeight * initialScale)
  // }

  // let viewTop = webView.position.top 
  // let viewLeft = webView.position.left
  // let nodes = JSON.parse(webView.htmlPage.nodes)
  let currentPage = [currentActivity, currentUrl].join('::')

  //获取当前页面已设置同类的路径
  let similarPathArray = _.get(similarEventMap, [currentPage], {})
  similarPathArray = _.omit(similarPathArray, [editEventInfo.event_path])

  //获取当前选中元素的同类设置
  let currEventSimilar = _.isEmpty(editEventInfo) ? false : editEventInfo.similar

  //过滤无效节点  根据控件大小排序 避免遮罩

  let nodesDiv = _.get(webView, 'htmlNodes', []).map((node, idx) => {
    if (node.position.top > screenshotHeight || node.position.top + screenshotHeight <= 0) return null
    if (node.position.left > screenshotWidth || node.position.left + screenshotWidth <= 0) return null

    const width = node.position.left + node.position.width >= screenshotWidth ? screenshotWidth - node.position.left : node.position.width
    const height = node.position.top + node.position.height >= screenshotHeight ? screenshotHeight - node.position.top : node.position.height

    node = _.cloneDeep(node)
    let path = node.path
    let eventPath = JSON.stringify({ path: path })
    let eventKey = [currentActivity, currentUrl, eventPath].join('::')
    let ev = _.get(trackEventMap, [eventKey], false)
    let className = [EVENT_DIV_STYLE.default]

    if (isHeatMap && selectEventPath === path) {
      className.push(EVENT_DIV_STYLE.click)
    } else if (isHeatMap && ev) {
      className.push(EVENT_DIV_STYLE.bind)
    }
    if (!isHeatMap) {
      // if (sugo.removeSdkFirstIdPath) {
      //   const firstNode = path.substr(0, path.indexOf('>'))
      //   path = firstNode.indexOf('#') >= 0 && firstNode.indexOf('RT') >= 0 ? '#_rootDiv > div ' + path.substr(path.indexOf('>')) : path
      // }
      //隐藏控件
      if (_.get(displayList, [eventKey], '')) {
        return null
      }

      //绑定当前选中事件相关元素
      if (editEventInfo && currentPage === editEventInfo.page) {
        //当前元素是选中元素
        if (eventPath === editEventInfo.event_path) {
          className.push(EVENT_DIV_STYLE.click)
        } else if (currEventSimilar && equalSimilarNode(editEventInfo.similar_path, node.path, h5ControlClass)) {
          className.push(EVENT_DIV_STYLE.similar)
        }
      }

      //显示已埋事件 
      if (className.length === 1 && showEventBinds) {
        //绑定页面相关元素样式
        if (ev) {
          className.push(EVENT_DIV_STYLE.bind)
        } else if (equalSimilarNode(similarPathArray, node.path, h5ControlClass)) {
          className.push(EVENT_DIV_STYLE.similar)
        } else if (_.find(crossPageEventArr, p => p === eventPath)) {
          className.push(EVENT_DIV_STYLE.corssPage)
        }
      }
    }

    
    let position = {
      ...node.position,
      screenshotWidth
    }

    const divModel = (<div
      key={'div-h5-' + idx}
      id={'node-' + idx}
      className={className.join(' ')}
      onClick={isHeatMap
        ? () => showHeatEvent(path, { top: node.position.top + (node.position.height / 2), left: node.position.left + node.position.width })
        : () => showEditEvent(node, position, APP_TYPE.h5)}
      style={{
        top: node.position.top - BORDER_WIDTH,
        left: node.position.left - BORDER_WIDTH,
        width: width + BORDER_WIDTH * 2,
        height: height + BORDER_WIDTH * 2,
        zIndex: 100 + idx
      }}
    />)
    return divModel
  })
  return nodesDiv
}
