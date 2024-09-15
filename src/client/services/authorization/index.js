/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2020-03-9 23:40:03
 * @description 审核
 */
import Fetch from 'client/common/fetch-final'

export function save( writeRoles, readRoles, modelType, modelId ) {
  return Fetch.post('/app/authorization/save', { writeRoles, readRoles, modelType, modelId })
}

export function get(modelType, modelId) {
  return Fetch.get('/app/authorization/get', { modelType, modelId })
}
