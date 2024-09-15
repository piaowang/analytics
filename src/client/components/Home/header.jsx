/* eslint-disable react/jsx-no-target-blank */
import React from 'react'
import { Dropdown, Input, Menu } from 'antd'
import Icon from '../Common/sugo-icon'
import classNames from 'classnames'
import _ from 'lodash'
import Link from '../Common/link-nojam'
import ProjectSelect from './project-select'
import { docUrl } from './common'
import { checkPermission } from '../../common/permission-control'
import './header.styl'
import { browserHistory } from 'react-router'
import AsyncTaskRunner from '../Common/async-task-runner'
import { getPortals } from '../Portals/portals-query-helper'
import { getPortalPages } from '../Portals/portal-pages-query-helper'
import { PORTAL_PAGES_TYPE_ENUM } from '../Portals/constants'
import { get as getSessionStorage } from '../../common/session-storage'
import { Anchor } from '../Common/anchor-custom'

let userUrl = '/console/security/user'
let roleUrl = '/console/security/role'
let logUrl = '/console/operate-log'
let checkUrl = '/console/data-checking'
let canManageSelf = checkPermission('get:/console/profile') // 由于单点登录，管理员也不一定有此权限
let canInstitutions = checkPermission('get:/console/institutions-manager')
let canManageCompany = checkPermission('get:/console/company') // 由于单点登录，管理员也不一定有此权限
let canManageUser = checkPermission(userUrl)
let canManageRole = checkPermission(roleUrl)
let canManageLog = checkPermission(logUrl)
let canManageCheck = checkPermission(checkUrl)
let canManageDepartments = checkPermission('get:/console/departments')
const MenuItem = Menu.Item
const MenuItemGroup = Menu.ItemGroup
let { Search } = Input
let savedWidth = 465 + 146

// 切换项目菜单改为右侧抽屉面板
const { enableProjectSelectDrawer = false } = window.sugo

export default class Header extends React.Component {
  state = {
    menuAvalWidth: 100,
    showSearch: false
  }

  componentDidMount() {
    window.addEventListener('resize', this.onResizeWindow)
    this.onResizeWindow()

    //地址栏带个datasource_name参数就自动帮选项目 给运营用的
    let datasource_name = _.get(this.props, 'location.query.datasource_name')
    if (datasource_name) {
      this.props.changeProject('', '', datasource_name)
    }
  }

  componentDidUpdate(nextProps) {
    if (!_.isEqual(this.props, nextProps)) {
      const { pathname } = browserHistory.getCurrentLocation()
      this.setState({
        showSearch: pathname === '/console/portal/search' ? false : true
      })
    }
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.onResizeWindow)
  }

  onResizeWindow = _.throttle(() => {
    const w = window.innerWidth > 1160 ? window.innerWidth : 1160
    let data = {
      menuAvalWidth: w - savedWidth
    }
    if (this.refs.headerRight) {
      data.topMaxWidth = window.innerWidth - this.refs.headerRight.offsetWidth - 10
    }
    if (this.refs.topMenus) {
      data.topWidth = this.refs.topMenus.offsetWidth + 120
    }
    this.setState({
      ...data
    })
  }, 200)

  checkActive = children => {
    let { pathname } = this.props.location
    if (pathname === '/console') {
      pathname = this.props.firstMenuPath
    }
    return _.find(children, o => o.path && pathname.includes(o.path))
  }

  renderMenus = menus => {
    let { menuAvalWidth } = this.state
    let { onMenuChange } = this.props
    let len = menus.length
    let mg = (menuAvalWidth - 97 * len) / (len - 1)
    if (mg < 0) {
      mg = 0
    } else if (mg > 20) {
      mg = 20
    }
    let rest = menuAvalWidth - 97 * len - mg * (len - 1)
    if (rest < 0) {
      rest = 0
    } else if (rest > 97) {
      rest = 97
    }
    return (
      <span className='top-menus' ref='topMenus'>
        {menus.map((menu, index) => {
          let n = Math.floor(this.state.topMaxWidth / 99)
          if (n === index + 1) {
            return <span key={index + 'k'}>...</span>
          } else if (index >= n) {
            return null
          }
          let { title, children } = menu
          let cls = classNames('top-menu block', {
            active: this.checkActive(children)
          })
          let ch = _.find(children, p => p.path && !p.hide)
          if (!ch) return null
          let path = ch.enableURLTemplate ? _.template(ch.path)(this.props) : ch.path
          let style = {
            marginRight: index === len - 1 ? 0 : mg,
            marginLeft: index ? 1 : rest
          }
          let visibleChild = children.filter(c => c && !c.hide)
          let overlay = (
            <Menu selectedKeys={[this.props.selectMenu]}>
              {visibleChild
                // 屏蔽空的组的标题
                .filter((c, idx, arr) => {
                  return !(c.type === 'label' && (_.get(arr, [idx + 1, 'type']) === 'label' || idx === arr.length - 1))
                })
                .map((child, i) => {
                  let { path, title, icon = 'bars', type, query = '', className = '', style = {} } = child
                  if (type === 'label') {
                    return <MenuItemGroup className='ignore-mouse header-menu-grouplabel' key={i + title} title={<div className='header-menu-txt'>{title}</div>} />
                  } else if (child.target === '_blank' || child.enableURLTemplate) {
                    // target="_blank" 为自定义超链接
                    let url = child.enableURLTemplate ? _.template(child.path)(this.props) : child.path
                    if (!url) {
                      return null
                    }
                    return (
                      <MenuItem key={path + query} className={className} style={style}>
                        <Anchor href={url + query} key={title} style={{ ...style }} target='_blank' className='block header-menu-item pd2l'>
                          <Icon type={icon} className='mg1r' /> {title}
                        </Anchor>
                      </MenuItem>
                    )
                  }
                  return (
                    <MenuItem key={path + query} className={className} style={style}>
                      <Link to={path + query} onClick={onMenuChange} className='block header-menu-item'>
                        <Icon type={icon} className='mg1r' /> {title}
                      </Link>
                    </MenuItem>
                  )
                })}
            </Menu>
          )
          // 没有子菜单的情况
          if (visibleChild.length === 1) {
            // target="_blank" 为自定义超链接
            let [child] = visibleChild
            if (child.target === '_blank') {
              let url = child.enableURLTemplate ? _.template(child.path)(this.props) : child.path
              if (!url) {
                return null
              }
              return (
                <Anchor href={url} key={title} className={cls} style={style} target='_blank'>
                  {child.title || title}
                </Anchor>
              )
            }
            return (
              <Link to={path} key={title} className={cls} style={style} onClick={onMenuChange}>
                {child.title || title}
              </Link>
            )
          }
          return (
            <Dropdown overlay={overlay} key={title} placement='bottomLeft'>
              {ch.target === '_blank' ? (
                <Anchor href={path} className={cls} style={style} target='_blank'>
                  {title}
                </Anchor>
              ) : (
                <Link to={path} className={cls} style={style} onClick={onMenuChange}>
                  {title} <Icon type='down' />
                </Link>
              )}
            </Dropdown>
          )
        })}
      </span>
    )
  }

  renderUserMenu = () => {
    let { user, companyManage, hideCompanyManage, hideDepartmentManage, hideUserManagement } = window.sugo
    let {
      company: { is_root },
      username,
      type,
      SugoRoles
    } = user

    let array = []

    if (canManageSelf) {
      array.push({
        to: '/console/profile',
        title: '编辑个人信息'
      })
    }
    if (type === 'built-in' && canManageCompany && !hideUserManagement) {
      array.push({
        to: '/console/company-info',
        title: '编辑企业信息'
      })
    }
    //作为门户系统时 和配置不需要显示右边菜单时 不显示下拉菜单
    const flag = !_.get(window.sugo, 'microFrontendUrlMap.sugo-portal-app') && !_.get(window.sugo, 'hideRightMenu')

    if (flag) {
      if (canInstitutions) {
        array.push({
          to: '/console/institutions-manager',
          title: '机构管理'
        })
      }
      if (is_root && companyManage && canManageCompany && _.find(SugoRoles, sr => sr.type === 'built-in')) {
        array.push({
          to: '/console/company',
          title: '企业管理'
        })
      }
      if (hideCompanyManage && canManageUser) {
        array.push({
          to: userUrl,
          title: '用户管理'
        })
      }
      if (_.get(window.sugo, 'enableDataChecking', false) && hideCompanyManage && canManageCheck) {
        array.push({
          to: checkUrl,
          title: '数据审核'
        })
      }
      if (hideCompanyManage && canManageRole) {
        array.push({
          to: roleUrl,
          title: '角色管理'
        })
      }
      if (!hideDepartmentManage && canManageDepartments) {
        array.push({
          to: '/console/departments',
          title: '部门管理'
        })
      }
      if (hideCompanyManage && canManageLog && !hideUserManagement) {
        array.push({
          to: logUrl,
          title: '操作日志管理'
        })
      }
    }

    let menu = (
      <Menu>
        {array.map(menu => {
          let { to, title } = menu
          return (
            <MenuItem key={to}>
              <Link to={to}>{title}</Link>
            </MenuItem>
          )
        })}
        <MenuItem key='logout'>
          <a href='/logout'>
            <Icon type='logout' /> 注销登录
          </a>
        </MenuItem>
      </Menu>
    )
    return (
      <Dropdown overlay={menu} placement='bottomLeft'>
        <Link to='/console/profile' className='user-link itblock pd2x'>
          <span className='iblock mw120 elli alignright' title={username}>
            <b>{username}</b> <Icon type='down' />
          </span>
        </Link>
      </Dropdown>
    )
  }

  //渲染额外链接，目前仅仅无限极用到
  renderExtraLinks = () => {
    let { extraLinks = [] } = window.sugo
    return extraLinks.map(link => {
      let { href, text, target } = link
      return (
        <a href={href} title={text} key={href + text} target={target} className='top-menu'>
          {text}
        </a>
      )
    })
  }

  renderConsoleHeader = () => {
    let { menus, firstMenuPath } = this.props
    let { cdn, siteName, mainLogoName } = window.sugo
    let logoUrl = mainLogoName.includes('/') ? `${cdn}${mainLogoName}` : `${cdn}/static/images/${mainLogoName}`
    if (_.startsWith(mainLogoName, 'http')) {
      logoUrl = mainLogoName
    }
    return (
      <div className='fix' id='main-header'>
        <span className='top-content' style={{ maxWidth: this.state.topMaxWidth }}>
          <Link className='iblock logo-wrap' to={firstMenuPath} title={siteName}>
            {mainLogoName ? <img className='iblock logo-img' src={logoUrl} alt='' /> : null}
          </Link>
          {this.renderMenus(menus)}
          {this.renderExtraLinks()}
        </span>
        {this.state.showSearch && _.get(window.sugo, 'microFrontendUrlMap.sugo-portal-app') ? (
          <Search
            onSearch={v => {
              browserHistory.push(`/console/portal/search?value=${v}`)
            }}
            className='my-search'
            placeholder='搜索'
            prefix={<Icon type='search' style={{ color: '#BFBFBF' }} />}
            style={{ width: '240px', height: '32px', position: 'absolute', right: '205px', top: '0px', bottom: '0px', margin: 'auto' }}
          />
        ) : null}
        <span className='absolute right0 top0' ref='headerRight'>
          {enableProjectSelectDrawer === true ? null : <ProjectSelect {...this.props} />}
          {!docUrl ? null : (
            <Anchor href={docUrl} className='iblock font16 color-white hover-color-ddd' target='_blank' title='查看帮助文档'>
              <Icon type='sugo-help' />
            </Anchor>
          )}
          {this.renderUserMenu()}
        </span>
      </div>
    )
  }

  renderPortalHeader = fromPortal => {
    let { firstMenuPath, location } = this.props
    let { logo_place_title = '', siteName } = window.sugo

    return (
      <AsyncTaskRunner
        args={[fromPortal]}
        task={async basePath => {
          let portals = await getPortals({ basePath, pageSize: 1 })
          const currentPortal = _.first(portals)
          if (!currentPortal) {
            return null
          }
          let pages = await getPortalPages(currentPortal.id, { type: PORTAL_PAGES_TYPE_ENUM.home, pageSize: 1 })
          return _.first(pages)
        }}
      >
        {({ result: currPage }) => {
          const { siteName: portalSiteName, logoImg } = currPage?.params || {}
          const homePageUrl = (fromPortal && `/${fromPortal}`) || firstMenuPath
          const portalTitle = portalSiteName || logo_place_title || siteName
          return (
            <div className='fix' id='main-header'>
              <span className='pd2l'>
                {logoImg ? <img className='iblock logo-img' src={logoImg} alt='' /> : null}

                <Link className='iblock' to={homePageUrl} title={portalTitle}>
                  <span
                    style={{
                      background: 'linear-gradient(to bottom, #FFFFFF, #A2B0D7)',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                      fontSize: '16px',
                      fontWeight: '600',
                      paddingLeft: '20px'
                    }}
                  >
                    {portalTitle}
                  </span>
                </Link>
                <span className='font16'>{_.get(location, 'query.headTitle', '')}</span>
                <a href={homePageUrl} className='iblock font14 color-white right0 absolute pd3r'>
                  返回首页
                </a>
              </span>
            </div>
          )
        }}
      </AsyncTaskRunner>
    )
  }

  render() {
    let fromPortal = getSessionStorage('fromPortal')
    if (fromPortal) {
      return this.renderPortalHeader(fromPortal)
    }
    return this.renderConsoleHeader()
  }
}
