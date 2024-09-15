/**
 * @Author sugo.io<asd>
 * @Date 17-10-24
 * @description 日志输出工具
 * 开发环境输出debug级别的日志
 * 其他环境输出error级别的日志
 */

import { createLogger, format, transports } from 'winston'
const DEV_MODEL = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'TEST_API_ENV'
const Loggers = new Map()
const DEFAULT_LOGGER = 'Sugoio'

/**
 * @param {string} [namespace]
 * @return {*}
 */
function get (namespace) {
  namespace = namespace || DEFAULT_LOGGER

  if (Loggers.has(namespace)) {
    return Loggers.get(namespace)
  }

  const logger = createLogger({
    format: format.combine(
      format.splat(),
      format.simple(),
      format.label({ label: namespace }),
      format.colorize(),
      format.json(),
      format.printf(info => `${info.label}->[${info.level}]: ${info.message}`)
    ),
    // default Logging level
    // { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
    level: DEV_MODEL ? 'debug' : 'error',
    transports: [
      new transports.Console()
    ]
  })

  Loggers.set(namespace, logger)
  return logger
}

// create default logger
get(DEFAULT_LOGGER)

export default get(DEFAULT_LOGGER)

export {
  get
}





