import { retryRequesterFactory, verboseRequesterFactory, concurrentLimitRequesterFactory } from 'sugo-plywood'
import { druidRequesterFactory } from 'plywood-sugo-requester'
import {mySqlRequesterFactory} from 'plywood-mysql-requester'

/**
 * 创建druid数据库连接request
 */
export function properDruidRequesterFactory(options) {
  let {
    druidHost,
    retry,
    timeout,
    verbose,
    concurrentLimit,
    requestDecorator,
    socksHost,
    socksUsername,
    socksPassword,
    queryEngine
  } = options

  let druidRequester = druidRequesterFactory({
    host: druidHost,
    timeout: timeout || 30000,
    requestDecorator,
    socksHost,
    socksUsername,
    socksPassword,
    queryEngine
  })

  if (retry) {
    druidRequester = retryRequesterFactory({
      requester: druidRequester,
      retry: retry,
      delay: 500,
      retryOnTimeout: false
    })
  }

  if (verbose) {
    druidRequester = verboseRequesterFactory({
      requester: druidRequester,
      verbose
    })
  }

  if (concurrentLimit) {
    druidRequester = concurrentLimitRequesterFactory({
      requester: druidRequester,
      concurrentLimit: concurrentLimit
    })
  }
  return druidRequester
}

/**
 * 生成 MySQL 数据库连接 requester
 */
export function properMySQLRequesterFactory(options) {
  const {
    host,
    database,
    user,
    password,
    retry,
    verbose,
    concurrentLimit,
    timezone
  } = options

  let mySqlRequester = mySqlRequesterFactory({ host, database, user, password, timezone })

  if (retry) {
    mySqlRequester = retryRequesterFactory({
      requester: mySqlRequester,
      retry: retry,
      delay: 500,
      retryOnTimeout: false
    })
  }

  if (verbose) {
    mySqlRequester = verboseRequesterFactory({
      requester: mySqlRequester,
      verbose
    })
  }

  if (concurrentLimit) {
    mySqlRequester = concurrentLimitRequesterFactory({
      requester: mySqlRequester,
      concurrentLimit: concurrentLimit
    })
  }
  return mySqlRequester
}
