import _ from 'lodash'

export function genSortedOrder(options, orders){
  // pendingOrder: [{id, visible}], 有排序的排在前面，没有排序的在后面
  let opDict = _.keyBy(options || [], o => o.name)

  let pendingOptions = (orders || []).map(o => {
    let visible = !_.startsWith(o, 'hide:')
    return {
      id: visible ? o : o.substr(5),
      visible
    }
  }).filter(po => opDict[po.id])

  // 不存在于顺序列表里面的 option，可能是新建的 option，也要加入列表
  let notInOrderOptions = _.difference(_.keys(opDict), pendingOptions.map(po => po.id))
  let unsorted = notInOrderOptions.map(id => ({id, visible: true})).concat(pendingOptions)
  let displayKeys = _.filter(unsorted, po => po.visible)

  return displayKeys.map((d) => opDict[d.id])
}


