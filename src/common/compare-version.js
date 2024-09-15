
//compare version '1.0.0' '12.0.3'
//return 1 when a > b
//return -1 when a < b
//return 0 when a === b
export default function (a, b) {
  let ar = a.split('.').map(n => Number(n))
  let br = b.split('.').map(n => Number(n))
  let res = 0
  for (let i = 0, len = br.length;i < len;i ++) {
    if (br[i] < ar[i]) {
      res = 1
      break
    } else if (br[i] > ar[i]) {
      res = -1
      break
    }
  }
  return res
}
