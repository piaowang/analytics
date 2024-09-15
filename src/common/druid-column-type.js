import _ from 'lodash'
import {DimensionParamsTypes} from './dimension-params-type'

export const MultipleValuesTypeOffset = 100

/** 自助分析显示维度类型图标 */
export const DruidColumnTypeIcon = {
  0: 'sugo-number',
  1: 'sugo-float',
  2: 'sugo-string',
  3: 'sugo-time',
  4: 'sugo-time',
  5: 'sugo-number',
  6: 'sugo-text',
  7: 'sugo-float',
  8: 'sugo-float',

  102: 'sugo-string'
}

/** 前端数据存的维度类型 */
const DruidColumnType = {
  Long: 0,
  Float: 1,
  String: 2,
  DateString: 3,
  Date: 4,
  Int: 5,
  Text: 6,
  Double: 7,
  BigDecimal: 8,
  // 多值列
  LongArray: 100,
  FloatArray: 101,
  StringArray: 102,
  DateArray: 104,
  IntArray: 105,
  DoubleArray: 107
}

export default DruidColumnType

/**
 * 端数据库存储类型与后端（druid里维度）类型对应关系
 * 后端类型：int|long|float|date\string
 * dateString => string
 */
export const DRUID_DIMENSION_MAP = {
  int: 'int',
  long: 'long',
  float: 'float',
  string: 'string',
  dateString: 'string',
  date: 'date',
  text: 'string',
  double: 'double',
  bigdecimal: 'bigdecimal'
}

/** 数据上报时，数据类型简写 */
export const DIMENSION_TYPES_MINI_MAP = {
  int: 'i',
  long: 'l',
  float: 'f',
  date: 'd',
  string: 's',
  text: 't',
  double: 'p',
  bigdecimal: 'f'
}

/** 自助分析显示维度类型映射 */
export const DruidColumnTypeInverted = {
  0: 'number',
  1: 'number',
  2: 'string',
  3: 'datestring',
  4: 'date',
  5: 'number',
  6: 'string',
  7: 'number',
  8: 'number',

  100: 'numberArray',
  101: 'numberArray',
  102: 'stringArray',
  104: 'dateArray',
  105: 'numberArray',
  107: 'numberArray'
}

/**
 * Druid segementMetaQuery返回数据对应的维度类型
 */
export const DruidNativeType = {
  0: 'LONG',
  1: 'FLOAT',
  2: 'STRING',
  3: 'STRING',
  4: 'DATE',
  5: 'INT',
  6: 'TEXT',
  7: 'DOUBLE',
  8: 'BIGDECIMAL',

  100: 'LONG',
  101: 'FLOAT',
  102: 'STRING',
  104: 'DATE',
  105: 'INT',
  107: 'DOUBLE'
}

export const DruidType = {
  0: 'NUMBER',
  1: 'NUMBER',
  2: 'STRING',
  3: 'STRING',
  4: 'TIME',
  5: 'NUMBER',
  6: 'STRING',
  7: 'NUMBER',
  8: 'NUMBER',

  100: 'NUMBER',
  101: 'NUMBER',
  102: 'STRING',
  104: 'TIME',
  105: 'NUMBER',
  107: 'NUMBER'
}

export function isUserTagGroupDimension(dbDim) {
  return _.startsWith(dbDim.name, '_userTagGroup_')
}

export function isDesensitizDimension(dbDim) {
  return _.get(dbDim, 'tag_extra.is_Desensitiz') === '1'
}

export function isTimeDimension(dbDim) {
  return dbDim.name === '__time' || dbDim.type === DruidColumnType.DateString || dbDim.type === DruidColumnType.Date
}

export function isNumberDimension(dbDim) {
  return isIntDimension(dbDim) || isFloatDimension(dbDim)
}

export function isTextDimension(dbDim) {
  return dbDim.type === DruidColumnType.Text
}

export function isIntDimension(dbDim) {
  return dbDim.type === DruidColumnType.Int || dbDim.type === DruidColumnType.Long
}

export function isFloatDimension(dbDim) {
  return dbDim.type === DruidColumnType.Float
    || dbDim.type === DruidColumnType.Double
    || dbDim.type === DruidColumnType.BigDecimal
}

export function isGroupDimension(dbDim) {
  return dbDim.params.type === DimensionParamsTypes.group
}

export function isCalcDimension(dbDim) {
  return dbDim.params.type === DimensionParamsTypes.calc
}

export function isCastDimension(dbDim) {
  return dbDim.params.type === DimensionParamsTypes.cast
}

export function isBusinessDimension(dbDim) {
  return dbDim.params.type === DimensionParamsTypes.business
}

export function isCustomDimension(dbDim) {
  return isGroupDimension(dbDim) || isCalcDimension(dbDim) || isCastDimension(dbDim)
}

export function isStringDimension(dbDim) {
  return dbDim.type === DruidColumnType.String || dbDim.type === DruidColumnType.StringArray
}

export function isCharDimension(dbDim) {
  return isStringDimension(dbDim) || isTextDimension(dbDim)
}
