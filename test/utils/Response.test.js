/**
 * Created on 10/04/2017.
 */

import { Response, Type } from '../../src/server/utils/Response'
import { equal, ok } from 'assert'

describe('Response', function () {
  
  describe('static', function () {
    it('ok', function () {
      const ret = []
      const res = Response.ok(ret)
      ok(res.success)
      equal(res.result, ret)
      equal(res.message, null)
      equal(res.code, 200)
      equal(res.type, Type.json)
    })
  
    it('fail', function () {
      const msg = 'msg'
      const res = Response.fail(msg)
      ok(!res.success)
      equal(res.message, msg)
      equal(res.code, 200)
      equal(res.type, Type.json)
    })
  })
})
