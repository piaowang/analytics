import React from 'react'
import { Popover, Menu, Dropdown } from 'antd'
import Icon from '../Common/sugo-icon'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { DownOutlined, LogoutOutlined } from '@ant-design/icons'
import { Link, browserHistory } from 'react-router'
import HeaderItem from './header-item'
import { connect } from 'react-redux'
import ProjectSelect from './project-select'
import pathToRegexp from 'path-to-regexp'
import { docUrl } from './common'
import { checkPermission } from '../../common/permission-control'
import { getPortalPages } from '../Portals/portal-pages-query-helper'
import PortalsHeader from './navigation-start/portals-header'

import _ from 'lodash'
import './css/head.styl'
const MenuItem = Menu.Item

let userUrl = '/console/security/user'
let roleUrl = '/console/security/role'
let logUrl = '/console/operate-log'
let checkUrl = '/console/data-checking'

let canManageSelf = checkPermission('get:/console/profile') // 由于单点登录，管理员也不一定有此权限
let canInstitutions = checkPermission('get:/console/institutions-manager')
let canManageCompany = checkPermission('get:/console/company') // 由于单点登录，管理员也不一定有此权限
let canManageCheck = checkPermission(checkUrl) // 审核权限
let canManageUser = checkPermission(userUrl)
let canManageRole = checkPermission(roleUrl)
let canManageLog = checkPermission(logUrl)
let canManageDepartments = checkPermission('get:/console/departments')

@connect(({ sagaCommon }) => ({ sagaCommon }))
export default class Header extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      icoCtr: [],
      portalMsg: {}
    }
    const selectArr = this.findSelectItem(props.menus, props.location.pathname)
    this.selectFun(selectArr)
  }

  componentDidMount() {
    //地址栏带个datasource_name参数就自动帮选项目 给运营用的
    let datasource_name = _.get(this.props, 'location.query.datasource_name')
    if (datasource_name) {
      this.props.changeProject('', '', datasource_name)
    }
    this.portalId = localStorage.portalId || false
    if (this.portalId) {
      this.getPortal()
    }
  }

  componentWillReceiveProps(props) {
    if (props.location.pathname !== this.props.location.pathname) {
      const selectArr = this.findSelectItem(props.menus, props.location.pathname)
      this.selectFun(selectArr)
    }
  }
  async getPortal() {
    const res = await getPortalPages(this.portalId)
    const portalMsg = res.find(val => {
      return val.type === 'home'
    }).params
    this.setState({ portalMsg })
  }
  selectFun(selectArr) {
    this.props.dispatch({
      type: 'sagaCommon/changeState',
      payload: {
        selectItem: selectArr
      }
    })
  }

  // 递归查找选中的选项
  /**
   *
   * @param {Array} data 传入的数据
   * @param {String} pathname 路由名称
   * @param {Array} arr 递归到的路径
   */
  findSelectItem(data, pathname, arr = []) {
    for (let i = 0; i < data.length; i++) {
      // fix #931，数据应用中心，点击行为分析下【漏斗分析】时，变全屏了
      // path-to-regexp 默认匹配最后一个字符，生成的path最后可能带上id
      if (data[i].path && pathToRegexp(data[i].path, [], { end: false }).test(pathname)) {
        arr.push({ tit: data[i].title, index: i, path: data[i].path })
        return arr
      }
      if (data[i].children && data[i].children.length) {
        const hasFind = this.findSelectItem(data[i].children, pathname, [...arr].concat({ tit: data[i].title, index: i, path: data[i].path }))
        if (hasFind) return hasFind
      }
      if (i === data.length - 1) return false
    }
    return arr
  }
  visFun(index, val) {
    this.setState(state => {
      state.icoCtr[index] = val
      return state
    })
  }
  //选中路由
  changePopFun = path => {
    if (!path) return false
    this.setState(
      state => {
        state.icoCtr = []
        return state
      },
      () => {
        browserHistory.push(path)
      }
    )
  }
  renderUserMenu = () => {
    let { user, companyManage, hideCompanyManage, hideDepartmentManage } = window.sugo
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
    if (type === 'built-in' && canManageCompany) {
      array.push({
        to: '/console/company-info',
        title: '编辑企业信息'
      })
    }
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
    if (hideCompanyManage && canManageLog) {
      array.push({
        to: logUrl,
        title: '操作日志管理'
      })
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
            <LogoutOutlined /> 注销登录
          </a>
        </MenuItem>
      </Menu>
    )
    return (
      <Dropdown overlay={menu} placement='bottomLeft'>
        <Link to='/console/profile' className='user-link itblock pd2x'>
          <span className='iblock mw120 elli alignright' title={username}>
            <b>{username}</b> <DownOutlined style={{ fontSize: '12px', marginLeft: '5px' }} />
          </span>
        </Link>
      </Dropdown>
    )
  }
  render() {
    if (this.portalId) {
      return (
        <div className='portal-head-box'>
          <PortalsHeader {...this.state.portalMsg} isNotHome />
        </div>
      )
    }

    let { cdn, mainLogoName, enableProjectSelectDrawer = false, defaultPage } = window.sugo
    let { menus, sagaCommon } = this.props
    const selectItem = sagaCommon.selectItem || []
    let logoUrl = mainLogoName.includes('/') ? `${cdn}${mainLogoName}` : `${cdn}/static/images/${mainLogoName}`
    if (_.startsWith(mainLogoName, 'http')) {
      logoUrl = mainLogoName
    }
    return (
      <div className='top-head-box'>
        <Link className='logo-link' to={defaultPage || '/console/index'}>
          {mainLogoName ? <img className='logo-img' src={logoUrl} alt='' /> : null}
        </Link>
        <div className='h-tab-box'>
          {menus.map((data, index) => {
            return data.hide ? (
              ''
            ) : (
              <Popover
                placement='bottom'
                onVisibleChange={this.visFun.bind(this, index)}
                arrowPointAtCenter
                content={<HeaderItem data={data.children} selectItem={selectItem} dataKey={index} changePopFun={this.changePopFun} />}
                visible={this.state.icoCtr.length ? this.state.icoCtr[index] : false}
                key={index}
              >
                <span className={selectItem[0] && selectItem[0].tit === data.title ? 'item cur' : 'item'}>
                  {data.title}
                  {this.state.icoCtr[index] && <em className='i-ico' />}
                </span>
              </Popover>
            )
          })}
        </div>
        <div className='head-top-rt'>
          {!enableProjectSelectDrawer && <ProjectSelect {...this.props} />}
          {docUrl && (
            <a href={docUrl} className='iblock font16 color-white hover-color-ddd' target='_blank' title='查看帮助文档'>
              <QuestionCircleOutlined />
            </a>
          )}
          {this.renderUserMenu()}
        </div>
      </div>
    )
  }
}
