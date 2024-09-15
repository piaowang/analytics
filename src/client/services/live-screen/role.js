/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-19 11:40:03
 * @description 大屏授权管理
 */
import Fetch from 'client/common/fetch-final'

export function fetch() {
  return Fetch.get('/app/livescreen/role/list')
}

export function save(writeRoles, readRoles, livescreenId) {
  return Fetch.post('/app/livescreen/role/authorize', { writeRoles, readRoles, livescreenId })
}

export function cancelAuthorize(livescreenId) {
  return Fetch.put('/app/livescreen/role/cancelAuthorize', { livescreenId })
}
