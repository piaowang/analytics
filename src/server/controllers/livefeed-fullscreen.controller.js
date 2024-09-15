/**
 * Created by heganjie on 2016/12/18.
 */


import config from '../config'

function livefeedFullscreen(ctx) {
  Object.assign(ctx.local, config.site, {
    dataConfig: config.dataConfig
  })
  ctx.render('console', ctx.local)
}

export default {livefeedFullscreen}
