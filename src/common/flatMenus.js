import _ from 'lodash'

// 全局变量缓存扁平菜单配置，避免重复调用递归
let flatNewMenus = []

/*扁平化菜单，可获取里面的某个属性值
  type：true获取扁平化菜单， false获取parameter属性值
*/
export function flatMenusTypeFn(arr, parameter='path', type=false, flatMenusType=[]){
  arr.map( i => {
    if (!_.isEmpty(i.children)) {
      return flatMenusTypeFn(i.children, parameter='path', type=false, flatMenusType)
    }
    // if (i.hide) return
    flatMenusType.push(type ? i : i[parameter])
  })
  return flatMenusType
}

export default function getNewFlatMenus (menus, type) {
  if (flatNewMenus.length === 0) {
    flatNewMenus = flatMenusTypeFn(menus, type)
  }
  return flatNewMenus
}
