/**
 * Created by asd on 17-6-23.
 * @file client与server共用的Plywood json数据转为csv
 */

import moment from 'moment-timezone'
import * as d3 from 'd3'

/**
 * json数据类型格式化
 * @class
 */
class TypeFormatter {
  constructor () {
    this._keys = null
  }

  /**
   * @abstract
   * @param {String} key
   * @param {Object} json
   * @return {*}
   * @private
   */
  _format (key, json) {
    return json[key]
  }

  /**
   * 性能优化：
   * 1. 不做`for in`遍历
   * 2. 不做`isObject`判断
   * 3. 默认所有的json的key都一样
   * @param {Object} json
   * @return {Array}
   */
  format (json) {
    // 由于除Array与Object外，所有的参数都是copy
    // 所以此处直接传入json，避免copy
    if (this._keys === null) this.keys(Object.keys(json))
    return this._keys.map(k => {
      try {
        return this._format(k, json)
      } catch (e) {
        return ''
      }
    })
  }

  /**
   * 设置或获取keys
   * 1. 如果传入参数json，则更新this._keys
   * 2. 返回this._keys
   * @param {Array<String>} [keys]
   * @return {Array}
   */
  keys (keys) {
    return keys
      ? (this._keys = keys)
      : (this._keys || [])
  }
}

/**
 * @callback Format
 * @param {String} key
 * @param {*} value
 * @return {*}
 */

/** @type {Object<String, Format>} */
const PLYWOOD_FORMATTER = {
  TIME: function (v) {
    //noinspection JSConstructorReturnsPrimitive
    return v
  },
  STRING: function (v) {
    //noinspection JSConstructorReturnsPrimitive
    return '' + v
  },
  NUMBER(v){return v},
  NULL: function (v) {
    //noinspection JSConstructorReturnsPrimitive
    return '' + v
  },
  BOOLEAN: function (v) {
    //noinspection JSConstructorReturnsPrimitive
    return '' + v
  },
  DATASET: function (v) {
    //noinspection JSConstructorReturnsPrimitive
    return 'DATASET'
  }
}

/**
 * plywood数据格式化
 * @class
 */
class PlywoodDatumFormatter extends TypeFormatter {
  /**
   * @param {Object<String, String>} types
   * @param {Object<String, Format>} [formatter]
   */
  constructor (types, formatter = {}) {
    super()
    this._types = types
    this._formatter = { ...PLYWOOD_FORMATTER, ...formatter }
  }

  /**
   * 不同的类型使用不同的格式化函数
   * @param {String} key
   * @param {Object} json
   * @return {*}
   * @private
   * @override
   */
  _format (key, json) {
    const type = this._types[key]
    if (this._formatter[type]) {
      return this._formatter[type](json[key])
    }
    // 如果没有对应的key，则返回 ''
    return json[key] || ''
  }
}

const DEFAULT_OPTIONS = {
  translateHeader: function (v) {
    return v
  },
  separator: ',',
  eof: '\r\n',
  formatter: {}
}

/**
 * client与server同用，所以不要用Stream，使用Observer
 * 也不要用Buffer，使用Array
 */
class PlywoodDatumToCsv {
  /**
   * @constructor
   * @param {Object} [options]
   */
  constructor (options = {}) {
    this._formatter = null
    this._timezone = null
    this._status = PlywoodDatumToCsv.STATUS.BEGIN
    this._options = { ...DEFAULT_OPTIONS, ...options }
    this._d3Translator = d3.dsvFormat(this._options.separator)
  }

  setTimezone (timezone) {
    this._timezone = timezone
    return this
  }

  /**
   * 压入数据
   * @param {Object<String, *>} datum
   * @return {String}
   */
  translate (datum) {
    const formatter = this._formatter
    const STATE = PlywoodDatumToCsv.STATUS
    const opt = this._options

    let result = ''

    if (formatter === null) {
      return result
    }

    // send header
    if (this._status === STATE.BEGIN) {
      // with BOM
      result = '\uFEFF' + this._options
        .translateHeader(formatter.keys())
        .join(opt.separator)
        .concat(opt.eof)

      this._status = STATE.SEND_HEADER

      // 修正导出 json 后的格式不正常，csv 文件无法打开
      let rowStr = this._d3Translator.formatRows([formatter.format(datum)])
      return result.concat(rowStr).concat(opt.eof)
    }

    if (this._status < STATE.SEND_BODY) {
      this._status = STATE.SEND_BODY
    }

    // send body
    // 修正导出 json 后的格式不正常，csv 文件无法打开
    return this._d3Translator.formatRows([formatter.format(datum)]).concat(opt.eof)
  }

  /**
   * 设置字段类型
   * @param {Array<String>} keys
   * @param {Object<String, String>} types
   * @return {PlywoodDatumToCsv}
   */
  initFormatter (keys, types) {
    // 保证setTimezone调用在initFormatter之前
    // console.log('initFormatter => %s', JSON.stringify(types, null, 1))
    const timezone = this._timezone || 'Asia/Shanghai'
    this._formatter = new PlywoodDatumFormatter(types, {
      DATE: (v) => {
        return v === null || v === '' ? '' : moment(v).tz(timezone).format('YYYY-MM-DD HH:mm:ss')
      },
      STRING: function (v) {
        // 性能起见，所有的String字段不再indexOf，直接加引号
        // 如果是null，返回空字符串
        //noinspection JSConstructorReturnsPrimitive
        return v === null || v === '' ? '' : v //`"${v}"` 这部分逻辑交给 d3.formatRows 处理
      },
      FLOAT: function (v) {
        // 保留两位小数
        //noinspection JSConstructorReturnsPrimitive
        return v === null ? null : v.toFixed(2)
      }
    })
    this._formatter.keys(keys)
    return this
  }

  status () {
    return this._status
  }

  static STATUS = {
    BEGIN: 0,
    SEND_HEADER: 1,
    SEND_BODY: 2,
    COMPLETED: 3
  }
}

export default PlywoodDatumToCsv
