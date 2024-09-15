import { APP_TYPE } from '../constants'
import { escapeForRegex } from '../../../../common/sugo-utils'
import _ from 'lodash'
/**
 * 生成同类层级
 * @param {*} eventPath eventpath
 * @param {*} similarPath 同类path
 */
export function getEventSimilarData(similarPath, eventPath, eventPathType) {
  if (eventPathType === APP_TYPE.h5) {
    let data = similarPath ? JSON.parse(similarPath).path : eventPath
    data = data.split('>')
    // 根据 > 拆分路径, 如果包含:nth-child(n) 当前层，路径中包含 ‘ &’ 样式被勾选
    const similarData = data.map((p, i) => {
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
    return {
      eventPathArr: data,
      similarData
    }
  }
  let data = similarPath ? similarPath : eventPath
  data = data.split('/')
  // 根据 > 拆分路径, 如果包含:nth-child(n) 当前层，路径中包含 ‘ &’ 样式被勾选
  const similarData = data.map((p, i) => {
    const checked = p.indexOf('[*]') > 0
    const display = checked || p.search(/\[[0-9]*\]/) > 0
    return {
      text: p,
      index: i,
      path: p,
      checked,
      classChecked: false,
      display
    }
  })
  return {
    eventPathArr: data,
    similarData
  }
}

/**
 * 选择层级 生成新的同类path
 * @param {*} eventPath 当前选中的元素路径
 * @param {*} index 层级
 * @param {*} checked 选中状态
 * @param {*} similarPath h5同类path
 */
export function getSimilarNodePath(eventPath, index, checked, similarPath, eventPathType) {
  // android ios 同类只能选中单层,直接根据eventpath 生成同类path
  if (eventPathType === APP_TYPE.h5) {
    let data = similarPath ? JSON.parse(similarPath).path : eventPath
    data = data.split('>')
    if (checked) {
      // 选中状态 判断当前层级 如果使用nth-child  则将 nth-child(1) 替换为 nth-child(n) 表示当前层级被选中
      // 如果使用 class 选择器 则删除样式选择器 追加 nth-child(n) 表示当前层级被选中
      data[index] = data[index].indexOf('nth-child(') > 0
        ? data[index].replace(/:nth-child\([0-9]*\)/, ':nth-child(n)')
        : (data[index].split('.')[0] + ':nth-child(n) ')
    } else {
      // 取消层级同类 则用eventpath替换现有的 层级path
      data[index] = eventPath.split('>')[index]
    }
    return JSON.stringify({ path: data.join('>') })
  }
  // let eventPathArr = eventPath.split('/')
  let data = similarPath ? similarPath : eventPath
  data = data.split('/')
  if (checked) {
    data[index] = data[index].replace(/\[[0-9]*\]/g, '[*]')
  } else {
    // 取消层级同类 则用eventpath替换现有的 层级path
    data[index] = eventPath.split('/')[index]
  }
  return data.join('/')
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

/**
 * 原生组件同类有效判断
 * @param {*} similarPath 同类元素path
 * @param {*} nodePath 当前元素path
 * @param {*} h5ControlClass 
 */
export function equalAndroidAndIosSimilarNode(similarPath, nodePath) {
  // 匹配路径正则
  let similarArr = []
  if (typeof (similarPath) === 'string') {
    similarArr = [similarPath]
  } else {
    similarArr = _.values(similarPath)
  }

  let nodePathArr = nodePath.split('/')
  return _.some(similarArr, (p, j) => {
    // 如果不包含同类 直接对比路径 处理[-]情况
    if (p.indexOf('[*]') < 0) {
      return nodePath === p
    }
    const similarPathArr = p.split('/')
    // 判断路径长度
    if (similarPathArr.length !== nodePathArr.length) {
      return false
    }
    const similarIndexs = similarPathArr.map((p, i) => p.indexOf('[*]') > -1 ? i : undefined).filter(_.identity)
    _.forEach(similarIndexs, index => {
      nodePathArr[index] = nodePathArr[index].replace(/\[[0-9]*\]/g, '[*]')
    })
    const newPath = nodePathArr.join('/')
    return p === newPath
  })
}

// H5选择同类 默认勾选最后一层 
export function getDefaultSimilarPath(eventPath, eventPathType) {
  if (eventPathType !== APP_TYPE.h5) return ''
  const lastClassIndex = eventPath.lastIndexOf('.')
  const lastNthIndex = eventPath.lastIndexOf(':nth-child')
  const maxIndex = _.max([lastClassIndex, lastNthIndex])
  if (maxIndex < 0) return eventPath
  // 找到最后一个 nth-child 或者样式选择器 替换为 nth-child(n)
  const startStr = eventPath.substr(0, maxIndex)
  const endStr = eventPath.substr(maxIndex)
  return startStr + ':nth-child(n)' + (endStr.indexOf('>') > 0 ? ' ' + endStr.substr(endStr.indexOf('>')) : '')
}
