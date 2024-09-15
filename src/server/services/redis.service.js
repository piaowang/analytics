/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   12/01/2018
 * @description
 */

import conf from '../config'
import { Redis } from '../utils/RedisServer'
const redisConfig = conf.redis
const clusterMode = redisConfig.host.indexOf(',') > -1 || redisConfig.host.indexOf(',') > -1
const redis = new Redis(redisConfig.host, clusterMode, redisConfig)

process.on('beforeExit', function () {
  redis.disconnect()
})

export default redis
