import {checkPermission} from '../../common/permission-control'
const {menus, user} = window.sugo
function menuFilter (item) {
  return item.microFrontend || item.noAuth || checkPermission(item.authPermission || { path: item.path || '', method: 'get' })
}
//递归过滤
function fixdata(data) {
  const arr = data.filter((val)=>{
    if(val.children && val.children.length){
      const res = fixdata(val.children)
      val.children = res
      if(res.length){
        return true
      }
    }else{
      const aule = menuFilter(val)
      if (aule) return true
    }
    
  })
  return arr
}
export default ()=> user.type === 'built-in' ? menus : fixdata(menus)

