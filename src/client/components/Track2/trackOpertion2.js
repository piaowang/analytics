import _ from 'lodash'
import { APP_TYPE, iOS_RENDERER, IOS_EVENT_MAP, BORDER_WIDTH, SKD_TRACKING_VERSION } from './constants'
import 'seedrandom'

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

/**
 *  android获取当前元素的path
 * 
 * @param {string} id 控件hashCode
 * @param {object} viewMap
 * @returns {array} path数组
 */
function getViewPathByHashCode(id, viewMap) {
  let path = []
  let view = viewMap[id]
  if (!view.uniqueId) {
    return path
  }
  path.unshift(view.uniqueId)

  while (view.parentView) {
    view = viewMap[view.parentView]
    path.unshift(view.uniqueId)
    if (view.uniqueId
      && view.uniqueId.prefix
      && view.uniqueId.prefix === 'shortest')
      break
  }
  return path
}

/**
 * 获取android节点Map
 *
 * @param {array} views 界面元素
 * @param {float} scale 压缩比例
 * @returns {object}
 */
function getAndroidViewMap(views, scale) {
  //获取界面图片大小
  let screenshotWidth = _.get(views, '[0].width', 0)
  let screenshotHeight = _.get(views, '[0].height', 0)

  //过滤元素 隐藏 滚动条外的
  let visibleViews = views

  //生成viewMap
  let newViewMap = _.keyBy(visibleViews, p => p.hashCode + '')

  //设置rootView的属性 位置和唯一标识
  const rootView = views[0]
  const uniqueId = getViewUniqueId(rootView)
  _.set(newViewMap, `${rootView.hashCode}.uniqueId`, uniqueId)
  let position = {
    top: rootView.top * scale,
    left: rootView.left * scale,
    width: rootView.width * scale,
    height: rootView.height * scale
  }
  _.set(newViewMap, `${rootView.hashCode}.position`, position)

  // 设置元素父级id
  _.forEach(visibleViews, (p, zIndex) => {
    //获取子元素id 标识
    let subview = p.subviews.map(p => newViewMap[p]).filter(_.identity)
    let uniqueIds = _.keyBy(subview.map(p => {
      return { uniqueId: getViewUniqueId(p), hashCode: p.hashCode }
    }), 'hashCode')

    _.forEach(subview, (vm, i) => {
      let uniqueId = _.cloneDeep(_.get(uniqueIds, `${vm.hashCode}.uniqueId`))
      let index = _.get(vm, 'indexOfScroller', undefined)
      if (index !== undefined) {
        uniqueId.index = index
      } else {
        //如果是第一个子元素index为0
        if (i === 0) {
          uniqueId.index = 0
        } else {
          //当前元素的标识在同级元素相同标识的下标
          const views = _.filter(_.values(uniqueIds), ids => _.isEqual(uniqueId, ids.uniqueId))
          const maxIndex = _.maxBy(views, 'index') || { index: -1 }
          uniqueId.index = maxIndex.index + 1
        }
      }
      //设置子元素唯一标识
      _.set(uniqueIds, `${vm.hashCode}.index`, uniqueId.index)
      _.set(newViewMap, `${vm.hashCode}.uniqueId`, uniqueId)
      _.set(newViewMap, `${vm.hashCode}.parentView`, p.hashCode + '')
      _.set(newViewMap, `${vm.hashCode}.zIndex`, zIndex)
      _.set(newViewMap, `${vm.hashCode}.parentType`, p.classes)
      _.set(newViewMap, `${vm.hashCode}.hidden`, p.hidden)
    })
  })
  // 获取元素的path和位置信息
  _.forEach(_.values(newViewMap), p => {
    newViewMap = getAndroidPosition(newViewMap, p.hashCode, scale, screenshotHeight * scale, screenshotWidth * scale)
    let eventPath = getViewPathByHashCode(p.hashCode, newViewMap, rootView.hashCode)
    _.set(newViewMap, `${p.hashCode}.eventPath`, JSON.stringify(eventPath))

    if (p.htmlPage && p.htmlPage.nodes) {
      // 获取缩略比例
      let initialScale = 1
      if (p.htmlPage.viewportContent) {
        let viewportContent = p.htmlPage.viewportContent.split(',')
        let scale = _.find(viewportContent, v => _.trim(v).indexOf('initial-scale') === 0)
        initialScale = scale ? parseFloat(_.trim(scale).replace('initial-scale=', '')) : 1
      }
      let viewTop = p.position.top
      let viewLeft = p.position.left
      let nodes = JSON.parse(p.htmlPage.nodes)

      //过滤无效节点  根据控件大小排序 避免遮罩
      nodes = nodes.filter(n => n.rect.width && n.rect.height)
      nodes = _.orderBy(nodes, ['rect.width', 'rect.height'], ['desc', 'desc'])

      const htmlNodes = nodes.map((node, i) => {
        if (node.rect.left > p.width || node.rect.top > p.height) {
          return null
        }
        const newNode = {
          ...node,
          position: {
            top: (node.rect.top + viewTop) * initialScale,
            left: node.rect.left + viewLeft * initialScale,
            width: node.rect.width * initialScale,
            height: node.rect.height * initialScale,
            screenshotWidth: p.clientWidth
          }
        }
        return newNode
      })
      _.set(newViewMap, `${p.hashCode}.htmlNodes`, htmlNodes.filter(_.identity))
    }
  })

  //过滤元素
  newViewMap = _.values(newViewMap).filter(p => {
    return (p.htmlPage || p.clickable === true)
      && p.hidden === 0
      && !_.intersection(window.sugo.sdkExcludeView, p.classes).length
  })
  return _.keyBy(newViewMap, 'hashCode')
}

/**
 * 计算位置信息
 * 
 * @param {object} viewMap
 * @param {sting} id hashcode
 * @param {float} scale 压缩比例
 * @returns {object} 包含位置信息的map
 */
function getAndroidPosition(viewMap, id, scale, maxHeight, maxWidth) {
  let newPosition = {}
  let newViewMap = viewMap
  let view = _.get(viewMap, `${id}`, {})

  //顶级节点通过属性设置位置信息
  if (!view.parentView) {
    _.set(newViewMap, `${id}.position`, {
      top: view.top * scale,
      left: view.left * scale,
      width: view.width * scale,
      height: view.height * scale
    })
    return newViewMap
  }

  //获取父级位置信息 如果不存在 递归计算
  let parentView = _.get(newViewMap, `${view.parentView}`, {})
  if (!parentView.position) {
    newViewMap = getAndroidPosition(newViewMap, view.parentView, scale)
  }

  parentView = _.get(newViewMap, `${view.parentView}`, {})
  let position = parentView.position
  //计算位置
  newPosition.top = position.top + view.top * scale
  newPosition.left = position.left + view.left * scale
  if (_.indexOf(parentView.classes, 'com.yibasan.lizhifm.views.LZViewPager') >= 0) {
    newPosition.left = position.left + (view.left - ((parentView.mCurItem + 1) * parentView.width)) * scale
  } else if (_.indexOf(parentView.classes, 'android.support.v4.view.ViewPager') >= 0) {
    newPosition.left = position.left + (view.left - (parentView.mCurItem * parentView.width)) * scale
  } else if (_.indexOf(parentView.classes, 'android.widget.ScrollView') >= 0
    || _.indexOf(parentView.classes, 'android.support.v4.widget.NestedScrollView') >= 0) {
    newPosition.top = position.top + (view.top - parentView.scrollY) * scale
  } else if (_.indexOf(parentView.classes, 'android.widget.HorizontalScrollView') >= 0) {
    newPosition.left = position.left + (view.left - parentView.scrollX) * scale
  } else if (_.indexOf(parentView.classes, 'com.everhomes.android.sdk.widget.ObservableNestedScrollView') >= 0
    || _.indexOf(parentView.classes, 'androidx.core.widget.NestedScrollView') >= 0) {
    newPosition.top = position.top + (view.top - parentView.scrollY) * scale
  } else if (_.indexOf(parentView.classes, 'com.everhomes.android.sdk.widget.ObservableNestedScrollView') >= 0
    || _.indexOf(parentView.classes, 'androidx.core.widget.NestedScrollView') >= 0) {
    newPosition.top = position.top + (view.top - parentView.scrollY) * scale
  } else if (_.indexOf(parentView.classes, 'androidx.viewpager.widget.ViewPager') >= 0) {
    newPosition.left = position.left + (view.left - (parentView.mCurItem * parentView.width)) * scale
  } else if (_.indexOf(parentView.classes, 'androidx.viewpager.widget.ViewPager') >= 0) {
    newPosition.left = position.left + (view.left - (parentView.mCurItem * parentView.width)) * scale
  }
  let viewWidth = view.width * scale
  let viewHeight = view.height * scale
  _.set(newViewMap, `${id}.hidden`, parentView.hidden)
  _.set(newViewMap, `${id}.position`, {
    left: newPosition.left,
    top: newPosition.top,
    width: viewWidth + newPosition.left < maxWidth ? viewWidth : viewWidth + (maxWidth - viewWidth - newPosition.left),
    height: viewHeight + newPosition.top < maxHeight ? viewHeight : viewHeight + (maxHeight - viewHeight - newPosition.top)
  })
  return newViewMap
}


function getViewUniqueId(view) {
  view.view_class = view.classes[0]
  let res = {}
  if (view.mp_id_name) {
    if (view.mp_id_name === 'android:content') {
      res['prefix'] = 'shortest'
      res['id'] = view.id
    } else {
      res['mp_id_name'] = view.mp_id_name
    }
    return res
  }

  if (view.tag && _.isString(view.tag)) {
    res['tag'] = view.tag
  }

  if (view.contentDescription) {
    res['contentDescription'] = view.contentDescription
    return res
  }

  if (view.classes && view.classes[0]) {
    let clazz = view.classes[0]
    if ((clazz === 'com.android.internal.policy.PhoneWindow.DecorView'
      || clazz === 'com.android.internal.policy.impl.PhoneWindow.DecorView')
      && view.classes[1]) {
      clazz = view.classes[1]
    }
    res['view_class'] = clazz
    return res
  }
  return res
}


//#region Infinitus 无限极
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
  let userInteractionEnabled = _.get(view, 'properties.userInteractionEnabled.values[0].value', true)
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

//#endregion


/**
 * 获取点击元素的 属性
 * 
 * @param {string} appType 类型
 * @param {objec} viewMap 元素map
 * @param {stirng} viewHashCode 控件hashcode
 * @param {stirng} currentActivity
 * @param {object} iosMainView
 * @param {string} currentUrl h5 url
 * @returns
 */
function getClickEventProp(appType, viewMap, viewHashCode, currentActivity, iosMainView, currentUrl) {
  let editEvent = {}
  let { iosViewMap, androidViewMap, iosContent } = viewMap
  if (appType === APP_TYPE.ios) {
    if (window.sugo.iOS_renderer === iOS_RENDERER.Infinitus
      && window[SKD_TRACKING_VERSION] < 1) {
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
      editEvent = iosContent.getEventInfoByCode(viewHashCode)
    }
    editEvent.className = _.get(iosContent.cachedObjects,`${viewHashCode}.class[0]`, '')
    editEvent.page = currentActivity
    editEvent.viewHashCode = viewHashCode
  } else if (appType === APP_TYPE.android) {
    let view = androidViewMap[viewHashCode]
    let component = view.eventPath//_.values(_.omit(view.uniqueId, 'index')).join('') + '::' + view.uniqueId['index']
    editEvent.component = component
    editEvent.event_type = 'click'
    let classes = view.classes
    editEvent.className = classes[0]
    if (_.findKey(classes, p => p === 'android.widget.EditText')) {
      editEvent.event_type = 'focus'
    }
    editEvent.ExtraTag = _.get(view, 'ExtraTag', '')
    editEvent.event_path = view.eventPath
    if (view.text) {
      editEvent.event_name = view.text
    }
    editEvent.parentType = view.parentType
    editEvent.page = currentActivity
    editEvent.viewHashCode = viewHashCode
  } else if (appType === APP_TYPE.h5) {
    let path = viewHashCode.path
    if (sugo.removeSdkFirstIdPath) {
      const firstNode = path.substr(0, path.indexOf('>'))
      path = firstNode.indexOf('#') >= 0 && firstNode.indexOf('RT') >= 0 ? '#_rootDiv > div ' + path.substr(path.indexOf('>')) : path
    }
    var id = { path }
    editEvent.viewHashCode = id
    editEvent.page = [currentActivity, currentUrl].join('::')
    editEvent.event_type = 'click'
    editEvent.component = path
    editEvent.event_path = JSON.stringify(editEvent.viewHashCode)
    if (viewHashCode.innerText) {
      editEvent.event_name = viewHashCode.innerText.trim()
    }
  }
  return editEvent
}
/**
 * 生成时间预览图片
 *
 * @param {string} imgUrl 图片数据
 * @param {object} newEvent 事件
 * @returns
 */
async function getScreenShot(imgUrl, newEvent, xwalkScreenshots = {}, viewMap = {}) {
  var canvas = document.createElement('canvas')
  var ctx = canvas.getContext('2d')
  //绘制事件高亮边框
  const img = await new Promise((resolve, reject) => {
    const _img = new Image()
    _img.onload = () => resolve(_img)
    _img.onerror = () => resolve(_img)
    _img.src = imgUrl
  })
  for (let key in xwalkScreenshots) {
    let { xwalkImgUrl } = xwalkScreenshots[key]
    const view = viewMap[key] || { position: {} }
    const xwalk_img = await new Promise((resolve, reject) => {
      const _img = new Image()
      _img.onload = () => resolve(_img)
      _img.onerror = () => resolve(_img)
      _img.src = xwalkImgUrl
    })
    ctx.drawImage(xwalk_img, 0, 0, xwalk_img.width, xwalk_img.height, view.position.left, view.position.top, view.position.width, view.position.height)
  }

  let { width, height, top, left, screenshotWidth } = newEvent.position || {}
  let scale = img.width / screenshotWidth
  let screenshotHeight = img.height / scale
  canvas.width = screenshotWidth
  canvas.height = screenshotHeight
  ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, screenshotWidth, screenshotHeight)
  if(width && height) {
    ctx.fillStyle = '#1bb39c'
    if (newEvent.event_path_type !== APP_TYPE.h5 || (newEvent.event_path_type === APP_TYPE.h5 && !_.get(JSON.parse(newEvent.event_path), 'type', ''))) {
      ctx.fillRect(left - BORDER_WIDTH, top - BORDER_WIDTH, BORDER_WIDTH, height + 2 * BORDER_WIDTH)
      ctx.fillRect(left, top - BORDER_WIDTH, width, BORDER_WIDTH)
      ctx.fillRect(left + width, top - BORDER_WIDTH, BORDER_WIDTH, height + 2 * BORDER_WIDTH)
      ctx.fillRect(left, top + height, width, BORDER_WIDTH)
      ctx.globalAlpha = 0.2
      ctx.fillRect(left, top, width, height)
    }
  }
  let res = canvas.toDataURL().replace('data:image/png;base64,', '')
  return res
}


/**
 * 获取事件预览的path信息
 * 
 * @param {any} event 
 * @returns 
 */
function getShortenEventPath(event) {
  const eventPath = event.event_path
  let shortEventPath = '' //默认赋值整个eventPath
  let fullEventPath = ''
  switch (event.event_path_type) {
    case 'h5': {
      shortEventPath = JSON.parse(eventPath).path
      break
    }
    case 'android': {
      let androidArray = JSON.parse(eventPath)
      fullEventPath = eventPath
      shortEventPath = JSON.stringify(androidArray[androidArray.length - 1])
      break
    }
    default: //ios的版本拿全部
      shortEventPath = eventPath
  }
  return { shortEventPath, fullEventPath }

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
  getViewUniqueId,
  getClickEventProp,
  getScreenShot,
  getShortenEventPath,
  getAndroidViewMap
}
