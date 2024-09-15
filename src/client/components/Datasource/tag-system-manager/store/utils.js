import { untypedItem } from 'common/constants'
import _ from 'lodash'

/**
 * @description 将扁平的列表对象通过key, parentKey 关系，转换为树形结构
 * @export
 * @param {Array} items
 * @param {String} key
 * @param {String} parentKey
 * @returns [{item: {}, children: [], ...}]
 */
export function convertToTreeSelectData (items = [], key, parentKey) {
  const rootKey = '-1'
  key = getter(key)
  parentKey = getter(parentKey)
  // 是否包含未分类节点
  if (!_.some(items, o => _.isEqual(o, untypedItem))) {
    items.push(untypedItem)
  }
  let nodes = items.reduce((nodes, item) => {
    nodes[key(item)] = {
      // TreeSelect => data
      key: item.id,
      value: item.id,
      title: item.name,
      ...item,
      children: []
    }
    return nodes
  }, {})
  let hasChildren = false
  do {
    nodes = Object.keys(nodes).reduce((newNodes, id) => {
      let node = nodes[id]
      let parentId = parentKey(node)
      if (parentId in nodes) {
        nodes[parentId].children.push(node)
        hasChildren = true
      } else {
        if (rootKey === parentId) {
          newNodes[id] = node
          hasChildren = false
        }
      }
      return newNodes
    }, {})
  } while (hasChildren)
  return Object.keys(nodes).map(id => nodes[id])
}

function getter(key) {
  if (typeof key === 'function') return key
  return obj => obj[key]
}

/**
 * 根据key查找标签分类树节点信息
 */
export const findTreeNode = (data, key, callback) => {
  data.forEach((item, index, arr) => {
    const isTagDimension = item.is_druid_dimension !== undefined
    const id = isTagDimension ? item.id : item.treeId
    const title = isTagDimension ? (item.title || item.name) : item.type
    item = {
      id,
      name: title,
      isTagDimension,
      ...item
    }
    if (item.id === key) {
      return callback(item, index, arr)
    }
    if (item.children) {
      return findTreeNode(item.children, key, callback)
    }
  })
}
