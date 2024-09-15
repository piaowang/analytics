import _ from 'lodash'
import moment from 'moment'

const relativeTimeTypeDefault = typeof window !== 'undefined' && _.get(window, 'sugo.relativeTimeType') || 'tool'
export const defaultFormat = () => 'YYYY-MM-DD HH:mm:ss'
export const queryDuridFormat = () => 'YYYY-MM-DD HH:mm:ss.SSS'
const spaceReg = /\s+/

// '-3 days' => ['-2 days startOf day', 'endOf day']
export function convertOldDateType(old, relativeTimeType) {
  let arr = old.split(spaceReg)
  let num = (Number(arr[0]) + 1) + ''
  let unit = arr[1] && arr[1].replace(/s$/, '')
  return [
    `${num} ${unit} startOf ${unit}`,
    relativeTimeType === 'business' ? `0 ${unit}` : `endOf ${unit}`
  ]
}

export function convertNewDateType(arr) {
  let a = arr[0].split(spaceReg)
  let num = (Number(a[0]) - 1) + ''
  let unit = a[1]
  return `${num} ${unit}`
}

function explain(str, format) {
  let arr = str.split(spaceReg)
  let m = arr.reduce((prev, curr, i, arr) => {
    if (i % 2) return prev
    if (/^\-?\d/.test(curr)) {
      return prev.add(Number(curr), arr[i + 1])
    } else {
      return prev[curr] && prev[curr](arr[i + 1])
    }
  }, moment())
  return format === 'iso'
    ? m.toISOString()
    : m?.format(format)
}

export function convertDateType(_dateType, format = defaultFormat(), relativeTimeType = relativeTimeTypeDefault) {
  if (_dateType === 'lastOneYear') return [moment().add(-1,'y').startOf('d').toISOString(), moment().toISOString()]
  try {
    let dateType = _.isString(_dateType)
      ? convertOldDateType(_dateType, relativeTimeType)
      : _dateType
    if (_.isArray(dateType)) {
      dateType = _.map(dateType, p => p.indexOf('Of week') >= 0 ? p.replace('Of week', 'Of isoweek') : p)
    }
    return dateType.map(str => explain(str, format))
  } catch (e) {
    console.error(e)
  }
  return null
}

export function isRelative(arr) {
  return arr !== 'custom' && (
    _.isString(arr) || (_.isArray(arr) && !/^\d{4}/.test(arr[0]))
  )
}

/**
 * 旧的标签筛选是一层的，但是后面需求复杂了， tagFilters 存储在分群里面是会有多层的
 * 这个函数把顶部的 and/or 筛选拆出来作为 relation，下层筛选作为旧的 tagFilters 处理
 * @param ugTagFilters
 * @returns {{relation: string, tagFilters: Array}}
 */
export function tagFiltersAdaptToOldFormat(ugTagFilters) {
  let relation = 'and'
  if (_.size(ugTagFilters) === 1 && ugTagFilters[0].op === 'or') {
    relation = 'or'
  }
  if (_.size(ugTagFilters) === 1 && (ugTagFilters[0].op === 'or' || ugTagFilters[0].op === 'and')) {
    ugTagFilters = (ugTagFilters[0].eq || []).map(subFlt => ({...ugTagFilters[0], ...subFlt}))
  }
  return {
    relation,
    tagFilters: ugTagFilters
  }
}
