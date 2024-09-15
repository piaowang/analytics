import _ from 'lodash'
import {DRUID_DIMENSION_MAP} from '../../common/druid-column-type'

const subPatternsRegex      = /%{[A-Z0-9_]+(?:[:;][^;]+?)?(?:[:;][^;]+?)?(?:[:;][^;]+?)?}/g
const subPatternGroupRegex  = /^%{([A-Z0-9_]+)(?:[:;]([^;]+?))?(?:[:;]([^;]+?))?(?:[:;]([^;]+?))?}$/

function extractFieldType(grokPattern) {
  return ((grokPattern || '').match(subPatternsRegex) || []).reduce((obj, subPattern) => {
    let m = subPattern.match(subPatternGroupRegex) // 第 1 组 ～ 第 4 组分别为：模式名，列名，类型，日期读取格式
    if (!m) {
      return obj
    }
    obj[m[2] || m[1]] = m[3] || 'string'
    return obj
  }, {})
}

const grokTypeToDruidColTypeMapper = {
  byte: DRUID_DIMENSION_MAP.int,
  boolean: DRUID_DIMENSION_MAP.string,
  short: DRUID_DIMENSION_MAP.int,
  int: DRUID_DIMENSION_MAP.int,
  long: DRUID_DIMENSION_MAP.long,
  float: DRUID_DIMENSION_MAP.double,
  double: DRUID_DIMENSION_MAP.float,
  date: DRUID_DIMENSION_MAP.date,
  datetime: DRUID_DIMENSION_MAP.date,
  string: DRUID_DIMENSION_MAP.string,
  json: DRUID_DIMENSION_MAP.string
}

function grokTypeToDruidColumnType(typeDict) {
  return _.mapValues(typeDict, grokType => {
    if (!(grokType in grokTypeToDruidColTypeMapper)) {
      throw new Error('Not support grok type: ' + grokType)
    }
    return grokTypeToDruidColTypeMapper[grokType]
  })
}

export default {
  extractFieldType,
  grokTypeToDruidColumnType
}
