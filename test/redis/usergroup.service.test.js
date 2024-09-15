/**
 * Created on 27/03/2017.
 */

import UserGroupRedis from '../../src/server/services/usergroup-redis.service'
import { equal } from 'assert'
import Conf from '../../config'

const redisHost = `${Conf.default.redis.host}:${Conf.default.redis.port}`
const Key = '_TEST_USER_GROUP_SERVICE_REDIS_KEY_'

function createDataConfig () {
  return {
    hostAndPorts: redisHost,
    groupId: Key,
    clusterMode: false,
    type: 'redis'
  }
}

/** @test {UserGroupRedisService} */
describe('UserGroupRedisService', function () {
  
  const list = new Array(100).fill(1).map((v, i) => '' + (i + 1))
  const pageSize = 4
  const pageIndex = 0
  
  /** @test {UserGroupRedisService#create} */
  describe('.create', function () {
    it('insert one record in redis', function (done) {
      UserGroupRedis
        .create(list, createDataConfig())
        .then(
          function (res) { equal(res.result, 'execute successfully') },
          done
        )
        .then(
          function () {
            return UserGroupRedis.read({
              dataConfig: createDataConfig(),
              groupReadConfig: {
                pageIndex,
                pageSize
              }
            })
          },
          done
        )
        .then(
          function (res) {
            equal(res.result.ids.length, pageSize)
          },
          done
        )
        .then(
          function () {done()},
          done
        )
    })
  })
  
  /** @test {UserGroupRedisService#read} */
  describe('.read', function () {
    it('will return value that stored previous', function (done) {
      UserGroupRedis
        .read({
          dataConfig: createDataConfig(),
          groupReadConfig: {
            pageIndex,
            pageSize
          }
        })
        .then(
          function (res) {equal(res.result.ids.length, pageSize)},
          done
        )
        .then(
          function () {done()},
          done
        )
    })
  })
  
  /** @test {UserGroupRedisService#del} */
  describe('.del', function () {
    it('delete from redis and return config', function (done) {
      UserGroupRedis
        .del(createDataConfig())
        .then(
          function (res) { equal(res.result.groupId, Key)},
          done
        )
        .then(
          function () {
            return UserGroupRedis.read({
              dataConfig: createDataConfig(),
              groupReadConfig: {
                pageIndex,
                pageSize
              }
            })
          },
          done
        )
        .then(
          function (res) {equal(res.result.ids.length, 0)},
          done
        )
        .then(
          function () { done() },
          done
        )
    })
  })
  
  describe('clear redis', function () {
    it('redis will be clean after del called', function (done) {
      UserGroupRedis
        .del(createDataConfig())
        .then(
          function (res) {equal(res.result.groupId, Key)},
          done
        )
        .then(
          function () {done()},
          done
        )
    })
  })
})

