/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2020-03-9 23:40:03
 * @description 审核
 */
import Fetch from 'client/common/fetch-final'

export function create(modelType, modelId) {
  return Fetch.post('/app/examine/create', { modelId, modelType })
}

export function cancel(id) {
  return Fetch.post('/app/examine/cancel', { id })
}

export function getExamineInfo(modelType, modelId) {
  return Fetch.get('/app/examine/get', { modelType, modelId })
}

export function getSendList(modelType) {
  return Fetch.get('/app/examine/getSendList', { modelType })
}
export function getExamineList(modelType) {
  return Fetch.get('/app/examine/getExamineList', { modelType })
}
export function examine(id, examieStatus, message) {
  return Fetch.post('/app/examine/examine', { id, examieStatus, message })
}
export function del(id) {
  return Fetch.post('/app/examine/delete', {id})
}
