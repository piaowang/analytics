
/**
 * Created by xj on 24/11/17.
 */
import _ from 'lodash'
import {
  EVENT_TYPE,
  CONTROLL_TYPE,
  CONTROLL_PROP,
  PAGE_TYPE,
  UIRECTDGE,
  UIScrollViewContentInsetAdjustmentBehavior,
  SKD_TRACKING_VERSION
} from './constants'

export default class iOSContent {

  constructor(info, snapshot) {
    this.info = info //设备信息
    this.image_hash = snapshot.image_hash //图片hash
    this.rootObject = snapshot.serialized_objects.rootObject // root节点ID
    this.cachedObjects = _.keyBy(snapshot.serialized_objects.objects, p => p.id) //节点MAP
    this.bindableEventTypes = EVENT_TYPE // 事件类型
    this.rootControllerId = this.getPropById(this.rootObject, 'rootViewController')
    this.vc = this.getCurrentUIViewInfo(this.rootControllerId) //顶级节点信息
    this.nvcId = this.getPropById(this.vc.id, 'navigationController')
    this.currentIdOfUIView = this.getPropById(this.vc.id, 'view')
    this.uiScreenInfoId = this.getPropById(this.rootObject, 'screen')
    this.prefersStatusBarHeight = 0
    this.hidesBottomBarWhenPushed = false
    this.currentActivity = this.getCurrentActivity(this.rootControllerId)
    this.colTreeMap = {}
    this.pathMap = {}
    this.positionMap = {}
    const bounds = this.getPropById(this.uiScreenInfoId, 'bounds') || {}
    this.uiScreenWidth = bounds.Width
    this.uiScreenHeight = bounds.Height
    const associationOfBindableMap = this.idsAssociationOfBindable()
    this.associationOfBindableMap = this.setControlIdentification(associationOfBindableMap)
  }

  /**
   * 将path中最后一个下标 替换为唯一标识
   *
   * @param {any} associationOfBindableMap 
   * @returns
   * @memberof iOSContent
   */
  setControlIdentification(associationOfBindableMap) {
    let newAssociationOfBindableMap = _.clone(associationOfBindableMap)
    _.forIn(newAssociationOfBindableMap, (v, k) => {
      const ind = v.path.lastIndexOf('[')
      let path = ''
      if (ind > 0) {
        path = v.path.substring(0, ind)
      } else {
        path = v.path
      }
      v.path = path + this.identificationOfBindableView(k)
    })
    return newAssociationOfBindableMap
  }

  /**
   * 递归获取当前CurrentActivit
   *
   * @param {any} rootControllerId
   * @returns
   * @memberof iOSContent
   */
  getCurrentActivity(id) {
    let rootObj = this.cachedObjects[id]
    const currentActivityClass = _.get(this.cachedObjects, `${id}.class`)
    //判断control类型 获取id 递归获取CurrentActivit
    if (currentActivityClass.includes(PAGE_TYPE.UINavigationCol)) {
      let visibleViewId = this.getPropByCol(rootObj, 'visibleViewController')
      if (visibleViewId) {
        return this.getCurrentActivity(visibleViewId)
      }

      let topViewId = this.getPropByCol(rootObj, 'topViewController')
      if (topViewId) {
        return this.getCurrentActivity(topViewId)
      }

      let childViews = this.getPropByCol(rootObj, 'childViewControllers')
      if (childViews && childViews.length) {
        let childViewId = _.last(childViews)
        return this.getCurrentActivity(childViewId)
      }
    }
    if (this.equalColType(id, PAGE_TYPE.UITabBarCol)) {
      let selected = this.getPropByCol(rootObj, 'selectedViewController')
      if (selected) {
        return this.getCurrentActivity(selected)
      }
      let childViews = this.getPropByCol(rootObj, 'childViewControllers')
      if (childViews && childViews.length) {
        let childView = _.last(childViews)
        return this.getCurrentActivity(childView)
      }
    }

    let childViews = this.getPropByCol(rootObj, 'childViewControllers')
    if (childViews && childViews.length) {
      let childView = _.last(childViews)
      return this.getCurrentActivity(childView)
    }

    let presented = this.getPropByCol(rootObj, 'presentedViewController')
    if (presented) {
      return this.getCurrentActivity(presented)
    }

    if (currentActivityClass.includes(PAGE_TYPE.UIViewCol)) {
      this.hidesBottomBarWhenPushed = this.getPropByCol(rootObj, 'hidesBottomBarWhenPushed')
      return _.get(rootObj, 'class[0]')
    }
  }


  /**
   * 获取界面url
   *
   * @param {any} object
   * @returns
   * @memberof iOSContent
   */
  getHtmlUrl(object) {
    return _.get(object, `${CONTROLL_PROP.htmlPage}.url`, null)
  }

  //#region 基础方法
  /**
   *  根据控件ID获取控件properties下属性值
   *
   * @param {string} id 控件ID
   * @param {string} property 属性名
   * @returns
   * @memberof iOSContent
   */
  getPropById(id, property) {
    return _.get(this.cachedObjects, `${id}.properties.${property}.values[0].value`, null)
  }
  /**
   * 获取控件指定properties下属性值
   *
   * @param {string} conrtroll 控件对象
   * @param {string} property 属性名
   * @returns
   * @memberof iOSContent
   */
  getPropByCol(conrtroll, property) {
    return _.get(conrtroll, `properties.${property}.values[0].value`, null)
  }

  /**
   * 根据控件id 获取Frame属性
   *
   * @param {any} id 控件id
   * @returns
   * @memberof iOSContent
   */
  getFrame(id) {
    if (_.get(this.cachedObjects, `${id}.${CONTROLL_PROP.class}`, []).includes('UIView')) {
      return this.getPropById(id, 'frame')
    }
    return null
  }

  /**
   * 根据控件id 获取Bounds属性
   *
   * @param {any} id 控件id
   * @returns
   * @memberof iOSContent
   */
  getBounds(id) {
    if (_.get(this.cachedObjects, `${id}.${CONTROLL_PROP.class}`, []).includes('UIView')) {
      return this.getPropById(id, 'bounds')
    }
    return null
  }

  /**
   * 判断控件类型
   *
   * @param {string} id 控件ID
   * @param {CONTROLL_TYPE} type 控件类型
   * @memberof iOSContent
   */
  equalColType(id, type) {
    const classs = _.get(this.cachedObjects, `${id}.${CONTROLL_PROP.class}`, [])
    switch (type) {
      case CONTROLL_TYPE.UIScrollView:
      case PAGE_TYPE.UINavigationCol:
      case PAGE_TYPE.UITabBarCol:
        // case CONTROLL_TYPE.UITableViewCell:
        // case CONTROLL_TYPE.UICollectionViewCell:
        return classs.includes(type)
      case CONTROLL_TYPE.UITextView:
        return classs.includes(type)
          && this.getPropById(id, 'userInteractionEnabled')
          && _.get(this.cachedObjects, `${id}.${CONTROLL_PROP.delegateSelector}`, []).includes('textViewDidBeginEditing:')
      case CONTROLL_TYPE.UIWebView:
      case CONTROLL_TYPE.WKWebView:
        return classs.includes(type) //&& _.get(this.cachedObjects, `${id}.${CONTROLL_PROP.htmlPage}`, null)
      case CONTROLL_TYPE.UITableView:
        return classs.includes(type)
          && this.getPropById(id, 'userInteractionEnabled')
          && _.get(this.cachedObjects, `${id}.${CONTROLL_PROP.delegateSelector}`, []).includes('tableView:didSelectRowAtIndexPath:')
      case CONTROLL_TYPE.UICollectionView:
        return classs.includes(type)
          && this.getPropById(id, 'userInteractionEnabled')
          && _.get(this.cachedObjects, `${id}.${CONTROLL_PROP.delegateSelector}`, []).includes('collectionView:didSelectItemAtIndexPath:')
      case CONTROLL_TYPE.UIView:
        var isUITapGestureRecognizer = false
        for (const p of this.getPropById(id, 'gestureRecognizers') || []) {
          isUITapGestureRecognizer = _.get(this.cachedObjects, `${p}.${CONTROLL_PROP.class}`, []).includes('UITapGestureRecognizer')
          if (isUITapGestureRecognizer) break
        }
        return classs.includes(type)
          && this.getPropById(id, 'userInteractionEnabled')
          && isUITapGestureRecognizer
      case CONTROLL_TYPE.UIControl:
        return classs.includes(type)
          && this.getPropById(id, 'userInteractionEnabled')
          && this.getPropById(id, 'enabled')
      case CONTROLL_TYPE.RTCControll:
        return classs.find(p => p.indexOf('RCT') === 0)
      default:
        return classs.includes(type)
    }
  }
  /**
   * 根据类型获取col路径
   * 查找顺序：
   * + presentedViewController
   * + viewControllers
   * + 如果是UINavigationController
   *   + visibleViewController
   *   + topViewController
   *   + childViewControllers
   * + 如果是UITabBarController
   *   + selectedViewController
   * + return {id, path}
   * @param {any} id
   * @param {any} path
   * @returns
   * @memberof iOSContent
   */
  getCotrollPath(id, path) {
    let currentObj = _.get(this.cachedObjects, `${id}`)
    if (!currentObj) return null

    //根据节点id 生成path 保存到 colTreeMap
    let getPath = (colId) => {
      let newPath = path + '/' + _.get(this.cachedObjects, `${colId}.${CONTROLL_PROP.class}[0]`, null)
      _.set(this.colTreeMap, `${colId}`, newPath)
      return newPath
    }

    let currentPath = ''

    //获取colTreeMap中的节点信息如果有直接返回
    let treePath = _.get(this.colTreeMap, `${id}`, null)
    if (treePath) {
      return { id, path: treePath }
    }

    //判断节点类型获取节点path
    let presented = this.getPropByCol(currentObj, 'presentedViewController')
    if (presented) {
      currentPath = getPath(presented)
      return this.getCotrollPath(presented, currentPath)
    }

    if (this.equalColType(id, PAGE_TYPE.UINavigationCol)) {
      let visibleView = this.getPropByCol(currentObj, 'visibleViewController')
      if (visibleView) {
        currentPath = getPath(visibleView)
        return this.getCotrollPath(visibleView, currentPath)
      }

      let topView = this.getPropByCol(currentObj, 'topViewController')
      if (topView) {
        currentPath = getPath(topView)
        return this.getCotrollPath(topView, currentPath)
      }

      let childViews = this.getPropByCol(currentObj, 'childViewControllers')
      if (childViews && childViews.length) {
        let childView = _.last(childViews)
        currentPath = getPath(childView)
        return this.getCotrollPath(childView, currentPath)
      }
      return { id, path }
    }
    if (this.equalColType(id, PAGE_TYPE.UITabBarCol)) {
      let selected = this.getPropByCol(currentObj, 'selectedViewController')
      if (selected) {
        currentPath = getPath(selected)
        return this.getCotrollPath(selected, currentPath)
      }
      let childViews = this.getPropByCol(currentObj, 'childViewControllers')
      if (childViews && childViews.length) {
        let childView = _.last(childViews)
        currentPath = getPath(childView)
        return this.getCotrollPath(childView, currentPath)
      }
    }

    // let selected = this.getPropByCol(currentObj, 'selectedViewController')
    // if (this.equalColType(id, PAGE_TYPE.UITabBarCol) && selected) {
    //   currentPath = getPath(selected)
    //   return this.getCotrollPath(selected, currentPath)
    // }

    // let tabBar = this.getPropByCol(currentObj, 'tabBarController')
    // if (tabBar) {
    //   currentPath = getPath(tabBar)
    //   return this.getCotrollPath(tabBar, currentPath)
    // }

    // let navigation = this.getPropByCol(currentObj, 'navigationController')
    // if (navigation) {
    //   currentPath = getPath(navigation)
    //   return this.getCotrollPath(navigation, currentPath)
    // }
    let childViews = this.getPropByCol(currentObj, 'childViewControllers')
    if (childViews && childViews.length) {
      let childView = _.last(childViews)
      currentPath = getPath(childView)
      return this.getCotrollPath(childView, currentPath)
    }

    let viewControllers = this.getPropByCol(currentObj, 'viewControllers')
    if (viewControllers && viewControllers.length) {
      let viewController = _.last(viewControllers)
      currentPath = getPath(viewController)
      return this.getCotrollPath(viewController, currentPath)
    }

    return { id, path }
  }

  //#endregion

  /**
   * 根据控件id获取类型映射
   *
   * @param {any} viewHashCode 控件 HashCode
   * @returns
   * @memberof iOSContent
   */
  getEventInfoByCode(viewHashCode) {
    let editEvent = {}
    if (this.equalColType(viewHashCode, CONTROLL_TYPE.RTCControll)) {
      editEvent.event_type = this.bindableEventTypes.bindable.UIView
      editEvent.control_event = this.eventTypeOf(viewHashCode)
    } else if (this.equalColType(viewHashCode, CONTROLL_TYPE.UITextView)) {
      editEvent.event_type = this.bindableEventTypes.bindable.UITextView
      editEvent.delegate = _.get(this.cachedObjects, `${viewHashCode}.${CONTROLL_PROP.delegateClass}`)
    } else if (this.equalColType(viewHashCode, CONTROLL_TYPE.UIControl)) {
      editEvent.event_type = this.bindableEventTypes.bindable.UIView
      editEvent.control_event = this.eventTypeOf(viewHashCode)
    } else if (this.equalColType(viewHashCode, CONTROLL_TYPE.UIView)) {
      editEvent.event_type = this.bindableEventTypes.bindable.UIView
    } else if (this.equalColType(viewHashCode, CONTROLL_TYPE.UITableView)) {
      editEvent.event_type = this.bindableEventTypes.bindable.UITableView
      editEvent.delegate = _.get(this.cachedObjects, `${viewHashCode}.${CONTROLL_PROP.delegateClass}`)
    }
    else if (this.equalColType(viewHashCode, CONTROLL_TYPE.UITableViewCell)) {
      editEvent.event_type = this.bindableEventTypes.bindable.UITableViewCell
      editEvent.delegate = _.get(this.cachedObjects, `${viewHashCode}.${CONTROLL_PROP.delegateClass}`)
    } else if (this.equalColType(viewHashCode, CONTROLL_TYPE.UICollectionViewCell)) {
      editEvent.event_type = this.bindableEventTypes.bindable.UICollectionViewCell
      editEvent.delegate = _.get(this.cachedObjects, `${viewHashCode}.${CONTROLL_PROP.delegateClass}`)
    }
    else if (this.equalColType(viewHashCode, CONTROLL_TYPE.UICollectionView)) {
      editEvent.event_type = this.bindableEventTypes.bindable.UICollectionView
      editEvent.delegate = _.get(this.cachedObjects, `${viewHashCode}.${CONTROLL_PROP.delegateClass}`)
    }
    editEvent.event_path = _.get(this.associationOfBindableMap, `${viewHashCode}.path`)
    editEvent.component = editEvent.event_path
    return editEvent
  }

  /**
   * 根据控件id获取控件事件名称
   * 
   * @param {any} id 控件id
   * @returns
   * @memberof iOSContent
   */
  eventTypeOf(id) {
    let objClass = _.get(this.cachedObjects, `${id}.${CONTROLL_PROP.class}`)
    let interClass = _.intersection(objClass, _.keys(this.bindableEventTypes.event))
    if (interClass.length) return this.bindableEventTypes.types[this.bindableEventTypes.event[interClass[0]]]
    return this.bindableEventTypes.types.UIControlEventTouchUpInside
  }

  /**
   * 调用生成节点位置信息
   *
   * @returns
   * @memberof iOSContent
   */
  idsAssociationOfBindable() {
    this.idsAssociationOfBindableUIView()
    this.idsAssociationOfBindableUINavigationBar()
    this.idsAssociationOfBindableUITabBar()
    return this.pathMap
  }

  /**
   * 获取节点的位置信息
   *
   * @returns
   * @memberof iOSContent
   */
  idsAssociationOfBindableUIView() {
    return this.idsAssociationOfBindableView(this.currentIdOfUIView, this.vc.path, true, true, true)
  }

  /**
   * 获取navigation位置信息
   * 
   * @returns 
   * @memberof iOSContent
   */
  idsAssociationOfBindableUINavigationBar() {
    let navColObj = _.get(this.cachedObjects, this.nvcId, null)
    if (navColObj) {
      let view = this.getPropByCol(navColObj, 'view')
      let navClassName = navColObj.class[0]
      let viewPath = this.vc.path.substring(0, this.vc.path.indexOf(navClassName) + navClassName.length)
      this.idsAssociationOfBindableView(view, viewPath, false, true, false)

      let navBarId = this.getPropByCol(navColObj, 'navigationBar')
      let navColPath = '/' + _.get(navColObj, `${CONTROLL_PROP.class}[0]`)
      let uiviewId = this.getPropByCol(navColObj, 'view')
      let directlyUIViewPath = '/' + _.get(this.cachedObjects, `${uiviewId}.${CONTROLL_PROP.class}[0]`)
      let path = this.vc.path + navColPath + directlyUIViewPath
      this.idsAssociationOfBindableView(navBarId, path, false, true, false)
    }
  }

  /**
   * 获取tabbar位置信息
   * 
   * @returns
   * @memberof iOSContent
   */
  idsAssociationOfBindableUITabBar() {
    let barColId = this.getPropById(this.vc.id, 'tabBarController', null)
    let barColObj = _.get(this.cachedObjects, barColId, null)
    if (barColObj) {
      let view = this.getPropByCol(barColObj, 'view')
      let barClassName = barColObj.class[0]
      let viewPath = this.vc.path.substring(0, this.vc.path.indexOf(barClassName) + barClassName.length)
      this.idsAssociationOfBindableView(view, viewPath, false, true, false)

      let barBarId = this.getPropByCol(barColObj, 'tabBar')
      let barColPath = '/' + _.get(barColObj, `${CONTROLL_PROP.class}[0]`)
      let uiviewId = this.getPropByCol(barColObj, 'view')
      let directlyUIViewPath = '/' + _.get(this.cachedObjects, `${uiviewId}.${CONTROLL_PROP.class}[0]`)
      let path = this.vc.path + barColPath + directlyUIViewPath
      this.idsAssociationOfBindableView(barBarId, path, false, true, false)
    }
  }

  eachHtmlNodes(webView) {
    if (!webView.htmlPage || !webView.htmlPage.nodes) {
      return {
        htmlNodes: [],
        url: ''
      }
    }
    const screenshotWidth = _.get(webView, 'properties.frame.values[0].value.Width')
    const screenshotHeight = _.get(webView, 'properties.frame.values[0].value.Height')
    let width = _.get(webView, 'htmlPage.clientWidth', 0)
    const initialScale = width ? (screenshotWidth / width).toFixed(2) : 1
    let clientHeight = webView.htmlPage.clientHeight
    let positionTop = screenshotHeight - (clientHeight * initialScale)

    let viewTop = webView.position.top
    let viewLeft = webView.position.left
    let nodes = JSON.parse(webView.htmlPage.nodes)
    //过滤无效节点  根据控件大小排序 避免遮罩
    nodes = nodes.filter(p => p.rect.width && p.rect.height)
    nodes = _.orderBy(nodes, ['rect.width', 'rect.height'], ['desc', 'desc'])

    const htmlNodes = nodes.map((node) => {
      if (node.rect.left > screenshotWidth || node.rect.top > screenshotHeight) {
        return null
      }
      return {
        ...node,
        position: {
          top: (node.rect.top + viewTop) * initialScale + positionTop,
          left: node.rect.left + viewLeft * initialScale,
          width: node.rect.width * initialScale,
          height: node.rect.height * initialScale,
          screenshotWidth
        }
      }
    })
    return {
      htmlNodes,
      url: webView.htmlPage.url
    }
  }


  /**
   * 递归获取控件的位置信息和路径
   *
   * @param {any} idOfView  控件id
   * @param {any} path 父级的path
   * @param {boolean} [isFistView=false] 第一个view需要计算topLayoutGuide
   * @param {boolean} [showFistViewIndex=false] 控制第一个uiview是否显示下标
   * @param {boolean} [findFirstScrollView=true] 是否找第一个scrollview(计算位置信息使用)
   * @returns
   * @memberof iOSContent
   */
  idsAssociationOfBindableView(idOfView, path, isFistView = false, showFistViewIndex = false, findFirstScrollView = true) {
    //判断positionMap 是否包含当前元素的位置信息 如果有直接返回
    if (_.get(this.pathMap, `${idOfView}`, null)) {
      return { [idOfView]: this.pathMap[idOfView] }
    }

    //获取当前元素的位置信息
    let currentPosition
    let isWebView = false
    let htmlPosition = {}
    let contentInsets = { top: 0 }
    if (this.equalColType(idOfView, CONTROLL_TYPE.UIWebView)
      || this.equalColType(idOfView, CONTROLL_TYPE.WKWebView)) {
      currentPosition = this.positionOfBindableWebView(idOfView)
      isWebView = true
      _.set(this.cachedObjects, `${idOfView}.position`, {
        left: currentPosition.x,
        top: currentPosition.y,
        width: currentPosition.width,
        height: currentPosition.height,
        screenshotWidth: this.uiScreenWidth,
        screenshotHeight: this.uiScreenHeight
      })
      const { htmlNodes, url } = this.eachHtmlNodes(_.get(this.cachedObjects, idOfView))
      _.set(this.cachedObjects, `${idOfView}.htmlNodes`, htmlNodes)
      _.each(htmlNodes, (p, i) => {
        htmlPosition[`${idOfView}-${i}`] = {
          path: JSON.stringify({ path: p.path }),
          page: url,
          position: {
            width: p.position.width,
            height: p.position.height,
            x: p.position.left,
            y: p.position.top
          }
        }
      })
    } else if (!this.equalColType(idOfView, CONTROLL_TYPE.RCTRefreshControl)
      && !this.equalColType(idOfView, CONTROLL_TYPE.RCTScrollContentView)
      && !this.equalColType(idOfView, CONTROLL_TYPE.RCTScrollView)
      && (this.equalColType(idOfView, CONTROLL_TYPE.UIControl)
        || this.equalColType(idOfView, CONTROLL_TYPE.UIView)
        || this.equalColType(idOfView, CONTROLL_TYPE.UITextView)
        || this.equalColType(idOfView, CONTROLL_TYPE.UITableView)
        || this.equalColType(idOfView, CONTROLL_TYPE.UICollectionView)
        || this.equalColType(idOfView, CONTROLL_TYPE.RTCControll)
        || this.equalColType(idOfView, CONTROLL_TYPE.UITableViewCell)
        || this.equalColType(idOfView, CONTROLL_TYPE.UICollectionViewCell)
        || this.equalColType(idOfView, CONTROLL_TYPE.UILabel)
      )) {
      //计算第一个ScrollView的top位置逻辑
      if (!isWebView && findFirstScrollView && this.equalColType(idOfView, CONTROLL_TYPE.UIScrollView)) {
        findFirstScrollView = false
        let contentInsetAdjustmentBehavior = this.getPropById(idOfView, 'UIScrollViewContentInsetAdjustmentBehavior')
        if (this.getPropById(this.vc.id, 'automaticallyAdjustsScrollViewInsets')) {
          contentInsets = this.getPropById(idOfView, 'contentInsets') || { top: 0 }
        } else if (this.getPropById(idOfView, 'contentInsetAdjustmentBehavior')
          && (contentInsetAdjustmentBehavior
            === UIScrollViewContentInsetAdjustmentBehavior.UIScrollViewContentInsetAdjustmentAutomatic
            || contentInsetAdjustmentBehavior
            === UIScrollViewContentInsetAdjustmentBehavior.UIScrollViewContentInsetAdjustmentScrollableAxes
            || contentInsetAdjustmentBehavior
            === UIScrollViewContentInsetAdjustmentBehavior.UIScrollViewContentInsetAdjustmentAlways)) {
          contentInsets = this.getPropById(idOfView, 'contentInsets') || { top: 0 }
        } else if (this.getPropById(this.vc.id, 'automaticallyAdjustsScrollViewInsets')) {
          contentInsets = { top: this.topLayoutGuideOf(this.vc.id) }
        } else if (this.getPropById(this.nvcId, 'automaticallyAdjustsScrollViewInsets')) {
          contentInsets = { top: this.topLayoutGuideOf(this.vc.id) }
        }
      }
      currentPosition = this.positionOfBindableNativeView(idOfView)
    }
    //第一个view
    if (isFistView) {
      this.positionOfBindableNativeView(idOfView, isFistView)
    }
    let currentPath = path + '/' + _.get(this.cachedObjects, `${idOfView}.class[0]`)
      + (showFistViewIndex || window[SKD_TRACKING_VERSION] < 1 ? '' : this.identificationOfBindableView(idOfView, false))
    let position = {}
    if (currentPosition) {
      if (currentPosition.x + currentPosition.width > this.uiScreenWidth) {
        currentPosition.width = currentPosition.width - (currentPosition.x + currentPosition.width - this.uiScreenWidth) - 1
      }
      if (currentPosition.y + currentPosition.height > this.uiScreenHeight) {
        currentPosition.height = currentPosition.height - (currentPosition.y + currentPosition.height - this.uiScreenHeight) - 1 + contentInsets.top
      }
      position = {
        [idOfView]: {
          'id': idOfView,
          'path': currentPath,
          'position': currentPosition
        },
        ...htmlPosition
      }
    }
    //webciew 不用递归子元素
    if (!isWebView && (!this.equalColType(idOfView, CONTROLL_TYPE.UITabBar) || !this.hidesBottomBarWhenPushed)) {
      //递归获取子元素的位置信息
      let idsOfSubviews = this.getPropById(idOfView, 'subviews')
      _.forEach(idsOfSubviews, p => {
        let subPosition = this.idsAssociationOfBindableView(p, currentPath, false, false, findFirstScrollView)
        if (!_.isEmpty(subPosition)) {
          position = _.assign(position, subPosition)
        }
      })
    }
    this.pathMap = _.assign(this.pathMap, position)
    return position
  }

  /**
   * 计算webView位置信息
   * 
   * @param {any} idOfWebView 
   * @returns 
   * @memberof iOSContent
   */
  positionOfBindableWebView(idOfWebView) {
    let position = this.positionOfBindableNativeView(idOfWebView)

    /**
     * For topLayoutGuide
     */
    let topLayoutGuide = 0
    // = _.get(this.cachedObjects, [idOfWebView, 'htmlPage', 'distance'], undefined)
    // if (typeof topLayoutGuide === 'undefined') {
    //   topLayoutGuide = this.info.system_version < '11' ? 0 : 20
    //   //判断导航是否隐藏
    //   if (this.getPropById(this.nvcId, 'isNavigationBarHidden') === false) {
    //     topLayoutGuide = this.topLayoutGuideOf(this.vc.id)
    //   }
    // }
    // let topLayoutGuide = this.info.system_version < '11' ? 0 : 20
    // //判断导航是否隐藏
    // if (this.getPropById(this.nvcId, 'isNavigationBarHidden') === false) {
    //   topLayoutGuide = this.topLayoutGuideOf(this.vc.id)
    // }
    // topLayoutGuide = _.toNumber(topLayoutGuide)
    let subviews = this.getPropById(idOfWebView, 'subviews') || []
    let subviewInfo
    if (this.equalColType(idOfWebView, CONTROLL_TYPE.UIWebView)) {
      subviewInfo = _.find(subviews, p => {
        return _.get(this.cachedObjects, `${p}.${CONTROLL_PROP.class}`, []).includes('_UIWebViewScrollView')
      })
    } else if (this.equalColType(idOfWebView, CONTROLL_TYPE.WKWebView)) {
      subviewInfo = _.find(subviews, p => {
        return _.get(this.cachedObjects, `${p}.${CONTROLL_PROP.class}`, []).includes('WKScrollView')
      })
    }

    if (subviewInfo) {
      let bounds = this.getBounds(subviewInfo)
      let offset = this.getPropById(subviewInfo, 'contentOffset') || { X: 0, Y: 0 }
      position.x = position.x - offset.X + bounds.X
      position.y = position.y - offset.Y + bounds.Y + topLayoutGuide
      position.width = parseFloat(_.get(this.cachedObjects, `${idOfWebView}.${CONTROLL_PROP.htmlPage}.clientWidth`, 0))
      position.height = parseFloat(_.get(this.cachedObjects, `${idOfWebView}.${CONTROLL_PROP.htmlPage}.clientHeight`, 0))
    }
    return position
  }

  /**
   * 根据id获取位置信息
   *
   * @param {any} idOfNativeView
   * @returns
   * @memberof iOSContent
   */
  positionOfBindableNativeView(idOfNativeView, isFistView = false) {

    let position = _.get(this.positionMap, `${idOfNativeView}`, null)
    if (position) {
      return position
    }
    position = {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    }
    /**
     * For contentOffset
     */
    let contentOffset = { X: 0, Y: 0 }
    if (this.equalColType(idOfNativeView, CONTROLL_TYPE.UIScrollView)) {
      const offset = this.getPropById(idOfNativeView, 'contentOffset')
      contentOffset = offset ? { X: offset.X, Y: offset.Y } : contentOffset
    }

    let topLayoutGuide = 0
    //当前页面第一个UIView 计算topLayoutGuide
    // if (idOfNativeView === this.currentIdOfUIView && isFistView) {
    //   var edgesForExtendedLayout = this.getPropById(this.vc.id, 'edgesForExtendedLayout')
    //   if (this.info.system_version < '11') {
    //     if (edgesForExtendedLayout && ((edgesForExtendedLayout & UIRECTDGE.UIRectEdgeTop) === UIRECTDGE.UIRectEdgeTop)) {
    //       topLayoutGuide = 20
    //       if (this.getPropById(this.vc.id, 'extendedLayoutIncludesOpaqueBars')) {
    //         if (!this.getPropById(this.nvcId, 'isTranslucent')) {//透明
    //           topLayoutGuide = this.topLayoutGuideOf(this.vc.id)
    //         }
    //       }
    //     }
    //     if (this.getPropById(this.nvcId, 'isNavigationBarHidden') === false) {
    //       topLayoutGuide -= 20
    //     }
    //   } else {
    //     if (edgesForExtendedLayout && ((edgesForExtendedLayout & UIRECTDGE.UIRectEdgeTop) === UIRECTDGE.UIRectEdgeTop)) {
    //       if (this.getPropById(this.nvcId, 'isTranslucent')) {
    //         contentOffset.Y += this.topLayoutGuideOf(this.vc.id)
    //       } else {
    //         if (this.getPropById(this.vc.id, 'extendedLayoutIncludesOpaqueBars')) {
    //           contentOffset.Y += this.topLayoutGuideOf(this.vc.id)
    //         }
    //       }
    //     }
    //   }
    // }
    /**
     * For recursive calculation
     */
    let idOfSuperview = this.getPropById(idOfNativeView, 'superview')
    if (idOfSuperview) {
      let positionOfSuperview = this.positionOfBindableNativeView(idOfSuperview)
      let frame = this.getFrame(idOfNativeView)
      if (frame) {
        position.x = positionOfSuperview.x + frame.X - contentOffset.X
        position.y = positionOfSuperview.y + frame.Y - contentOffset.Y + topLayoutGuide
        position.width = frame.Width
        position.height = frame.Height
      }
    }
    _.set(this.positionMap, `${idOfNativeView}`, position)
    return position
  }

  /**
   * 获取控件唯一标识 生成控件path 使用
   * 
   * @param {any} id
   * @returns
   * @memberof iOSContent
   */
  identificationOfBindableView(id, isLatCol = true) {
    let identification = ''
    let object = _.get(this.cachedObjects, id, {})
    if (isLatCol) {
      let varA = this.getPropByCol(object, 'mp_varA', [])
      let varB = this.getPropByCol(object, 'mp_varB', [])
      let varC = this.getPropByCol(object, 'mp_varC', [])
      let varE = this.getPropByCol(object, 'mp_varE', [])
      //如果没有特定属性值 则用当前控件在同类型的兄弟元素的下标
      if (varA && varA.length) {
        identification = '[(mp_fingerprintVersion >= 1 AND mp_varA == "' + varA + '")]'
      } else if (varB && varB.length) {
        identification = '[(mp_fingerprintVersion >= 1 AND mp_varB == "' + varB + '")]'
      } else if (varC && varC.length) {
        identification = '[(mp_fingerprintVersion >= 1 AND mp_varC == "' + varC + '")]'
      } else if (varE && varE.length) {
        identification = '[(mp_fingerprintVersion >= 1 AND mp_varE == "' + varE + '")]'
      }
      if (identification) return identification
    }
    const cellIndex = _.get(object, 'properties.cellIndex', undefined)
    if (typeof cellIndex !== 'undefined') {
      return '[' + cellIndex + ']'
    }
    let superViewId = this.getPropById(id, 'superview')
    if (superViewId) {
      let subviews = this.getPropById(superViewId, 'subviews', [])
      identification = '[' + _.indexOf(subviews, id) + ']'
      let index = 0
      _.every(subviews, p => {
        if (id === p) {
          identification = '[' + index + ']'
          return false
        }
        if (_.get(this.cachedObjects, `${id}.${CONTROLL_PROP.class}[0]`) === _.get(this.cachedObjects, `${p}.${CONTROLL_PROP.class}[0]`)) {
          index++
        }
        return true
      })
    }
    return identification
  }

  //#endregion

  /**
   * 获取当前UIView的绝对path和id
   *
   * @param {any} idOfRootViewController
   * @returns
   * @memberof iOSContent
   */
  getCurrentUIViewInfo(idOfRootViewController) {
    let pathOfRootViewController = '/' + _.get(this.cachedObjects, `${idOfRootViewController}.${CONTROLL_PROP.class}[0]`)
    return this.getCotrollPath(idOfRootViewController, pathOfRootViewController)
  }

  /**
   * 根据id获取topLayout属性
   *
   * @param {any} id
   * @returns
   * @memberof iOSContent
   */
  topLayoutGuideOf(id) {
    // let topLayoutGuide = 0
    // let idOfTopLayoutGuide = this.getPropById(id, 'topLayoutGuide')
    // if (!idOfTopLayoutGuide) return 0
    // if (idOfTopLayoutGuide.indexOf('$') === 0) {
    //   const frame = this.getFrame(idOfTopLayoutGuide)
    //   topLayoutGuide = frame ? frame.Height : 0
    // } else {
    //   topLayoutGuide = parseFloat(idOfTopLayoutGuide)
    // }
    return 0
  }
}
