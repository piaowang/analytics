/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   09/12/2017
 * @description Service返回内容结构定义
 */

/**
 * @typedef {object} ServiceStruct
 * @property {boolean} success
 * @property {*} result
 * @property {?string} message
 */

export class Structure {

  /**
   * 正确执行
   * @param {*} result
   * @return {ServiceStruct}
   */
  static ok(result) {
    return {
      success: true,
      message: null,
      result
    }
  }

  /**
   * 异常
   * @param message
   * @return {ServiceStruct}
   */
  static fail(message) {
    return {
      success: false,
      message,
      result: null
    }
  }
}
