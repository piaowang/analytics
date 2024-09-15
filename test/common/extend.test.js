import extend from '../../src/common/extend'
import { equal } from 'assert'

describe('rec-assign', function () {

  it('basic', function () {
    let a = {
      x: '3',
      y: true,
      z: {
        ff: 'as',
        gg: 0,
        hh: {
          kl: 'sa'
        },
        ll: 'sdf'
      }
    }

    let b = {
      x: 6,
      y: false,
      z: {
        ff: 'as8',
        gg: 56,
        jj: 'asd',
        hh: {
          kl: 'sa5',
          hhg: 'sdf'
        }
      }
    }

    extend(a, b)
    equal(a.x, 6)
    equal(a.y, false)
    equal(a.z.ff, 'as8')
    equal(a.z.hh.kl, 'sa5')
    equal(a.z.ll, 'sdf')
    equal(a.z.hh.hhg, 'sdf')
  })

})
