/**
 * Created on 27/02/2017.
 * @file 定义服务器接口响应统一返回结构
 */


const Type = {
  json: 'json',
  text: 'text/plain',
  xml: 'xml'
}

/**
 * 服务器接口响应统一返回结构
 * @typedef {object} ResponseStruct
 * @property {boolean} success
 * @property {*} result
 * @property {?string} message
 * @property {number} code
 * @property {string} type
 */

/**
 * 生成服务器响应数据结构类
 * @example <caption>不传参数</caption>
 * const resp = new Response()
 * resp.result = {list: [1,2,3]}
 * ctx.body = resp.serialize()
 * @class
 */
class Response {
  /**
   * @param {boolean} [success=true]
   * @param {*} [result={}}
   * @param {?string} [message=null]
   * @param {number} [code]
   * @param {string} [type='json']
   */
  constructor (success = true, result = {}, message = null, code = 200, type = Type.json) {
    this._success = void 0
    this._result = void 0
    this._message = void 0
    this._code = void 0
    this._type = void 0
    
    this.success = success
    this.result = result
    this.message = message
    this.code = code
    this.type = type
  }
  
  /** @return {boolean} */
  get success () {
    return this._success
  }
  
  /** @param {boolean} value */
  set success (value) {
    this._success = value
  }
  
  /** @return {*} */
  get result () {
    return this._result
  }
  
  /** @param {*} value */
  set result (value) {
    this._result = value
  }
  
  /** @return {?string} */
  get message () {
    return this._message
  }
  
  /** @param {?string} value */
  set message (value) {
    this._message = value
    if (value) this.success = false
  }
  
  /**
   * code 需要以后全局统一定义
   * 比如
   * <pre>1xx 表示系统级异常</pre>
   * <pre>2xx 表示业务级异常</pre>
   * 定义 code 是为了 client 端方便统一处理错误消息
   * 也为了日志规范化输出异常
   * @return {number}
   */
  get code () {
    return this._code
  }
  
  /** @param {number} value */
  set code (value) {
    this._code = value
  }
  
  /** @return {string} */
  get type () {
    return this._type
  }
  
  /** @param {string} value */
  set type (value) {
    this._type = value
  }
  
  /** @return {ResponseStruct} */
  serialize () {
    return {
      success: this.success,
      result: this.result,
      message: this.message,
      code: this.code,
      type: this.type
    }
  }
  
  /**
   * 成功响应快捷接口
   * @param {*} result
   * @return {ResponseStruct}
   */
  static ok (result) {
    return new Response(true, result).serialize()
  }
  
  /**
   * 失败响应快捷接口
   * @param {string} message
   * @return {ResponseStruct}
   */
  static fail (message) {
    return new Response(false, {}, message).serialize()
  }

  /**
   * 服务的错误信息返回定义
   * @param {string} message
   * @return {ResponseStruct}
   */
  static error (ctx, message, status = 400) {
    ctx.status = status
    return new Response(false, {}, message).serialize()
  }
}

export { Response, Type }
