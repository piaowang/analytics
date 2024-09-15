import _ from 'lodash'
import redis from '../services/redis.service'
import { tryJsonParse } from '../../common/sugo-utils'

//del usergroup
export async function redisDel(id) {
  return await redis.del(id)
}

//common set
export async function redisSet(id, strOrObj) {
  return await redis.set(id, _.isString(strOrObj) ? strOrObj : JSON.stringify(strOrObj))
}

/**
 *
 * @export
 * @param {*} id
 * @param {number} expire key的过期时间，以秒为单位
 * @param {string|object} strOrObj
 * @returns
 */
export async function redisSetExpire(id, expire, strOrObj) {
  return await redis.setWithExpire(id, _.isString(strOrObj) ? strOrObj : JSON.stringify(strOrObj), expire)
}

//common get
export async function redisGet(id) {
  return tryJsonParse(await redis.get(id))
}

/**
 *
 * @export
 * @param {any} id
 * @param {any} time 过期时间，以秒为单位
 * @returns
 */
//expire usergroup
export async function redisExpire(id, time) {
  return await redis.expire(id, time)
}

export function getRedisClient() {
  return redis.getService()
}

export async function disconnectRedis() {
  return await redis.disconnect()
}
