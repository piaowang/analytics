
import _ from 'lodash'
import { FilterOpValueMap } from './offline-calc-model-helper'
import { OfflineCalcDataSourceTypeEnum } from './constants'

export function externalDataSourceFilterToSql(filters, dbType) {
  if (!_.get(filters, '0.eq.length')) {
    return {
      sql:'',
      binds: []
    }
  }
  let profix = '?'
  if(dbType === OfflineCalcDataSourceTypeEnum.Oracle) {
    profix = ':'
  }
  const relation = _.get(filters, '0.op', 'and')
  let sql = []
  let binds = []
  _.forEach(filters[0].eq, p => {
    const subRelation = _.get(p, 'relation', 'and')
    const subSql = _.get(p, 'eq', []).map(f => {
      if (f.col === '') {
        return ''
      }
      if (f.op === 'nullOrEmpty') {
        return `${f.col} ${FilterOpValueMap[f.op]}`
      }
      const eq = _.get(f, 'eq.0', '')
      binds.push(f.op === 'contains' ? `%${eq}%` : eq)
      return `${quoteIdentifier(dbType, f.col)} ${FilterOpValueMap[f.op]} ${profix}${profix !== '?' ? binds.length : ''}`
    }).filter(_.identity).join(` ${subRelation} `)
    sql.push(`(${subSql})`)
  })
  return {
    sql: sql.join(` ${relation} `),
    binds
  }
}

export const quoteIdentifier = (dbType, str) => {
  if (!str) {
    return ''
  }
  let identifier = ''
  switch (dbType) {
    case OfflineCalcDataSourceTypeEnum.MySQL:
      identifier = '`'
      break
    case OfflineCalcDataSourceTypeEnum.Db2:
      identifier = '"'
      break
    default:
      identifier = ''
      break
  }
  return `${identifier}${str}${identifier}`
}


// 获取有权限的机构
export function getHasPromessinInstitutions(list, keys, containsMine = true) {
  let ids = keys
  if (!keys) {
    return list
  }
  if (_.isString(keys)) {
    ids = [keys]
  }
  let data = _.filter(list, p => {
    if (containsMine) {
      return _.includes(ids, p.parent) || _.includes(ids, p.id)
    }
    return _.includes(ids, p.parent)
  })
  if (!data.length) {
    return _.union(data)
  }
  const child = getHasPromessinInstitutions(list, data.map(p => p.id), false)
  return _.union(data, child)
}
