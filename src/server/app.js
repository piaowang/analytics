//user bluebird as global.Promise for better performance
// global.Promise = require('bluebird')

global.sdkconf = {}
// global.SugoCtxErorr = require('./utils/')

import init, { initSocketServer, initWebpty } from './init'
import config from './config'
import { err, log } from './utils/log'

const start = async function () {
  try {
    const { site } = config

    const app = await init()

    const socketProxy = initSocketServer(app)

    // 必须放在在所有app.use()之后
    const httpServer = app.listen(config.port, config.host, () => {
      log(site.siteName, 'start on -->', config.host + ':' + config.port)
    })

    httpServer.on('upgrade', socketProxy.upgrade)

    if (config.enableWebPty) {
      initWebpty(app, httpServer, socketProxy.socketIoServer)
    }
  } catch (e) {
    err('sugo-astro starting => ', e.stack)
    console.log(e.stack)
    process.exit(1)
  }
}

try {
  //go
  start()
} catch (e) {
  err('sugo-astro start => ', e.stack)
  process.exit(1)
}

process.once('SIGHUP', function () {
  // this is only called on ctrl+c, not restart
  process.kill(process.pid, 'SIGHUP')
})
