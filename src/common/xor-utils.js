/*
* 异或base64加密
* xjandwqz
* 2017-09-16
*/
let sn = 'sugo_tindex_des_cipher_jdbc_20170914'
export default {
  encrypt(str) {
    let snNum = []
    let result = ''
    let temp = ''
    let hash = 0
    for (let i = 0; i < sn.length; i++) {
      hash += sn.charCodeAt(i)
    }
    hash = hash % 128
    for (let i = 0; i < str.length; i++) {
      snNum.push((str.charCodeAt(i)) ^ hash)
    }
    for (let k = 0; k < snNum.length; k++) {
      if (snNum[k] < 10) {
        temp = '00' + snNum[k]
      } else {
        if (snNum[k] < 100) {
          temp = '0' + snNum[k]
        } else {
          temp = snNum[k]
        }
      }
      result += temp
    }
    var buf = new Buffer(result)
    return buf.toString('base64')
  },
  decrypt(str) {
    var buf = new Buffer(str, 'base64')
    str = buf.toString()
    let hash = 0
    for (let i = 0; i < sn.length; i++) {
      hash += sn.charCodeAt(i)
    }
    hash = hash % 128
    let snNum = []
    for (let i = 0; i < str.length / 3; i++) {
      let n = parseInt(str.substring(i * 3, i * 3 + 3))
      snNum[i] = (n ^ hash)
    }
    return String.fromCharCode(...snNum)
  }
}
