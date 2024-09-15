/**
 * @Author sugo.io<asd>
 * @Date 17-10-28
 */

var slice = Array.prototype.slice

/**
 * @typedef {Object} LoggerLevel
 * @property {number} error
 * @property {number} warn
 * @property {number} info
 * @property {number} debug
 * @property {number} log
 */

/** @type {LoggerLevel} */
const LoggerLevel = {
  error: 0,
  warn: 1,
  info: 2,
  log: 3,
  debug: 4
}

/**
 * @typedef {Object} LoggerColor
 * @property {string} error
 * @property {string} warn
 * @property {string} info
 * @property {string} debug
 * @property {string} log
 */

/** @type {LoggerColor} */
const LoggerColor = {
  error: '#ff4949',
  warn: '#f7ba2a',
  info: '#50bfff',
  log: '#333',
  debug: '#6969d7'
}

/**
 * @param {string} [scope]
 * @param {number} [level=LoggerLevel.debug]
 * @constructor
 */
function Logger (scope, level) {
  this.$scope = scope ? (scope + '->') : ''
  this.$level = level || LoggerLevel.debug
  this.$console = window.console
    ? function () {window.console.log.apply(console, slice.call(arguments))}
    : function () {/* noop */}

  /** @type {LoggerColor} */
  this.$color = {}
  // copy default color
  for (var prop in LoggerColor) {
    if (LoggerColor.hasOwnProperty(prop)) {
      this.$color[prop] = LoggerColor[prop]
    }
  }
}

/**
 * 变更logger输出控制层级
 * @param {number} level
 * @return {Logger}
 */
Logger.prototype.setLevel = function (level) {
  this.$level = level
  return this
}

/**
 * @param {string} level
 * @param {Array<*>} args
 * @return {Array<*>}
 * @private
 */
Logger.prototype._prefix = function (level, args) {
  var color = this.$color[level]
  if (!color) {
    return args
  }

  var prefix = '%c' + (this.$scope || '') + '[' + level + ']%c: '
  var first = args[0]
  if (typeof first === 'string') {
    prefix = prefix + first
    args = args.slice(1)
  }

  return [
    prefix,
    'color:' + color + ';font-weight:bold;',
    'color:' + this.$color.log
  ].concat(args)
}

/**
 * @param {string} level
 * @param {Array<*>} args
 * @return {Logger}
 * @private
 */
Logger.prototype._log = function (level, args) {

  if (!LoggerLevel.hasOwnProperty(level)) {
    return this
  }

  if (this.$level < LoggerLevel[level]) {
    return this
  }

  this.$console.apply(this, this._prefix(level, args))
  return this
}

/**
 * @return {Logger}
 */
Logger.prototype.error = function () {
  return this._log('error', slice.call(arguments))
}

/**
 * @return {Logger}
 */
Logger.prototype.warn = function () {
  return this._log('warn', slice.call(arguments))
}

/**
 * @return {Logger}
 */
Logger.prototype.info = function () {
  return this._log('info', slice.call(arguments))
}

/**
 * @return {Logger}
 */
Logger.prototype.debug = function () {
  return this._log('debug', slice.call(arguments))
}

/**
 * @return {Logger}
 */
Logger.prototype.log = function () {
  return this._log('log', slice.call(arguments))
}

module.exports = {
  Logger: Logger,
  LoggerColor: LoggerColor,
  LoggerLevel: LoggerLevel
}
