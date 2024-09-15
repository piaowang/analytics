import _ from 'lodash'
import {dictBy} from '../../../common/sugo-utils'
import flatMenusType from '../../../common/flatMenus.js'

export const typeMap = {
  ['维度']: 'dimensions',
  ['指标']: 'measures',
  ['组合标签']: 'tagGroups'
}

let {menus} = window.sugo
let menuPaths = _.flatMap(menus, m => {
  return _.flatMap(m?.children?.filter(p => p.path), p => {
    return p.authPermission ? [p.authPermission.replace(/^\w+:/, ''), p.path] : p.path
  })
})

/**
 * 根据菜单的配置，筛选出可见的权限项
 * @param permissions
 * @returns {*}
 */
export function filterPermission(permissions) {
  let accessiblePathGroupDict = dictBy(permissions, p => p.path, p => p.group)
  let accessibleGroupsForCurrMenuSet = new Set(menuPaths.map(p => accessiblePathGroupDict[p]))
  return permissions.filter(p => accessibleGroupsForCurrMenuSet.has(p.group))
}
