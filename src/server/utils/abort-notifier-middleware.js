/**
 * Created by heganjie on 2017/08/30.
 * xhr.abort() 通知中间件，目前主要用于通知 druid 停止查询
 */

import _ from 'lodash'

export default function withAbortNotifier(app) {
  app.context.onceAbort = function (callback) {
    this.state._onceAbort = _.over([this.state._onceAbort, callback].filter(_.identity))
    if (this.state._aborted && _.isFunction(this.state._onceAbort)) {
      this.state._onceAbort()
    }
  }

  app.context.isAborted = function () {
    return this.state._aborted
  }

  app.context.raceWithAbort = async function(promise, onInterrupt) {
    let doneOfTheOther = false
    let theOtherPromise = async () => {
      try {
        return await promise
      } catch(e) {
        throw e
      } finally {
        doneOfTheOther = true
      }
    }
    return await Promise.race([theOtherPromise(), new Promise((resolve, reject) => {
      this.onceAbort(() => {
        // 另一个 promise 完成后，不会再触发 onInterrupt
        if (doneOfTheOther) {
          return
        }
        onInterrupt(resolve, reject)
      })
    })])
  }

  let middleware = async (ctx, next) => {
    let onAbortListener = () => {
      ctx.state._aborted = true
      if (_.isFunction(ctx.state._onceAbort)) {
        ctx.state._onceAbort()
        ctx.state._onceAbort = null
      }
    }
    try {
      ctx.request.socket.once('end', onAbortListener)
      await next()
    } catch (e) {
      throw e
    } finally {
      ctx.request.socket.removeListener('end', onAbortListener)
    }
  }

  app.use(middleware)
}
