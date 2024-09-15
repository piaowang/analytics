import config from '../config'
import chalk from 'chalk'
import _ from 'lodash'

const logParser = arg => {
  return _.isArray(arg) || _.isPlainObject(arg)
    ? JSON.stringify(arg, null, 2)
    : arg
}

const colorWrapper = (color) => {
  return config.site.env === 'production'
    ? (...args) => args
    : (...args) => [color(...args)]
}
const blue = colorWrapper(chalk.blue)
const red = colorWrapper(chalk.red)
const yellow = colorWrapper(chalk.yellow)

console.log('env:', config.site.env)

export function debugLog (env) {

  return function (...args) {
    if (config.site.env === env) console.log(...args.map(logParser))
  }
}

export const debug = debugLog('development')

global.debug = debug

export function log (...args) {
  console.log.apply(
    null,
    blue('' + new Date(), ...args.map(logParser))
  )
}

export function err (...args) {
  console.log.apply(
    null,
    red('' + new Date(), ...args.map(logParser))
  )
}

export function warn (...args) {
  console.log.apply(
    null,
    yellow('' + new Date(), ...args.map(logParser))
  )
}
