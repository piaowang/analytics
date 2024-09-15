import _ from 'lodash'

/**
 * 数组上移，下移，置顶操作
 * @param {Array} data 目标数组对象
 * @param {any} currentItem 当前项
 * @param {int} currentIdx 当前项索引
 * @param {string} type ['moveUp', 'moveDown', 'moveTop', 'moveBotton']
 */
export const moveArrayPosition = (data = [], currentItem, currentIdx, type) => {
  data = _.clone(data)
  const idx = currentIdx
  const size = _.size(data)
  const swapValue = (arr, idx1, idx2) => {
    const val1 = arr[idx1]
    const [ val2 ] = arr.splice(idx2, 1, val1)
    arr[idx1] = val2
    return arr
  }
  switch (type) {
    case 'moveUp':
      if(idx !== 0) {
        swapValue(data, idx, idx - 1)
      }
      break
    case 'moveDown':
      if(idx + 1 !== size){
        swapValue(data, idx, idx + 1)
      }
      break
    case 'moveTop':
      data.splice(idx, 1)
      data.unshift(currentItem)
      break
    case 'moveBotton':
      data.splice(idx, 1)
      data.push(currentItem)
      break
  }
  return data
}
