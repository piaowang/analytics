//启动时运行一次，修改websdk包 node_modules/sugo-sdk-js/libs/sugoio-jslib-snippet.min.js
//改为config.site的配置

import {resolve} from  'path'
const cwd = process.cwd()
const path = resolve(cwd, 'node_modules/sugo-sdk-js/bin/deploy.js')

export default () => {
  return require(path)
}
