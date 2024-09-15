import { Parser } from '../../src/client/common/encoding'
import { equal, ok } from 'assert'

describe('encoding', () => {
  
  const title = [
    { name: 'a', type: 'int' },
    { name: 'b', type: 'string' },
    { name: 'c', type: 'long' }
  ]
  
  const make_data = (get) => {
    return new Array(4).fill(1).map((v, i) => {
      const obj = {}
      title.forEach(one => obj[one.name] = get(one, i))
      return obj
    })
  }
  
  const list = [
    { title: '#normal data', data: make_data((one, i) => `${one.name}-${i}`) },
    { title: '#empty data', data: make_data((one, i) => '') }
  ]
  
  list.forEach(one => {
    const parser = new Parser()
    parser.setTitle(title)
    const data = one.data
    const base64 = parser.encode(data)
    const buf = Buffer.from(base64, 'base64')
    const str = buf.toString('utf8')
    const arr = str.split(/\u0002/)
    
    describe(`.encode ${one.title}`, () => {
      it(`data:: 
      ${JSON.stringify(data)}
      and title::
      ${JSON.stringify(title)}
      translate to base64::
      ${base64}
      to string::
      ${str}
      split with \\u0002::
      ${JSON.stringify(arr)}
      will get (data.length + 1) group`, () => {
        equal(arr.length, data.length + 1)
      })
    })
    
    const decode_result = parser.decode(str)
    describe(`.decode ${one.title}`, () => {
      it(`string::
        ${str}
        pass to decode will return json::
        ${JSON.stringify(decode_result)}
        includes title and data property.
        json.title.length === title.length and
        json.data.length === data.length`, () => {
        equal(decode_result.title.length, title.length)
        equal(decode_result.data.length, data.length)
      })
    })
  })
  
})
