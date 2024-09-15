/**
 * 通过模板转换和modifier function把配置中的模板转换成正确字符串
 * 如 config.site.websdk_app_host为 'localhost:9000',
 * ${site.websdk_app_host#noPort}' 解析为
 * modifierList.noPort( _.get(config, 'site.websdk_app_host'), config )
 * 最终输出 `localhost`
 */
const _ = require('lodash')
const deepCopy = require('../../common/deep-copy')

/**
 * 获取字符串的host部分
 * @param {string} str
 */
function getHost(str) {
  return str.replace('http://', '')
}

/**
 * 把host字符串的端口去掉, `localhost:9000` => `localhost`
 * @param {string} host
 * @return {string}
 */
function noPort(host) {
  return host.replace(/\:\d+$/, '')
}

/**
 * get cdn or websdk_app_host
 * @param {string} str
 * @param {object} config
 */
function cdnOrWebsdkAppHost(str, config) {
  return config.site.cdn || config.site.websdk_app_host
}

function getRedisConfig(str, config) {
  const { host, port, sentinels, name } = config.redis
  if (sentinels && name) {
    // 哨兵模式
    return sentinels
  }
  return `${host}:${port}`
}

function getRedisMasterName(str, config) {
  return config.redis.name || null
}

function getRedisClusterMode(str, config) {
  const { host, sentinels, name } = config.redis
  return _.isEmpty(sentinels) && _.isEmpty(name) && (host.indexOf(',') > -1 || host.indexOf(';') > -1)
}

function getRedisSentinelMode(str, config) {
  const { sentinels, name } = config.redis
  return !_.isEmpty(sentinels) && !_.isEmpty(name)
}

function getRedisPassword(str, config) {
  return config.redis.password || null
}

/**
 * modifier list自定义程序，以便灵活处理字符串模板
 */
const modifierList = {
  noPort,
  cdnOrWebsdkAppHost,
  getHost,
  getRedisPassword,
  getRedisConfig,
  getRedisMasterName,
  getRedisClusterMode,
  getRedisSentinelMode
}

let reg = /@\{([^\{\}]+)\}/g
function parseTemplate(str, config) {
  let mats = str.match(reg)
  return mats.reduce((prev, curr) => {
    let newStr = curr.replace(/^@\{/, '').replace(/\}$/, '')
    let [getStr, modifierStr = ''] = newStr.split('#')
    let modifiers = modifierStr.split('.')
    let res = _.get(config, getStr)
    res = modifiers.reduce((p, c) => {
      return c && modifierList[c] ? modifierList[c](p, config) : p
    }, res)

    if (_.isObject(res) || _.isArray(res)) {
      return deepCopy(res)
    }

    if (_.isUndefined(res) || _.isNull(res)) {
      return res
    }

    return prev.replace(curr, res)
  }, str)
}

/**
 * 检查config，有字符串模板就翻译
 * @params {object} config 配置
 */
module.exports = exports.default = function parser(config) {
  const enableTemplateParserPaths = ['', 'site', 'dataConfig', 'hive', 'microFrontendApps', ..._.keys(config.proxy).map(path => `proxy['${path}']`)]
  enableTemplateParserPaths.forEach(p => {
    let conf = p ? _.get(config, p) : config
    Object.keys(conf).forEach(k => {
      let v = conf[k]
      if (reg.test(v)) {
        conf[k] = parseTemplate(v, config)
      }
    })
  })
  return config
}
