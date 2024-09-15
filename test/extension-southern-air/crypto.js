/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   08/12/2017
 * @description
 */

import { encrypto, decrypto } from '../../src/extension-southern-air/crypto'
import _ from 'lodash'
import { equal } from 'assert'

const values = '~!@#$%^&*()_+`1234567890-=qwertyuiop[]asdfghjkl;\'zxcvbnm,./QWERTYUIOP{}ASDFGHJKL:"ZXCVBNM<>'
const min = 0
const max = values.length
const length = new Array(_.random(8, 18)).fill(1)

describe('Crypto', function () {
  new Array(10).fill(1).forEach(function () {
    const a = length.map(() => values[_.random(min, max)]).join('')
    const b = length.map(() => values[_.random(min, max)]).join('')
    it(`encrypto(${a}, ${b}) will return token named t. decrypto(t, ${b}) return value should equal ${a}`, function () {
      const t = encrypto(a, b)
      const o = decrypto(t, b)
      equal(o, a)
    })
  })
})

