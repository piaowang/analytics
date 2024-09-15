/* eslint-disable no-unused-vars */
import React, { Suspense } from 'react'
import { browserHistory } from 'react-router'
import deepCopy from '../../../common/deep-copy'
import NewHeader from './header-new'
import Header from './header'
import SubMenu from './left-nav'
import LeftMenu from './left-menu'
import ZoomWarn from '../Common/zoom-warn'
import * as ls from '../../common/localstorage'
import * as ss from '../../common/session-storage'
import { Icon as LegacyIcon } from '@ant-design/compatible'
import { notification, Button, Tooltip } from 'antd'
import CustomerService from './customer-service'
import menuData from './menu-data'
import newMenuData from './new-menu-data'
import _ from 'lodash'
import classNames from 'classnames'
import * as actions from '../../actions'
import { checkPermission } from '../../common/permission-control'
import Link from '../Common/link-nojam'
import HelpLink from './help'
import Ploading from '../Common/public-loading'
import Fetch from '../../common/fetch-final'

//组件公共loading灵活可控
window.sugo.$loading = new Ploading()
//切换路由关闭打开的loading
browserHistory.listen((location, action) => {
  sugo.$loading.hide()
})

import {
  getProjListLSId,
  checkPathShouldHideProjectMenu,
  getCurrentProjLSId,
  shouldShowChildProject,
  checkMenuSouldHideSideNav,
  qqCustomerServiceUrl,
  showHelpLink,
  customerServicePhoneNumber
} from './common'
import { trackRouteChange, initTrack, startStayTimer } from './sdk-track'
import { ContextNameEnum, getContextByName } from '../../common/context-helper'
import { AccessDataType } from '../../../common/constants'
import { recurFind, isEqualWithReactObj } from 'common/sugo-utils'
import { getCurrentTagProject } from '../../common/tag-current-project'
import { connect } from 'react-redux'
import { namespace } from './model'
import ProjectSelectDrawer from './project-select-drawer'
import { set as setSessionStorage, get as getSessionStorage } from '../../common/session-storage'

// 切换项目菜单改为右侧抽屉面板
const { enableProjectSelectDrawer = false, enableNewMenu = false, cdn, defaultPage } = window.sugo
const urlBase = `${cdn}/_bc/sugo-analytics-static/assets/images`
const canAddProj = checkPermission('get:/console/project') && checkPermission('get:/console/project/create')
const showFilter = p => p.status

// lazy load ProjectSelectDrawer
// const ProjectSelectDrawer = React.lazy(() => import('./project-select-drawer'));

const controlIconId = 'help-icon-control'
let shouldHideSubmenuPrev = 0

//根据当前localstorage设定排序
const sorter = projs => {
  let projIds = ls.get(getProjListLSId)
  if (!projIds) return projs
  let res = projIds.reduce((prev, id) => {
    let proj = _.find(projs, { id })
    if (proj) {
      prev.push(proj)
    }
    return prev
  }, [])
  let ids = new Set(res.map(r => r.id))
  let others = projs.filter(p => !ids.has(p.id))
  return [...res, ...others]
}

//根据当前localstorage获取当前项目
const getCurrentProject = projs => {
  // 优先使用当前 session 的项目 id
  // let proj
  // if(window.sugo.defaultDatasourceName) {
  //   proj = _.find(projs, p => p.datasource_name === window.sugo.defaultDatasourceName )
  // }
  let id = ss.gets(getCurrentProjLSId) || ls.gets(getCurrentProjLSId)
  let proj = _.find(projs, { id })
  return proj ? proj : projs[0] || {}
}

//根据路径过滤项目
const childProjectControl = props => {
  let { pathname } = props.location
  return shouldShowChildProject(pathname) ? p => p : p => !p.parent_id
}

//检查路径改变，不受 hash 影响
let prevPath = window.location.href.split('#')[0]
const checkPathChange = () => {
  let res = prevPath !== window.location.href.split('#')[0]
  if (res) {
    prevPath = window.location.href.split('#')[0]
  }
  return res
}
let menus = enableNewMenu ? newMenuData() : menuData()
let firstMenuPath = window.sugo.firstMenuPath ? window.sugo.firstMenuPath : _.get(menus, '[0].children[0].path') || defaultPage || '/console/index'
// 判断是否在iframe内部
const isInIframe = (self.frameElement || self !== top) && window.sugo.hideMenu

@connect(state => state[namespace] || {})
export default class Home extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      compactMenu: false,
      menus,
      subMenus: this.getSubMenu(props, menus),
      selectMenu: firstMenuPath,
      loadingProject: false,
      projectList: [],
      projectCurrent: {},
      datasourceCurrent: {},
      datasourceList: [],
      closeMenu: false,
      hideHelpIcon: ls.get(controlIconId) || false
    }
    let query = (props.location && props.location.query) || {}
    if ('hideTopNavigatorInThisSession' in query) {
      setSessionStorage('hideTopNavigator', query.hideTopNavigatorInThisSession)
    }
    if ('hideLeftNavigatorInThisSession' in query) {
      setSessionStorage('hideLeftNavigator', query.hideLeftNavigatorInThisSession)
    }
  }

  componentDidMount() {
    this.unmounted = false
    initTrack()
    this.checkLogin()
    this.checkServerTime()
    this.getData()
    startStayTimer()
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (!isEqualWithReactObj(this.props, prevProps)) {
      let subMenus = this.getSubMenu(this.props)

      let shouldHideSubmenu = subMenus.length < 2
      if (shouldHideSubmenu !== shouldHideSubmenuPrev) {
        this.notifyResize(1000)
        shouldHideSubmenuPrev = shouldHideSubmenu
      }

      this.setState({
        subMenus
      })
      if (checkPathChange()) {
        this.getData(this.props)
        trackRouteChange(prevProps)
      }
    }
  }

  // UNSAFE_componentWillReceiveProps(nextProps) {
  //   let subMenus = this.getSubMenu(nextProps)

  //   let shouldHideSubmenu = subMenus.length < 2
  //   if (shouldHideSubmenu !== shouldHideSubmenuPrev) {
  //     this.notifyResize(1000)
  //     shouldHideSubmenuPrev = shouldHideSubmenu
  //   }

  //   this.setState({
  //     subMenus
  //   })
  //   if (checkPathChange()) {
  //     this.getData(nextProps)
  //     trackRouteChange(this.props)
  //   }
  // }

  componentWillUnmount() {
    this.unmounted = true
  }

  getSubMenu = (props = this.props, menus = this.state.menus) => {
    let { pathname } = props.location
    if (pathname === '/console') {
      pathname = firstMenuPath
    }
    let menu =
      recurFind(
        menus,
        m => m.children,
        m => m.path && pathname.includes(m.path)
      ) || {}
    return menu.children || []
  }

  getData = async (props = this.props) => {
    let shouldHide = checkPathShouldHideProjectMenu(props.location.pathname)

    let { getDatasources, getProjects } = actions
    let q = {
      includeChild: 1
    }
    let update = {
      loadingProject: false,
      dataLoaded: true
    }
    !this.unmounted && this.setState({ loadingProject: true })
    let res1 = await getProjects(q)(_.noop)
    let datasourceIdSet
    if (res1) {
      update.projectAll = res1.result.model
      update.projectList = sorter(update.projectAll.filter(showFilter).filter(childProjectControl(props)))
      update.projectCurrent = shouldHide ? {} : getCurrentProject(update.projectList)
      datasourceIdSet = new Set(update.projectAll.map(p => p.datasource_id))
    } else {
      return this.setState(update)
    }
    let res2 = await getDatasources(q)(_.noop)
    if (res2) {
      update.datasourceList = res2.result.filter(d => datasourceIdSet.has(d.id))
      update.datasourceCurrent = shouldHide
        ? {}
        : _.find(update.datasourceList, {
            id: update.projectCurrent.datasource_id
          }) || {}
    }

    // 存入全局model
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload: {
        projectCurrent: update.projectCurrent,
        datasourceCurrent: update.datasourceCurrent
      }
    })
    !this.unmounted && this.setState(update)
  }

  modifier = (...args) => {
    this.setState(...args)
  }

  changeProject = async (id, datasource_id, datasource_name) => {
    let { datasourceList } = this.state
    let projectList = deepCopy(this.state.projectList)
    let rmd = _.remove(projectList, p => p.id === id)
    projectList = [...rmd, ...projectList]

    if (datasource_name) {
      let projectInfo = await Fetch.get('/app/project/info', { datasource_name })
      if (projectInfo?.result?.model?.id) id = projectInfo?.result?.model?.id
    }

    if (!id) return
    //changeCurrentProject真正起作用的地方
    ls.set(
      getProjListLSId,
      projectList.map(p => p.id)
    )
    ls.set(getCurrentProjLSId, id)
    ss.set(getCurrentProjLSId, id) // 刷新页面时优先读取当前 session 的 id
    // 切换项目后之前项目的分群无意义，清除
    ls.set('current_common_usergroup_id', '')
    if (this.props.location.query.usergroup_id) {
      this.changeUrl({
        usergroup_id: ''
      })
    }

    let proj = _.find(projectList, { id }) || {
      datasource_id
    }
    let datasourceCurrent = _.find(datasourceList, {
      id: proj.datasource_id
    }) || {
      id: datasource_id
    }

    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload: {
        projectCurrent: proj,
        datasourceCurrent
      }
    })
    return new Promise(resolve => {
      this.setState(
        {
          projectCurrent: proj,
          datasourceCurrent,
          projectList
        },
        resolve
      )
    })
  }

  checkServerTime = () => {
    //检查服务器时间
    let now = new Date().getTime()
    let serverTime1 = new Date(window.sugo.serverTime).getTime()
    let serverTime2 = new Date(parseInt(ls.gets('serverTime') || new Date('1970-01-01').getTime(), 10)).getTime()
    let serverTime = serverTime1 > serverTime2 ? serverTime1 : serverTime2
    let diff = Math.abs(now - serverTime)
    //超过10分钟差距，提醒用户
    if (diff > 1000 * 60 * 10) {
      notification.warn({
        message: '您的系统时间与服务器差距较大',
        description: '这可能会影响数据分析结果，建议调整您的系统时间',
        duration: 14
      })
    }
  }

  checkLogin() {
    if (!window.sugo.user) {
      return browserHistory.push('/')
    } else if (this.props.location.pathname === '/console') {
      browserHistory.replace(firstMenuPath)
    }
  }

  notifyResize = (timer = 500) => {
    setTimeout(() => window.dispatchEvent(new CustomEvent('resize')), timer)
  }

  onToggleMenuCompact = () => {
    //trigger window resize
    this.notifyResize()
    this.setState({
      compactMenu: !this.state.compactMenu
    })
  }

  onMenuChange = path => {
    this.setState({
      selectMenu: path
    })
  }

  //change url
  changeUrl = (queryObj, action = 'push', props = this.props) => {
    if (action === 'remove' || action === 'removeByReplace') {
      // 删除query中的参数 queryObj=[key1,key2,...]
      const location = Object.assign({}, browserHistory.getCurrentLocation())
      _.each(queryObj, q => delete location.query[q])
      if (action === 'removeByReplace') {
        browserHistory.replace(location)
      } else {
        browserHistory.push(location)
      }
      return
    }
    let newLoc = deepCopy(_.pick(props.location, ['pathname', 'query']))
    Object.assign(newLoc.query, queryObj)
    browserHistory[action](newLoc)
  }

  renderLoading = () => {
    return <p className='pd3 aligncenter'>加载中...</p>
  }

  toggleHide = () => {
    let hideHelpIcon = !this.state.hideHelpIcon
    this.setState({
      hideHelpIcon
    })
    ls.set(controlIconId, hideHelpIcon)
  }

  renderControl = () => {
    let { hideHelpIcon } = this.state
    let type = hideHelpIcon ? 'caret-left' : 'caret-right'
    let title = hideHelpIcon ? '显示' : '隐藏'
    return (
      <Tooltip title={title}>
        <LegacyIcon type={type} className='pointer block mg2t' onClick={this.toggleHide} />
      </Tooltip>
    )
  }

  renderContent = (childrenWithProps, projectList, loadingProject) => {
    if (loadingProject || projectList.length || checkPathShouldHideProjectMenu(this.props.location.pathname)) {
      return childrenWithProps
    }

    return (
      <div className='relative height-100'>
        <div className='center-of-relative aligncenter pd3'>
          <p>
            <img src={`${urlBase}/ui-nothing.png`} alt='' className='iblock' />
          </p>
          {canAddProj && !loadingProject ? (
            <div className='pd3'>
              目前还没有可用项目，请到 <b>[数据管理->项目列表]</b> 检查项目是否授权或者隐藏.
              <p className='pd2t'>
                <Link to='/console/project'>
                  <Button type='primary' className='mg1l'>
                    前往项目列表
                  </Button>
                </Link>
              </p>
            </div>
          ) : (
            <div className='aligncenter pd3'>目前还没有可用项目，请联系管理员</div>
          )}
        </div>
      </div>
    )
  }
  toggleCol = () => {
    this.setState({
      closeMenu: !this.state.closeMenu
    })
  }

  render() {
    let { menus, compactMenu, subMenus, hideHelpIcon, selectMenu, projectList, loadingProject, projectCurrent, datasourceCurrent, datasourceList } = this.state
    const { taskFullscreen } = this.props
    //无角色用户
    const {
      user: { SugoRoles }
    } = window.sugo
    if (!SugoRoles || !SugoRoles.length) {
      return (
        <div className='pd3 aligncenter'>
          <h3>
            您的账户已经建立，不过还没有分配权限，暂时不能使用任何功能，请联系系统管理员分配权限之后重新登录
            <a href='/logout'>
              <Button type='primary' className='mg1l'>
                注销登录
              </Button>
            </a>
          </h3>
        </div>
      )
    }

    let { location, selectItem = [] } = this.props
    let { modifier } = this
    let headerProps = {
      menus,
      compactMenu,
      firstMenuPath,
      location,
      modifier,
      selectMenu,
      loadingProject,
      projectList,
      datasourceList,
      projectCurrent,
      datasourceCurrent,
      changeProject: this.changeProject,
      onMenuChange: this.onMenuChange
    }

    let asideProps = {
      projectCurrent,
      subMenus,
      compactMenu,
      onToggleMenuCompact: this.onToggleMenuCompact,
      location,
      onMenuChange: this.onMenuChange
    }

    let { hideLeftNavigator = getSessionStorage('hideLeftNavigator'), hideTopNavigator = getSessionStorage('hideTopNavigator') } = (location && location.query) || {}
    let shouldHideSubmenu = (!enableNewMenu && subMenus.length < 2) || checkMenuSouldHideSideNav(location.pathname) || hideLeftNavigator

    let shouldHideProjectSelectorAndService = _.get(location, ['query', 'isSharePage'])

    let cls = classNames('contain', {
      compact: compactMenu,
      'hide-left-menu': shouldHideSubmenu || isInIframe
    })

    let mainTimeDimName =
      projectCurrent.access_type === AccessDataType.MySQL
        ? _.get(datasourceCurrent, 'params.dbConnectionInfo.db_time_dim_name') // 有可能无时间列，不需要默认值
        : projectCurrent.access_type === AccessDataType.Tag
        ? null
        : '__time'

    const props = _.omit(this.props, 'children')

    const { tagProject, tagDatasource } = getCurrentTagProject(projectList, projectCurrent, datasourceList, datasourceCurrent)

    Object.assign(props, {
      projectList,
      datasourceList,
      projectCurrent,
      loadingProject,
      datasourceCurrent,
      tagProject,
      tagDatasource,
      mainTimeDimName,
      changeUrl: this.changeUrl,
      changeProject: this.changeProject,
      stateModifier: this.modifier
    })
    const childrenWithProps = React.Children.map(this.props.children, child => React.cloneElement(child, { ...props }))
    let { Provider: ProjectInfoProvider } = getContextByName(ContextNameEnum.ProjectInfo)
    // TODO
    // 是否显示新版左边菜单
    const fixLeftMenu = () => {
      if (!isInIframe) {
        if (enableNewMenu) {
          if (selectItem.length) {
            return <LeftMenu location={location} menus={menus} toggleCol={this.toggleCol} />
          }
        } else {
          return <SubMenu {...asideProps} />
        }
      }
      return ''
    }
    //控制显示隐藏左边主题内容的宽度
    const fixWidth = () => {
      if (enableNewMenu) {
        if (selectItem.length) {
          return 'ico-new-control'
        } else {
          return 'ico-new-control-hide'
        }
      } else {
        return ''
      }
    }
    return (
      <div className={cls}>
        {isInIframe || hideTopNavigator || taskFullscreen ? null : enableNewMenu ? <NewHeader {...headerProps} /> : <Header {...headerProps} />}
        {fixLeftMenu()}
        {enableProjectSelectDrawer === true ? shouldHideProjectSelectorAndService ? null : <ProjectSelectDrawer {...headerProps} /> : null}
        <div
          className={`contain-docs-main ${fixWidth()}${this.state.closeMenu ? ' ico-new-control-min' : ''}`}
          style={{
            minHeight: hideTopNavigator ? '100%' : 'calc(100% - 48px)'
          }}
        >
          <div
            className={`${taskFullscreen ? 'height-100' : 'main-content'} `} // 根据taskFullscreen 动态设置高度
            id='main-content'
            style={hideTopNavigator ? { height: '100%' } : undefined}
          >
            <ProjectInfoProvider
              value={{
                loadingProject,
                projectCurrent,
                datasourceCurrent,
                mainTimeDimName,
                projectList,
                datasourceList,
                tagProject,
                tagDatasource
              }}
            >
              {this.renderContent(childrenWithProps, projectList, loadingProject)}
            </ProjectInfoProvider>
          </div>
        </div>

        <ZoomWarn />

        {shouldHideProjectSelectorAndService ? null : (
          <div className={`icon-control-wrap ${hideHelpIcon ? 'hide-help-icon' : ''}`}>
            <HelpLink location={location} />
            <CustomerService />
            {qqCustomerServiceUrl || showHelpLink || customerServicePhoneNumber ? this.renderControl() : null}
          </div>
        )}
      </div>
    )
  }
}
