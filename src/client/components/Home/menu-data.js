import {checkPermission} from '../../common/permission-control'
import _ from 'lodash'
import flatMenusType from '../../../common/flatMenus.js'

//filter user routes
function menuFilter (menus) {
  let res = []
  menus.forEach(menu => {
    let children = menu.children.filter(c => {
      // 增加判断条件 支持子项目菜单为二级菜单
      // return c.microFrontend || c.type === 'label' || c.noAuth || checkPermission(c.authPermission || { path: c.path, method: 'get' })
      // !important子应用页面路由权限放到menu-data里 通过角色管理分配权限授权
      return c.type === 'label' || c.noAuth || checkPermission(c.authPermission || { path: c.path, method: 'get' })
    })
    if (children.length) res.push({...menu, children})
  })
  return res
}

const allMenus = window.sugo.menus
const subscribePath = '/console/subscribe'
const overviewPath = '/console/overview'

export const hasSubscribeLink = window.sugo.enableNewMenu 
  ? _.includes(flatMenusType(allMenus), subscribePath)
  : !!_.find(allMenus, menu => {
    return _.find(menu.children, m => m.path === subscribePath)
  })

// 现在没有概览菜单的话，概览就会显示在看版
export const hasOverviewLink = true // !!_.find(allMenus, menu => _.find(menu.children, m => m.path === overviewPath))

export default () => menuFilter(allMenus)
