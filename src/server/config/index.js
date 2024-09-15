const cwd = process.cwd()
const _ = require('lodash')
const env = process.env.NODE_ENV
const pack = require(cwd + '/package.json')
const config = require(cwd + '/config.default.js').default
const moment = require('moment')
const { readFileSync } = require('fs')
const versionPath = cwd + '/version'
let version = pack.version + '-' + (parseInt(moment().format('YYDDDHm'), 10) + 17890)
const extend = require('recursive-assign')
const read = require('svg-reader')
const templateParser = require('./config-template-parser')
let icons = read(cwd + '/node_modules/sugo-analytics-static/assets/antd/iconfont.svg', { nosvg: true })
let menus = require('./menu-data')
let newMenus = require('./menu-data-new')
let { operatorIconMap, convert } = require('../../common/operator-icon-map')

if (env === 'production') {
  try {
    version = readFileSync(versionPath).toString()
    console.log('version file found!')
  } catch (e) {
    console.log('no version file found!')
  }
}

console.log('版本号', pack.version, version)

try {
  let customConfigFile = cwd + '/config.js'
  extend(config, require(customConfigFile).default)
} catch (e) {
  console.log(e.stack)
  console.warn('warn:no custom config file, use "cp config.default.js config.js" to create one')
}

config.site.version = version
config.site.menus = config.site.menus || (config.site.enableNewMenu ? newMenus : menus)

let iconNames = _.uniq(
  ['check', 'exclamation-circle-o', 'check-circle-o', 'close', 'close-circle-o']
    .concat(
      _.values(operatorIconMap)
    )
)

config.site.icons = iconNames.reduce((prev, name) => {
  let n = convert(name)
  if (!icons[n]) {
    n = 'bulb'
  }
  prev[name] = icons[n]
  return prev
}, {})

// 模板字符处理
templateParser(config)

// 转换dataConfig的clusterMode，sentinelMode参数为boolean值（因为模板转换为字符串）
config.dataConfig.clusterMode = config.dataConfig.clusterMode === 'true' ? true : false
config.dataConfig.sentinelMode = config.dataConfig.sentinelMode === 'true' ? true : false

module.exports = exports.default = Object.freeze(config)
