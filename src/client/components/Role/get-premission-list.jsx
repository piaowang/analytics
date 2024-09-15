import menuData from '../Home/new-menu-data'
let pmList = []
function getPermissionList(permissions = []) {
  pmList = []
  permissions.forEach(item => {
    if (item.menusCate && item.menusCate.length) {
      const inMenusDate = findData(menuData(), item.menusCate)
      if(inMenusDate){
        if(pmList.length === 0) pmList.push({title:inMenusDate[0].title,key: randomNum()})
        pushData(pmList, inMenusDate,0 , item)
      }
    }
  })
  return pmList
}
//生成唯一标识
function randomNum() {
  const t = new Date().getTime()
  const n = Math.ceil(Math.random()*1000)
  return n+t
}
//递归查找满足条件的层级数据
/**
 * 
 * @param {*} data 需要查找的数组
 * @param {*} p 层级数据 [{一级对象},{二级对象},{三级对象}]
 * @param {*} key 判断层级的位置
 * @param {*} arr 找到返回的数据
 */
function findData(data = [], p = [], key = 0, arr = []) {
  for (let i = 0; i < data.length; i++) {
    if (data[i].title === p[key]) {
      arr.push({ ...data[i], index: i })
      if( key === p.length-1) return arr
      if (data[i].children) {
        const returnArr = findData(data[i].children, p, key + 1, arr)
        if(returnArr) return returnArr
      } else {
        if (p.length === key) {
          return arr
        }
      }
    }
    if (i === data.length - 1) return false
  }
}
//递归生成有权限的四维数组
/**
 * 
 * @param {*} pmList 需要匹配的数组
 * @param {*} inMD 层级数据
 * @param {*} k 判断层级的位置
 * @param {*} item 满足条件的数据
 */
function pushData(pmList,inMD,k=0,item) {
  for (let i = 0; i < pmList.length; i++) {
    if (pmList[i].title === inMD[k].title) {
      if( k === inMD.length-1){
        if(pmList[i].api){
          pmList[i].api.push({title:item.title,id:item.id,key:randomNum()})
          
        }else{
          pmList[i].api = [{title:item.title,id:item.id,key:randomNum()}]
        }
        const newArr = new Set(pmList[i].api)
        pmList[i].api = [...newArr]
        return pmList[i]
      } 
      if (!pmList[i].children) {
        pmList[i].children = [{title:inMD[k+1].title,key:randomNum()}]
      }
      const addArr = pushData(pmList[i].children, inMD, k + 1, item)
      if(addArr) return pmList[i]
      
    }
    if (i === pmList.length - 1){
      pmList.push({title:inMD[k].title,key:randomNum()})
      const fristaddArr = pushData(pmList, inMD, k, item)
      if(fristaddArr) return pmList
    }
  }
}
export default getPermissionList
