import _ from 'lodash'
import { APP_TYPE, iOS_RENDERER, IOS_EVENT_MAP, BORDER_WIDTH } from './constants'
//界面绑定事件和数据存储结构的转换
function dimBindingToDataBinds(dimBinding, type) {
  return _.reduce(dimBinding, (r, v, k) => {
    r[v.dimension] = type === APP_TYPE.h5 ? _.pick(v, ['path', 'similar']) : JSON.parse(v.path)
    return r
  }, {})
}

function dataBindsToDimBinding(dataBinds, type) {
  return _.reduce(dataBinds, (r, v, k) => {
    if (type === APP_TYPE.h5) {
      r.push({ dimension: k, path: v.path, similar: v.similar })
    } else {
      r.push({ dimension: k, path: JSON.stringify(v) })
    }
    return r
  }, [])
}

function getIOSPosition(view, view_map, position, main_view) {
  if (main_view.id === view.id) {
    return position
  }
  if (view.properties.superview.values.length > 0) {
    let parentView = view_map[view.properties.superview.values[0].value]
    if (parentView) {
      if (parentView.properties) {
        let frame = parentView.properties.frame
        let bounds = parentView.properties.bounds.values[0].value
        let pos = frame.values[0].value
        position.top += pos.Y
        position.left += pos.X
        position.top -= bounds.Y
        position.left -= bounds.X
      }
      return getIOSPosition(parentView, view_map, position, main_view)
    }

  }
  return position
}

function getIOSControlEvent(view, ios_event_map) {
  for (let key in view.class) {
    let control_event = ios_event_map[view.class[key]]
    if (control_event)
      return control_event
  }
  return 64
}

function getIOSEventType(view) {
  let classes = view.class
  for (let key in classes) {
    let classz = classes[key]
    if (classz === 'UITableView') {
      return 'ui_table_view'
    }
    if (classz === 'UIControl') {
      return 'ui_control'
    }
  }
}

function handlerViews(views, index, parentView, view_map) {
  if (!parentView) {
    parentView = views[0]
    parentView['uniqueId'] = getViewUniqueId(parentView)
    view_map[parentView.hashCode] = parentView
    index = handlerViews(views, 1, parentView, view_map)
    return index
  }

  let subViewObjs = []
  for (let key in parentView.subviews) {
    let subview = parentView.subviews[key]
    for (var i = index; i < views.length; i++) {
      view_map[views[i].hashCode] = views[i]
      if (subview === views[i].hashCode) {
        subViewObjs.push(views[i])
        views[i].parentView = parentView.hashCode
        index = handlerViews(views, i + 1, views[i], view_map)
        break
      }
    }
  }
  handleSubViews(subViewObjs)
  return index

}

function handleSubViews(subviews) {
  for (var i = 0; i < subviews.length; i++) {
    let uniqueId = getViewUniqueId(subviews[i])
    let index = 0
    if (i > 0) {
      for (var j = i - 1; j >= 0; j--) {
        let equal = true
        for (let key in uniqueId) {
          if (!(subviews[j][key] && subviews[j][key] === uniqueId[key])) {
            equal = false
            break
          }
        }
        if (equal === true)
          index++
      }
    }

    uniqueId['index'] = index
    subviews[i]['uniqueId'] = uniqueId
  }
}

function getViewUniqueId(view) {
  view.view_class = view.classes[0]
  let res = {}
  if (view.mp_id_name) {
    if (view.mp_id_name == 'android:content') {
      res['prefix'] = 'shortest'
      res['id'] = view.id
    } else {
      res['mp_id_name'] = view.mp_id_name
    }
    return res
  }


  if (view.tag && typeof view.tag === 'string')
    res['tag'] = view.tag

  if (view.contentDescription) {
    res['contentDescription'] = view.contentDescription
    return res
  }

  if (view.classes && view.classes[0]) {
    let clazz = view.classes[0]
    if (clazz === 'com.android.internal.policy.PhoneWindow.DecorView' || clazz === 'com.android.internal.policy.impl.PhoneWindow.DecorView' && view.classes[1]) {
      clazz = view.classes[1]
    }
    res['view_class'] = clazz
    return res
  }
  return res

}

function getPosition(view, view_map, position) {
  if (view.parentView) {
    let parentView = view_map[view.parentView]
    let isViewPager = false
    let isScrollView = false
    let isHorizontalScrollView = false
    for (let key in parentView.classes) {
      if (parentView.classes[key] === 'android.support.v4.view.ViewPager') {
        isViewPager = true
        break
      } else if (parentView.classes[key] === 'android.widget.ScrollView') {
        isScrollView = true
        break
      } else if (parentView.classes[key] === 'android.support.v4.widget.NestedScrollView') {
        isScrollView = true
        break
      } else if (parentView.classes[key] === 'android.widget.HorizontalScrollView') {
        isHorizontalScrollView = true
        break
      }
    }
    if (isViewPager === true) {
      position.left += parentView.left - (parentView.mCurItem * parentView.width)
    } else {
      position.left += parentView.left
    }
    if (isScrollView === true) {
      position.top += parentView.top - parentView.scrollY
    } else {
      position.top += parentView.top
    }
    if (isHorizontalScrollView) {
      position.left += parentView.left - parentView.scrollX
    } else {
      position.left += parentView.left
    }
    return getPosition(parentView, view_map, position)
  }
  return position
}

function getViewPath(viewHashCode, view_map) {
  let view = view_map[viewHashCode]
  return getViewPathByView(view, view_map)
}

function getViewPathByView(view, view_map) {
  let path = []
  if (!view.uniqueId) {
    return path
  }
  path.unshift(view.uniqueId)

  while (view.parentView) {
    view = view_map[view.parentView]
    path.unshift(view.uniqueId)
    if (view.uniqueId && view.uniqueId.prefix && view.uniqueId.prefix == 'shortest')
      break
  }
  return path
}

function isVisible(view, view_map) {
  if (view.hidden !== 0) {
    return false
  }
  if (!view.parentView || !view_map[view.parentView]) {
    return true
  }
  return isVisible(view_map[view.parentView], view_map)
}

// For Infinitus
function getIOSViewsMap(views) {
  let view_map = {}
  for (let key in views) {
    let view = views[key]
    view_map[view.id] = view
  }
  return view_map
}

function associationController(views, iosViewMap) {
  for (let key in views) {
    let view = views[key]
    let UIViewController
    for (let key in view.class) {
      if (view.class[key] === 'UIViewController') {
        UIViewController = view
        break
      } else if (view.class[key] === 'UINavigationController') {
        break
      }
    }
    if (UIViewController) {
      if (view.properties.view) {
        let mv = iosViewMap[view.properties.view.values[0].value]
        addController(iosViewMap, mv, UIViewController)
      }
    }
  }
}

function addController(iosViewMap, view, UIViewController) {
  view.UIViewController = UIViewController
  iosViewMap[view.id] = view
  if (!view.properties.subviews) {
    return
  }
  let values = view.properties.subviews.values || []
  let subviewIds = values.length > 0 && values[0].value || []
  for (let key in subviewIds) {
    addController(iosViewMap, iosViewMap[subviewIds[key]], UIViewController)
  }
}

function getIOSViewController(view, iosViewMap) {
  if (view.UIViewController) {
    return view.UIViewController
  }

  let UIViewController
  if (view.properties.subviews) {
    let subviewIds = view.properties.subviews.values[0].value
    for (let key in subviewIds) {
      UIViewController = getIOSViewController(iosViewMap[subviewIds[key]], iosViewMap)
      if (UIViewController) {
        break
      }
    }
  }
  return UIViewController
}

function getVisibleViews(parent_view, view_map, res) {
  if (!parent_view)
    return
  if (parent_view.properties) {
    if (parent_view.properties.subviews) {
      let subviews = parent_view.properties.subviews.values[0].value
      for (let key in subviews) {
        let view = view_map[subviews[key]]
        res.push(view)
        getVisibleViews(view, view_map, res)
      }
    }
  }

}

function getIOSViewPath(viewId, view_map, current_page, main_view, index) {
  let view = view_map[viewId]
  let classes = view.class
  let userInteractionEnabled = view.properties.userInteractionEnabled.values[0].value
  let clickable = false
  if (userInteractionEnabled === true) {
    for (let key in classes) {
      let classz = classes[key]
      if (classz === 'UIControl') {
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
  let parentView
  let pvs = view.properties.superview.values
  if (pvs.length > 0) {
    parentView = view_map[pvs[0].value]
  }
  let path = classes[0]
  if (viewId === main_view.id || (parentView && !parentView.UIViewController)) {
    path = '/' + current_page + '/' + view.class[0]
  }
  if (clickable === true) {
    let varB = view.properties.mp_varB.values[0].value
    if (varB === '' || varB === null) {
      let varE = view.properties.mp_varE.values[0].value
      if (varE === '' || varE === null) {
        let varC = view.properties.mp_varC.values[0].value
        if (varC === '' || varC === null) {
          if (parentView) {
            let subviews = parentView.properties.subviews.values[0].value
            let index = 0
            for (let key in subviews) {
              let subviewId = subviews[key]
              if (subviewId === view.id) {
                path += '[' + index + ']'
                break
              }
              let subview = view_map[subviewId]
              if (subview.class[0] === view.class[0]) {
                index++
              }
            }
          }

        } else {
          path += '[(mp_fingerprintVersion >= 1 AND mp_varC == "' + varC + '")]'
        }
      } else {
        path += '[(mp_fingerprintVersion >= 1 AND mp_varE == "' + varE + '")]'
      }
    } else {
      path += '[(mp_fingerprintVersion >= 1 AND mp_varB == "' + varB + '")]'
    }

  }

  if (viewId === main_view.id || (parentView && !parentView.UIViewController)) {
    return path
  }

  if (parentView) {
    return getIOSViewPath(parentView.id, view_map, current_page, main_view, ++index) + '/' + path
  }
  return path
}

function getClickEventProp(appType, viewMap, viewHashCode, currentActivity, iosMainView, currentUrl) {
  let editEvent = {}
  let { iosViewMap, androidViewMap, iosContent } = viewMap
  if (appType === APP_TYPE.ios) {
    if (window.sugo.iOS_renderer === iOS_RENDERER.Infinitus) {
      let view = iosViewMap[viewHashCode]
      editEvent.event_type = getIOSEventType(view)
      let classes = view.class
      if (_.findKey(classes, p => p === 'UITableView')) {
        editEvent.delegate = view.delegate.class
      }
      if (_.findKey(classes, p => p === 'UIControl')) {
        editEvent.control_event = getIOSControlEvent(view, IOS_EVENT_MAP)
      }
      editEvent.event_path = getIOSViewPath(viewHashCode, iosViewMap, currentActivity, iosMainView, 0)
      editEvent.component = editEvent.event_path
    } else {
      // let object = iosContent.objectOf(viewHashCode)
      // editEvent.event_type = iosContent.bindableTypeOf(viewHashCode)
      // if (iosContent.isBindableUIControl(viewHashCode)) {
      //   editEvent.control_event = iosContent.eventTypeOf(viewHashCode)
      // } else if (iosContent.isBindableUITableView(viewHashCode)) {
      //   editEvent.delegate = iosContent.delegateClassOf(object)
      // } else if (iosContent.isBindableUITextView(viewHashCode)) {
      //   editEvent.delegate = iosContent.delegateClassOf(object)
      // }
      // editEvent.event_path = iosContent.idsAssociationOfBindable()[viewHashCode].path
      // editEvent.component = editEvent.event_path
      editEvent = iosContent.getEventInfoByCode(viewHashCode)
    }
  } else if (appType === APP_TYPE.android) {
    let view = androidViewMap[viewHashCode]
    let component = _.values(_.omit(view.uniqueId, 'index')).join('') + '::' + view.uniqueId['index']
    // _.forIn(_.omit(uniqueId, 'index'), (v, k) => component.push(k))
    // component = [...component, uniqueId['index']]
    editEvent.component = component
    editEvent.event_type = 'click'
    let classes = view.classes
    if (_.findKey(classes, p => p === 'android.widget.EditText')) {
      editEvent.event_type = 'focus'
    }
    editEvent.event_path = JSON.stringify(getViewPath(viewHashCode, androidViewMap))
    if (view.text) {
      editEvent.event_name = view.text
    }
  } else if (appType === APP_TYPE.h5) {
    var id = { path: viewHashCode.path }
    editEvent.viewHashCode = id
    editEvent.page = [currentActivity, currentUrl].join('::')
    editEvent.event_type = 'click'
    editEvent.component = viewHashCode.path
    editEvent.event_path = JSON.stringify(editEvent.viewHashCode)
    if (viewHashCode.innerText) {
      editEvent.event_name = viewHashCode.innerText.trim()
    }
  }
  return editEvent
}

async function getScreenShot(imgUrl, xwalkScreenshots, newEvent) {
  var canvas = document.createElement('canvas')
  var ctx = canvas.getContext('2d')
  let { width, height, top, left, screenshotWidth } = newEvent.position

  const img = await new Promise((resolve, reject) => {
    const _img = new Image()
    _img.onload = () => resolve(_img)
    _img.onerror = () => resolve(_img)
    _img.src = imgUrl
  })
  let scale = img.width / screenshotWidth
  let screenshotHeight = img.height / scale
  canvas.width = screenshotWidth
  canvas.height = screenshotHeight

  ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, screenshotWidth, screenshotHeight)
  for (let key in xwalkScreenshots) {
    let { xwalk_imgUrl, view } = xwalkScreenshots[key]
    const xwalk_img = await new Promise((resolve, reject) => {
      const _img = new Image()
      _img.onload = () => resolve(_img)
      _img.onerror = () => resolve(_img)
      _img.src = xwalk_imgUrl
    })

    ctx.drawImage(xwalk_img, 0, 0, xwalk_img.width, xwalk_img.height, view.position.left, view.position.top, view.position.width, view.position.height)
  }
  ctx.fillStyle = '#1bb39c'
  ctx.fillRect(left - BORDER_WIDTH, top - BORDER_WIDTH, BORDER_WIDTH, height + 2 * BORDER_WIDTH)
  ctx.fillRect(left, top - BORDER_WIDTH, width, BORDER_WIDTH)
  ctx.fillRect(left + width, top - BORDER_WIDTH, BORDER_WIDTH, height + 2 * BORDER_WIDTH)
  ctx.fillRect(left, top + height, width, BORDER_WIDTH)
  ctx.globalAlpha = 0.2
  ctx.fillRect(left, top, width, height)
  let res = canvas.toDataURL().replace('data:image/png;base64,', '')
  return res
}

function getShortenEventPath (event) {
  const eventPath = event.event_path
  let shortEventPath = '' //默认赋值整个eventPath
  switch (event.event_path_type) {
    case 'h5' : {
      shortEventPath = JSON.parse(eventPath).path
      break
    }
    case 'android' : {
      let androidArray = JSON.parse(eventPath)
      shortEventPath = JSON.stringify(androidArray[androidArray.length - 1])
      break
    }
    default : //ios的版本拿全部
      shortEventPath = eventPath
  }
  return shortEventPath

}


export {
  dimBindingToDataBinds,
  dataBindsToDimBinding,
  getIOSPosition,
  getIOSEventType,
  getIOSControlEvent,
  getIOSViewPath,
  getVisibleViews,
  getIOSViewController,
  addController,
  associationController,
  getIOSViewsMap,
  isVisible,
  getViewPathByView,
  getViewPath,
  getPosition,
  getViewUniqueId,
  handlerViews,
  getClickEventProp,
  getScreenShot,
  getShortenEventPath
}
