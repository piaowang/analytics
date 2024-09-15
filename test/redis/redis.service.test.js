/**
 * Created on 27/03/2017.
 */

import { Redis } from '../../src/server/utils/RedisServer'
import { equal, ok } from 'assert'
import Conf from '../../config'

const k = '__REDIS_TEST_BY_NODE__', v = 'str'

/** @test {Redis} */
describe('redis', function () {
  
  const redis = new Redis(Conf.default.redis, false)
  
  describe('config', function () {
    it(`is:${JSON.stringify(redis.host)}`, function (done) {
      done()
    })
  })
  
  /** @test {Redis#constructor} */
  describe('.constructor', function () {
    it('Should return an instance', function () {
      ok(redis instanceof Redis)
    })
  })
  
  /** @test {Redis#getService} */
  describe('.getService', function () {
    it('Should return a Redis Server that with set method', function (done) {
      redis
        .getService()
        .then(
          function (ins) {
            ok(ins && typeof ins.set === 'function')
            done()
          },
          done
        )
    })
    it('redis._status should equal ready', function (done) {
      redis
        .getService()
        .then(
          function () {
            equal(redis._status, 'ready')
            done()
          },
          done
        )
      
    })
  })
  
  /** @test {Redis#set} */
  describe('.set', function () {
    it('Should return an instance and use redis.get ' +
      'should return the value that stored previous', function (done) {
      
      redis
        .set(k, v)
        .then(
          function (ins) { return ins.get(k) },
          done
        )
        .then(
          function (s) {
            equal(s, v)
            done()
          },
          done
        )
    })
  })
  
  describe('redis.client.multi', function () {
    it('should done this case', function (done) {
      redis.getService()
        .then(
          function (redis) {
            return redis.multi([
              ['get', k],
              ['del', k]
            ])
          },
          done
        )
        .then(
          function (multi) {
            return multi.exec()
          },
          done
        )
        .then(
          function (res) {
            equal(res[0][1], v)
            equal(res[1][1], 1)
            done()
          },
          done
        )
    })
  })
  
  /** @test {Redis#get} */
  describe('.get', function () {
    const v = 'v1'
    it('Should return the value of the key if exist', function (done) {
      redis
        .set(k, v)
        .then(
          function (ins) { return ins.get(k) },
          done
        )
        .then(
          function (s) {
            equal(s, v)
            done()
          },
          done
        )
    })
    
    it('If the key does not exist the special value null is returned', function (done) {
      redis
        .get((Math.random() * 1000).toString(2))
        .then(
          function (s) {
            equal(s, null)
            done()
          },
          done
        )
    })
  })
  
  /** @test {Redis#setWithExpire} */
  describe('.setWithExpire', function () {
    it('The value stored should expire if with expire param', function (done) {
      redis
        .setWithExpire(k, v, 1)
        .then(
          function (ins) {
            return new Promise(function (resolve) {
              setTimeout(function () { resolve(ins) }, 1500)
            })
          },
          done
        )
        .then(
          function (ins) { return ins.get(k) },
          done
        )
        .then(
          function (s) {
            ok(s === null)
            done()
          },
          done
        )
    })
  })
  
  /** @test {Redis#expire} */
  describe('.expire', function () {
    it('Set a timeout on key. After the timeout has expired, The key will automatically be deleted.', function (done) {
      const v1 = 1, k1 = k
      redis.set(k1, v1)
        .then(
          function (ins) {
            return ins.expire(k1, 1)
          },
          done
        )
        .then(
          function (ins) {
            return new Promise(function (resolve) {
              setTimeout(function () { resolve(ins) }, 1500)
            })
          },
          done
        )
        .then(
          function (ins) { return ins.get(k1) },
          done
        )
        .then(
          function (s) {
            ok(s === null)
            done()
          },
          done
        )
    })
  })
  
  /** @test {Redis#del} */
  describe('.del', function () {
    it('should return null if a key was delete', function (done) {
      redis.set(k, v)
        .then(
          function (ins) { return ins.get(k) },
          done
        )
        .then(
          function (s) { equal(s, v) },
          done
        )
        .then(
          function () { return redis.del(k) },
          done
        )
        .then(
          function (ins) { return ins.get(k) },
          done
        )
        .then(
          function (s) {
            equal(s, null)
            done()
          },
          done
        )
    })
  })
  
  /** @test {Redis#getBuffer} */
  describe('.getBuffer', function () {
    it('store buffer', function (done) {
      const buf = Buffer.from('abc')
      redis
        .set(k, buf)
        .then(
          function (ins) {return ins.getBuffer(k)},
          done
        )
        .then(
          function (s_buf) {
            ok(s_buf.equals(buf))
            done()
          },
          done
        )
    })
  })
  
  /** @test {Redis#writeBytes} */
  /** @test {Redis#readBytes} */
  describe('.writeBytes & .readBytes', function () {
    const buf = Buffer.from([96, 97, 98, 99])
    it('store buffer use writeBytes', function (done) {
      redis
        .writeBytes(k, buf)
        .then(
          function (ins) {return ins.readBytes(k)},
          done
        )
        .then(
          function (s_buf) {
            ok(s_buf.equals(buf))
            done()
          },
          done
        )
    })
  })
  
  /** @test {Redis#disconnect} */
  describe('.disconnect', function () {
    it('redis._status will be end after call redis.disconnect', function (done) {
      redis
        .disconnect()
        .then(
          function () {
            equal(redis._status, 'end')
            done()
          },
          done
        )
    })
    
    it('clear the value stored the key', function (done) {
      redis.del(k)
        .then(
          function (ins) { return ins.get(k) },
          done
        )
        .then(
          function (s) {
            equal(s, null)
            done()
          },
          done
        )
    })
  })
  
})


