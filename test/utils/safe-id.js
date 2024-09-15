/**
 * Created on 06/05/2017.
 */

import safeid from '../../src/server/models/safe-id'
import { ok } from 'assert'

describe('safe-id', function () {
  it('safe short id not contains - character', function (done) {
    ok(safeid().indexOf('-') < 0)
    done()
  })
})

