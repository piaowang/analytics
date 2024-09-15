import _ from 'lodash'
// tasks: [{'showName':'作业1','typeId':4,'id':2}, ...]
// types: [{'name':'作业树','parentId':0,'id':1}, ...]
// order: ?

// => [{key: 'xxx', title: 'xxx', parentKey: null, children: [{key, title, parentKey: 'xxx'}, ...]}]
export function makeTreeNode({types, tasks, order}) {
  // if(!types || !tasks || !order) return 
  if(!types || !tasks) return 
  let typeNodes = types.map(k => ({
    title: k.name,
    key: `type-${k.id}`,
    parentKey: k.parentId ? `type-${k.parentId}` : null,
    children: []
  }))
  let typeNodeKeyDict = _.keyBy(typeNodes, 'key')

  let treeRoot = [];

  // 插入 task
  (tasks || []).forEach(task => {
    let parentType = typeNodeKeyDict[`type-${task.typeId}`]
    let taskNodeProps = {
      title: task.showName,
      key: task.id + '',
      parentKey: parentType ? parentType.key : null
    }
    if (parentType) {
      parentType.children.push(taskNodeProps)
    } else {
      // 未分类
      treeRoot.push(taskNodeProps)
    }
  })

  // types 嵌套
  let treeUnsorted = typeNodes.reduce((arr, k) => {
    if (k.parentKey) {
      let parent = typeNodeKeyDict[k.parentKey]
      if (!parent) {
        return [...arr, k]
      }
      parent.children.unshift(k)
      return arr
    }
    return [...arr, k]
  }, treeRoot)

  let sortInfo = JSON.parse(_.get(order, 'sort') || '{}')
  return sortTree(treeUnsorted, sortInfo)
}

export function sortTree(tree, sortInfoDict) {
  function recurSort(tree, parentKey) {
    let sortDict = (sortInfoDict[parentKey] || []).reduce((acc, curr, idx) => {
      acc[curr] = idx
      return acc
    }, {})
    return _.orderBy(tree, n => sortDict[n.key]).map(n => {
      return n.children ? {...n, children: recurSort(n.children, n.key)} : n
    })
  }
  return recurSort(tree, '-1')
}

export function treeFilter(tree, predicate) {
  if (_.isEmpty(tree)) {
    return []
  }
  return tree.map(n => {
    if (n.children) {
      let filteredChildren = treeFilter(n.children, predicate)
      return !predicate(n) && _.isEmpty(filteredChildren) ? null : {...n, children: filteredChildren}
    }
    return predicate(n) ? n : null
  }).filter(_.identity)
}
