import { APP_TYPE } from '../constants'
import { escapeForRegex } from '../../../../common/sugo-utils'

/**
 * 生成同类层级
 * @param {*} appType event类型
 * @param {*} similarPath 同类path
 */
export function getEventSimilarData(eventType, similarPath) {
  if (eventType === APP_TYPE.android) {
    return JSON.parse(similarPath).map((p, i) => ({ text: `第${i}层`, index: i, checked: p.index === -1 }))
  }
  if (eventType === APP_TYPE.ios) {
    // 找出路径中 带有[]定位元素的控件 选择替换为[*]
    const commonCount = similarPath.split('/').filter(_.identity).filter(p => p.indexOf('[') < 0).length
    const data = similarPath
      .split('/')
      .filter(_.identity)
      .filter(p => p.indexOf('[') > 0)
    return data.map((p, i) => ({ text: `第${i}层`, index: i + commonCount, checked: p.indexOf('[*]') > 0 }))
  }
  if (eventType === APP_TYPE.h5) {
    let data = JSON.parse(similarPath).path
    data = data.split('>')
    // 根据 > 拆分路径, 如果包含:nth-child(n) 当前层，路径中包含 ‘ &’ 样式被勾选
    return data.map((p, i) => {
      const checked = p.indexOf(':nth-child(n)') > 0
      const display = checked || p.search(/:nth-child\([0-9]*\)/) > 0 || p.indexOf('.') > 0
      const classChecked = display ? p.indexOf(' &') > 0 : false
      const path = classChecked ? p.split(' &')[0] : p.split('.')[0]
      return {
        text: p,
        index: i,
        path,
        checked,
        classChecked,
        display
      }
    })
  }
}

/**
 * 选择层级 生成新的同类path
 * @param {*} eventPath 当前选中的元素路径
 * @param {*} eventType 事件类型 android h5 ios
 * @param {*} index 层级
 * @param {*} checked 选中状态
 * @param {*} similarPath h5同类path
 */
export function getSimilarNodePath(eventPath, eventType, index, checked, similarPath) {
  // android ios 同类只能选中单层,直接根据eventpath 生成同类path
  if (eventType === APP_TYPE.android) {
    let eventPaths = JSON.parse(eventPath)
    eventPaths[index].index = -1
    return JSON.stringify(eventPaths)
  }
  if (eventType === APP_TYPE.ios) {
    let eventPaths = eventPath.split('/').filter(_.identity)
    eventPaths[index] = eventPaths[index].replace(/\[(.+)\]/g, '[*]')
    return '/' + eventPaths.join('/')
  }

  if (eventType === APP_TYPE.h5) {
    let data = JSON.parse(similarPath).path
    data = data.split('>')
    if (checked) {
      // 选中状态 判断当前层级 如果使用nth-child  则将 nth-child(1) 替换为 nth-child(n) 表示当前层级被选中
      // 如果使用 class 选择器 则删除样式选择器 追加 nth-child(n) 表示当前层级被选中
      data[index] = data[index].indexOf('nth-child(') > 0
        ? data[index].replace(/:nth-child\([0-9]*\)/, ':nth-child(n)')
        : (data[index].split('.')[0] + ':nth-child(n) ')
    } else {
      // 取消层级同类 则用eventpath替换现有的 层级path
      data[index] = JSON.parse(eventPath).path.split('>')[index]
    }
    return JSON.stringify({ path: data.join('>') })
  }
}

/**
 * 勾选层级样式 生成新的同类path
 * @param {*} similarPath  当前同类path
 * @param {*} checked 选中状态
 * @param {*} index 层级
 * @param {*} className 样式名
 */
export function getSimilarNodeClassPath(similarPath, checked, index, className) {
  let data = JSON.parse(similarPath).path
  data = data.split('>')
  if (checked) {
    data[index] = data[index] + '&' + className + ' '
  } else {
    data[index] = data[index].replace(` &${className}`, '')
  }
  return JSON.stringify({ path: data.join('>') })
}
/**
 * 
 * @param {*} similarPath 同类元素path
 * @param {*} nodePath 当前元素path
 * @param {*} h5ControlClass 
 */
export function equalSimilarNode(similarPath, nodePath, h5ControlClass) {
  //a > a:nth-child(n) &.xx.yy
  //a > a:nth-child(1)
  // 匹配路径正则
  let similarArr = []
  if (typeof (similarPath) === 'string') {
    similarArr = [similarPath]
  } else {
    similarArr = _.values(similarPath)
  }

  return _.some(similarArr, (p, j) => {
    p = JSON.parse(p).path
    const similarPathArr = p.split('>')
    // 遍历替换掉勾选样式的层 生成同类paht 
    if (similarPathArr.length === nodePath.split('>').length) {
      let similar = similarPathArr.map(si => si.indexOf(' &') >= 0 ? si.split(' &')[0] : si).join('>')
      // 正则替换 nth-child 为 非> 
      similar = escapeForRegex(similar).replace(/:nth\\\-child\\\(n\\\)/g, '[^>]*')
      const similarExp = new RegExp(similar + '$')
      // 匹配
      if (similarExp.test(nodePath)) {
        // 根据同类path  获取勾选的样式 和  层级
        let similarCss = p.split('>')
        similarCss = _.map(similarCss, (r, i) => {
          if (r.search(/:nth-child\(n\)/) > 0 && r.indexOf(' &') >= 0) {
            r = _.trim(r)
            return { index: i, className: _.trim(r.substring(r.indexOf(' &') + 2)) }
          }
          return null
        }).filter(_.identity)
        let nodePathArry = []
        if (similarCss.length) {
          // 生成当前要元素的 生成每一层的完整path
          nodePathArry = nodePath.split('>').filter(_.identity)
          nodePathArry = nodePathArry.map((p, i) => {
            return _.trim(nodePathArry.slice(0, i).join('>') + (i > 0 ? '>' : '') + p)
          }).filter(_.identity)
        }
        // 匹配样式 
        return !_.some(similarCss, s => !nodePathArry[s.index] || h5ControlClass[nodePathArry[s.index]] !== s.className)
      }
      return false
    }
    return false
  })
}

// H5选择同类 默认勾选最后一层 
export function getDefaultSimilarPath(eventPath, eventPathType) {
  if (eventPathType !== APP_TYPE.h5) return eventPath
  const lastClassIndex = eventPath.lastIndexOf('.')
  const lastNthIndex = eventPath.lastIndexOf(':nth-child')
  const maxIndex = _.max([lastClassIndex, lastNthIndex])
  if (maxIndex < 0) return eventPath
  // 找到最后一个 nth-child 或者样式选择器 替换为 nth-child(n)
  const startStr = eventPath.substr(0, maxIndex)
  const endStr = eventPath.substr(maxIndex)
  return startStr + ':nth-child(n)' + (endStr.indexOf('>') > 0 ? ' ' + endStr.substr(endStr.indexOf('>')) : '"}')

}

function getTagName(path) {
  if (path.indexOf(':')) {
    return _.trim(path.substr(0, path.indexOf(':')))
  }
  if (path.indexOf('.')) {
    return _.trim(path.substr(0, path.indexOf('.')))
  }
  return _.trim(path)
}
