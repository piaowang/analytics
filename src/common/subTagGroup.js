import _ from 'lodash'
import moment from 'moment'
import { DIMENSION_TYPES } from './constants'

export const convertSubTagToGroup = (customDimensions, dimension) => {
  const customDim = _.find(customDimensions, p => p.name === dimension.name)
  if (!_.get(customDim, 'isSubTag', false)) {
    return dimension
  }
  // if (_.get(dimensionExtraSettingDict, `${dimension.name}.numberSplitType`, '') !== 'subTag') {
  //   return dimension
  // }
  const GroupVal = _.get(customDim, 'customGroup', [])
  let itemType = _.get(dimension, 'type', -1)
  const isNumber = itemType === DIMENSION_TYPES.int
    || itemType === DIMENSION_TYPES.float
    || itemType === DIMENSION_TYPES.double
    || itemType === DIMENSION_TYPES.bigDecimal
    || itemType === DIMENSION_TYPES.long
  const isDate = itemType === DIMENSION_TYPES.date

  let groupFilters = _.keys(GroupVal).map(p => {
    const item = GroupVal[p]
    let filter = [{ type: 'in', value: item }]
    if (isNumber) {
      if (item.length === 1) {
        filter = [{ type: 'between', value: [item[0],item[0]] }]
      } else {
        let [start, end] = item
        filter = [{ type: 'between', value: [start, end] }]
      }
    } else if (isDate) {
      if (item.length === 1) {
        start = moment(item[0]).startOf('d') + 0
        end = moment(end).endOf('d') + 0
        filter = {
          'lower': 1546272000000,
          'upper': 1556640000000
        }
      }
      let [start, end] = (item.length === 1 ? [item[0], item[0]] : item)
      start = moment(start).startOf('d') + 0
      end = moment(end).endOf('d') + 0
      filter = { lower: start, upper: end }
    }
    return { rule: filter, relation: 'and', groupName: p }
  })

  return {
    ...dimension,
    type: DIMENSION_TYPES.string,
    params: {
      type: 'group',
      dimension: { 'id': dimension.id, 'name': dimension.name, 'type': dimension.type, 'title': dimension.title },
      groupFilters,
      othersGroupName: '其他'
    }
  }
}
