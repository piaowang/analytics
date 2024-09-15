/**
 * sdk埋点的自动上报代码
 * 仅监视按钮点击事件和路由切换事件
 */

import _ from 'lodash'

function track() {
  return window.sugoio ? window.sugoio.track.apply(window.sugoio, arguments) : _.noop
}

function time_event () {
  return window.sugoio ? window.sugoio.time_event.apply(window.sugoio, arguments) : _.noop
}

//按钮点击
function onButtonClick(target) {
  let text = (target.textContent || '').trim()
  track('按钮:' + text, {
    event_type: 'click',
    event_label: text
  })
}

//图标按钮点击
// function onIconClick(e) {
//   let className = e.target.className || ''
//   track('图标:' + className, {
//     event_type: 'click'
//   })
// }

//下拉菜单
function onDropdownItemClick(target) {
  let text = (target.textContent || '').trim()
  track('菜单:' + text, {
    event_type: 'click',
    event_label: text
  })
}

//钉板
function onDingItemClick(target) {
  let text = (target.textContent || '').trim()
  track('钉板', {
    event_type: 'click',
    event_label: text
  })
}

//图形选择
function onChartIconClick(target) {
  let text = (target.textContent || '').trim()
  track('图表', {
    event_type: 'click',
    event_label: text
  })
}

//链接
function onLinkClick(target) {
  let text = (target.textContent || '').trim()
  track('链接:' + text, {
    event_type: 'click',
    event_label: text
  })
}

//路由改变
let prevPageName = document.title
export function trackRouteChange(prevProp) {
  let {pathname} = window.location.href
  let event = '浏览'
  track(event, {
    event_type: 'view',
    path_name: pathname
  })
  track('停留', {
    path_name: prevProp.location.pathname,
    page_name: prevPageName
  })
  startStayTimer()
}

export function startStayTimer() {
  time_event('停留')
  prevPageName = document.title
}

function matches(el, selector) {
  let res = (
    el.matches || el.matchesSelector ||
    el.msMatchesSelector || el.mozMatchesSelector ||
    el.webkitMatchesSelector || el.oMatchesSelector
  ).call(el, selector)
  if (!res && el.parentNode && el.parentNode.tagName.toLowerCase() !== 'body') {
    return matches(el.parentNode, selector)
  } else return res ? el : res
}

export function initTrack() {
  if (!window.sugoio) {
    return
  }
  document.body.addEventListener('click', function(e) {
    let el = e.target

    //按钮
    let elm = matches(el, '.ant-btn, .ant-select')
    if (
      elm
    ) {
      return onButtonClick(elm)
    }

    //图形选择
    elm = matches(el, '.viz-switch-btn')
    if (
      elm
    ) {
      return onChartIconClick(elm)
    }

    //钉板
    elm = matches(el, '.ding-panel .ant-select-dropdown-menu-item')
    if (
      elm
    ) {
      return onDingItemClick(elm)
    }

    //菜单
    elm = matches(el, '.ant-dropdown-menu-item, .ant-select-dropdown-menu-item')
    if (
      elm
    ) {
      return onDropdownItemClick(elm)
    }

    //链接
    elm = matches(el, 'a, a.pointer, span.pointer')
    if (
      elm
    ) {
      onLinkClick(elm)
    }
  })
}
