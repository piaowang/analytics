/**
 * Created by zack on 10/4/17.
 */


export default class iOSContent {
  constructor(info, snapshot) {
    this.state = {
      info: info,
      screenshot: snapshot.screenshot,
      image_hash: snapshot.image_hash,
      objects: snapshot.serialized_objects.objects,
      rootObject: snapshot.serialized_objects.rootObject,
      cachedObjects: {},
      bindableEventTypes: {}
    }
    this.cachedObjectsOfObjects()
    this.eventTypesOfBindable()
  }

  render() {
    let content = null

    // content = Object.keys(this.idsAssociationOfBindable()).map(function(id) {
    //
    // }, this)

    return content
  }

  // event type
  bindableTypeOf(id) {
    let bindableEventTypes = this.eventTypesOfBindable()
    if (this.isBindableUIControl(id)) {
      return bindableEventTypes.bindable.UIControl
    } else if (this.isBindableUITableView(id)) {
      return bindableEventTypes.bindable.UITableView
    } else if (this.isBindableUITextView(id)) {
      return bindableEventTypes.bindable.UITextView
    }
    return null
  }

  eventTypeOf(id) {
    let bindableEventTypes = this.eventTypesOfBindable()
    for (let index in this.classOf(this.objectOf(id))) {
      if (Object.keys(bindableEventTypes.event).includes(this.classOf(this.objectOf(id))[index])) {
        return bindableEventTypes.types[bindableEventTypes.event[this.classOf(this.objectOf(id))[index]]]
      }
    }
    return bindableEventTypes.types.UIControlEventTouchUpInside
  }

  eventTypesOfBindable() {
    if (Object.keys(this.state.bindableEventTypes).length <= 0) {
      this.state.bindableEventTypes =
        {
          'types':
          {
            'UIControlEventTouchDown': 1 << 0,
            'UIControlEventTouchDownRepeat': 1 << 1,
            'UIControlEventTouchDragInside': 1 << 2,
            'UIControlEventTouchDragOutside': 1 << 3,
            'UIControlEventTouchDragEnter': 1 << 4,
            'UIControlEventTouchDragExit': 1 << 5,
            'UIControlEventTouchUpInside': 1 << 6,
            'UIControlEventTouchUpOutside': 1 << 7,
            'UIControlEventTouchCancel': 1 << 8,
            'UIControlEventValueChanged': 1 << 12,
            'UIControlEventPrimaryActionTriggered': 1 << 13,
            'UIControlEventEditingDidBegin': 1 << 16,
            'UIControlEventEditingChanged': 1 << 17,
            'UIControlEventEditingDidEnd': 1 << 18,
            'UIControlEventEditingDidEndOnExit': 1 << 19,
            'UIControlEventAllTouchEvents': 0x00000FFF,
            'UIControlEventAllEditingEvents': 0x000F0000,
            'UIControlEventApplicationReserved': 0x0F000000,
            'UIControlEventSystemReserved': 0xF0000000,
            'UIControlEventAllEvents': 0xFFFFFFFF
          },
          'event':
          {
            'UIButton': 'UIControlEventTouchUpInside',
            'UIDatePicker': 'UIControlEventValueChanged',
            'UISegmentedControl': 'UIControlEventValueChanged',
            'UISlider': 'UIControlEventValueChanged',
            'UISwitch': 'UIControlEventValueChanged',
            'UITextField': 'UIControlEventEditingDidBegin',
            'UISearchBarTextField': 'UIControlEventEditingDidBegin'
          },
          'bindable':
          {
            'UIControl': 'ui_control',
            'UITableView': 'ui_table_view',
            'UITextView': 'ui_text_view'
          }
        }
    }
    return this.state.bindableEventTypes
  }

  // View
  idsAssociationOfBindable() {
    let idsAssociation = {}
    idsAssociation = this.combinedDictionaryOf(idsAssociation, this.idsAssociationOfBindableUIView())

    if (this.idsAssociationOfBindableUINavigationBar() != null) {
      idsAssociation = this.combinedDictionaryOf(idsAssociation, this.idsAssociationOfBindableUINavigationBar())
    }

    if (this.idsAssociationOfBindableUITabBar() != null) {
      idsAssociation = this.combinedDictionaryOf(idsAssociation, this.idsAssociationOfBindableUITabBar())
    }
    return idsAssociation
  }

  idsAssociationOfBindableUIView() {
    let currentIdOfUIViewController = this.idOfCurrentUIViewController(this.idOfRootUIViewController())
    let currentIdOfUIView = this.idOfUIViewDirectlyFrom(currentIdOfUIViewController)
    let path = this.pathOfCurrentUIViewController(this.idOfRootUIViewController())
    return this.idsAssociationOfBindableView(currentIdOfUIView, path)
  }

  idsAssociationOfBindableUINavigationBar() {
    let currentIdOfUINavigationController = this.idOfCurrentUINavigationController()
    if (currentIdOfUINavigationController != null) {
      let currentIdOfUINavigationBar = this.valueFromIdOf(currentIdOfUINavigationController, 'navigationBar')
      let pathOfCurrentUIViewController = this.pathOfCurrentUIViewController(this.idOfRootUIViewController())
      let pathOfCurrentUINavigationController = '/' + this.pathNameOf(this.objectOf(currentIdOfUINavigationController))
      let pathOfDirectlyUIView = '/' + this.pathNameOf(this.objectOf(this.idOfUIViewDirectlyFrom(currentIdOfUINavigationController)))
      let path = pathOfCurrentUIViewController + pathOfCurrentUINavigationController + pathOfDirectlyUIView
      return this.idsAssociationOfBindableView(currentIdOfUINavigationBar, path)
    }
    return null
  }

  idsAssociationOfBindableUITabBar() {
    let currentIdOfUITabBarController = this.idOfCurrentUITabBarController()
    if (currentIdOfUITabBarController != null) {
      let currentIdOfUITabBar = this.valueFromIdOf(currentIdOfUITabBarController, 'tabBar')
      let pathOfCurrentUIViewController = this.pathOfCurrentUIViewController(this.idOfRootUIViewController())
      let pathOfCurrentUITabBarController = '/' + this.pathNameOf(this.objectOf(currentIdOfUITabBarController))
      let pathOfDirectlyUIView = '/' + this.pathNameOf(this.objectOf(this.idOfUIViewDirectlyFrom(currentIdOfUITabBarController)))
      let path = pathOfCurrentUIViewController + pathOfCurrentUITabBarController + pathOfDirectlyUIView
      return this.idsAssociationOfBindableView(currentIdOfUITabBar, path)
    }
    return null
  }

  idsAssociationOfBindableView(idOfView, path) {
    let ids = {}
    let idsOfSubviews = this.idsOfSubviewsFrom(idOfView)
    let currentPath = path + '/' + this.pathNameOf(this.objectOf(idOfView))

    if (this.isBindableUIControl(idOfView)
      || this.isBindableUITableView(idOfView)
      || this.isBindableUITextView(idOfView)) {
      let currentPosition = this.positionOfBindableNativeView(idOfView)
      ids = this.combinedDictionaryOf(ids,
        {
          [idOfView]: {
            'path': path + '/' + this.classNameOf(this.objectOf(idOfView)) + this.identificationOfBindableView(idOfView),
            'position': currentPosition
          }
        }
      )
    } else if (this.isBindableUIWebView(idOfView)
      || this.isBindableWKWebView(idOfView)) {
      let currentPosition = this.positionOfBindableWebView(idOfView)
      ids = this.combinedDictionaryOf(ids,
        {
          [idOfView]: {
            'path': path + '/' + this.classNameOf(this.objectOf(idOfView)) + this.identificationOfBindableView(idOfView),
            'position': currentPosition
          }
        }
      )
      this.objectOf(idOfView).position = {
        left: currentPosition.x,
        top: currentPosition.y,
        width: currentPosition.width,
        height: currentPosition.height,
        screenshotWidth: this.widthInBoundsOfUIScreen()
      }
    }
    for (let index in idsOfSubviews) {
      if (Object.keys(this.idsAssociationOfBindableView(idsOfSubviews[index], currentPath)).length > 0) {
        ids = this.combinedDictionaryOf(ids, this.idsAssociationOfBindableView(idsOfSubviews[index], currentPath))
      }
    }
    return ids
  }

  positionOfBindableWebView(idOfWebView) {
    let position = this.positionOfBindableNativeView(idOfWebView)

    /**
     * For topLayoutGuide
     */
    let topLayoutGuide = 0
    let currentIdOfCurrentVC = this.idOfCurrentUIViewController(this.idOfRootUIViewController())
    let currentIdOfCurrentNVC = this.idOfCurrentUINavigationController()
    if (this.valueFromIdOf(currentIdOfCurrentNVC, 'isNavigationBarHidden') === false) {
      topLayoutGuide = this.topLayoutGuideOf(currentIdOfCurrentVC)
    }

    if (this.isBindableUIWebView(idOfWebView)) {
      let idsOfSubviews = this.idsOfSubviewsFrom(idOfWebView)
      for (let index in idsOfSubviews) {
        if (this.classOf(this.objectOf(idsOfSubviews[index])).includes('_UIWebViewScrollView')) {
          let bounds = this.boundsOfUIViewFrom(idsOfSubviews[index])
          let offset = this.contentOffsetOf(idsOfSubviews[index])
          position.x = position.x - offset.X + bounds.X
          position.y = position.y - offset.Y + bounds.Y + topLayoutGuide
          position.width = parseFloat(this.htmlPageOf(this.objectOf(idOfWebView)).clientWidth)
          position.height = parseFloat(this.htmlPageOf(this.objectOf(idOfWebView)).clientHeight)
          break
        }
      }
    } else if (this.isBindableWKWebView(idOfWebView)) {
      let idsOfSubviews = this.idsOfSubviewsFrom(idOfWebView)
      for (let index in idsOfSubviews) {
        if (this.classOf(this.objectOf(idsOfSubviews[index])).includes('WKScrollView')) {
          let bounds = this.boundsOfUIViewFrom(idsOfSubviews[index])
          let offset = this.contentOffsetOf(idsOfSubviews[index])
          position.x = position.x - offset.X + bounds.X
          position.y = position.y - offset.Y + bounds.Y + topLayoutGuide
          position.width = parseFloat(this.htmlPageOf(this.objectOf(idOfWebView)).clientWidth)
          position.height = parseFloat(this.htmlPageOf(this.objectOf(idOfWebView)).clientHeight)
          break
        }
      }
    }

    return position
  }

  positionOfBindableNativeView(idOfNativeView) {
    let position = {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    }

    /**
     * For contentOffset
     */
    let contentOffset = {
      'X': 0,
      'Y': 0
    }
    if (this.isUIScrollView(idOfNativeView)) {
      let offset = this.contentOffsetOf(idOfNativeView)
      contentOffset.X = offset.X
      contentOffset.Y = offset.Y
    }

    /**
     * For recursive calculation
     */
    let idOfSuperview = this.idOfSuperviewFrom(idOfNativeView)
    if (idOfSuperview != null) {
      let positionOfSuperview = this.positionOfBindableNativeView(idOfSuperview)
      let frame = this.frameOfUIViewFrom(idOfNativeView)
      position.x = positionOfSuperview.x + frame.X - contentOffset.X
      position.y = positionOfSuperview.y + frame.Y - contentOffset.Y
      position.width = frame.Width
      position.height = frame.Height
    }

    return position
  }

  identificationOfBindableView(id) {
    let object = this.objectOf(id)
    let varA = this.valueFromObjectOf(object, 'mp_varA')
    let varB = this.valueFromObjectOf(object, 'mp_varB')
    let varC = this.valueFromObjectOf(object, 'mp_varC')
    // let varSetD = this.valueFromObjectOf(object, 'mp_varSetD') // useless
    let varE = this.valueFromObjectOf(object, 'mp_varE')
    let identification = ''
    // if (varSetD != null && varSetD.length > 0) {
    //     identification = '[(mp_fingerprintVersion >= 1 AND mp_varSetD == "' + varSetD + '")]'
    // }
    if (varE != null && varE.length > 0) {
      identification = '[(mp_fingerprintVersion >= 1 AND mp_varE == "' + varE + '")]'
    }
    if (varC != null && varC.length > 0) {
      identification = '[(mp_fingerprintVersion >= 1 AND mp_varC == "' + varC + '")]'
    }
    if (varB != null && varB.length > 0) {
      identification = '[(mp_fingerprintVersion >= 1 AND mp_varB == "' + varB + '")]'
    }
    if (varA != null && varA.length > 0) {
      identification = '[(mp_fingerprintVersion >= 1 AND mp_varA == "' + varA + '")]'
    }
    if (identification.length <= 0) {
      let idOfSuperview = this.idOfSuperviewFrom(id)
      if (idOfSuperview != null) {
        let idsOfSubviewsFromSuperview = this.idsOfSubviewsFrom(idOfSuperview)
        let index = 0
        for (let i in idsOfSubviewsFromSuperview) {
          if (id === idsOfSubviewsFromSuperview[i]) {
            identification = '[' + index + ']'
            break
          }
          if (this.classNameOf(this.objectOf(id)) === this.classNameOf(this.objectOf(idsOfSubviewsFromSuperview[i]))) {
            index++
          }
        }
      }
    }
    return identification
  }

  isUIScrollView(id) {
    if (this.classOf(this.objectOf(id)).includes('UIScrollView')) {
      return true
    } else {
      return false
    }
  }

  isBindableWKWebView(id) {
    if (this.classOf(this.objectOf(id)).includes('WKWebView') && this.htmlPageOf(this.objectOf(id)) != null) {
      return true
    } else {
      return false
    }
  }

  isBindableUIWebView(id) {
    if (this.classOf(this.objectOf(id)).includes('UIWebView') && this.htmlPageOf(this.objectOf(id)) != null) {
      return true
    } else {
      return false
    }
  }

  isBindableUITextView(id) {
    if (this.classOf(this.objectOf(id)).includes('UITextView')
      && this.isUIViewUserInteractionEnabled(id)
      && this.delegateSelectorsOf(this.objectOf(id)).includes('textViewDidBeginEditing:')) {
      return true
    } else {
      return false
    }
  }

  isBindableUITableView(id) {
    if (this.classOf(this.objectOf(id)).includes('UITableView')
      && this.isUIViewUserInteractionEnabled(id)
      && this.delegateSelectorsOf(this.objectOf(id)).includes('tableView:didSelectRowAtIndexPath:')) {
      return true
    } else {
      return false
    }
  }

  isBindableUIControl(id) {
    if (this.classOf(this.objectOf(id)).includes('UIControl') && this.isUIViewUserInteractionEnabled(id)) {
      return true
    } else {
      return false
    }
  }

  idOfSuperviewFrom(id) {
    return this.valueFromIdOf(id, 'superview')
  }

  idsOfSubviewsFrom(id) {
    return this.valueFromIdOf(id, 'subviews')
  }

  isUIViewUserInteractionEnabled(id) {
    return this.valueFromIdOf(id, 'userInteractionEnabled') === true
  }

  idOfUIViewDirectlyFrom(idOfUIViewController) {
    return this.valueFromIdOf(idOfUIViewController, 'view')
  }

  idOfUIScreen() {
    return this.valueFromIdOf(this.idOfUIWindow(), 'screen')
  }

  idOfUIWindow() {
    return this.state.rootObject
  }

  // ViewController
  idOfCurrentUINavigationController() {
    let idOfCurrentVC = this.idOfCurrentUIViewController(this.idOfRootUIViewController())
    if (idOfCurrentVC != null) {
      return this.valueFromIdOf(idOfCurrentVC, 'navigationController')
    }
    return null
  }

  idOfCurrentUITabBarController() {
    let idOfCurrentVC = this.idOfCurrentUIViewController(this.idOfRootUIViewController())
    if (idOfCurrentVC != null) {
      return this.valueFromIdOf(idOfCurrentVC, 'tabBarController')
    }
    return null
  }

  idOfCurrentUIViewController(idOfRootViewController) {

    let pathOfRootViewController = '/' + this.classNameOf(this.objectOf(idOfRootViewController))
    let idOfCurrentVC = this.associationOfCurrentUIViewController(idOfRootViewController, pathOfRootViewController).id
    if (idOfCurrentVC != null) {
      return idOfCurrentVC
    }
    return null
  }

  pathOfCurrentUIViewController(idOfRootViewController) {

    let pathOfRootViewController = '/' + this.classNameOf(this.objectOf(idOfRootViewController))
    let pathOfCurrentVC = this.associationOfCurrentUIViewController(idOfRootViewController, pathOfRootViewController).path
    if (pathOfCurrentVC != null) {
      return pathOfCurrentVC
    }
    return null
  }

  associationOfCurrentUIViewController(idOfRootViewController, path) {
    if (this.objectOf(idOfRootViewController) != null) {
      let currentPath = path
      if (this.valueFromIdOf(idOfRootViewController, 'presentedViewController') != null) {
        currentPath = currentPath + '/' + this.classNameOf(this.objectOf(this.valueFromIdOf(idOfRootViewController, 'presentedViewController')))
        return this.associationOfCurrentUIViewController(this.valueFromIdOf(idOfRootViewController, 'presentedViewController'), currentPath)
      } else if (this.isUISplitViewController(idOfRootViewController) && this.valueFromIdOf(idOfRootViewController, 'viewControllers') != null) {
        let viewControllers = this.valueFromIdOf(idOfRootViewController, 'viewControllers')
        currentPath = currentPath + '/' + this.classNameOf(this.objectOf(viewControllers[viewControllers.length - 1]))
        return this.associationOfCurrentUIViewController(viewControllers[viewControllers.length - 1], currentPath)
      } else if (this.isUINavigationController(idOfRootViewController)) {
        let idOfvisibleViewController = this.valueFromIdOf(idOfRootViewController, 'visibleViewController')
        let idOftopViewController = this.valueFromIdOf(idOfRootViewController, 'topViewController')
        let idsOfchildViewControllers = this.valueFromIdOf(idOfRootViewController, 'childViewControllers')
        if (idOfvisibleViewController != null) {
          currentPath = currentPath + '/' + this.classNameOf(this.objectOf(idOfvisibleViewController))
          return this.associationOfCurrentUIViewController(idOfvisibleViewController, currentPath)
        } else if (idOftopViewController != null) {
          currentPath = currentPath + '/' + this.classNameOf(this.objectOf(idOftopViewController))
          return this.associationOfCurrentUIViewController(idOftopViewController, currentPath)
        } else if (idsOfchildViewControllers != null) {
          currentPath = currentPath + '/' + this.classNameOf(this.objectOf(idsOfchildViewControllers[idsOfchildViewControllers.length - 1]))
          return this.associationOfCurrentUIViewController(idsOfchildViewControllers[idsOfchildViewControllers.length - 1], currentPath)
        } else {
          return { 'id': idOfRootViewController, 'path': path }
        }
      } else if (this.isUITabBarController(idOfRootViewController)) {
        let idOfSelectedViewController = this.valueFromIdOf(idOfRootViewController, 'selectedViewController')
        if (idOfSelectedViewController != null) {

          currentPath = currentPath + '/' + this.classNameOf(this.objectOf(idOfSelectedViewController))
          return this.associationOfCurrentUIViewController(idOfSelectedViewController, currentPath)
        } else {
          return { 'id': idOfRootViewController, 'path': path }
        }
      } else {
        return { 'id': idOfRootViewController, 'path': path }
      }
    }
    return null
  }

  idOfRootUIViewController() {
    return this.valueFromIdOf(this.idOfUIWindow(), 'rootViewController')
  }

  isUISplitViewController(id) {
    if (this.classOf(this.objectOf(id)).includes('UISplitViewController')) {
      return true
    } else {
      return false
    }
  }

  isUINavigationController(id) {
    if (this.classOf(this.objectOf(id)).includes('UINavigationController')) {
      return true
    } else {
      return false
    }
  }

  isUITabBarController(id) {
    if (this.classOf(this.objectOf(id)).includes('UITabBarController')) {
      return true
    } else {
      return false
    }
  }

  // 获取指定的property
  contentOffsetOf(idOfUIScrollView) {
    let contentOffset = {
      'X': 0,
      'Y': 0
    }
    if (this.valueFromIdOf(idOfUIScrollView, 'contentOffset') != null) {
      contentOffset = this.valueFromIdOf(idOfUIScrollView, 'contentOffset')
    }
    return contentOffset
  }

  isNavigationBarHiddenOf(idOfUINavigationController) {
    return this.valueFromIdOf(idOfUINavigationController, 'isNavigationBarHidden')
  }

  translatesAutoresizingMaskIntoConstraintsOf(idOfUIView) {
    return this.valueFromIdOf(idOfUIView, 'translatesAutoresizingMaskIntoConstraints')
  }

  topLayoutGuideOf(idOfUIViewController) {
    let topLayoutGuide = 0

    if (this.valueFromIdOf(idOfUIViewController, 'topLayoutGuide') != null) {
      if (this.valueFromIdOf(idOfUIViewController, 'topLayoutGuide').substring(0, 1) === '$') {
        let idOfTopLayoutGuide = this.valueFromIdOf(idOfUIViewController, 'topLayoutGuide')
        topLayoutGuide = this.heightInFrameOfUIViewFrom(idOfTopLayoutGuide)
        if (topLayoutGuide === null) {
          topLayoutGuide = 0
        }
      } else {
        topLayoutGuide = parseFloat(this.valueFromIdOf(idOfUIViewController, 'topLayoutGuide'))
      }
    }
    return topLayoutGuide
  }

  widthInBoundsOfUIScreen() {
    return this.boundsOfUIScreen().Width
  }

  heightInBoundsOfUIScreen() {
    return this.boundsOfUIScreen().Height
  }

  scaleOfUIScreen() {
    return this.valueFromIdOf(this.idOfUIScreen(), 'scale')
  }

  boundsOfUIScreen() {
    return this.valueFromIdOf(this.idOfUIScreen(), 'bounds')
  }

  xInBoundsOfUIViewFrom(id) {
    let bounds = this.boundsOfUIViewFrom(id)
    if (bounds != null) {
      return bounds.X
    }
    return null
  }

  yInBoundsOfUIViewFrom(id) {
    let bounds = this.boundsOfUIViewFrom(id)
    if (bounds != null) {
      return bounds.Y
    }
    return null
  }

  widthInBoundsOfUIViewFrom(id) {
    let bounds = this.boundsOfUIViewFrom(id)
    if (bounds != null) {
      return bounds.Width
    }
    return null
  }

  heightInBoundsOfUIViewFrom(id) {
    let bounds = this.boundsOfUIViewFrom(id)
    if (bounds != null) {
      return bounds.Height
    }
    return null
  }

  boundsOfUIViewFrom(id) {
    let object = this.objectOf(id)
    if (this.classOf(object).includes('UIView')) {
      return this.valueFromObjectOf(object, 'bounds')
    }
    return null
  }

  xInFrameOfUIViewFrom(id) {
    let frame = this.frameOfUIViewFrom(id)
    if (frame != null) {
      return frame.X
    }
    return null
  }

  yInFrameOfUIViewFrom(id) {
    let frame = this.frameOfUIViewFrom(id)
    if (frame != null) {
      return frame.Y
    }
    return null
  }

  widthInFrameOfUIViewFrom(id) {
    let frame = this.frameOfUIViewFrom(id)
    if (frame != null) {
      return frame.Width
    }
    return null
  }

  heightInFrameOfUIViewFrom(id) {
    let frame = this.frameOfUIViewFrom(id)
    if (frame != null) {
      return frame.Height
    }
    return null
  }

  frameOfUIViewFrom(id) {
    let object = this.objectOf(id)
    if (this.classOf(object).includes('UIView')) {
      return this.valueFromObjectOf(object, 'frame')
    }
    return null
  }

  // 获取指定class的object的id
  objectIdsOfClass(name) {
    let ids = []
    for (let object in this.state.objects) {
      if (this.classOf(object).includes(name)) {
        ids.push(this.idOf(object))
      }
    }
    return ids
  }

  // 获取object
  objectOf(id) {
    let object = null
    object = this.cachedObjectsOfObjects()[id]
    return object
  }

  cachedObjectsOfObjects() {
    if (Object.keys(this.state.cachedObjects).length <= 0) {
      for (var index = 0; index < this.state.objects.length; index++) {
        this.state.cachedObjects[this.idOf(this.state.objects[index])] = this.state.objects[index]
      }
    }
    return this.state.cachedObjects
  }

  // -- 获取object --

  // 获取object内字段的数据
  valueFromIdOf(id, property) {
    let object = this.objectOf(id)
    if (object != null) {
      return this.valueFromObjectOf(object, property)
    }
    return null
  }

  valueFromObjectOf(object, property) {
    let propertiesOfObject = this.propertiesOf(object)
    if (propertiesOfObject
      && propertiesOfObject != null
      && propertiesOfObject[property]
      && propertiesOfObject[property].values.length > 0) {
      return propertiesOfObject[property].values[0].value
    }
    return null
  }

  delegateClassOf(object) {
    return this.delegateOf(object).class
  }

  delegateSelectorsOf(object) {
    return this.delegateOf(object).selectors
  }

  pathNameOf(object) {
    let pathName = this.classNameOf(object)
    // let c = this.classOf(object)
    // if (c.includes('UIView')) {
    //     pathName = 'UIView'
    // } else if (c.includes('UIViewController')) {
    //     pathName = 'UIViewController'
    // }
    return pathName
  }

  classNameOf(object) {
    if (object) {
      return this.classOf(object)[0]
    } else {
      throw new Error('object does not exist')
    }
  }

  nodesFromHtmlPageOf(object) {
    let nodes = null
    if (this.htmlPageOf(object) != null) {
      nodes = this.htmlPageOf(object).nodes
    }
    return nodes
  }

  urlFromHtmlPageOf(object) {
    let url = null
    if (this.htmlPageOf(object) != null) {
      url = this.htmlPageOf(object).url
    }
    return url
  }

  // -- 获取object内字段的数据 --

  // 获取object内的数据
  idOf(object) {
    return object.id
  }

  classOf(object) {
    return object.class
  }

  propertiesOf(object) {
    return object.properties
  }

  delegateOf(object) {
    return object.delegate
  }

  htmlPageOf(object) {
    let htmlPage = null
    if (object.htmlPage && object.htmlPage != null) {
      htmlPage = object.htmlPage
    }
    return htmlPage
  }

  // -- 获取object内的数据 --

  // 工具
  combinedDictionaryOf(o1, o2) {
    return Object.assign({}, o1, o2)
  }
}
