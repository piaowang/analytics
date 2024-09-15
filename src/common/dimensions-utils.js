/**
 * Created on 12/04/2017.
 * @file 维度相关的工具类
 */

import _ from 'lodash'
import { DIMENSION_TYPES as TYPES, DIMENSION_MAP } from './constants'

const DIMENSION_MAP_INVERT = _.invert(TYPES)
// 与tables中定义的一致
// 可用字母、数字、下划线，但必须以字母或下划线开头，长度为2至50位
const NAME_REG = /^[_A-Za-z][\w\\.]{1,49}$/i

/**
 * 维度相关工具类
 * @class
 */
class Utils {
  /**
   * 检测维名是否合法。
   * 可用字母、数字、下划线，但必须以字母或下划线开头，长度为2至50位
   * @param {string} name
   * @return {boolean}
   */
  static checkName (name) {
    return NAME_REG.test(name.toString())
  }

  /**
   * <p>判断两个维度的类型是否相同<p>
   * <p>满足如下条件之一的，则表示为相同类型维度</p>
   * <ol>
   *   <li>两个维度的type相同</li>
   *   <li>一个维度的类型为dateString，例一个维度的类型为string</li>
   * </ol>
   * @param {DimensionModel} base
   * @param {DimensionModel} compare
   * @return {boolean}
   */
  static sameType (base, compare) {
    const { type: baseType } = base
    const { type: compareType } = compare

    return baseType === compareType ||
      (baseType === TYPES.dateString && compareType === TYPES.string) ||
      (compareType === TYPES.dateString && baseType === TYPES.string)
  }

  /**
   * 从两个列表中取出类型不同的维度，以name作为判断是否是相同维度的判断条件
   * @param {Array<DimensionModel>} base
   * @param {Array<DimensionModel>} compare
   * @return {Array<DimensionModel>}
   */
  static getTypeDiff (base, compare) {
    const map = Utils.nameMap(compare)

    return base.filter(d => {
      const p = map.get(d.name)
      return p && !Utils.sameType(d, p)
    })
  }

  /**
   * number维度类型转为string维度类型
   * @example
   * Utils.stringType(2) // string
   * @param {number} type
   * @return {string}
   */
  static stringType (type) {
    return DIMENSION_MAP[DIMENSION_MAP_INVERT[type]] || ''
  }

  /**
   * string维度类型转为number维度类型
   * @example
   * Utils.type('string') // 2
   * @param type
   */
  static type (type) {
    return TYPES[type]
  }

  /**
   * 生成一组维度的name映射
   * @param {Array<DimensionModel>} dims
   * @return {Map}
   */
  static nameMap (dims) {
    const m = new Map()
    dims.forEach(d => m.set(d.name, d))
    return m
  }

  /**
   * 重复的名称
   * @param {Array<String>} names
   * @return {Array<String>}
   */
  static duplicateName (names) {
    const m = new Map()
    const duplicated = []
    names.forEach(name => {
      if (m.get(name)) {
        duplicated.push(name)
      } else {
        m.set(name, true)
      }
    })
    return duplicated
  }
}

export default Utils
